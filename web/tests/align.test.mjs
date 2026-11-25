import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignWords, containsWord, sameOrExtraEnding } from '../site/js/align.js';

const same = (a, b) => a === b || (a === 'their' && b === 'there') || (a === 'there' && b === 'their');
const statuses = (results) => results.map((r) => r.status);

test('identical text is all ok', () => {
  const r = alignWords(['i', 'think', 'so'], ['i', 'think', 'so'], same);
  assert.deepEqual(statuses(r), ['ok', 'ok', 'ok']);
});

test('a different word is reported with what was heard', () => {
  const r = alignWords(['i', 'think', 'so'], ['i', 'sink', 'so'], same);
  assert.deepEqual(statuses(r), ['ok', 'changed', 'ok']);
  assert.equal(r[1].heard, 'sink');
});

test('a dropped word is missed, an extra word is ignored', () => {
  const r = alignWords(['we', 'worked', 'hard'], ['we', 'hard', 'thank', 'you'], same);
  assert.deepEqual(statuses(r), ['ok', 'missed', 'ok']);
});

test('contractions line up with their long form in both directions', () => {
  assert.deepEqual(statuses(alignWords(["i'm", 'ready'], ['i', 'am', 'ready'], same)), ['ok', 'ok']);
  assert.deepEqual(statuses(alignWords(['i', 'am', 'ready'], ["i'm", 'ready'], same)), ['ok', 'ok', 'ok']);
  assert.deepEqual(statuses(alignWords(["don't", 'go'], ['do', 'go'], same)), ['missed', 'ok']);
});

test('the comparison function decides what counts as the same word', () => {
  assert.deepEqual(statuses(alignWords(['their', 'plan'], ['there', 'plan'], same)), ['ok', 'ok']);
});

test('empty transcripts mark every word as missed', () => {
  assert.deepEqual(statuses(alignWords(['a', 'b'], [], same)), ['missed', 'missed']);
});

test('a short recording contains the target word', () => {
  assert.equal(containsWord('think', ['i', 'think'], same), true);
  assert.equal(containsWord('think', ['sink'], same), false);
});

test('a lone word still counts when Whisper splits it in two', () => {
  const same = (a, b) => a === b;
  assert.ok(containsWord('checkup', ['check', 'up'], same));
  assert.ok(containsWord('everyone', ['every', 'one'], same));
  assert.ok(!containsWord('checkup', ['check'], same));
});

test('an added ending is forgiven, a dropped one is not', () => {
  const same = (a, b) => a === b;
  assert.ok(sameOrExtraEnding('thank', 'thanks', same));
  assert.ok(sameOrExtraEnding('box', 'boxes', same));
  assert.ok(sameOrExtraEnding('three', "three's", same));
  assert.ok(!sameOrExtraEnding('thanks', 'thank', same), 'dropping the final sound is a real slip');
  assert.ok(!sameOrExtraEnding('west', 'vests', same));
});
