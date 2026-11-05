#!/usr/bin/env node
"use strict";

// Vertrauens-Agent für Probleme. Start: ANTHROPIC_API_KEY=... node support-agent/agent.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const { SYSTEM_PROMPT } = require("./system-prompt");
const { isCrisis, CRISIS_NOTICE } = require("./safety");

const MODEL = process.env.SUPPORT_AGENT_MODEL || "claude-sonnet-5-5";
const MAX_TURNS_KEPT = 40; // letzte Nachrichten, die als Kontext mitgehen
const HISTORY_FILE =
  process.env.SUPPORT_AGENT_HISTORY ||
  path.join(os.homedir(), ".support-agent", "history.json");

function loadHistory(file = HISTORY_FILE) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveHistory(history, file = HISTORY_FILE) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(history, null, 2), { mode: 0o600 });
}

function trimHistory(history, max = MAX_TURNS_KEPT) {
  let trimmed = history.slice(-max);
  // Die API verlangt, dass das erste Element vom User kommt.
  while (trimmed.length && trimmed[0].role !== "user") trimmed = trimmed.slice(1);
  return trimmed;
}

async function askClaude(history, apiKey, fetchImpl = fetch) {
  const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: trimHistory(history),
    }),
  });
  if (!res.ok) {
    throw new Error(`API-Fehler ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Bitte ANTHROPIC_API_KEY setzen.");
    process.exit(1);
  }

  let history = loadHistory();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  console.log("Hey, ich bin Kumpel. Du kannst mir erzählen, was dich beschäftigt.");
  console.log("Befehle: /neu = neues Gespräch (löscht den Verlauf), /ende = beenden.");
  console.log("Ich bin eine KI – bei akuter Not ruf bitte 112 oder die Telefonseelsorge 0800 111 0 111.\n");

  for (;;) {
    const input = (await ask("Du: ")).trim();
    if (!input) continue;
    if (input === "/ende") break;
    if (input === "/neu") {
      history = [];
      saveHistory(history);
      console.log("Neu gestartet. Verlauf gelöscht.\n");
      continue;
    }

    if (isCrisis(input)) console.log(`\n${CRISIS_NOTICE}\n`);

    history.push({ role: "user", content: input });
    try {
      const reply = await askClaude(history, apiKey);
      history.push({ role: "assistant", content: reply });
      saveHistory(history);
      console.log(`\nKumpel: ${reply}\n`);
    } catch (err) {
      history.pop();
      console.error(`\nFehler: ${err.message}\n`);
    }
  }
  rl.close();
}

if (require.main === module) main();

module.exports = { loadHistory, saveHistory, trimHistory, askClaude };
