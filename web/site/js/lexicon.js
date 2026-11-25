// Loads the language data built by scripts/build-data.mjs and answers
// questions about single words, for the chosen first language.

import { riskScore, levelOf, featureNames, syllablesOf, weightOf, SLIPS, MIN_SCORE_FOR_ALTERNATIVES, MIN_IMPROVEMENT } from './risk-rules.js';
import { getLanguage, reasonFor, DEFAULT_LANGUAGE } from './languages.js';
import { STOPWORDS } from './stopwords.js';
import { normalizeWord, spellingKey, isNumber } from './text.js';
import { DATA_FORMAT, DATA_VERSION } from './data-version.js';

const MAX_CONFUSABLES = 3;
const MAX_ALTERNATIVES = 4;

// The version in the URL makes browsers fetch new data after every rebuild.
const dataUrl = (name) => new URL(`../data/${name}?v=${DATA_VERSION}`, import.meta.url);

let lexicon = null; // word -> packed entry
let details = null; // word -> [ipa, slips?, alternatives?]
let homophones = null; // word -> [words that sound the same]
let detailsPromise = null;
let language = getLanguage(DEFAULT_LANGUAGE);

async function fetchJson(name) {
  const response = await fetch(dataUrl(name));
  if (!response.ok) throw new Error(`Could not load ${name} (HTTP ${response.status}).`);
  const json = await response.json();
  if (json.version !== DATA_FORMAT) throw new Error(`${name} is out of date. Reload the page.`);
  return json.words;
}

/** Load the data needed to mark a script. Details load in the background. */
export async function loadLexicon() {
  if (!lexicon) {
    [lexicon, homophones] = await Promise.all([fetchJson('lexicon.json'), fetchJson('homophones.json')]);
  }
  loadDetails();
  return lexicon;
}

export function loadDetails() {
  detailsPromise ??= fetchJson('details.json').then((d) => (details = d));
  return detailsPromise;
}

export function metaUrl() {
  return dataUrl('meta.json');
}

/** Use already-parsed data (tests). */
export function setData(data) {
  lexicon = data.lexicon;
  details = data.details ?? null;
  homophones = data.homophones ?? {};
  detailsPromise = Promise.resolve(details);
}

export const isLoaded = () => lexicon !== null;
export const detailsLoaded = () => details !== null;

/** Choose the first-language profile used by describe(). */
export function setLanguage(code) {
  language = getLanguage(code);
  return language;
}

export const currentLanguage = () => language;

const known = (word) => Object.hasOwn(lexicon, word);

/** Find the dictionary form of a word as written ("Company's" -> "company"). */
export function resolveKey(raw) {
  if (!lexicon) return null;
  const word = normalizeWord(raw);
  if (known(word)) return word;
  for (const candidate of [word.replace(/'s$/, ''), word.replace(/s'$/, 's'), word.replace(/'$/, ''), spellingKey(word)]) {
    if (candidate !== word && known(candidate)) return candidate;
  }
  return null;
}

// Same sum as scripts/build-data.mjs: function words are free.
function phraseScore(phrase, profile) {
  let total = 0;
  for (const part of phrase.split(' ')) {
    if (STOPWORDS.has(part)) continue;
    if (!known(part)) return Infinity;
    total += riskScore(lexicon[part], profile);
  }
  return total;
}

function confusablesFor(list, profile) {
  const words = [];
  let rude = false;
  for (const [word, slip] of list) {
    if ((profile.slipMask & (1 << slip)) === 0) continue;
    if (word === '*') rude = true;
    else if (words.length < MAX_CONFUSABLES && !words.some((c) => c.word === word)) words.push({ word, slip: SLIPS[slip] });
  }
  return { words, rude };
}

function alternativesFor(list, own, profile) {
  if (own < MIN_SCORE_FOR_ALTERNATIVES) return [];
  return list
    .map(([phrase, rank], index) => ({ phrase, rank, index, score: phraseScore(phrase, profile), words: phrase.split(' ').length }))
    .filter((c) => c.score <= own - MIN_IMPROVEMENT)
    .sort((a, b) => a.rank - b.rank || a.score - b.score || a.words - b.words || a.index - b.index)
    .slice(0, MAX_ALTERNATIVES)
    .map((c) => c.phrase);
}

/**
 * Everything the app shows about one word.
 * @returns {null | {key: string, score: number, level: string, flags: string[], syllables: number,
 *   stop: boolean, ipa: string|null, confusables: {word: string, slip: string}[], rude: boolean,
 *   alternatives: string[], reasons: object[]}}
 */
export function describe(raw, profile = language) {
  const key = resolveKey(raw);
  if (!key) return null;
  const entry = lexicon[key];
  const score = riskScore(entry, profile);
  // The features that count for this language, most important first.
  const flags = featureNames(entry)
    .filter((name) => weightOf(profile, name) > 0)
    .sort((a, b) => weightOf(profile, b) - weightOf(profile, a));
  const [ipa = null, slipList = [], altList = []] = details?.[key] ?? [];
  const { words: confusables, rude } = confusablesFor(slipList, profile);
  return {
    key,
    score,
    level: levelOf(score),
    flags,
    syllables: syllablesOf(entry),
    stop: STOPWORDS.has(key),
    ipa,
    confusables,
    rude,
    alternatives: alternativesFor(altList, score, profile),
    // The r-and-l tip already covers /r/ and /l/ on their own.
    reasons: flags.filter((name) => !(flags.includes('RL') && (name === 'R' || name === 'L'))).map((name) => reasonFor(profile, name)),
  };
}

/** True when two words are the same, sound the same, or differ only in spelling. */
export function sameWord(a, b) {
  if (a === b) return true;
  if (isNumber(a) || isNumber(b)) return true; // "2026" vs "twenty twenty-six"
  if (spellingKey(a) === spellingKey(b)) return true;
  return Boolean(homophones?.[a]?.includes(b) || homophones?.[b]?.includes(a));
}
