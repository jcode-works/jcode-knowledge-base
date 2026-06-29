# Dogfooding Frictions

This ledger tracks product frictions found while using Mimir locally. Keep private client details and
raw evidence outside the repository.

| Priority | Friction | Current impact | Next action |
| --- | --- | --- | --- |
| P0 | Semantic mode still requires an explicit model preload and rebuild. | Users can stay on `local-hash` and think they have semantic retrieval, but the manual config edit is removed. | Use `mimir models pull --enable` and keep `mimir doctor` guidance sharp until real dogfooding proves a stronger default. |
| P0 | Real-agent MCP proof is not yet recorded against a private client brief. | Repo tests can prove protocol compatibility, but not agent ergonomics in Claude Code/Cursor. | Run the generated `.mimir/claude-mcp-server.json` or equivalent local client config against a private corpus and record only sanitized findings here. |
| P0 | Mixed private corpus validation is still external to the repo. | OSS fixtures exercise text formats, but not the exact PDF/DOCX/XLSX meeting-note mix from real work. | Run a local evidence ledger outside git; summarize extraction/recall failures without committing source material. |
| P1 | Offline audio is safer for confidential dossiers but less turnkey than Edge TTS. | Users may choose higher-quality online rendering before understanding the privacy tradeoff; the offline path fails until the TTS model is preloaded locally. | Add a clear preload workflow for offline TTS models before recommending offline audio to non-technical users. |
| P1 | Direct-download app release depends on signing machines, certificates, and update metadata. | The app can be built locally, but public release remains blocked by operational setup. | Keep release preflight strict and avoid placeholder updater keys or store-led assumptions. |

## Evidence Log

| Date | Check | Result | Evidence kept out of git |
| --- | --- | --- | --- |
| 2026-06-29 | MCP stdio smoke against `examples/sovereign-rag-demo` | Passed: 5 tools listed, 5 chunks indexed, `mimir_search` returned 2 results, `mimir_ask` returned 2 cited sources. | Ignored `.kb/storage/` and `.kb/access.log` under the synthetic demo. |
| 2026-06-29 | `mimir audio` on a synthetic dogfooding summary | Edge MP3 render passed; offline Transformers render failed because `Xenova/mms-tts-fra` was not preloaded under `.mimir/models/tts`. | Ignored `.mimir/audio/dogfood-summary.txt` and `.mimir/audio/dogfood-summary.mp3`. |
