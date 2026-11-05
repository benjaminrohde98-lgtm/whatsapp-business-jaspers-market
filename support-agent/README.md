# Kumpel – KI-Agent zum Anvertrauen

Ein Chat-Agent, der zuhört, Probleme sortiert und bei nächsten Schritten hilft (Deutsch, du-Ansprache).

## Start
```bash
export ANTHROPIC_API_KEY=sk-ant-...
node support-agent/agent.js
```
Befehle: `/neu` löscht den Verlauf, `/ende` beendet.

## Eigenschaften
- Hört zuerst zu, fragt nach, gibt dann praktische Hilfe.
- Erkennt Krisen-Stichwörter und zeigt immer Hilfenummern (112, Telefonseelsorge 0800 111 0 111 / 0800 111 0 222, Nummer gegen Kummer 116 111).
- Verlauf wird nur lokal in `~/.support-agent/history.json` gespeichert (nur für dich lesbar). Der Chat-Text geht zur Antwortgenerierung an die Anthropic-API.
- Persönlichkeit anpassen: `system-prompt.js`. Modell ändern: `SUPPORT_AGENT_MODEL`.

## Wichtig
Das ist eine KI, keine Therapie und kein Ersatz für Freunde, Familie oder Fachleute.
