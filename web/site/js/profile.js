// Your personal word list and settings, stored in this browser only
// (localStorage). Nothing is sent anywhere. Export makes a backup file.

const PROFILE_KEY = 'presay.profile.v1';
const MAX_ATTEMPTS = 10;

export const DEFAULT_SETTINGS = Object.freeze({
  language: null, // first-language profile code; null = guess from the browser
  explain: null, // 'en' or 'native' for the explanations; null = native unless the language is only a fallback
  model: 'base', // 'small' (most accurate), 'base' (accurate) or 'tiny' (fast)
  gpu: false,
  voice: 'en-GB',
  show: 'all', // 'all' or 'high' marks in the script view
});

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // storage can be blocked (private mode, strict settings)
  }
}

function emptyProfile() {
  return { version: 1, words: {}, settings: { ...DEFAULT_SETTINGS } };
}

function isValidProfile(value) {
  return value && typeof value === 'object' && value.version === 1 && value.words && typeof value.words === 'object';
}

function cleanAttempts(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((a) => a && typeof a.ok === 'boolean')
    .map((a) => ({ ok: a.ok, heard: typeof a.heard === 'string' ? a.heard.slice(0, 60) : null, at: Number(a.at) || 0 }))
    .slice(-MAX_ATTEMPTS);
}

let profile = load();

function load() {
  try {
    const raw = storage()?.getItem(PROFILE_KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw);
    if (!isValidProfile(parsed)) return emptyProfile();
    return { version: 1, words: parsed.words, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
  } catch {
    return emptyProfile();
  }
}

function save() {
  try {
    storage()?.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false; // full or blocked; the app keeps working for this visit
  }
}

/** Re-read from storage (another tab may have changed it). */
export function reload() {
  profile = load();
}

export function getSettings() {
  return { ...profile.settings };
}

export function updateSettings(changes) {
  profile.settings = { ...profile.settings, ...changes };
  save();
  return getSettings();
}

/** Record one try at saying a word. */
export function recordAttempt(word, ok, heard = null) {
  const entry = (profile.words[word] ??= { attempts: [] });
  entry.attempts = cleanAttempts([...entry.attempts, { ok, heard, at: Date.now() }]);
  save();
  return status(word);
}

/** Remove the latest try (for example, a bad recording). */
export function discardLastAttempt(word) {
  const entry = profile.words[word];
  if (!entry) return null;
  entry.attempts.pop();
  if (!entry.attempts.length) delete profile.words[word];
  save();
  return status(word);
}

/**
 * Summary of your history with a word.
 * A word is "flagged" when it was misheard at least twice and in at least 40%
 * of tries, or in the last two tries. Three correct tries in a row clear it.
 */
export function status(word) {
  const attempts = profile.words[word]?.attempts ?? [];
  const tries = attempts.length;
  const misses = attempts.filter((a) => !a.ok).length;
  const lastMiss = [...attempts].reverse().find((a) => !a.ok);
  const lastThree = attempts.slice(-3);
  const lastTwo = attempts.slice(-2);
  const cleared = lastThree.length === 3 && lastThree.every((a) => a.ok);
  const flagged =
    !cleared && ((misses >= 2 && misses / tries >= 0.4) || (lastTwo.length === 2 && lastTwo.every((a) => !a.ok)));
  return { word, tries, misses, flagged, lastHeard: lastMiss?.heard ?? null, cleared };
}

export function hasHistory(word) {
  return Boolean(profile.words[word]?.attempts.length);
}

/** Words that were misheard at least once, most troublesome first. */
export function listWords() {
  return Object.keys(profile.words)
    .map(status)
    .filter((s) => s.misses > 0)
    .sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.misses - a.misses || a.word.localeCompare(b.word));
}

export function removeWord(word) {
  delete profile.words[word];
  save();
}

export function resetWords() {
  profile.words = {};
  save();
}

export function exportProfile() {
  return JSON.stringify({ app: 'presay', exportedAt: new Date().toISOString(), ...profile }, null, 2);
}

/**
 * Import a backup. Attempts for the same word are merged.
 * @returns {number} number of words in the imported file
 */
export function importProfile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file is not a Presay backup (it is not valid JSON).');
  }
  if (!isValidProfile(parsed)) throw new Error('This file is not a Presay backup.');
  let count = 0;
  for (const [word, entry] of Object.entries(parsed.words)) {
    if (!/^[a-z][a-z' -]{0,40}$/.test(word)) continue;
    const merged = [...(profile.words[word]?.attempts ?? []), ...cleanAttempts(entry?.attempts)];
    merged.sort((a, b) => a.at - b.at);
    const attempts = cleanAttempts(merged);
    if (attempts.length) {
      profile.words[word] = { attempts };
      count++;
    }
  }
  save();
  return count;
}
