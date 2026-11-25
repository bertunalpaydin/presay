import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// In-memory localStorage, installed before the module reads it.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const profile = await import('../site/js/profile.js');

beforeEach(() => {
  profile.resetWords();
});

test('a word is flagged after two misses in a row', () => {
  profile.recordAttempt('think', false, 'sink');
  assert.equal(profile.status('think').flagged, false);
  profile.recordAttempt('think', false, 'sink');
  const s = profile.status('think');
  assert.equal(s.flagged, true);
  assert.equal(s.lastHeard, 'sink');
});

test('one miss and one success is not enough to flag', () => {
  profile.recordAttempt('three', false, 'tree');
  profile.recordAttempt('three', true);
  assert.equal(profile.status('three').flagged, false);
});

test('three correct tries in a row clear the flag', () => {
  for (const ok of [false, false, true, true]) profile.recordAttempt('west', ok, ok ? null : 'vest');
  assert.equal(profile.status('west').flagged, true);
  profile.recordAttempt('west', true);
  const s = profile.status('west');
  assert.equal(s.flagged, false);
  assert.equal(s.cleared, true);
});

test('ignoring the last recording removes it', () => {
  profile.recordAttempt('worth', false, 'worse');
  profile.discardLastAttempt('worth');
  assert.equal(profile.status('worth').tries, 0);
  assert.equal(profile.hasHistory('worth'), false);
});

test('only misheard words are listed, most troublesome first', () => {
  profile.recordAttempt('easy', true);
  profile.recordAttempt('hard', false, 'heart');
  profile.recordAttempt('harder', false, 'x');
  profile.recordAttempt('harder', false, 'y');
  assert.deepEqual(profile.listWords().map((w) => w.word), ['harder', 'hard']);
});

test('export and import round-trip and merge', () => {
  profile.recordAttempt('think', false, 'sink');
  const backup = profile.exportProfile();
  profile.resetWords();
  assert.equal(profile.importProfile(backup), 1);
  assert.equal(profile.status('think').misses, 1);
  assert.throws(() => profile.importProfile('not json'), /not a Presay backup/);
  assert.throws(() => profile.importProfile('{"version":2}'), /not a Presay backup/);
});

test('a broken stored profile does not break the app', async () => {
  store.set('presay.profile.v1', '{broken');
  profile.reload();
  assert.deepEqual(profile.listWords(), []);
  assert.equal(profile.getSettings().model, 'base');
});

test('settings are saved', () => {
  profile.updateSettings({ model: 'tiny', voice: 'en-US' });
  profile.reload();
  assert.equal(profile.getSettings().model, 'tiny');
  assert.equal(profile.getSettings().voice, 'en-US');
});
