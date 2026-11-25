import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguage,
  detectLanguage,
  reasonFor,
  stressNoteFor,
  stressReasonFor,
  reasonsHeadingFor,
  textDirection,
  slipLabel,
} from '../site/js/languages.js';
import { FEATURE_NAMES, SLIPS, SLIP, compileProfile, riskScore, makeEntry, decodeEntry, FLAGS } from '../site/js/risk-rules.js';

const usedFeatures = (profile) => Object.entries(profile.weights).filter(([, w]) => w > 0).map(([name]) => name);

test('every profile is complete', () => {
  assert.deepEqual(LANGUAGES.map((p) => p.code).sort(), ['ar', 'de', 'es', 'fr', 'hi', 'ja', 'pt', 'ru', 'tr', 'zh']);
  const codes = new Set();
  for (const profile of LANGUAGES) {
    assert.ok(!codes.has(profile.code), `${profile.code} is unique`);
    codes.add(profile.code);
    assert.ok(profile.name && profile.label && profile.speakers, profile.code);
    assert.ok(profile.rules.length > 0 && profile.slipMask > 0, profile.code);
    for (const name of Object.keys(profile.tips)) assert.ok(FEATURE_NAMES.includes(name), `${profile.code} tip ${name}`);
  }
  assert.ok(codes.has(DEFAULT_LANGUAGE));
});

test('unknown features and slips are rejected', () => {
  assert.throws(() => compileProfile({ code: 'x', weights: { NOPE: 1 }, rules: [] }), /Unknown feature/);
  assert.throws(() => compileProfile({ code: 'x', weights: {}, rules: ['NOPE'] }), /Unknown slip/);
});

test('the browser language picks a profile; other languages pick none', () => {
  assert.equal(detectLanguage(['en-GB', 'tr-TR']), 'tr');
  assert.equal(detectLanguage(['de-AT', 'en']), 'de');
  assert.equal(detectLanguage(['es-MX']), 'es');
  assert.equal(detectLanguage(['pt-BR']), 'pt');
  assert.equal(detectLanguage(['zh-Hant-TW']), 'zh');
  // Related languages are not guessed: a Ukrainian visitor is not shown "Russian".
  assert.equal(detectLanguage(['uk-UA']), null);
  assert.equal(detectLanguage(['ur-PK']), null);
  assert.equal(detectLanguage(['en-US']), null);
  assert.equal(detectLanguage([]), null);
  assert.equal(DEFAULT_LANGUAGE, 'tr');
  assert.equal(getLanguage('nope').code, 'tr');
});

test('every feature has a reason in every language, and every slip a label', () => {
  for (const profile of LANGUAGES) {
    for (const feature of FEATURE_NAMES) {
      const reason = reasonFor(profile, feature);
      assert.ok(reason.title && reason.tip, `${profile.code} ${feature}`);
      assert.ok(!reason.tip.includes('undefined'), `${profile.code} ${feature}`);
    }
    assert.ok(stressNoteFor(profile).length > 20);
  }
  for (const slip of SLIPS) assert.notEqual(slipLabel(slip), slip);
});

test('tips name the slips of the chosen language', () => {
  assert.match(reasonFor(getLanguage('es'), 'TH').tip, /^Spanish speakers often say it as “t” or “s”\./);
  assert.match(reasonFor(getLanguage('pt'), 'TH').tip, /^Brazilian speakers often say it as “t”, “s” or “f”\./);
  assert.match(reasonFor(getLanguage('fr'), 'H').tip, /French drops every h/);
});

test('every language has explanations in its own language for every sound that counts', () => {
  for (const profile of LANGUAGES) {
    const native = profile.native;
    assert.ok(native, `${profile.code} has native explanations`);
    for (const key of ['lang', 'dir', 'label', 'heading', 'stressNote']) assert.ok(native[key], `${profile.code} ${key}`);
    assert.equal(native.dir, profile.code === 'ar' ? 'rtl' : 'ltr', `${profile.code} direction`);
    const used = usedFeatures(profile);
    for (const feature of used) {
      const reason = reasonFor(profile, feature, true);
      assert.ok(reason.title && reason.tip, `${profile.code} ${feature}`);
      assert.notEqual(reason.tip, reasonFor(profile, feature).tip, `${profile.code} ${feature} is translated`);
    }
    // No leftover text for sounds the language does not count.
    for (const feature of Object.keys(native.reasons)) assert.ok(used.includes(feature), `${profile.code} ${feature} is used`);
    assert.equal(reasonsHeadingFor(profile, false), 'Why it can be hard');
    assert.deepEqual(textDirection(profile, false), { lang: 'en', dir: 'ltr' });
    assert.match(stressReasonFor(profile, 4, true).title, /4/);
    assert.equal(stressReasonFor(profile, 4, false).title, 'Long word, 4 syllables');
  }
});

test('Russian counts syllables with the right word form', () => {
  const ru = getLanguage('ru');
  assert.equal(stressReasonFor(ru, 3, true).title, 'Длинное слово, 3 слога');
  assert.equal(stressReasonFor(ru, 5, true).title, 'Длинное слово, 5 слогов');
  assert.equal(stressReasonFor(ru, 11, true).title, 'Длинное слово, 11 слогов');
});

test('Turkish keeps its original tips', () => {
  const tr = getLanguage('tr');
  assert.equal(
    reasonFor(tr, 'TH').tip,
    'Turkish has no /θ/, so it often comes out as “t”, “s” or “f”. Put your tongue lightly between your teeth and blow air, without voice.',
  );
  assert.equal(reasonFor(tr, 'NG').tip, 'End on the back of the tongue, without adding a hard “g” or “k” after it.');
  assert.equal(stressNoteFor(tr), 'Turkish usually stresses the last syllable; English often does not.');
});

test('entries pack flags, syllables and slips without losing anything', () => {
  const flags = FLAGS.TH | FLAGS.FINAL_STOP | FLAGS.T_I;
  const slips = (1 << 31) | 1;
  const entry = makeEntry(flags, 4, slips);
  assert.deepEqual(decodeEntry(entry), { flags, syllables: 4, slips: slips >>> 0 });
  assert.equal(typeof makeEntry(flags, 2), 'number');
  // The last slip in the mask still counts.
  const last = 1 << SLIP.FINAL_DROP;
  assert.equal(SLIP.FINAL_DROP, SLIPS.length - 1);
  assert.equal(riskScore(makeEntry(0, 1, last), getLanguage('zh')), 1.5);
  assert.equal(riskScore(makeEntry(0, 1, last), getLanguage('tr')), 0);
});
