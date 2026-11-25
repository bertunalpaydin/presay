# How Presay works, and why it is built this way

## The idea in one paragraph

Before an interview or a talk, you paste what you plan to say. Presay marks the
words a listener might mishear and explains why. You can swap a risky word for an
easier one, or practise it: you say it, a speech recognition model running in
your browser writes down what it heard, and if that is a different word, the word
goes on your personal list. The model stands in for a listener.

## Main decisions

### 1. A static site with no server

Everything runs in the browser, so the site is just files. That gives three
things at once: it costs nothing to host, it scales to any number of visitors
(Cloudflare serves static files without limits on the free plan), and privacy is
simple, because no recording or script ever leaves the device.

There is also no build step: the JavaScript in `site/js` is served as it is
(native ES modules). Fewer moving parts means fewer things that can break on
deploy, and the code you read is the code that runs.

### 2. Speech recognition in the browser

`js/asr.worker.js` runs Whisper (OpenAI's open speech model) with Transformers.js
inside a Web Worker, so the page stays responsive while it thinks.

- Models: `whisper-small.en` ("Most accurate", about 250 MB), `whisper-base.en`
  ("Accurate", about 77 MB, the default) and `whisper-tiny.en` ("Fast", about
  41 MB), all 8-bit quantised. English-only models are better at English and
  smaller than multilingual ones.
- Before a recording reaches the model it is trimmed and levelled (quiet
  recordings are raised, at most ten times). Whisper's sound notes such as
  "[BLANK_AUDIO]" are dropped, and the stock phrases it writes for silence or
  noise ("Thank you.") are not counted as a mispronounced word. In word
  practice an added ending ("thanks" for "thank") is forgiven, a dropped one is
  not, because dropping a final sound is a real slip.
- The browser downloads them once from Hugging Face and keeps them in its cache.
- It runs on the CPU through WebAssembly by default, which works everywhere. The
  graphics card (WebGPU) is optional, because it needs a much bigger download.
- The WebAssembly runtime itself is 28 MB, larger than Cloudflare Pages' 25 MiB
  per-file limit, so it is loaded from the jsDelivr CDN, with unpkg as a backup.
  Transformers.js comes from the same CDN, so the repository holds no copy of
  the minified library; `npm run vendor` makes a local copy for working offline.
- `site/_headers` turns on cross-origin isolation, which lets the runtime use
  several CPU threads. The `credentialless` setting keeps the model and runtime
  downloads working.

### 3. Long recordings are cut at pauses

Whisper listens to 30 seconds at a time. Its built-in chunking sometimes repeats
whole sentences at the joins (we saw this in testing). `js/transcribe.js` instead
cuts the recording into pieces of at most 25 seconds at the quietest moment
(a pause between words), transcribes each piece, caps the number of tokens per
piece, and removes runaway repeats. In the tests, a 35-second recording came back
word for word, in two pieces.

### 4. Silence is never transcribed

Speech models invent words when given silence ("Thank you." is a classic). So
`trimSilence()` cuts quiet parts off both ends, and a recording that is basically
silent is rejected with a message instead of being sent to the model.

### 5. Comparing what you meant with what was heard

`js/align.js` lines up the script and the transcript with an edit-distance table,
the same method used to measure speech recognition accuracy. Each script word
ends up as heard, changed (heard as another word) or missed. Before comparing:

- contractions are expanded on both sides ("I'm" = "I am"),
- words that sound the same count as the same ("their" = "there"), using the
  homophone list from the pronunciation dictionary,
- British and American spellings count as the same ("organise" = "organize"),
- numbers are never counted as errors ("2026" may come back as words).

On ties, the alignment prefers a match, then an extra heard word, then a dropped
word, so one dropped word does not shift every word after it.

### 6. Risk rules for each first language

`js/risk-rules.js` describes each word by sound features taken from its dictionary
pronunciation: the two "th" sounds, /w/ and /v/, /r/ and /l/, /p/, /f/, /z/, "sh"
and "ch", /h/, /æ/ and other vowels, consonant clusters, endings that can lose
their voice or get dropped, an /s/ or /t/ before an "ee" sound, silent letters,
silent "-ed" and long words where the stress can land in the wrong place.

It also lists 32 typical slips, each changing one sound: /θ/ to /t/, /w/ to /v/,
/r/ to /l/, a dropped /h/, a final consonant that loses its voice, and so on. When
a slip turns a word into another common word ("west" into "vest", "right" into
"light", "park" into "bark"), the word scores extra, and the panel shows that word
as "might be heard as". If the other word is rude, the panel only says so; the
word itself is never printed (`scripts/blocklist.mjs`).

`js/languages.js` turns this into profiles. Each first language gives points to
the features and picks the slips that are typical for its speakers: German counts
/w/ and final devoicing, Japanese counts /r/ with /l/ and /v/, Arabic counts /p/
and /v/, and so on. The tips use the same data, so a tip never claims a slip the
language does not have. Turkish keeps exactly the weights, slips and tips of the
first version.

Each profile also has its explanations in its own language (`js/native/`). They
say the same as the English tips, keep the same English example words and
often compare a sound with one the speaker already knows: Spanish /ð/ is the
soft "d" in "nada", German /v/ is the "w" in "Wasser", Hindi /z/ is "ज़". A
switch next to the language picker chooses English or the first language. It
starts on the first language when the browser asked for it or the visitor
picked it, and on English when the language is only the fallback (Turkish, for
browsers in a language that is not on the list). Arabic is shown right to left,
and every native text carries its `lang` attribute so the browser picks the
right fonts.

The weights were tuned so that every profile marks a similar share of words
(roughly 35 to 40 percent of common words reach medium, and about 10 words in the
interview answer used by `tests/browser-smoke.mjs`), instead of one language
marking half the text. A word can be
easy for one language and hard for another: "really" is high risk for Japanese
and low for Turkish.

The same files are imported by the data build script and by the app, so both use
exactly the same scores.

Your own results beat the rules: a word misheard at least twice (and in at least
40% of tries), or in the last two tries, is marked in blue as "your word". Three
correct tries in a row clear it. Function words such as "the" are never marked.

### 7. The word data is built ahead of time

`scripts/build-data.mjs` turns three free sources into compact JSON files:

| Source | Used for |
| --- | --- |
| CMU Pronouncing Dictionary | pronunciations, sound flags, IPA, homophones |
| SCOWL word lists | how common a word is |
| WordNet 3.1 | synonyms for "easier to say" |

About 50,000 common words are included. Each word is stored as one number (its
features and syllable count), plus a bit mask of the slips that turn it into
another word. Scoring a word for a language is a sum of a few weights, so
switching language re-marks a script instantly.

Alternatives must be common, clearly easier (at least one point lower for the
chosen language) and come from the word's most frequent meanings. The build keeps
each language's best four, and the app picks the ones that fit the chosen
language. For inflected words the synonym is inflected the same way ("thinking"
becomes "believing") and kept only if the result is a real word. Numbers, names,
rude words and slang are never suggested.

`lexicon.json` (scores) and `homophones.json` load first; `details.json`
(pronunciations, slips, alternatives) loads in the background. The build also
writes `js/data-version.js`, a hash of the data that the app adds to the data
URLs, so browsers never combine a new app with old cached data.

### 8. Your data stays in your browser

`js/profile.js` keeps the word list and settings in `localStorage`, with the last
10 tries per word. It survives a broken or missing store, and export and import
let you move the list to another device. The script itself is never stored:
every visit starts on the home page with an empty box.

## Limits worth knowing

- A speech model is not a person. It sometimes understands a mispronounced word
  from context, and sometimes mishears a clear one. This is why one miss is not
  enough to flag a word, and why there is "Ignore this recording".
- The pronunciations are American English (the CMU dictionary).
- A first-language profile is a summary of common tendencies. Speakers differ by
  region, by the other languages they know and by how they learned English.
- The explanations in the first languages were written with care, but not every
  language has been checked by a native speaker yet.
- Synonyms come from a dictionary, not from understanding your sentence, so the
  app asks you to check that the meaning still fits.

## Tests

- `tests/*.test.mjs` (Node's built-in test runner): text handling, alignment, the
  profile rules, the word data (including that every suggested alternative is
  really easier, in every language), the language profiles and their native
  explanations, and audio splitting.
- `tests/browser-smoke.mjs`: the whole app in headless Chrome with a fake
  microphone and a fake speech model, including switching the first language
  and the explanation language,
  plus a check that the real worker reports a clear error when the model cannot
  be downloaded.
- `tests/real-asr.mjs`: the real worker and a real Whisper model served locally,
  including a full "read the whole script" run through the fake microphone.
