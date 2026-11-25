# Third-party notices

Presay's website serves or is built from these works. The full licence texts are
in [`site/licenses.txt`](site/licenses.txt), which `npm run vendor` regenerates.

| Work | Used for | Licence |
| --- | --- | --- |
| CMU Pronouncing Dictionary (Carnegie Mellon University) | pronunciations in `site/data` | BSD-style |
| WordNet 3.1 (Princeton University) | synonyms in `site/data` | WordNet licence |
| SCOWL word lists (Kevin Atkinson and others) | word frequency levels | permissive (see notice) |
| Gentium Book Plus (SIL International) | font | SIL Open Font Licence 1.1 |
| Schibsted Grotesk | font | SIL Open Font Licence 1.1 |
| Transformers.js (Hugging Face) | loaded by the browser from jsDelivr (unpkg as a fallback) | Apache 2.0 |
| ONNX Runtime Web (Microsoft) | bundled JavaScript, WebAssembly from a CDN | MIT |
| Whisper models (OpenAI) | downloaded by the browser from Hugging Face | MIT |

Development-only packages (used by the scripts and tests, not served):
`cmu-pronouncing-dictionary` (ISC), `wordnet-db` (MIT), `wordlist-english` (MIT),
`@fontsource/*` (OFL), `puppeteer-core` (Apache 2.0).
