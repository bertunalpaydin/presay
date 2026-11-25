// Turning a recording into words, for single words and for whole scripts.

import { splitIntoSegments } from './audio.js';
import { words, collapseLoops } from './text.js';

// Whisper sometimes writes a stock phrase when it hears silence or noise.
const PHANTOMS = new Set([
  'you',
  'bye',
  'bye bye',
  'thank you',
  'thank you very much',
  'thanks for watching',
  'thank you for watching',
  'thank you so much for watching',
  'please subscribe',
  'subscribe',
]);

/** True when the words heard are one of Whisper's stock phrases for silence or noise. */
export function isPhantom(heard) {
  return PHANTOMS.has(heard.join(' '));
}

/** Drop Whisper's sound notes, such as "[BLANK_AUDIO]", "(laughs)", "*cough*" or "♪". */
function cleanText(text) {
  return text.replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|[♪♫]/g, ' ');
}

// Enough tokens for fast speech, but not enough for a runaway loop.
export function tokenBudget(samples) {
  return Math.ceil((samples.length / 16000) * 6) + 16;
}

/** Transcribe a short recording (one word or phrase). Returns lower-case words. */
export async function transcribeShort(recognizer, samples) {
  const text = await recognizer.transcribe(samples, { maxNewTokens: 24 });
  return words(cleanText(text));
}

/**
 * Transcribe a recording of any length, piece by piece.
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<string[]>} lower-case words
 */
export async function transcribeLong(recognizer, samples, onProgress) {
  const segments = splitIntoSegments(samples);
  const all = [];
  for (let i = 0; i < segments.length; i++) {
    onProgress?.(i, segments.length);
    const text = await recognizer.transcribe(segments[i], { maxNewTokens: tokenBudget(segments[i]) });
    all.push(...collapseLoops(words(cleanText(text))));
  }
  onProgress?.(segments.length, segments.length);
  return all;
}
