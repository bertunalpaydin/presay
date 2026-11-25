import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimSilence, splitIntoSegments, normalizeLevel } from '../site/js/audio.js';
import { tokenBudget, transcribeShort, transcribeLong, isPhantom } from '../site/js/transcribe.js';

const RATE = 16000;

// Speech-like bursts: tone for `on` seconds, silence for `off` seconds.
function bursts(totalSeconds, on = 1.6, off = 0.4) {
  const out = new Float32Array(Math.round(totalSeconds * RATE));
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    out[i] = t % (on + off) < on ? 0.3 * Math.sin(2 * Math.PI * 220 * t) : 0;
  }
  return out;
}

test('silence is rejected instead of being sent to the model', () => {
  assert.equal(trimSilence(new Float32Array(RATE * 2)), null);
});

test('silence around a word is trimmed, with a little padding', () => {
  const samples = new Float32Array(RATE * 3);
  for (let i = RATE; i < RATE * 1.5; i++) samples[i] = 0.3 * Math.sin(i / 5);
  const trimmed = trimSilence(samples);
  assert.ok(trimmed.length > RATE * 0.5 && trimmed.length < RATE * 1.2, `kept ${trimmed.length / RATE} s`);
});

test('long recordings are split into pieces of at most 25 seconds, at pauses', () => {
  const samples = bursts(70);
  const parts = splitIntoSegments(samples);
  assert.ok(parts.length >= 3);
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  assert.ok(Math.abs(total - samples.length) < RATE * 0.25, 'no audio is lost');
  for (const p of parts) assert.ok(p.length <= RATE * 25 + 1, `piece of ${p.length / RATE} s`);
  // Each cut should fall in a pause (silent sample at the boundary).
  let offset = 0;
  for (const p of parts.slice(0, -1)) {
    offset += p.length;
    assert.equal(samples[offset], 0, `cut at ${offset / RATE} s is in a pause`);
  }
});

test('short recordings stay in one piece', () => {
  assert.equal(splitIntoSegments(bursts(20)).length, 1);
});

test('the token budget grows with length but stays bounded', () => {
  assert.equal(tokenBudget(new Float32Array(RATE)), 22);
  assert.ok(tokenBudget(new Float32Array(RATE * 25)) < 200);
});

test('quiet recordings are raised to a clear level, loud ones are not clipped', () => {
  const quiet = Float32Array.from({ length: 1600 }, (_, i) => 0.2 * Math.sin(i / 5));
  const raised = normalizeLevel(quiet);
  assert.ok(Math.abs(Math.max(...raised.map(Math.abs)) - 0.9) < 0.01);
  const loud = Float32Array.from({ length: 1600 }, (_, i) => 1.2 * Math.sin(i / 5));
  assert.ok(Math.max(...normalizeLevel(loud).map(Math.abs)) <= 0.9001);
  const faint = Float32Array.from({ length: 1600 }, (_, i) => 0.001 * Math.sin(i / 5));
  assert.ok(Math.max(...normalizeLevel(faint).map(Math.abs)) <= 0.0101, 'noise is raised at most ten times');
  const offset = Float32Array.from({ length: 1600 }, (_, i) => 0.3 + 0.1 * Math.sin(i / 5));
  const centred = normalizeLevel(offset);
  assert.ok(Math.abs(centred.reduce((sum, v) => sum + v, 0) / centred.length) < 0.01, 'the DC offset is removed');
});

test('Whisper sound notes are dropped and its stock phrases are recognised', async () => {
  const fake = (text) => ({ transcribe: async () => text });
  assert.deepEqual(await transcribeShort(fake('[BLANK_AUDIO]'), new Float32Array(16000)), []);
  assert.deepEqual(await transcribeShort(fake(' Three. (laughs) ♪'), new Float32Array(16000)), ['three']);
  assert.deepEqual(await transcribeLong(fake('*cough* Ask not.'), new Float32Array(16000)), ['ask', 'not']);
  assert.ok(isPhantom(['thank', 'you']));
  assert.ok(isPhantom(['thanks', 'for', 'watching']));
  assert.ok(!isPhantom(['thank']));
  assert.ok(!isPhantom(['three', 'years']));
});
