// Lines up what you meant to say with what the speech model heard.

import { expandContractions } from './text.js';

/**
 * Align two word lists with the classic edit-distance table.
 * @param {string[]} expected words from the script
 * @param {string[]} heard words from the transcript
 * @param {(a: string, b: string) => boolean} same
 * @returns {{status: 'ok'|'changed'|'missed', heard: string|null}[]} one result per expected word
 */
export function alignWords(expected, heard, same) {
  const exp = expandContractions(expected);
  const got = expandContractions(heard);
  const n = exp.length;
  const m = got.length;
  const cost = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = 0; i <= n; i++) cost[i][0] = i;
  for (let j = 0; j <= m; j++) cost[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const match = cost[i - 1][j - 1] + (same(exp[i - 1].word, got[j - 1].word) ? 0 : 1);
      cost[i][j] = Math.min(match, cost[i - 1][j] + 1, cost[i][j - 1] + 1);
    }
  }

  // Walk back through the table to find what happened to each expected word.
  // On ties, prefer a match, then an extra heard word, then a dropped word, and
  // only then a changed word, so one dropped word does not shift the rest.
  const perExpanded = new Array(n);
  let i = n;
  let j = m;
  while (i > 0) {
    if (j > 0 && cost[i][j] === cost[i - 1][j - 1] && same(exp[i - 1].word, got[j - 1].word)) {
      perExpanded[i - 1] = { status: 'ok', heard: got[j - 1].word };
      i--;
      j--;
    } else if (j > 0 && cost[i][j] === cost[i][j - 1] + 1) {
      j--; // an extra word was heard; ignore it
    } else if (cost[i][j] === cost[i - 1][j] + 1) {
      perExpanded[i - 1] = { status: 'missed', heard: null };
      i--;
    } else {
      perExpanded[i - 1] = { status: 'changed', heard: got[j - 1].word };
      i--;
      j--;
    }
  }

  // Fold expanded contractions back onto the original words: a word is only
  // "ok" if every part of it was heard.
  const results = expected.map(() => ({ status: 'ok', heard: null, parts: [] }));
  exp.forEach((item, k) => results[item.from].parts.push(perExpanded[k]));
  return results.map(({ parts }) => {
    const bad = parts.find((p) => p.status !== 'ok');
    if (!bad) return { status: 'ok', heard: parts.map((p) => p.heard).join(' ') };
    return { status: bad.status, heard: parts.map((p) => p.heard).filter(Boolean).join(' ') || null };
  });
}

/**
 * Did a short recording contain the target word? Two heard words written
 * together also count ("check up" for "checkup", "every one" for "everyone").
 */
export function containsWord(target, heard, same) {
  const list = expandContractions(heard).map(({ word }) => word);
  if (list.some((word) => same(target, word))) return true;
  const joined = target.replace(/-/g, '');
  return list.some((word, i) => i + 1 < list.length && same(joined, word + list[i + 1]));
}

/**
 * The same word, or the word with an ending added: Whisper often writes a lone
 * "thank" as "thanks". Only an added ending is forgiven: "thank" for "thanks"
 * still counts as a miss, because dropping a final sound is a real slip.
 */
export function sameOrExtraEnding(target, heard, same) {
  if (same(target, heard)) return true;
  return ["'s", 'es', 's'].some((ending) => heard.endsWith(ending) && heard.length - ending.length >= 3 && same(target, heard.slice(0, -ending.length)));
}
