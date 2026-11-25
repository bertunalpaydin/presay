import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, normalizeWord, words, spellingKey, expandContractions, matchCase, collapseLoops, escapeHtml } from '../site/js/text.js';

test('tokenize keeps every character and the position of each word', () => {
  const text = "I’m sure it's fine — the company's 2026 well-known plan.";
  const tokens = tokenize(text);
  assert.equal(tokens.map((t) => t.text).join(''), text);
  for (const t of tokens) assert.equal(text.slice(t.start, t.end), t.text);
  const wordTokens = tokens.filter((t) => t.type === 'word').map((t) => t.text);
  assert.deepEqual(wordTokens, ['I’m', 'sure', "it's", 'fine', 'the', "company's", '2026', 'well', 'known', 'plan']);
});

test('words are lower-cased and apostrophes straightened', () => {
  assert.equal(normalizeWord('I’M'), "i'm");
  assert.deepEqual(words('Hello, World! Don’t.'), ['hello', 'world', "don't"]);
});

test('British and American spellings share a key', () => {
  assert.equal(spellingKey('organise'), spellingKey('organize'));
  assert.equal(spellingKey('colour'), spellingKey('color'));
  assert.equal(spellingKey('centre'), spellingKey('center'));
  assert.equal(spellingKey('travelled'), spellingKey('traveled'));
  assert.notEqual(spellingKey('four'), spellingKey('for'));
});

test('contractions expand and remember their source word', () => {
  assert.deepEqual(expandContractions(["i'm", 'here']), [
    { word: 'i', from: 0 },
    { word: 'am', from: 0 },
    { word: 'here', from: 1 },
  ]);
});

test('replacement words copy the capitalisation of the original', () => {
  assert.equal(matchCase('believe', 'Think'), 'Believe');
  assert.equal(matchCase('believe', 'THINK'), 'BELIEVE');
  assert.equal(matchCase('believe', 'think'), 'believe');
});

test('runaway repetition is collapsed, normal repeats are kept', () => {
  const loop = 'ask not what your country ask not what your country ask not what your country can do'.split(' ');
  assert.deepEqual(collapseLoops(loop), 'ask not what your country can do'.split(' '));
  assert.deepEqual(collapseLoops('you you you you'.split(' ')), ['you']);
  assert.deepEqual(collapseLoops('very very good'.split(' ')), 'very very good'.split(' '));
  assert.deepEqual(collapseLoops('we tested tested tested it'.split(' ')), 'we tested tested tested it'.split(' '));
});

test('HTML is escaped', () => {
  assert.equal(escapeHtml('<b>"x" & \'y\'</b>'), '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
});
