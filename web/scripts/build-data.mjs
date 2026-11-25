#!/usr/bin/env node
// Builds the language data the app loads in the browser (site/data/*.json).
//
// Sources (all free to use; see THIRD_PARTY_NOTICES.md):
//   - CMU Pronouncing Dictionary  -> how words are pronounced (ARPAbet)
//   - WordNet 3.1                  -> synonyms
//   - SCOWL word lists             -> how common a word is
//
// Run with:  npm run build:data
// The output is committed to the repo, so the site itself needs no build step.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { dictionary as CMU } from 'cmu-pronouncing-dictionary';
import { FLAGS, SLIP, makeEntry, riskScore, MIN_SCORE_FOR_ALTERNATIVES, MIN_IMPROVEMENT } from '../site/js/risk-rules.js';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../site/js/languages.js';
import { STOPWORDS } from '../site/js/stopwords.js';
import { IRREGULAR_VERBS, IRREGULAR_NOUNS, IRREGULAR_ADJECTIVES } from './morph-data.mjs';
import { BLOCKED, INFORMAL } from './blocklist.mjs';

const require = createRequire(import.meta.url);
const wordnet = require('wordnet-db');
const wordlists = require('wordlist-english');

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(ROOT, 'site', 'data');
const VERSION_FILE = path.join(ROOT, 'site', 'js', 'data-version.js');
const FORMAT = 2; // bump when the shape of the JSON files changes

// How common a word must be (SCOWL size level; smaller = more common).
const MAX_LEVEL_LEXICON = 70; // words we know anything about
const MAX_LEVEL_SUGGEST = 50; // words we are willing to call "confusable"
const MAX_LEVEL_ALTERNATIVE = 35; // words we are willing to suggest instead
const MAX_ALTERNATIVES = 4; // per language; the app shows at most this many
const MAX_CONFUSABLES_PER_SLIP = 3; // the app shows at most three per word
const MAX_HOMOPHONES = 8;

// ---------------------------------------------------------------------------
// 1. Pronunciations (CMU dictionary)
// ---------------------------------------------------------------------------

const VOWELS = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW']);
const strip = (phone) => phone.replace(/\d/, '');
const isVowel = (phone) => VOWELS.has(strip(phone));
const keyOf = (phones) => phones.map(strip).join(' ');

/** word -> list of pronunciations, each a list of ARPAbet phones */
const pron = new Map();
for (const [rawKey, value] of Object.entries(CMU)) {
  const word = rawKey.replace(/\(\d+\)$/, '');
  if (!/^[a-z][a-z']*$/.test(word)) continue;
  if (!pron.has(word)) pron.set(word, []);
  pron.get(word).push(value.trim().split(/\s+/));
}

// ---------------------------------------------------------------------------
// 2. How common each word is (SCOWL levels 10..70)
// ---------------------------------------------------------------------------

const level = new Map();
const onlyCapitalised = new Map();
for (const [key, list] of Object.entries(wordlists)) {
  const match = key.match(/^english(?:\/(?:american|british|canadian|australian))?\/(\d+)$/);
  if (!match) continue;
  const lv = Number(match[1]);
  for (const raw of list) {
    if (!/^[A-Za-z][A-Za-z']*$/.test(raw)) continue;
    const word = raw.toLowerCase();
    if (word.endsWith("'s")) continue; // possessives; the app strips "'s" itself
    if (!level.has(word) || level.get(word) > lv) level.set(word, lv);
    const capital = raw !== word;
    const seen = onlyCapitalised.get(word);
    onlyCapitalised.set(word, seen === undefined ? capital : seen && capital);
  }
}
// The SCOWL lists in the npm package contain no proper nouns, but days, months
// and a few names come up in almost every talk or interview answer.
const PROPER_NOUNS = `
monday tuesday wednesday thursday friday saturday sunday
january february march april may june july august september october november december
england english britain british america american europe european london
turkey turkish istanbul ankara germany german france french spain spanish
italy italian china chinese japan japanese india indian canada australia
christmas easter internet google microsoft amazon apple linkedin youtube
`.split(/\s+/).filter(Boolean);
for (const word of PROPER_NOUNS) {
  if (!level.has(word)) {
    level.set(word, 20);
    onlyCapitalised.set(word, true);
  }
}

// Words that should never get "say this instead" suggestions. ("very" only
// has synonyms from rare senses, like "the very man" -> "precise".)
const NO_ALTERNATIVES = new Set([
  ...PROPER_NOUNS,
  'very',
  ...`zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen
  sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred
  thousand million billion first second third fourth fifth sixth seventh eighth ninth tenth half
  thirds fourths fifths hundreds thousands millions billions`.split(/\s+/),
]);

const isName = (word) => onlyCapitalised.get(word) === true;
const levelOf = (word) => level.get(word) ?? 99;

// British spellings are often missing from the (American) CMU dictionary.
function americanSpelling(word) {
  const candidates = [
    word.replace(/our/g, 'or'),
    word.replace(/is(e|ed|es|ing|ation|ations|er|ers)$/, 'iz$1'),
    word.replace(/ys(e|ed|es|ing)$/, 'yz$1'),
    word.replace(/tre(s?)$/, 'ter$1'),
    word.replace(/ogue(s?)$/, 'og$1'),
    word.replace(/ence(s?)$/, 'ense$1'),
    word.replace(/ll(ed|ing|er|ers)$/, 'l$1'),
    word.replace(/our/g, 'or').replace(/is(e|ed|es|ing|ation|ations)$/, 'iz$1'),
  ];
  return candidates.find((c) => c !== word && pron.has(c)) ?? null;
}

/** The vocabulary: common words we have a pronunciation for. */
const vocab = new Map();
for (const [word, lv] of level) {
  if (lv > MAX_LEVEL_LEXICON) continue;
  const prons = pron.get(word) ?? pron.get(americanSpelling(word) ?? '');
  if (prons) vocab.set(word, prons);
}

// ---------------------------------------------------------------------------
// 3. Risk features for each word
// ---------------------------------------------------------------------------

const EE = new Set(['IY', 'IH']); // "ee" sounds
const OO = new Set(['UW', 'UH']); // "oo" sounds
const FINAL_STOPS = new Set(['P', 'B', 'T', 'D', 'K', 'G', 'CH', 'JH']);

function phonemeFlags(phones) {
  const base = phones.map(strip);
  const has = (p) => base.includes(p);
  const before = (consonants, vowels) => base.some((p, i) => consonants.includes(p) && vowels.has(base[i + 1]));
  let f = 0;
  if (has('TH')) f |= FLAGS.TH;
  if (has('DH')) f |= FLAGS.DH;
  if (has('W')) f |= FLAGS.W;
  if (has('AE')) f |= FLAGS.AE;
  if (phones.some((p) => p === 'AH1' || p === 'AH2')) f |= FLAGS.STRUT;
  if (has('ER')) f |= FLAGS.ER;
  if (has('NG')) f |= FLAGS.NG;
  if (base.length >= 2 && !isVowel(phones[0]) && !isVowel(phones[1]) && base[1] !== 'Y') {
    f |= base[0] === 'S' ? FLAGS.S_CLUSTER : FLAGS.CLUSTER;
  }
  if (['B', 'D', 'G', 'V', 'Z', 'ZH', 'DH', 'JH'].includes(base[base.length - 1])) f |= FLAGS.FINAL_VOICED;
  let trailing = 0;
  for (let i = phones.length - 1; i >= 0 && !isVowel(phones[i]); i--) trailing++;
  if (trailing >= 3) f |= FLAGS.FINAL_CLUSTER;
  if (phones.some((p) => p === 'IH1' || p === 'IH2')) f |= FLAGS.SHORT_I;
  if (has('UH')) f |= FLAGS.SHORT_U;
  if (has('R')) f |= FLAGS.R;
  if (has('L')) f |= FLAGS.L;
  if (has('V')) f |= FLAGS.V;
  if (has('P')) f |= FLAGS.P;
  if (has('F')) f |= FLAGS.F;
  if (base.slice(0, -1).includes('Z')) f |= FLAGS.Z; // a final /z/ is FINAL_VOICED
  if (has('SH')) f |= FLAGS.SH;
  if (has('CH')) f |= FLAGS.CH;
  if (has('HH')) f |= FLAGS.H;
  if (before(['Y'], EE)) f |= FLAGS.YI;
  if (before(['W'], OO)) f |= FLAGS.WU;
  if (before(['S'], EE)) f |= FLAGS.S_I;
  if (before(['T', 'D'], EE)) f |= FLAGS.T_I;
  if (FINAL_STOPS.has(base[base.length - 1])) f |= FLAGS.FINAL_STOP;
  return f;
}

// True when `stem` sounds exactly like `phones` without its last sound.
function isStemOf(phones, stem) {
  if (stem.length !== phones.length - 1) return false;
  return stem.every((p, i) => strip(p) === strip(phones[i]));
}

// "-ed" that adds no syllable, on a real stem: worked, played, used, stopped.
function hasSilentEd(word, phones) {
  if (word.length < 5 || !word.endsWith('ed') || word.endsWith('ied') || word.endsWith('eed')) return false;
  const last = strip(phones[phones.length - 1]);
  if (last !== 'T' && last !== 'D') return false;
  const prev = phones[phones.length - 2];
  if (!prev || prev === 'AH0' || prev === 'IH0') return false; // "wanted": syllable expected
  const stems = [word.slice(0, -2), word.slice(0, -1)];
  if (/([b-df-hj-np-tv-z])\1ed$/.test(word)) stems.push(word.slice(0, -3));
  return stems.some((stem) => stem.length >= 3 && (pron.get(stem) ?? []).some((p) => isStemOf(phones, p)));
}

function orthographicConsonants(word) {
  let w = word.replace(/'/g, '');
  w = w
    .replace(/tch/g, 'C')
    .replace(/dge/g, 'J')
    .replace(/ck/g, 'K')
    .replace(/ph/g, 'F')
    .replace(/sh/g, 'S')
    .replace(/ch/g, 'C')
    .replace(/th/g, 'T')
    .replace(/wh/g, 'W')
    .replace(/gh/g, 'G')
    .replace(/ng/g, 'N')
    .replace(/qu/g, 'KW')
    .replace(/x/g, 'KS')
    .replace(/([bcdfgjklmnprstvz])\1/g, '$1');
  let count = 0;
  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    if (ch >= 'A' && ch <= 'Z') count += 1;
    else if ('aeiou'.includes(ch)) continue;
    else if (ch === 'y') count += i === 0 ? 1 : 0;
    else if (ch === 'w' && i > 0 && 'aeiou'.includes(w[i - 1])) continue;
    else count += 1;
  }
  return count;
}

function phonemeConsonants(phones) {
  // An r-coloured vowel (ER) also accounts for a written "r".
  return phones.filter((p) => !isVowel(p) || strip(p) === 'ER').length;
}

function vowelGroups(word) {
  const w = word.replace(/'/g, '');
  let groups = 0;
  let inVowel = false;
  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    const vowel = 'aeiou'.includes(ch) || (ch === 'y' && i > 0);
    if (vowel && !inVowel) groups++;
    inVowel = vowel;
  }
  return groups;
}

// "homework", "someone": a silent e at the end of the first part.
function isCompoundWithSilentE(word) {
  const common = (w) => pron.has(w) && levelOf(w) <= MAX_LEVEL_ALTERNATIVE;
  for (let i = 3; i <= word.length - 3; i++) {
    const left = word.slice(0, i);
    const right = word.slice(i);
    if (left.endsWith('e') && common(left) && common(right)) return true;
  }
  return false;
}

// Silent letters, or fewer syllables than the spelling suggests.
function spellingMismatch(word, phones, silentEd) {
  if (orthographicConsonants(word) - phonemeConsonants(phones) >= 1) return true;
  let groups = vowelGroups(word);
  const syllables = phones.filter(isVowel).length;
  if (/[^aeiou]e$/.test(word) && !/[^aeiouy]le$/.test(word) && word.length > 2) groups -= 1;
  if (/[^aeiou]es$/.test(word) && word.length > 3) {
    const prev = phones[phones.length - 2];
    if (prev && !isVowel(prev)) groups -= 1;
  }
  if (/[^aeiou]e(ly|ment|ments|ful|fully|less|ness)$/.test(word)) groups -= 1;
  if (silentEd) groups -= 1;
  if (isCompoundWithSilentE(word)) groups -= 1;
  return groups - syllables >= 1;
}

function featureFlags(word, phones) {
  let f = phonemeFlags(phones);
  const silentEd = hasSilentEd(word, phones);
  if (silentEd) f |= FLAGS.ED;
  if (spellingMismatch(word, phones, silentEd)) f |= FLAGS.SPELLING;
  return f;
}

// ---------------------------------------------------------------------------
// 4. Confusable words ("west" may be heard as "vest") and homophones
// ---------------------------------------------------------------------------

function indexByPronunciation(maxLevel) {
  const map = new Map();
  for (const [word, prons] of vocab) {
    if (levelOf(word) > maxLevel || isName(word)) continue;
    for (const phones of prons) {
      const key = keyOf(phones);
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(word);
    }
  }
  return map;
}

const commonByPron = indexByPronunciation(MAX_LEVEL_SUGGEST);
const allByPron = indexByPronunciation(MAX_LEVEL_LEXICON);

// One-sound slips (see SLIPS in risk-rules.js). Which of them matter depends on
// the speaker's first language; the data stores all of them.
const SUBSTITUTIONS = [
  ['TH_T', 'TH', 'T'], ['TH_S', 'TH', 'S'], ['TH_F', 'TH', 'F'], ['DH_D', 'DH', 'D'], ['DH_Z', 'DH', 'Z'],
  ['W_V', 'W', 'V'], ['V_W', 'V', 'W'], ['V_B', 'V', 'B'], ['V_F', 'V', 'F'], ['P_B', 'P', 'B'], ['F_P', 'F', 'P'],
  ['L_R', 'L', 'R'], ['R_L', 'R', 'L'], ['AE_EH', 'AE', 'EH'], ['IH_IY', 'IH', 'IY'], ['IY_IH', 'IY', 'IH'],
  ['IH_EH', 'IH', 'EH'], ['UH_UW', 'UH', 'UW'], ['SH_CH', 'SH', 'CH'], ['CH_SH', 'CH', 'SH'],
  ['Z_S', 'Z', 'S'], ['Z_JH', 'Z', 'JH'],
];
const DEVOICE = { B: 'P', D: 'T', G: 'K', V: 'F', Z: 'S', ZH: 'SH', JH: 'CH', DH: 'TH' };
const DROPPABLE_END = new Set(['P', 'B', 'T', 'D', 'K', 'G']);
const BACK_ROUNDED = new Set(['UW', 'UH', 'OW']);

/** Every pronunciation one slip can produce, as [slip name, phones]. */
function slipVariants(phones) {
  const base = phones.map(strip);
  const out = [];
  const replace = (i, sound, rule) => {
    const changed = base.slice();
    changed[i] = sound;
    out.push([rule, changed]);
  };
  const remove = (i, rule) => {
    const changed = base.slice();
    changed.splice(i, 1);
    if (changed.length) out.push([rule, changed]);
  };
  base.forEach((phone, i) => {
    const next = base[i + 1];
    for (const [rule, from, to] of SUBSTITUTIONS) if (phone === from) replace(i, to, rule);
    if (phone === 'F' && BACK_ROUNDED.has(next)) replace(i, 'HH', 'F_H');
    if (phone === 'R' && i === 0) replace(i, 'HH', 'R_H');
    if (phone === 'HH') remove(i, 'H_DROP');
    if (phone === 'AH' && /[12]$/.test(phones[i])) replace(i, 'AA', 'STRUT_AA');
    if (phone === 'Y' && EE.has(next)) remove(i, 'YI_I');
    if (phone === 'S' && EE.has(next)) replace(i, 'SH', 'SI_SHI');
    if (phone === 'T' && EE.has(next)) replace(i, 'CH', 'TI_CHI');
    if (phone === 'D' && EE.has(next)) replace(i, 'JH', 'TI_CHI');
  });
  const last = base.length - 1;
  if (DEVOICE[base[last]]) replace(last, DEVOICE[base[last]], 'DEVOICE');
  if (DROPPABLE_END.has(base[last]) && base.length > 2) remove(last, 'FINAL_DROP');
  return out;
}

// Most common first; between equally common spellings of one sound, the shorter
// one ("lily" before "lilly").
const byCommonness = (a, b) => levelOf(a) - levelOf(b) || a.length - b.length || a.localeCompare(b);

// "worked"/"work", "used"/"use", "stopped"/"stop", "learnt"/"learn"
function isPastOf(word, stem) {
  return [stem + 'ed', stem + 'd', stem + 't', stem + stem[stem.length - 1] + 'ed'].includes(word);
}

/**
 * Common words a slip turns this word into.
 * @returns {{slips: number, list: Array<[string, number]>}} slips is a bit mask
 *   of SLIP indices; list holds [word, slip] pairs, most common first, with
 *   "*" standing for a rude word that is never printed.
 */
function confusablesOf(word) {
  const selfKeys = new Set(vocab.get(word).map(keyOf));
  const bySlip = new Map(); // slip -> the most common word for each pronunciation it produces
  const rude = new Set();
  let slips = 0;
  for (const [rule, variant] of slipVariants(vocab.get(word)[0])) {
    const key = variant.join(' ');
    if (selfKeys.has(key)) continue;
    const hits = [...(commonByPron.get(key) ?? [])].filter(
      (hit) =>
        hit !== word &&
        hit.length > 1 && // letter names: "c" sounds like "see"
        !STOPWORDS.has(hit) &&
        !hit.includes("'") &&
        // "worked" -> "work" is the "-ed" feature, not a different word.
        !(rule === 'FINAL_DROP' && isPastOf(word, hit)),
    );
    if (!hits.length) continue;
    slips |= 1 << SLIP[rule];
    if (hits.some((hit) => BLOCKED.has(hit))) rude.add(SLIP[rule]);
    // Words that sound the same ("sink", "sync") are one suggestion.
    const best = hits.filter((hit) => !BLOCKED.has(hit)).sort(byCommonness)[0];
    if (best) {
      if (!bySlip.has(rule)) bySlip.set(rule, new Set());
      bySlip.get(rule).add(best);
    }
  }
  // Keep the most common hits of every slip, so each language can still find
  // its own three most common ones.
  const list = [];
  for (const [rule, hits] of bySlip) {
    for (const hit of [...hits].sort(byCommonness).slice(0, MAX_CONFUSABLES_PER_SLIP)) list.push([hit, SLIP[rule]]);
  }
  list.sort((a, b) => byCommonness(a[0], b[0]) || a[1] - b[1]);
  for (const slip of [...rude].sort((a, b) => a - b)) list.push(['*', slip]);
  return { slips: slips >>> 0, list };
}

function homophonesOf(word) {
  const found = new Set();
  for (const phones of vocab.get(word)) {
    for (const hit of allByPron.get(keyOf(phones)) ?? []) if (hit !== word) found.add(hit);
  }
  return [...found].sort(byCommonness).slice(0, MAX_HOMOPHONES);
}

// ---------------------------------------------------------------------------
// 5. Lexicon entries
// ---------------------------------------------------------------------------

const entries = new Map();
const confusables = new Map();
for (const [word, prons] of vocab) {
  const phones = prons[0];
  const { slips, list } = isName(word) ? { slips: 0, list: [] } : confusablesOf(word);
  if (list.length) confusables.set(word, list);
  const syllables = phones.filter(isVowel).length;
  entries.set(word, makeEntry(featureFlags(word, phones), syllables, slips));
}

// Every word's score for every language, computed once.
const scoreTable = new Map();
for (const [word, entry] of entries) scoreTable.set(word, Float64Array.from(LANGUAGES, (profile) => riskScore(entry, profile)));
const scoreOf = (word, lang) => scoreTable.get(word)?.[lang] ?? Infinity;
// Only used to order the stored alternatives; the app sorts them per language.
const ORDER_BY = LANGUAGES.findIndex((profile) => profile.code === DEFAULT_LANGUAGE);

// ---------------------------------------------------------------------------
// 6. WordNet: synonyms
// ---------------------------------------------------------------------------

const POS_FILES = { n: 'noun', v: 'verb', a: 'adj', r: 'adv' };
const wnIndex = new Map(); // "pos:lemma" -> { offsets, tagged }
const wnSynsets = new Map(); // "pos:offset" -> lemmas
const wnSimilar = new Map(); // "a:offset" -> offsets of "similar to" adjective synsets

for (const [pos, name] of Object.entries(POS_FILES)) {
  const index = fs.readFileSync(path.join(wordnet.path, `index.${name}`), 'utf8');
  for (const line of index.split('\n')) {
    if (!line || line.startsWith(' ')) continue; // licence header lines start with spaces
    const parts = line.trim().split(/\s+/);
    const synsetCount = Number(parts[2]);
    const pointerCount = Number(parts[3]);
    const tagged = Number(parts[5 + pointerCount]);
    const offsets = parts.slice(6 + pointerCount, 6 + pointerCount + synsetCount);
    wnIndex.set(`${pos}:${parts[0]}`, { offsets, tagged });
  }
  const data = fs.readFileSync(path.join(wordnet.path, `data.${name}`), 'utf8');
  for (const line of data.split('\n')) {
    if (!line || line.startsWith(' ')) continue;
    const parts = line.split(' ');
    const wordCount = parseInt(parts[3], 16);
    const lemmas = [];
    for (let i = 0; i < wordCount; i++) lemmas.push(parts[4 + i * 2].replace(/\([a-z]+\)$/, ''));
    wnSynsets.set(`${pos}:${parts[0]}`, lemmas);
    if (pos === 'a') {
      let i = 4 + wordCount * 2;
      const pointerCount = Number(parts[i++]);
      const similar = [];
      for (let k = 0; k < pointerCount; k++, i += 4) {
        if (parts[i] === '&') similar.push(parts[i + 1]);
      }
      if (similar.length) wnSimilar.set(`a:${parts[0]}`, similar);
    }
  }
}
const inWordNet = (lemma, pos) => wnIndex.has(`${pos}:${lemma}`);

// How often each lemma is used as each part of speech (SemCor tag counts), so
// "experience" is treated as a noun before a verb.
const SENSE_POS = { 1: 'n', 2: 'v', 3: 'a', 4: 'r', 5: 'a' };
const usage = new Map(); // "pos:lemma" -> tag count
for (const line of fs.readFileSync(path.join(wordnet.path, 'index.sense'), 'utf8').split('\n')) {
  if (!line) continue;
  const [senseKey, , , tagCount] = line.split(' ');
  const [lemma, rest] = senseKey.split('%');
  const pos = SENSE_POS[rest?.[0]];
  if (!pos) continue;
  const key = `${pos}:${lemma}`;
  usage.set(key, (usage.get(key) ?? 0) + Number(tagCount));
}
const usageOf = (lemma, pos) => usage.get(`${pos}:${lemma}`) ?? 0;

// ---------------------------------------------------------------------------
// 7. Morphology: inflected word <-> base form
// ---------------------------------------------------------------------------

const irregular = { past: new Map(), participle: new Map(), plural: new Map(), comparative: new Map(), superlative: new Map() };
const irregularForms = new Map(); // "pos:base" -> { past, participle, plural, comparative, superlative }
const addIrregular = (form, inflected, base, pos) => {
  if (!irregular[form].has(inflected)) irregular[form].set(inflected, []);
  irregular[form].get(inflected).push({ base, pos });
};
for (const { base, past, participle } of IRREGULAR_VERBS) {
  addIrregular('past', past, base, 'v');
  addIrregular('participle', participle, base, 'v');
  irregularForms.set(`v:${base}`, { past, participle, third: null });
}
for (const { singular, plural } of IRREGULAR_NOUNS) {
  addIrregular('plural', plural, singular, 'n');
  irregularForms.set(`n:${singular}`, { plural });
}
for (const { base, comparative, superlative } of IRREGULAR_ADJECTIVES) {
  addIrregular('comparative', comparative, base, 'a');
  addIrregular('superlative', superlative, base, 'a');
  irregularForms.set(`a:${base}`, { comparative, superlative });
}

const CONSONANT = '[b-df-hj-np-tv-z]';
const doubledEnding = new RegExp(`(${CONSONANT})\\1$`);

/** Possible (base form, part of speech, inflection) readings of a word. */
function analyses(word) {
  const out = [];
  const seen = new Set();
  const add = (lemma, pos, form) => {
    const key = `${lemma}|${pos}|${form}`;
    if (lemma && !seen.has(key) && inWordNet(lemma, pos)) {
      seen.add(key);
      out.push({ lemma, pos, form });
    }
  };
  for (const pos of ['v', 'a', 'n', 'r']) add(word, pos, 'base');
  for (const form of ['past', 'participle', 'plural', 'comparative', 'superlative']) {
    for (const { base, pos } of irregular[form].get(word) ?? []) add(base, pos, form);
  }
  const stem = (n) => word.slice(0, -n);
  const undouble = (s) => (doubledEnding.test(s) ? s.slice(0, -1) : null);
  if (word.endsWith('ies')) {
    add(stem(3) + 'y', 'n', 'plural');
    add(stem(3) + 'y', 'v', 'third');
  }
  if (word.endsWith('ves')) {
    add(stem(3) + 'f', 'n', 'plural');
    add(stem(3) + 'fe', 'n', 'plural');
  }
  if (/(s|x|z|ch|sh)es$/.test(word)) {
    add(stem(2), 'n', 'plural');
    add(stem(2), 'v', 'third');
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    add(stem(1), 'n', 'plural');
    add(stem(1), 'v', 'third');
  }
  if (word.endsWith('ied')) add(stem(3) + 'y', 'v', 'past');
  if (word.endsWith('ed')) {
    add(stem(2), 'v', 'past');
    add(stem(1), 'v', 'past');
    add(undouble(stem(2)), 'v', 'past');
  }
  if (word.endsWith('ying')) add(stem(4) + 'ie', 'v', 'ing');
  if (word.endsWith('ing')) {
    add(stem(3), 'v', 'ing');
    add(stem(3) + 'e', 'v', 'ing');
    add(undouble(stem(3)), 'v', 'ing');
  }
  if (word.endsWith('ier')) add(stem(3) + 'y', 'a', 'comparative');
  if (word.endsWith('iest')) add(stem(4) + 'y', 'a', 'superlative');
  if (word.endsWith('er')) {
    add(stem(2), 'a', 'comparative');
    add(stem(1), 'a', 'comparative');
    add(undouble(stem(2)), 'a', 'comparative');
  }
  if (word.endsWith('est')) {
    add(stem(3), 'a', 'superlative');
    add(stem(2), 'a', 'superlative');
    add(undouble(stem(3)), 'a', 'superlative');
  }
  // Most frequent reading first ("experience" as a noun before the verb).
  return out.sort((a, b) => usageOf(b.lemma, b.pos) - usageOf(a.lemma, a.pos));
}

const isKnownWord = (w) => pron.has(w) && levelOf(w) <= MAX_LEVEL_LEXICON;

function inflectWord(word, pos, form) {
  if (form === 'base') return [word];
  const irr = irregularForms.get(`${pos}:${word}`);
  const cands = [];
  const shortCVC = new RegExp(`^${CONSONANT}*[aeiou]${CONSONANT}$`).test(word) && !/[wxy]$/.test(word);
  const lastLetter = word[word.length - 1];
  if (form === 'plural' || form === 'third') {
    if (form === 'plural' && irr?.plural) return [irr.plural];
    if (/(s|x|z|ch|sh)$/.test(word)) cands.push(word + 'es');
    else if (new RegExp(`${CONSONANT}y$`).test(word)) cands.push(word.slice(0, -1) + 'ies');
    else cands.push(word + 's');
  } else if (form === 'past' || form === 'participle') {
    if (irr?.past) {
      // Only use an irregular verb when past and participle agree, because a
      // regular "-ed" word does not tell us which one was meant.
      return irr.past === irr.participle ? [irr.past] : [];
    }
    if (word.endsWith('e')) cands.push(word + 'd');
    else if (new RegExp(`${CONSONANT}y$`).test(word)) cands.push(word.slice(0, -1) + 'ied');
    else {
      if (shortCVC) cands.push(word + lastLetter + 'ed');
      cands.push(word + 'ed');
    }
  } else if (form === 'ing') {
    if (word.endsWith('ie')) cands.push(word.slice(0, -2) + 'ying');
    else if (word.endsWith('e') && !/(ee|ye|oe)$/.test(word)) cands.push(word.slice(0, -1) + 'ing');
    else {
      if (shortCVC) cands.push(word + lastLetter + 'ing');
      cands.push(word + 'ing');
    }
  } else if (form === 'comparative' || form === 'superlative') {
    if (irr?.[form]) return [irr[form]];
    const suffix = form === 'comparative' ? 'er' : 'est';
    if (word.endsWith('e')) cands.push(word + suffix.slice(1));
    else if (new RegExp(`${CONSONANT}y$`).test(word)) cands.push(word.slice(0, -1) + 'i' + suffix);
    else {
      if (shortCVC) cands.push(word + lastLetter + suffix);
      cands.push(word + suffix);
    }
  }
  return cands.filter(isKnownWord);
}

/** Inflect a (possibly multi-word) WordNet lemma like "look_into". */
function inflectLemma(lemma, pos, form) {
  const parts = lemma.split('_');
  const headIndex = pos === 'v' ? 0 : parts.length - 1;
  const heads = inflectWord(parts[headIndex], pos, form);
  return heads.map((head) => {
    const copy = parts.slice();
    copy[headIndex] = head;
    return copy.join(' ');
  });
}

// ---------------------------------------------------------------------------
// 8. Easier alternatives for risky words
// ---------------------------------------------------------------------------

// The same sum the app uses at run time (lexicon.js): function words are free.
function phraseScore(phrase, lang) {
  let total = 0;
  for (const part of phrase.split(' ')) {
    if (STOPWORDS.has(part)) continue;
    if (!entries.has(part)) return Infinity;
    total += scoreOf(part, lang);
  }
  return total;
}

function phraseLevel(phrase) {
  return Math.max(...phrase.split(' ').map((part) => (STOPWORDS.has(part) ? 0 : levelOf(part))));
}

const commonnessBucket = (lv) => (lv <= 10 ? 0 : lv <= 20 ? 1 : 2);

function sharesRoot(a, b) {
  const n = Math.min(4, a.length, b.length);
  return a.slice(0, n) === b.slice(0, n);
}

/** Synonym lemmas for one sense, plus "similar" adjectives for adjective senses. */
function senseLemmas(pos, offset, senseRank) {
  const out = (wnSynsets.get(`${pos}:${offset}`) ?? []).map((lemma) => ({ lemma, rank: senseRank }));
  if (pos === 'a') {
    for (const similar of (wnSimilar.get(`a:${offset}`) ?? []).slice(0, 6)) {
      for (const lemma of wnSynsets.get(`a:${similar}`) ?? []) out.push({ lemma, rank: senseRank + 0.5 });
    }
  }
  return out;
}

/**
 * Easier synonyms for a word, for every language at once.
 * @returns {Array<[string, number]>} [phrase, rank] pairs. A lower rank means a
 *   closer meaning and a more common word. The app keeps the phrases that are
 *   easier for the chosen language and orders them by rank, then score.
 */
function alternativesOf(word) {
  if (isName(word) || STOPWORDS.has(word) || NO_ALTERNATIVES.has(word)) return [];
  const own = LANGUAGES.map((_, lang) => scoreOf(word, lang));
  if (!own.some((score) => score >= MIN_SCORE_FOR_ALTERNATIVES)) return [];
  const homophones = new Set(homophonesOf(word));
  const readings = analyses(word);
  const ownLemmas = [word, ...readings.map((r) => r.lemma)];
  const found = []; // candidates in the order WordNet gives them

  readings.forEach((reading, readingRank) => {
    const info = wnIndex.get(`${reading.pos}:${reading.lemma}`);
    const senseLimit = Math.max(1, Math.min(3, info.tagged || 1));
    info.offsets.slice(0, senseLimit).forEach((offset, senseRank) => {
      for (const { lemma, rank: meaningRank } of senseLemmas(reading.pos, offset, senseRank)) {
        const plain = lemma.toLowerCase();
        if (lemma !== plain) continue; // proper nouns
        const parts = plain.split('_');
        if (parts.length > 2 || (parts.length === 2 && reading.pos !== 'v')) continue; // phrasal verbs only
        if (ownLemmas.some((own) => sharesRoot(parts[0], own))) continue; // "badly" for "bad"
        for (const phrase of inflectLemma(plain, reading.pos, reading.form)) {
          if (phrase === word || homophones.has(phrase) || phrase.includes("'")) continue;
          if (STOPWORDS.has(phrase)) continue; // "had" is not a useful stand-in for "accepted"
          if (phrase.split(' ').some((part) => BLOCKED.has(part) || INFORMAL.has(part))) continue;
          if (phraseScore(phrase, ORDER_BY) === Infinity) continue;
          const lv = phraseLevel(phrase);
          if (lv > MAX_LEVEL_ALTERNATIVE) continue;
          // Same sound = same suggestion ("marvellous" / "marvelous", "cosy" / "cozy").
          const key = phrase
            .split(' ')
            .map((part) => (vocab.has(part) ? keyOf(vocab.get(part)[0]) : part))
            .join(' | ');
          const rank = Math.round(((readingRank === 0 ? 0 : 0.5) + meaningRank + 0.6 * commonnessBucket(lv)) * 10);
          found.push({ phrase, key, rank, words: parts.length });
        }
      }
    });
  });

  // Each language's own best few, chosen exactly as the app chooses them.
  const chosen = new Map();
  own.forEach((ownScore, lang) => {
    if (ownScore < MIN_SCORE_FOR_ALTERNATIVES) return;
    const bySound = new Map();
    for (const candidate of found) {
      const score = phraseScore(candidate.phrase, lang);
      if (!(score <= ownScore - MIN_IMPROVEMENT)) continue;
      const order = [candidate.rank, score, candidate.words];
      const prev = bySound.get(candidate.key);
      if (!prev || compareRanks(order, prev.order) < 0) bySound.set(candidate.key, { ...candidate, order });
    }
    [...bySound.values()]
      .sort((a, b) => compareRanks(a.order, b.order))
      .slice(0, MAX_ALTERNATIVES)
      .forEach((c) => chosen.set(c.phrase, c.rank));
  });

  return [...chosen]
    .sort((a, b) => a[1] - b[1] || phraseScore(a[0], ORDER_BY) - phraseScore(b[0], ORDER_BY))
    .map(([phrase, rank]) => [phrase, rank]);
}

function compareRanks(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

// ---------------------------------------------------------------------------
// 9. IPA for display
// ---------------------------------------------------------------------------

const IPA = {
  AA: 'ɑ', AE: 'æ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', EH: 'ɛ', EY: 'eɪ', IH: 'ɪ', IY: 'i', OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'u',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p',
  R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};
const LEGAL_ONSETS = new Set([
  'P L', 'P R', 'B L', 'B R', 'T R', 'D R', 'K L', 'K R', 'G L', 'G R', 'F L', 'F R', 'TH R', 'SH R',
  'S P', 'S T', 'S K', 'S M', 'S N', 'S L', 'S W', 'S F', 'T W', 'D W', 'K W', 'G W', 'TH W',
  'S P L', 'S P R', 'S T R', 'S K R', 'S K W', 'P Y', 'B Y', 'F Y', 'V Y', 'M Y', 'K Y', 'G Y', 'HH Y', 'S K Y',
]);

function vowelIpa(phone) {
  const base = strip(phone);
  const stress = phone.slice(-1);
  if (base === 'AH') return stress === '0' ? 'ə' : 'ʌ';
  if (base === 'ER') return stress === '0' ? 'ɚ' : 'ɝ';
  return IPA[base];
}

function toIpa(phones) {
  const vowelAt = phones.map(isVowel);
  const starts = new Set();
  let prevVowel = -1;
  phones.forEach((phone, i) => {
    if (!vowelAt[i]) return;
    if (prevVowel === -1) {
      starts.add(0);
    } else {
      const between = phones.slice(prevVowel + 1, i).map(strip);
      let onset = 0;
      for (let n = Math.min(3, between.length); n >= 1; n--) {
        const tail = between.slice(between.length - n);
        if (n === 1 ? tail[0] !== 'NG' : LEGAL_ONSETS.has(tail.join(' '))) {
          onset = n;
          break;
        }
      }
      starts.add(i - onset);
    }
    prevVowel = i;
  });
  let out = '';
  const syllableStress = new Map();
  let current = 0;
  phones.forEach((phone, i) => {
    if (starts.has(i)) current = i;
    if (vowelAt[i]) syllableStress.set(current, phone.slice(-1));
  });
  phones.forEach((phone, i) => {
    if (starts.has(i)) {
      const stress = syllableStress.get(i);
      if (stress === '1' && phones.filter(isVowel).length > 1) out += 'ˈ';
      else if (stress === '2') out += 'ˌ';
    }
    out += vowelAt[i] ? vowelIpa(phone) : IPA[strip(phone)];
  });
  return out;
}

// ---------------------------------------------------------------------------
// 10. Write the files
// ---------------------------------------------------------------------------

const sortedWords = [...entries.keys()].sort();
const lexicon = {};
const details = {};
const homophones = {};
let withAlternatives = 0;

for (const word of sortedWords) {
  lexicon[word] = entries.get(word);
  const record = [toIpa(vocab.get(word)[0])];
  const conf = confusables.get(word) ?? [];
  const alts = alternativesOf(word);
  if (alts.length) withAlternatives++;
  if (conf.length || alts.length) record.push(conf);
  if (alts.length) record.push(alts);
  details[word] = record;
  const homs = homophonesOf(word);
  if (homs.length) homophones[word] = homs;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const hash = crypto.createHash('sha256');
const write = (name, value) => {
  const file = path.join(OUT_DIR, name);
  const text = JSON.stringify(value);
  fs.writeFileSync(file, text);
  if (name !== 'meta.json') hash.update(text);
  return `${name} ${(fs.statSync(file).size / 1024).toFixed(0)} KB`;
};

const sizes = [
  write('lexicon.json', { version: FORMAT, words: lexicon }),
  write('details.json', { version: FORMAT, words: details }),
  write('homophones.json', { version: FORMAT, words: homophones }),
];
const meta = {
  version: FORMAT,
  builtAt: new Date().toISOString().slice(0, 10),
  words: sortedWords.length,
  languages: LANGUAGES.length,
  withConfusables: confusables.size,
  withAlternatives,
  withHomophones: Object.keys(homophones).length,
  sources: ['CMU Pronouncing Dictionary', 'WordNet 3.1 (Princeton University)', 'SCOWL (Kevin Atkinson)'],
};
sizes.push(write('meta.json', meta));

// The app adds this to the data URLs, so browsers never mix a new app with old
// cached data (site/_headers lets browsers cache data files for a day).
const version = hash.digest('hex').slice(0, 10);
fs.writeFileSync(
  VERSION_FILE,
  `// Generated by scripts/build-data.mjs. Do not edit.\nexport const DATA_FORMAT = ${FORMAT};\nexport const DATA_VERSION = '${version}';\n`,
);

console.log(`Words: ${meta.words}, confusables: ${meta.withConfusables}, alternatives: ${withAlternatives}, homophones: ${meta.withHomophones}`);
console.log(sizes.join('\n'));
console.log(`site/js/data-version.js ${version}`);
