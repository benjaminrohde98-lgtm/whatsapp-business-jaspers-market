"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { isCrisis } = require("../support-agent/safety");
const { trimHistory, askClaude, loadHistory, saveHistory } = require("../support-agent/agent");

test("erkennt Krisen-Formulierungen", () => {
  assert.ok(isCrisis("Ich will nicht mehr leben"));
  assert.ok(isCrisis("denke an Suizid"));
  assert.ok(!isCrisis("Ich hab Stress in der Schule"));
});

test("trimHistory beginnt immer mit User-Nachricht", () => {
  const h = [
    { role: "user", content: "a" },
    { role: "assistant", content: "b" },
    { role: "user", content: "c" },
  ];
  const t = trimHistory(h, 2);
  assert.strictEqual(t[0].role, "user");
  assert.deepStrictEqual(t, [{ role: "user", content: "c" }]);
});

test("askClaude sendet System-Prompt und liest Text", async () => {
  let body;
  const fake = async (_url, opts) => {
    body = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ content: [{ type: "text", text: "Ich höre dir zu." }] }) };
  };
  const out = await askClaude([{ role: "user", content: "Hi" }], "key", fake);
  assert.strictEqual(out, "Ich höre dir zu.");
  assert.ok(body.system.includes("Kumpel"));
});

test("Verlauf wird gespeichert und geladen", () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sa-")), "h.json");
  saveHistory([{ role: "user", content: "x" }], f);
  assert.deepStrictEqual(loadHistory(f), [{ role: "user", content: "x" }]);
});
