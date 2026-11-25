import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setData, setLanguage, describe, sameWord, resolveKey } from '../site/js/lexicon.js';
import { riskScore } from '../site/js/risk-rules.js';
import { LANGUAGES, getLanguage, reasonFor } from '../site/js/languages.js';
import { FEATURE_NAMES } from '../site/js/risk-rules.js';
import { STOPWORDS } from '../site/js/stopwords.js';
import { BLOCKED, INFORMAL } from '../scripts/blocklist.mjs';

const DATA = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'site', 'data');
const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')).words;
const lexicon = read('lexicon.json');
const details = read('details.json');
setData({ lexicon, details, homophones: read('homophones.json') });
setLanguage('tr');

const heardAs = (word, code) => describe(word, getLanguage(code)).confusables.map((c) => c.word);

test('typical hard words get the expected reasons', () => {
  const cases = {
    think: ['TH'],
    west: ['W'],
    school: ['S_CLUSTER'],
    bad: ['AE', 'FINAL_VOICED'],
    wednesday: ['SPELLING'],
    worked: ['ED'],
    island: ['SPELLING'],
    months: ['FINAL_CLUSTER'],
  };
  for (const [word, flags] of Object.entries(cases)) {
    const info = describe(word);
    assert.ok(info, `${word} is in the lexicon`);
    for (const flag of flags) assert.ok(info.flags.includes(flag), `${word} has ${flag} (got ${info.flags})`);
  }
});

test('words that do not need an extra syllable are not flagged as "-ed"', () => {
  assert.ok(!describe('shed').flags.includes('ED'));
  assert.ok(!describe('wanted').flags.includes('ED'));
  assert.ok(!describe('need').flags.includes('ED'));
});

test('confusable words are found ("west" may sound like "vest")', () => {
  assert.ok(heardAs('west', 'tr').includes('vest'));
  assert.ok(heardAs('three', 'tr').includes('tree'));
  assert.ok(heardAs('bad', 'tr').includes('bed'));
  assert.equal(describe('west').confusables.find((c) => c.word === 'vest').slip, 'W_V');
});

test('words that sound the same are suggested once, and letter names never', () => {
  const words = heardAs('think', 'tr');
  assert.ok(words.includes('sink') && !words.includes('sync'), words.join());
  for (const [word, record] of Object.entries(details)) {
    for (const [hit] of record[1] ?? []) assert.ok(hit === '*' || hit.length > 1, `${word} lists "${hit}"`);
  }
});

test('high and low risk words land in different levels', () => {
  assert.equal(describe('thoroughly').level, 'high');
  assert.equal(describe('plan').level, 'low');
});

test('Turkish scores and marks match the original Turkish-only rules', () => {
  // The sample script on the first page marks these ten words for Turkish.
  const marked = ['thank', 'last', 'three', 'worked', 'including', 'something', 'actually', 'think', 'strongest', 'skills'];
  for (const word of marked) assert.notEqual(describe(word).level, 'low', word);
  assert.equal(describe('think').score, 6.5);
  assert.equal(describe('bad').score, 4.5);
  assert.equal(describe('west').score, 4);
});

test('each first language finds its own typical slips', () => {
  const cases = [
    ['ja', 'right', 'light'],
    ['ja', 'light', 'right'],
    ['ja', 'year', 'ear'],
    ['ar', 'park', 'bark'],
    ['ar', 'bit', 'bet'],
    ['es', 'ship', 'sheep'],
    ['es', 'zoo', 'sue'],
    ['de', 'west', 'vest'],
    ['de', 'bad', 'bat'],
    ['pt', 'red', 'head'],
    ['pt', 'tip', 'chip'],
    ['fr', 'hair', 'air'],
    ['hi', 'vest', 'west'],
    ['zh', 'vest', 'west'],
    ['zh', 'light', 'lie'],
    ['fr', 'hate', 'ate'],
    ['ru', 'think', 'sink'],
  ];
  for (const [code, word, expected] of cases) {
    assert.ok(heardAs(word, code).includes(expected), `${code}: ${word} -> ${expected} (got ${heardAs(word, code)})`);
  }
  // ...and not the slips of other languages.
  assert.ok(!heardAs('right', 'tr').includes('light'));
  assert.ok(!heardAs('park', 'tr').includes('bark'));
});

test('every example in the tips matches what the app shows', () => {
  // “west” → “vest”, “hair” can sound like “air”: when the second word is a real
  // word, it must be one the app lists for the first. Sound descriptions such as
  // “zero” → “jero” are not words and are skipped.
  const pair = /“([a-z]+)”\s*(?:→|can sound like|like)\s*“([a-zA-Z]+)”/g;
  let checked = 0;
  for (const profile of LANGUAGES) {
    const texts = FEATURE_NAMES.map((name) => reasonFor(profile, name).tip);
    for (const text of texts) {
      for (const [, word, heard] of text.matchAll(pair)) {
        if (!(heard.toLowerCase() in lexicon)) continue;
        assert.ok(heardAs(word, profile.code).includes(heard.toLowerCase()), `${profile.code}: “${word}” → “${heard}”`);
        checked++;
      }
    }
  }
  assert.ok(checked > 40, `checked ${checked} examples`);
});

test('explanations in the first language keep the English example words', () => {
  // If the English tip says “bad” → “bed”, the Spanish one must mention both too.
  const quoted = /“([A-Za-z]+)”/g;
  const examples = (text) => [...text.matchAll(quoted)].map((m) => m[1].toLowerCase()).filter((w) => w.length >= 3 && w in lexicon);
  let checked = 0;
  for (const profile of LANGUAGES) {
    const pairs = [];
    for (const feature of FEATURE_NAMES) {
      if (!(profile.weights[feature] > 0)) continue;
      const en = reasonFor(profile, feature);
      const native = reasonFor(profile, feature, true);
      pairs.push([`${en.title} ${en.tip}`, `${native.title} ${native.tip}`]);
    }
    for (const [en, native] of pairs) {
      for (const word of examples(en)) {
        assert.ok(native.toLowerCase().includes(word), `${profile.code}: "${word}" is kept in: ${native}`);
        checked++;
      }
    }
  }
  assert.ok(checked > 250, `checked ${checked} example words`);
});

test('the same word can be easy for one language and hard for another', () => {
  assert.equal(describe('really', getLanguage('ja')).level, 'high');
  assert.equal(describe('really', getLanguage('tr')).level, 'low');
  assert.equal(describe('hair', getLanguage('fr')).level, 'medium');
  assert.equal(describe('hair', getLanguage('tr')).level, 'low');
});

test('reasons only list features that count for the chosen language', () => {
  const ja = describe('really', getLanguage('ja'));
  assert.ok(ja.reasons.some((r) => r.flag === 'RL'));
  assert.ok(!ja.reasons.some((r) => r.flag === 'R' || r.flag === 'L'), 'the r-and-l tip replaces the separate ones');
  assert.ok(!describe('really', getLanguage('tr')).flags.includes('RL'));
});

test('rude words are never printed, only noted, and slang is never suggested', () => {
  const beach = describe('beach');
  assert.equal(beach.rude, true);
  assert.ok(!beach.confusables.some((c) => BLOCKED.has(c.word)));
  for (const [word, record] of Object.entries(details)) {
    for (const [hit] of record[1] ?? []) assert.ok(!BLOCKED.has(hit), `${word} lists "${hit}"`);
    for (const [phrase] of record[2] ?? []) {
      assert.ok(!phrase.split(' ').some((part) => BLOCKED.has(part) || INFORMAL.has(part)), `${word} suggests "${phrase}"`);
    }
  }
});

test('every alternative shown is in the lexicon and clearly easier, in every language', () => {
  const words = Object.keys(details).filter((w) => details[w][2]);
  let checked = 0;
  for (const profile of LANGUAGES) {
    for (const word of words) {
      const info = describe(word, profile);
      for (const alt of info.alternatives) {
        let score = 0;
        for (const part of alt.split(' ')) {
          if (STOPWORDS.has(part)) continue;
          assert.ok(part in lexicon, `"${part}" (for ${word}) is known`);
          score += riskScore(lexicon[part], profile);
        }
        assert.ok(score <= info.score - 1, `${profile.code}: ${alt} (${score}) is easier than ${word} (${info.score})`);
        checked++;
      }
      assert.ok(info.alternatives.length <= 4);
    }
  }
  assert.ok(checked > 20000, `checked ${checked} alternatives`);
});

test('numbers and names never get alternatives', () => {
  for (const profile of LANGUAGES) {
    assert.deepEqual(describe('three', profile).alternatives, []);
    assert.deepEqual(describe('wednesday', profile).alternatives, []);
  }
});

test('possessives and British spellings are looked up', () => {
  assert.equal(resolveKey("Company's"), 'company');
  assert.equal(resolveKey('THINK'), 'think');
  assert.ok(resolveKey('organisation'));
  assert.equal(resolveKey('constructor'), 'constructor');
  assert.equal(resolveKey('hasownproperty'), null);
});

test('homophones and spelling variants count as the same word', () => {
  assert.equal(sameWord('their', 'there'), true);
  assert.equal(sameWord('organise', 'organize'), true);
  assert.equal(sameWord('2026', 'twenty'), true);
  assert.equal(sameWord('think', 'sink'), false);
});

test('every data file fits Cloudflare Pages’ 25 MiB file limit', () => {
  for (const file of fs.readdirSync(DATA)) {
    assert.ok(fs.statSync(path.join(DATA, file)).size < 25 * 1024 * 1024, file);
  }
});
