"use strict";

// Einfache, bewusst großzügige Erkennung akuter Krisen. Unabhängig vom Modell
// wird dann immer zusätzlich ein Hilfehinweis angezeigt.
const CRISIS_PATTERNS = [
  /suizid/i,
  /selbstmord/i,
  /umbringen/i,
  /mich\s+töten/i,
  /nicht\s+mehr\s+leben/i,
  /leben\s+beenden/i,
  /sterben\s+(will|möchte|wollen)/i,
  /ritzen/i,
  /selbstverletz/i,
  /kein\s+sinn\s+mehr/i,
  /will\s+nicht\s+mehr\s+(da\s+sein|leben)/i,
];

const CRISIS_NOTICE = [
  "Wenn du dich gerade in Gefahr fühlst oder dir etwas antun möchtest, hol dir bitte jetzt Hilfe von Menschen:",
  "  • Notruf: 112",
  "  • Telefonseelsorge (kostenlos, 24/7): 0800 111 0 111 oder 0800 111 0 222",
  "  • Nummer gegen Kummer (Kinder/Jugendliche): 116 111",
  "Du musst da nicht allein durch.",
].join("\n");

function isCrisis(text) {
  return CRISIS_PATTERNS.some((re) => re.test(String(text)));
}

module.exports = { isCrisis, CRISIS_NOTICE };
