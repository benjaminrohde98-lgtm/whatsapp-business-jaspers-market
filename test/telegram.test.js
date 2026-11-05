"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { handleUpdate, histories } = require("../support-agent/telegram");

function setup() {
  const sent = [];
  const fetchImpl = async (url, opts) => {
    const body = JSON.parse(opts.body);
    if (url.endsWith("/sendMessage")) sent.push(body.text);
    return { ok: true };
  };
  return { sent, fetchImpl };
}
const upd = (id, text) => ({ message: { text, chat: { id }, from: { id } } });

test("ohne ALLOWED_USER_ID wird nur die ID verraten, kein API-Aufruf", async () => {
  const { sent, fetchImpl } = setup();
  let called = false;
  await handleUpdate(upd(42, "hi"), { token: "t", apiKey: "k", fetchImpl, ask: async () => (called = true) });
  assert.ok(sent[0].includes("42"));
  assert.strictEqual(called, false);
});

test("Fremde werden abgewiesen", async () => {
  const { sent, fetchImpl } = setup();
  let called = false;
  await handleUpdate(upd(7, "hi"), { token: "t", apiKey: "k", allowedId: "42", fetchImpl, ask: async () => (called = true) });
  assert.strictEqual(sent[0], "Das ist ein privater Bot.");
  assert.strictEqual(called, false);
});

test("erlaubter User bekommt Antwort, Krise zeigt Hilfenummern, /neu löscht", async () => {
  const { sent, fetchImpl } = setup();
  const ask = async () => "Ich höre dir zu.";
  await handleUpdate(upd(42, "ich will nicht mehr leben"), { token: "t", apiKey: "k", allowedId: "42", fetchImpl, ask });
  assert.ok(sent[0].includes("112"));
  assert.strictEqual(sent[1], "Ich höre dir zu.");
  assert.ok(histories.has(42));
  await handleUpdate(upd(42, "/neu"), { token: "t", apiKey: "k", allowedId: "42", fetchImpl, ask });
  assert.ok(!histories.has(42));
});
