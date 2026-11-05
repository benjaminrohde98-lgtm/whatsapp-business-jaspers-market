#!/usr/bin/env node
"use strict";

// Telegram-Version von Kumpel (Webhook). Läuft z. B. auf Render.
// Nötige Umgebungsvariablen: TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY,
// ALLOWED_USER_ID (deine Telegram-ID), WEBHOOK_SECRET, PUBLIC_URL (oder RENDER_EXTERNAL_URL).
const express = require("express");
const { askClaude } = require("./agent");
const { isCrisis, CRISIS_NOTICE } = require("./safety");

// Verlauf nur im Arbeitsspeicher: Auf kostenlosem Hosting geht er beim Neustart verloren.
const histories = new Map();

async function tg(token, method, payload, fetchImpl = fetch) {
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Telegram ${method} fehlgeschlagen: ${res.status}`);
  return res;
}

async function handleUpdate(update, { token, apiKey, allowedId, fetchImpl = fetch, ask = askClaude }) {
  const msg = update && update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const send = (text) => tg(token, "sendMessage", { chat_id: chatId, text }, fetchImpl);

  // Zugriffsschutz: Nur du darfst mit dem Bot reden.
  if (!allowedId) {
    await send(`Deine Telegram-ID ist: ${userId}\nTrage sie beim Hosting als ALLOWED_USER_ID ein, dann bin ich für dich da.`);
    return;
  }
  if (userId !== String(allowedId)) {
    await send("Das ist ein privater Bot.");
    return;
  }

  const text = msg.text.trim();
  if (text === "/start") {
    await send("Hey, ich bin Kumpel. Erzähl mir, was dich beschäftigt. Mit /neu fangen wir von vorn an.\n\nIch bin eine KI. Bei akuter Not: 112 oder Telefonseelsorge 0800 111 0 111.");
    return;
  }
  if (text === "/neu") {
    histories.delete(chatId);
    await send("Neu gestartet. Verlauf gelöscht.");
    return;
  }

  if (isCrisis(text)) await send(CRISIS_NOTICE);

  const history = histories.get(chatId) || [];
  history.push({ role: "user", content: text });
  try {
    await tg(token, "sendChatAction", { chat_id: chatId, action: "typing" }, fetchImpl).catch(() => {});
    const reply = await ask(history, apiKey, fetchImpl);
    history.push({ role: "assistant", content: reply });
    histories.set(chatId, history.slice(-40));
    await send(reply.slice(0, 4000));
  } catch (err) {
    history.pop();
    console.error(err.message);
    await send("Da ist gerade was schiefgelaufen. Probier es gleich nochmal.");
  }
}

function createApp(cfg) {
  const app = express();
  app.use(express.json());
  app.get("/", (_req, res) => res.send("Kumpel läuft."));
  app.post("/telegram", (req, res) => {
    if (req.get("x-telegram-bot-api-secret-token") !== cfg.secret) return res.sendStatus(403);
    res.sendStatus(200);
    handleUpdate(req.body, cfg).catch((e) => console.error(e.message));
  });
  return app;
}

async function main() {
  const need = ["TELEGRAM_BOT_TOKEN", "ANTHROPIC_API_KEY", "WEBHOOK_SECRET"];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Fehlende Variablen: ${missing.join(", ")}`);
    process.exit(1);
  }
  const cfg = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    apiKey: process.env.ANTHROPIC_API_KEY,
    allowedId: process.env.ALLOWED_USER_ID,
    secret: process.env.WEBHOOK_SECRET,
  };
  const port = process.env.PORT || 8080;
  createApp(cfg).listen(port, () => console.log(`Kumpel hört auf Port ${port}`));

  const publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL;
  if (publicUrl) {
    await tg(cfg.token, "setWebhook", {
      url: `${publicUrl.replace(/\/$/, "")}/telegram`,
      secret_token: cfg.secret,
      allowed_updates: ["message"],
    });
    console.log("Webhook gesetzt.");
  } else {
    console.warn("Keine PUBLIC_URL – Webhook nicht gesetzt.");
  }
}

if (require.main === module) main();

module.exports = { handleUpdate, createApp, histories };
