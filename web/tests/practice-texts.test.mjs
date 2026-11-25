import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setData, describe } from '../site/js/lexicon.js';
import { LANGUAGES } from '../site/js/languages.js';
import { tokenize, normalizeWord } from '../site/js/text.js';
import { BLOCKED, INFORMAL } from '../scripts/blocklist.mjs';
import { PRACTICE_TEXTS, SITUATIONS } from '../site/js/practice-texts.js';

const DATA = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'site', 'data');
const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')).words;
setData({ lexicon: read('lexicon.json'), details: read('details.json'), homophones: read('homophones.json') });

const words = (text) => tokenize(text).filter((t) => t.type === 'word');

test('every practice text has a unique id, a known situation, a title and a sensible length', () => {
  const ids = new Set();
  const situations = new Set(SITUATIONS.map((s) => s.id));
  for (const t of PRACTICE_TEXTS) {
    assert.ok(!ids.has(t.id), `duplicate id ${t.id}`);
    ids.add(t.id);
    assert.ok(situations.has(t.situation), `${t.id}: unknown situation ${t.situation}`);
    assert.ok(t.title.length > 3, `${t.id}: missing title`);
    const count = words(t.text).length;
    assert.ok(count >= 40 && count <= 90, `${t.id}: ${count} words (40 to 90 read well in one go)`);
  }
});

test('every situation has at least four texts', () => {
  for (const s of SITUATIONS) {
    const count = PRACTICE_TEXTS.filter((t) => t.situation === s.id).length;
    assert.ok(count >= 4, `${s.name}: only ${count} texts`);
  }
});

test('practice texts use no rude or slang words', () => {
  for (const t of PRACTICE_TEXTS) {
    for (const w of words(t.text)) {
      const key = normalizeWord(w.text);
      assert.ok(!BLOCKED.has(key) && !INFORMAL.has(key), `${t.id}: "${w.text}"`);
    }
  }
});

test('every text gives every first language words to practise', () => {
  for (const t of PRACTICE_TEXTS) {
    // A text about one sound (r and l, say) is naturally easy for some languages.
    const minimum = t.situation === 'sounds' ? 3 : 4;
    for (const language of LANGUAGES) {
      const marked = new Set();
      for (const w of words(t.text)) {
        const info = describe(w.text, language);
        if (info && !info.stop && info.level !== 'low') marked.add(info.key);
      }
      assert.ok(marked.size >= minimum, `${t.id}: only ${marked.size} words to watch for ${language.speakers}`);
    }
  }
});
