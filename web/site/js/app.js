// Presay: user interface.

import { tokenize, normalizeWord, matchCase, escapeHtml, words as wordsOf } from './text.js';
import { loadLexicon, loadDetails, describe, sameWord, detailsLoaded, isLoaded, setLanguage, currentLanguage, metaUrl } from './lexicon.js';
import {
  LANGUAGES,
  DEFAULT_LANGUAGE,
  detectLanguage,
  isLanguage,
  slipLabel,
  reasonFor,
  stressReasonFor,
  reasonsHeadingFor,
  textDirection,
} from './languages.js';
import { alignWords, containsWord, sameOrExtraEnding } from './align.js';
import { STOPWORDS } from './stopwords.js';
import * as profile from './profile.js';
import { Recorder, canRecord, microphoneErrorMessage, trimSilence, normalizeLevel } from './audio.js';
import { SpeechRecognizer, MODEL_INFO, webgpuAvailable, clearModelCache } from './asr.js';
import { transcribeShort, transcribeLong, isPhantom } from './transcribe.js';
import { canSpeak, speak } from './speak.js';
import { PRACTICE_TEXTS, SITUATIONS } from './practice-texts.js';

// Example scripts for the empty box. Each one marks enough words in every
// first language to show what the site does.
const EXAMPLES = {
  interview: `Thank you for having me. For the last three years I have worked as a project coordinator at a logistics company, where I look after deliveries for more than thirty clients.

What I enjoy most is solving problems before they reach the customer. Last winter, when a supplier closed without warning, I found two new partners within a week, and we did not miss a single delivery.

I think my strongest skills are planning and clear communication, and I would love to bring them to your team.`,
  talk: `Good morning, everyone, and thank you for coming. Today I want to show you three ways to make our website faster, and why it matters for the people who use it every day.

Let's start with a simple question: how long would you wait for a page to load? Most visitors leave after three seconds. Our checkout page takes almost six.

The good news is that the fixes are small, cheap and already tested.`,
  meeting: `Hi everyone, here is a quick update on the mobile app. This week we finished the first version of the booking screen and fixed the three most serious bugs from user testing.

Next week we will work on payments and the settings page. The main risk is the deadline, because the bank needs our test results by the twelfth.

If anyone has a few hours free on Thursday, I would really appreciate some help with testing.`,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ICONS = {
  listen:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 010 7M18.5 6a8 8 0 010 12" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
};

const LEVEL_LABELS = {
  yours: 'Your word',
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
};

// Which IPA symbols to emphasise for each feature.
const HARD_SYMBOLS = {
  TH: ['θ'],
  DH: ['ð'],
  W: ['w'],
  AE: ['æ'],
  STRUT: ['ʌ'],
  ER: ['ɝ', 'ɚ'],
  NG: ['ŋ'],
  SHORT_I: ['ɪ'],
  SHORT_U: ['ʊ'],
  R: ['r'],
  L: ['l'],
  V: ['v'],
  P: ['p'],
  F: ['f'],
  SH: ['ʃ'],
  CH: ['tʃ'],
  H: ['h'],
  VW: ['v', 'w'],
  RL: ['r', 'l'],
};
const IPA_PAIRS = new Set(['tʃ', 'dʒ', 'aɪ', 'aʊ', 'eɪ', 'oʊ', 'ɔɪ']);
const STRESS_MARKS = new Set(['ˈ', 'ˌ']);
const EE_SOUNDS = new Set(['i', 'ɪ']);
const OO_SOUNDS = new Set(['u', 'ʊ']);
const STOP_SOUNDS = new Set(['p', 'b', 't', 'd', 'k', 'ɡ', 'tʃ', 'dʒ']);
const VOICED_SOUNDS = new Set(['b', 'd', 'ɡ', 'v', 'z', 'ʒ', 'ð', 'dʒ']);

const settings = profile.getSettings();
const recognizer = new SpeechRecognizer();
const recorder = new Recorder();

function browserLanguages() {
  try {
    return navigator.languages?.length ? navigator.languages : [navigator.language];
  } catch {
    return [];
  }
}

// The saved choice, or a guess from the browser's languages. When neither
// works, the default language is used, but explanations stay in English
// because it is probably not the visitor's language.
const savedLanguage = isLanguage(settings.language) ? settings.language : null;
const detectedLanguage = savedLanguage ? null : detectLanguage(browserLanguages());
setLanguage(savedLanguage ?? detectedLanguage ?? DEFAULT_LANGUAGE);
let languageIsFallback = !savedLanguage && !detectedLanguage;

/** True when explanations should be shown in the first language. */
function explainInNative() {
  if (settings.explain === 'en') return false;
  if (settings.explain === 'native') return true;
  return !languageIsFallback;
}

const state = {
  view: 'check',
  script: '',
  editing: true,
  analysis: [],
  selected: null,
  lexiconError: null,
  gpuAvailable: false,
  practice: {
    mode: 'drill',
    queue: [],
    queueFrom: null, // the script text the queue was built from, or null for a custom list
    queueLanguage: null, // the first language the queue was built for
    index: 0,
    phase: 'idle', // idle | recording | checking | result | done
    result: null,
    customWord: '',
    sessionResults: [],
    origin: new Map(), // where each queued word came from: 'script', 'list' (My words), 'bank' or 'read'
    bank: false, // true when every word comes from the word bank below
    bankScript: null, // the script there was when the round was built
    opened: false, // whether the practice page has been opened in this visit
  },
  read: {
    phase: 'idle', // idle | recording | checking | result
    results: null,
    error: null,
    script: null, // the text the results belong to
  },
  texts: {
    situation: 'all', // a situation id, or 'all'
    index: 0,
  },
  setup: {
    loading: false,
    progress: null,
    error: null,
    cached: false,
    notice: null,
  },
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

function listenButton(text, label = `Listen to “${text}”`) {
  if (!canSpeak()) return '';
  return `<button type="button" class="icon-button" data-speak="${escapeHtml(text)}" aria-label="${escapeHtml(label)}" title="Listen">${ICONS.listen}</button>`;
}

function ipaSegments(ipa) {
  const out = [];
  for (let i = 0; i < ipa.length; ) {
    const pair = ipa.slice(i, i + 2);
    const size = IPA_PAIRS.has(pair) ? 2 : 1;
    out.push(ipa.slice(i, i + size));
    i += size;
  }
  return out;
}

function highlightIpa(ipa, flags) {
  const segments = ipaSegments(ipa);
  const active = new Set(flags);
  const symbols = new Set(flags.flatMap((flag) => HARD_SYMBOLS[flag] ?? []));
  const sounds = segments.map((s, i) => i).filter((i) => !STRESS_MARKS.has(segments[i]));
  const last = sounds[sounds.length - 1];
  const hard = new Set();
  sounds.forEach((i, k) => {
    const seg = segments[i];
    const next = segments[sounds[k + 1]];
    if (symbols.has(seg)) hard.add(i);
    if (active.has('Z') && seg === 'z' && i !== last) hard.add(i);
    if (active.has('YI') && seg === 'j' && EE_SOUNDS.has(next)) hard.add(i);
    if (active.has('WU') && seg === 'w' && OO_SOUNDS.has(next)) hard.add(i);
    if (active.has('S_I') && seg === 's' && EE_SOUNDS.has(next)) hard.add(i);
    if (active.has('T_I') && (seg === 't' || seg === 'd') && EE_SOUNDS.has(next)) hard.add(i);
  });
  if (last !== undefined) {
    if (active.has('FINAL_STOP') && STOP_SOUNDS.has(segments[last])) hard.add(last);
    if (active.has('FINAL_VOICED') && VOICED_SOUNDS.has(segments[last])) hard.add(last);
  }
  const html = segments.map((seg, i) => (hard.has(i) ? `<span class="hard">${escapeHtml(seg)}</span>` : escapeHtml(seg))).join('');
  return `/${html}/`;
}

function formatMb(bytes) {
  return `${Math.round(bytes / 1e6)} MB`;
}

function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Views and navigation
// ---------------------------------------------------------------------------

const VIEWS = ['check', 'practice', 'words', 'about'];

function setView(name) {
  const view = VIEWS.includes(name) ? name : 'check';
  if (state.view === 'practice' && view !== 'practice') stopAnyRecording();
  state.view = view;
  for (const section of $$('[data-view]')) section.hidden = section.dataset.view !== view;
  for (const link of $$('[data-nav]')) {
    if (link.dataset.nav === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (view === 'practice' || view === 'words') checkGpu();
  if (view === 'practice') enterPractice();
  if (view === 'words') renderWords();
  if (view === 'check' && !state.editing && isLoaded()) {
    // Practice may have changed which words are "yours".
    state.analysis = analyze(state.script);
    renderCheck(false);
    renderPanel();
  }
}

function updateWordsCount() {
  const flagged = profile.listWords().filter((w) => w.flagged).length;
  const badge = $('#words-count');
  badge.hidden = flagged === 0;
  badge.textContent = String(flagged);
  badge.setAttribute('aria-label', `${flagged} words to practise`);
}

// ---------------------------------------------------------------------------
// First language
// ---------------------------------------------------------------------------

function renderLanguageSelects() {
  const code = currentLanguage().code;
  const ordered = [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const options = ordered.map((l) => `<option value="${l.code}">${escapeHtml(l.label)}</option>`).join('');
  for (const select of $$('[data-language-select]')) {
    select.innerHTML = options;
    select.value = code;
  }
}

function renderLanguageList() {
  const names = LANGUAGES.map((l) => l.name).sort((a, b) => a.localeCompare(b, 'en'));
  $('#language-list').textContent = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// "Explanations in English | <first language>" in the hero and in Settings.
function renderExplainSwitch() {
  const lang = currentLanguage();
  const value = explainInNative() ? 'native' : 'en';
  for (const label of $$('[data-native-label]')) {
    label.textContent = lang.native.label;
    label.lang = lang.native.lang;
  }
  for (const radio of $$('input[name="explain"], input[name="setting-explain"]')) radio.checked = radio.value === value;
}

function changeExplain(value) {
  changeSettings({ explain: value });
  renderExplainSwitch();
  renderPanel();
}

function changeLanguage(code, { announce = false } = {}) {
  const lang = setLanguage(code);
  languageIsFallback = false; // the visitor chose it
  changeSettings({ language: lang.code });
  for (const select of $$('[data-language-select]')) select.value = lang.code;
  renderExplainSwitch();
  if (isLoaded()) {
    state.analysis = analyze(state.script);
    if (!state.editing) renderCheck(true);
    renderPanel();
  }
  // Rounds built for the old language are built again; lists of chosen words are kept.
  if ((state.practice.bank || state.practice.queueFrom !== null) && !recorder.recording) state.practice.queue = [];
  if (state.view === 'practice') renderPractice();
  if (announce) toast(`Marks and tips are now for ${lang.speakers}.`);
}

// ---------------------------------------------------------------------------
// Check script
// ---------------------------------------------------------------------------

function analyze(text) {
  return tokenize(text).map((token) => {
    if (token.type !== 'word') return token;
    const info = isLoaded() ? describe(token.text) : null;
    const key = info?.key ?? normalizeWord(token.text);
    const personal = profile.status(key);
    let mark = null;
    if (personal.flagged && !STOPWORDS.has(key)) mark = 'yours';
    else if (info && !info.stop && info.level !== 'low') mark = info.level;
    return { ...token, key, info, personal, mark };
  });
}

function setScript(text) {
  state.script = text;
  state.analysis = analyze(text);
}

function visibleMark(token) {
  if (!token.mark) return null;
  if (settings.show === 'high' && token.mark === 'medium') return null;
  return token.mark;
}

function renderSummary() {
  const seen = { yours: new Set(), high: new Set(), medium: new Set() };
  for (const token of state.analysis) {
    if (token.type === 'word' && token.mark) seen[token.mark].add(token.key);
  }
  const total = seen.yours.size + seen.high.size + seen.medium.size;
  const el = $('#summary');
  el.hidden = false;
  if (!state.script.trim()) {
    el.textContent = 'Add some text to check.';
    return;
  }
  if (total === 0) {
    el.innerHTML = '<strong>Nothing marked.</strong> The words in this script are generally easy to hear.';
    return;
  }
  const parts = [];
  if (seen.yours.size) parts.push(`<span class="tally tally--yours">${seen.yours.size} from your practice</span>`);
  if (seen.high.size) parts.push(`<span class="tally tally--high">${seen.high.size} high risk</span>`);
  if (seen.medium.size) parts.push(`<span class="tally tally--medium">${seen.medium.size} medium</span>`);
  el.innerHTML = `<strong>${total} ${total === 1 ? 'word' : 'words'} to watch</strong>${parts.join('')}`;
}

function renderCheck(reveal) {
  const input = $('#script-input');
  const view = $('#script-view');
  $('#check-button').hidden = !state.editing;
  $('#edit-button').hidden = state.editing;
  $('#show-filter').hidden = state.editing;
  $('#summary').hidden = state.editing;
  input.hidden = !state.editing;
  view.hidden = state.editing;
  renderTextButtons();

  if (state.lexiconError) {
    $('#summary').hidden = false;
    $('#summary').textContent = state.lexiconError;
  }
  if (state.editing) return;

  let order = 0;
  view.innerHTML = state.analysis
    .map((token, index) => {
      if (token.type !== 'word') return escapeHtml(token.text);
      const mark = visibleMark(token);
      if (!mark) return `<span class="w" data-index="${index}">${escapeHtml(token.text)}</span>`;
      const pressed = state.selected === index;
      return `<button type="button" class="mark mark--${mark}" data-index="${index}" style="--i:${order++}" aria-pressed="${pressed}">${escapeHtml(token.text)}<span class="visually-hidden"> (${LEVEL_LABELS[mark].toLowerCase()})</span></button>`;
    })
    .join('');
  view.classList.toggle('is-revealing', Boolean(reveal));
  for (const radio of $$('input[name="show"]')) radio.checked = radio.value === settings.show;
  renderSummary();
}

/** An empty box offers the examples; copying and clearing need some text. */
function renderTextButtons() {
  const empty = state.editing && !$('#script-input').value.trim();
  $('#examples').hidden = !empty;
  $('#copy-button').hidden = empty;
  $('#clear-button').hidden = empty;
}

function startChecking() {
  state.script = $('#script-input').value;
  state.analysis = analyze(state.script);
  state.editing = false;
  state.selected = null;
  renderCheck(true);
  renderPanel();
}

function startEditing() {
  state.editing = true;
  state.selected = null;
  const input = $('#script-input');
  input.value = state.script;
  renderCheck(false);
  renderPanel();
  input.focus();
}

function selectToken(index) {
  state.selected = index;
  for (const el of $$('#script-view .mark')) el.setAttribute('aria-pressed', String(Number(el.dataset.index) === index));
  renderPanel();
  $('#panel').classList.add('is-open');
}

function closePanel() {
  state.selected = null;
  for (const el of $$('#script-view .mark')) el.setAttribute('aria-pressed', 'false');
  $('#panel').classList.remove('is-open');
  renderPanel();
}

function useAlternative(index, replacement) {
  const token = state.analysis[index];
  if (!token) return;
  const newWord = matchCase(replacement, token.text);
  const text = state.script.slice(0, token.start) + newWord + state.script.slice(token.end);
  setScript(text);
  $('#script-input').value = text;
  const newIndex = state.analysis.findIndex((t) => t.type === 'word' && t.start === token.start);
  state.selected = newIndex >= 0 ? newIndex : null;
  renderCheck(false);
  renderPanel();
  toast(`Replaced “${token.text}” with “${newWord}”.`);
}

// ---------------------------------------------------------------------------
// Word panel
// ---------------------------------------------------------------------------

function emptyPanel() {
  return `
    <div class="panel-empty">
      <h2>How it works</h2>
      <ol class="steps">
        <li><strong>${state.editing ? 'Check your script.' : 'Read the marks.'}</strong> Words a listener may mishear get a red or amber line.</li>
        <li><strong>Select a marked word.</strong> Hear it, see why it is risky and swap in an easier word.</li>
        <li><strong>Practise out loud.</strong> Words you get misheard on turn blue and stay on your list.</li>
      </ol>
    </div>`;
}

function historyHtml(personal) {
  if (!personal || personal.tries === 0) return '';
  let text;
  if (personal.misses === 0) text = `Heard correctly in all ${personal.tries} of your tries.`;
  else {
    text = `Misheard ${personal.misses} of ${personal.tries} times when you practised.`;
    if (personal.lastHeard) text += ` Last heard as “${escapeHtml(personal.lastHeard)}”.`;
    if (personal.cleared) text += ' Your last three tries were all heard correctly.';
  }
  return `<section><p class="history">${text}</p></section>`;
}

function reasonsHtml(info) {
  const lang = currentLanguage();
  const native = explainInNative();
  const reasons = info.reasons.map((r) => reasonFor(lang, r.flag, native));
  if (info.syllables >= 3) reasons.push(stressReasonFor(lang, info.syllables, native));
  if (!reasons.length) return '';
  const items = reasons.map((r) => `<li><strong>${escapeHtml(r.title)}</strong><span>${escapeHtml(r.tip)}</span></li>`);
  const { lang: code, dir } = textDirection(lang, native);
  return `<section lang="${code}" dir="${dir}"><h3>${escapeHtml(reasonsHeadingFor(lang, native))}</h3><ul class="reasons">${items.join('')}</ul></section>`;
}

function renderPanel() {
  const content = $('#panel-content');
  const token = state.selected !== null ? state.analysis[state.selected] : null;
  if (!token) {
    content.innerHTML = emptyPanel();
    $('#panel').classList.remove('is-open');
    return;
  }
  // Describe again: pronunciation details may have finished loading since the
  // script was analysed.
  const info = token.info ? describe(token.text) : null;
  const mark = token.mark ?? (info ? (info.stop ? null : info.level) : null);
  const label = token.mark === 'yours' ? LEVEL_LABELS.yours : info?.stop ? 'Common word' : info ? LEVEL_LABELS[info.level] : 'Not in dictionary';
  const levelClass = mark ?? 'low';

  let body = '';
  if (!info) {
    body = `<section><p class="muted">This word is not in Presay’s dictionary, so there is no pronunciation advice for it. You can still practise it.</p></section>`;
  } else {
    if (!detailsLoaded()) {
      body += `<div class="ipa-row"><span class="muted">Loading pronunciation…</span></div>`;
      loadDetails().then(() => {
        state.analysis = analyze(state.script);
        renderPanel();
      });
    } else if (info.ipa) {
      body += `<div class="ipa-row"><span class="ipa" aria-label="Pronunciation">${highlightIpa(info.ipa, info.flags)}</span>${listenButton(info.key)}</div>`;
    }
    body += historyHtml(token.personal);
    if (info.confusables.length || info.rude) {
      const chips = info.confusables
        .map(
          ({ word, slip }) =>
            `<button type="button" class="chip" data-speak="${escapeHtml(word)}" aria-label="${escapeHtml(word)}, ${escapeHtml(slipLabel(slip))}. Listen">${escapeHtml(word)}<small aria-hidden="true">${escapeHtml(slipLabel(slip))}</small></button>`,
        )
        .join('');
      body += `<section><h3>Might be heard as</h3>${
        chips ? `<p class="muted">Select one to hear the difference.</p><div class="chips">${chips}</div>` : ''
      }${info.rude ? `<p class="muted rude">A small slip here can make it sound like a rude word.</p>` : ''}</section>`;
    }
    body += reasonsHtml(info);
    if (info.alternatives.length) {
      body += `<section><h3>Easier to say</h3><p class="muted">Check that it still means what you want.</p><div class="chips">${info.alternatives
        .map((w) => `<button type="button" class="chip chip--use" data-use="${escapeHtml(w)}" aria-label="Use “${escapeHtml(w)}” instead">${escapeHtml(w)}</button>`)
        .join('')}</div></section>`;
    } else if (!info.stop && info.level !== 'low' && detailsLoaded()) {
      body += `<section><p class="muted">No easier synonym found. Practise this one instead.</p></section>`;
    }
  }
  body += `<section><button type="button" class="button" data-practise="${escapeHtml(token.key)}">Practise this word</button></section>`;

  content.innerHTML = `
    <div class="word-title">
      <h2>${escapeHtml(info?.key ?? token.key)}</h2>
      <span class="level level--${levelClass}">${label}</span>
    </div>
    ${body}`;
}

// ---------------------------------------------------------------------------
// Practice: setup
// ---------------------------------------------------------------------------

async function modelIsCached() {
  try {
    if (!('caches' in globalThis) || !(await caches.has('transformers-cache'))) return false;
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    const name = settings.model === 'tiny' ? 'whisper-tiny.en' : 'whisper-base.en';
    return keys.some((request) => request.url.includes(name) && request.url.includes('.onnx'));
  } catch {
    return false;
  }
}

function recognizerSettings() {
  return { model: settings.model, gpu: settings.gpu && state.gpuAvailable };
}

async function enterPractice() {
  if (!recognizer.isReadyFor(recognizerSettings())) {
    state.setup.cached = await modelIsCached();
    renderSetup();
    if (state.setup.cached && !state.setup.loading && !state.setup.error) startModel();
  } else {
    renderSetup();
  }
  const p = state.practice;
  const languageChanged = p.queueLanguage !== currentLanguage().code;
  const stale = p.queueFrom !== null && (p.queueFrom !== state.script || languageChanged);
  // A newly checked script takes over from a round of everyday words.
  const newScript = p.bank && state.script.trim() && p.bankScript !== state.script;
  if (!p.queue.length || stale || newScript || (p.bank && languageChanged)) buildQueue();
  // The first time, with nothing of your own to practise, start with the practice texts.
  if (!p.opened) {
    p.opened = true;
    if (!state.script.trim() && (p.bank || !p.queue.length)) setPracticeMode('texts');
  }
  renderPractice();
}

function setPracticeMode(mode) {
  if (state.practice.mode === mode) return;
  stopAnyRecording();
  state.practice.mode = mode;
  for (const radio of $$('input[name="mode"]')) radio.checked = radio.value === mode;
  resetRead();
}

function resetRead() {
  state.read.phase = 'idle';
  state.read.results = null;
  state.read.error = null;
}

function renderSetup() {
  const el = $('#setup');
  const ready = recognizer.isReadyFor(recognizerSettings());
  el.hidden = ready;
  $('#practice-body').hidden = !ready;
  if (ready) return;

  if (!canRecord()) {
    el.innerHTML = `<h2>Recording is not available</h2><p>This browser cannot record from a microphone. Try a recent version of Chrome, Edge, Firefox or Safari.</p>`;
    return;
  }

  const { loading, progress, error, cached, notice } = state.setup;
  const mode = settings.gpu && state.gpuAvailable ? 'gpu' : 'cpu';
  const size = MODEL_INFO[settings.model].size[mode];
  let progressHtml = '';
  if (loading) {
    let labelText = cached ? 'Starting speech recognition…' : 'Preparing download…';
    let pct = 0;
    if (progress && progress.total > 0) {
      pct = Math.min(100, (progress.loaded / progress.total) * 100);
      labelText = pct >= 99.5 ? 'Starting speech recognition…' : `Downloading speech model: ${formatMb(progress.loaded)} of ${formatMb(progress.total)}`;
    }
    progressHtml = `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Speech model download"><div class="progress__bar"><span style="width:${pct}%"></span></div><p class="progress__label">${labelText}</p></div>`;
  }

  el.innerHTML = `
    <h2>Set up speech recognition</h2>
    <p>
      Presay listens with Whisper, a speech recognition model that runs on this device.
      ${cached ? 'It is already saved in this browser, so it only needs to start.' : `The first time, your browser downloads it (about ${size} MB). After that it stays in your browser.`}
      Your recordings never leave this device.
    </p>
    <fieldset ${loading ? 'disabled' : ''}>
      <legend>Speech model</legend>
      <label class="choice"><input type="radio" name="setup-model" value="small" ${settings.model === 'small' ? 'checked' : ''} /><span>Most accurate<small>About ${MODEL_INFO.small.size[mode]} MB. Best with accents. Each check takes a few seconds on older laptops.</small></span></label>
      <label class="choice"><input type="radio" name="setup-model" value="base" ${settings.model === 'base' ? 'checked' : ''} /><span>Accurate<small>About ${MODEL_INFO.base.size[mode]} MB. Better at catching slips.</small></span></label>
      <label class="choice"><input type="radio" name="setup-model" value="tiny" ${settings.model === 'tiny' ? 'checked' : ''} /><span>Fast<small>About ${MODEL_INFO.tiny.size[mode]} MB. Quicker on phones and older laptops.</small></span></label>
      ${
        state.gpuAvailable
          ? `<label class="choice"><input type="checkbox" name="setup-gpu" ${settings.gpu ? 'checked' : ''} /><span>Use the graphics card<small>Can be faster on good computers, but the download is bigger.</small></span></label>`
          : ''
      }
    </fieldset>
    <button type="button" class="button button--primary" id="start-model" ${loading ? 'disabled' : ''}>${cached ? 'Start' : 'Download and start'}</button>
    ${progressHtml}
    ${notice ? `<p class="alert alert--info">${escapeHtml(notice)}</p>` : ''}
    ${error ? `<p class="alert" role="alert">${escapeHtml(error)}</p>` : ''}`;
}

async function startModel() {
  state.setup.loading = true;
  state.setup.error = null;
  state.setup.progress = null;
  renderSetup();
  try {
    await recognizer.load(recognizerSettings());
    state.setup.loading = false;
    renderSetup();
    renderPractice();
  } catch (error) {
    state.setup.loading = false;
    state.setup.error = error.message;
    renderSetup();
  }
}

recognizer.onProgress((info) => {
  if (info.status !== 'progress_total') return;
  state.setup.progress = info;
  if (state.view === 'practice') {
    const bar = $('#setup .progress__bar span');
    const label = $('#setup .progress__label');
    if (bar && label && info.total > 0) {
      const pct = Math.min(100, (info.loaded / info.total) * 100);
      bar.style.width = `${pct}%`;
      bar.closest('.progress').setAttribute('aria-valuenow', String(Math.round(pct)));
      label.textContent = pct >= 99.5 ? 'Starting speech recognition…' : `Downloading speech model: ${formatMb(info.loaded)} of ${formatMb(info.total)}`;
    } else {
      renderSetup();
    }
  }
});

recognizer.onNotice((message) => {
  state.setup.notice = message;
  toast(message);
});

// ---------------------------------------------------------------------------
// Practice: word by word
// ---------------------------------------------------------------------------

const ROUND_SIZE = 10;

/**
 * Words for a round: the marked words of the script, then flagged words from
 * My words. A short list is topped up with everyday words, so a round is never
 * just two or three words.
 */
function buildQueue(customList = null, { from = null } = {}) {
  const p = state.practice;
  let list = customList;
  let origin;
  if (list) {
    origin = new Map(list.map((word) => [word, from ?? p.origin.get(word)]).filter(([, source]) => source));
  } else {
    const analysis = state.analysis.length ? state.analysis : analyze(state.script);
    const rank = { yours: 0, high: 1, medium: 2 };
    const fromScript = new Map();
    for (const token of analysis) {
      if (token.type !== 'word' || !token.mark || fromScript.has(token.key)) continue;
      fromScript.set(token.key, { key: token.key, rank: rank[token.mark], score: token.info?.score ?? 99 });
    }
    list = [...fromScript.values()].sort((a, b) => a.rank - b.rank || b.score - a.score).map((w) => w.key);
    origin = new Map(list.map((word) => [word, 'script']));
    for (const { word, flagged } of profile.listWords()) {
      if (flagged && !origin.has(word)) {
        list.push(word);
        origin.set(word, 'list');
      }
    }
    list = list.slice(0, 15);
    if (list.length < ROUND_SIZE && isLoaded()) {
      for (const word of bankRound(ROUND_SIZE - list.length, new Set(list))) {
        list.push(word);
        origin.set(word, 'bank');
      }
    }
  }
  p.queue = list;
  p.origin = origin;
  p.queueFrom = customList ? null : state.script;
  p.queueLanguage = currentLanguage().code;
  p.bank = list.length > 0 && list.every((word) => origin.get(word) === 'bank');
  p.bankScript = state.script;
  p.index = 0;
  p.phase = 'idle';
  p.result = null;
  p.sessionResults = [];
}

function practiceWord(word) {
  const key = normalizeWord(word).trim();
  if (!key) return;
  const queue = state.practice.queue.filter((w) => w !== key);
  queue.unshift(key);
  state.practice.queue = queue;
  state.practice.queueFrom = null;
  state.practice.bank = false;
  state.practice.index = 0;
  state.practice.phase = 'idle';
  state.practice.result = null;
  state.practice.mode = 'drill';
  for (const radio of $$('input[name="mode"]')) radio.checked = radio.value === 'drill';
  if (location.hash !== '#practice') location.hash = '#practice';
  else renderPractice();
}

// Word bank: rounds of everyday words for word-by-word practice, taken from the
// practice texts and examples, so there is always something new to say.

let vocabulary = null;
function practiceVocabulary() {
  vocabulary ??= [...new Set(wordsOf([...PRACTICE_TEXTS.map((t) => t.text), ...Object.values(EXAMPLES)].join(' ')))];
  return vocabulary;
}

const usedBankWords = new Set();

/** Words that are hard for the chosen first language, high risk first, none repeated until all have had a turn. */
function bankRound(size = ROUND_SIZE, exclude = new Set()) {
  const found = { high: new Set(), medium: new Set() };
  for (const word of practiceVocabulary()) {
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    const info = describe(word);
    if (!info || info.stop || !(info.level in found) || usedBankWords.has(info.key) || exclude.has(info.key)) continue;
    found[info.level].add(info.key);
  }
  if (found.high.size + found.medium.size < size && usedBankWords.size) {
    usedBankWords.clear();
    return bankRound(size, exclude);
  }
  const shuffle = (set) => {
    const list = [...set];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const high = shuffle(found.high);
  const medium = shuffle(found.medium);
  const highCount = Math.ceil(size * 0.6);
  const round = [...high.slice(0, highCount), ...medium].slice(0, size);
  if (round.length < size) round.push(...high.slice(highCount, highCount + size - round.length));
  for (const word of round) usedBankWords.add(word);
  return round;
}

function startBankRound() {
  buildQueue(bankRound(), { from: 'bank' });
}

function renderPractice() {
  if (state.view !== 'practice') return;
  $('#drill').hidden = state.practice.mode !== 'drill';
  $('#read').hidden = state.practice.mode === 'drill';
  if (state.practice.mode === 'drill') renderDrill();
  else renderRead();
}

function addWordForm() {
  return `
    <form class="drill__after" id="add-word-form">
      <label class="visually-hidden" for="add-word">Word to practise</label>
      <input id="add-word" class="chip" style="font-family: var(--sans); min-width: 12rem" placeholder="Type any word" autocomplete="off" />
      <button type="submit" class="button">Practise this word</button>
    </form>`;
}

/** Says where a practice word came from. */
function sourceLine(from) {
  const text = {
    script: 'From your script',
    list: 'From your word list',
    bank: `Everyday word to watch for ${currentLanguage().speakers}`,
    read: 'From your reading',
  }[from];
  return text ? `<p class="drill__source">${escapeHtml(text)}</p>` : '';
}

/** Points to the bigger model when a smaller one is in use. */
function modelTip() {
  return settings.model === 'small' ? '' : ' The “Most accurate” speech model, in Settings on the My words page, makes fewer mistakes.';
}

function renderDrill() {
  const el = $('#drill');
  const p = state.practice;
  if (!p.queue.length && isLoaded()) buildQueue();
  if (!p.queue.length && !isLoaded()) {
    el.innerHTML = `<div class="drill"><p class="muted">${escapeHtml(state.lexiconError || 'Loading the word list…')}</p></div>`;
    return;
  }
  if (!p.queue.length) {
    el.innerHTML = `
      <div class="drill">
        <div class="empty"><strong>No words to practise yet.</strong>Check a script first and its marked words will show up here. You can also type a word.</div>
        ${addWordForm()}
      </div>`;
    return;
  }
  if (p.phase === 'done') {
    const ok = p.sessionResults.filter((r) => r.ok).length;
    const missed = [...new Set(p.sessionResults.filter((r) => !r.ok).map((r) => r.word))];
    el.innerHTML = `
      <div class="drill">
        <p class="drill__count">Round finished</p>
        <h2 class="drill__word" style="font-size: 2.5rem">${ok} of ${p.sessionResults.length} heard correctly</h2>
        ${missed.length ? `<p>Keep practising: ${missed.map((w) => `<strong>${escapeHtml(w)}</strong>`).join(', ')}.</p>` : '<p>Every word was heard as you meant it.</p>'}
        <div class="drill__after">
          ${missed.length ? '<button type="button" class="button button--primary" id="drill-missed">Practise the missed words</button>' : ''}
          <button type="button" class="button ${missed.length ? '' : 'button--primary'}" id="drill-new">Practise new words</button>
          <button type="button" class="button" id="drill-restart">Start the round again</button>
        </div>
        ${addWordForm()}
      </div>`;
    return;
  }

  const word = p.queue[p.index];
  const info = describe(word);
  const ipa = info?.ipa && detailsLoaded() ? `<span class="ipa">${highlightIpa(info.ipa, info.flags)}</span>` : '';
  if (info && !detailsLoaded()) loadDetails().then(() => state.view === 'practice' && renderPractice());
  const recording = p.phase === 'recording';
  const checking = p.phase === 'checking';
  let resultHtml = '';
  if (p.result) {
    const r = p.result;
    if (r.kind === 'ok') resultHtml = `<div class="result result--ok" role="status">Heard correctly${r.heard && r.heard !== word ? `, as <span class="heard">“${escapeHtml(r.heard)}”</span>` : ''}.</div>`;
    else if (r.kind === 'miss')
      resultHtml = `<div class="result result--miss" role="status">Heard as <span class="heard">“${escapeHtml(r.heard || '…')}”</span>. Listen again and focus on the marked sounds.<span class="result__hint">Speech recognition can be wrong too. If you are sure you said it right, choose “Ignore this recording”.${modelTip()}</span></div>`;
    else resultHtml = `<div class="result result--neutral" role="status">${escapeHtml(r.message)}</div>`;
  }
  const afterButtons =
    p.phase === 'result'
      ? `<div class="drill__after">
          <button type="button" class="button button--primary" id="drill-next">${p.index + 1 < p.queue.length ? 'Next word' : 'Finish round'}</button>
          ${p.result?.kind === 'ok' || p.result?.kind === 'miss' ? '<button type="button" class="button button--quiet" id="drill-ignore">Ignore this recording</button>' : ''}
        </div>`
      : '';

  el.innerHTML = `
    <div class="drill">
      <p class="drill__count">Word ${p.index + 1} of ${p.queue.length}</p>
      ${sourceLine(p.origin.get(word))}
      <h2 class="drill__word">${escapeHtml(word)}</h2>
      <div class="ipa-row">${ipa}${listenButton(word)}</div>
      <div class="drill__controls">
        <button type="button" class="record ${recording ? 'is-recording' : ''}" id="drill-record" ${checking ? 'disabled' : ''}>
          ${recording ? 'Stop' : checking ? 'Checking…' : p.phase === 'result' ? 'Record again' : 'Record'}
        </button>
        <div class="meter" aria-hidden="true"><span id="drill-meter"></span></div>
      </div>
      <p class="muted" style="margin-top: 0.75rem">${recording ? 'Say the word once. Recording stops by itself when you finish.' : 'Press Record and say the word once.'}</p>
      ${resultHtml}
      ${afterButtons}
      <div class="drill__after">
        ${p.index + 1 < p.queue.length && p.phase !== 'result' ? '<button type="button" class="button button--quiet" id="drill-skip">Skip this word</button>' : ''}
        ${p.bank && !recording && !checking ? '<button type="button" class="button button--quiet" id="drill-new">New set of words</button>' : ''}
      </div>
    </div>`;
}

function stopAnyRecording() {
  if (recorder.recording) recorder.cancel();
  if (state.practice.phase === 'recording') state.practice.phase = 'idle';
  if (state.read.phase === 'recording') state.read.phase = 'idle';
}

async function startDrillRecording() {
  const p = state.practice;
  p.result = null;
  let heardVoice = false;
  let quietSince = 0;
  try {
    await recorder.start({
      maxSeconds: 6,
      onAutoStop: () => finishDrillRecording(),
      onLevel: (level) => {
        const meter = $('#drill-meter');
        if (meter) meter.style.width = `${Math.round(level * 100)}%`;
        const now = performance.now();
        if (level > 0.12) {
          heardVoice = true;
          quietSince = 0;
        } else if (heardVoice && level < 0.05) {
          quietSince ||= now;
          if (now - quietSince > 1100) finishDrillRecording();
        }
      },
    });
    p.phase = 'recording';
  } catch (error) {
    p.phase = 'result';
    p.result = { kind: 'neutral', message: microphoneErrorMessage(error) };
  }
  renderDrill();
}

let finishingDrill = false;
async function finishDrillRecording() {
  const p = state.practice;
  if (finishingDrill || p.phase !== 'recording') return;
  finishingDrill = true;
  p.phase = 'checking';
  renderDrill();
  const word = p.queue[p.index];
  try {
    const { samples } = await recorder.stop();
    const speech = trimSilence(samples);
    if (!speech) {
      p.result = { kind: 'neutral', message: 'We did not hear anything. Check that the right microphone is selected and try again.' };
    } else {
      const heard = await transcribeShort(recognizer, normalizeLevel(speech));
      const ok = heard.length > 0 && containsWord(word, heard, (a, b) => sameOrExtraEnding(a, b, sameWord));
      if (!heard.length || (!ok && isPhantom(heard))) {
        // Silence or noise, or one of Whisper's stock phrases: not a fair miss.
        p.result = { kind: 'neutral', message: 'The speech model could not make that out. Try again, a little closer to the microphone.' };
      } else if (!ok && heard.length > 4) {
        p.result = { kind: 'neutral', message: 'That sounded like several words. Say just the word, once.' };
      } else {
        const heardText = heard.slice(0, 4).join(' ');
        profile.recordAttempt(word, ok, ok ? null : heardText);
        p.sessionResults.push({ word, ok });
        p.result = { kind: ok ? 'ok' : 'miss', heard: heardText };
        updateWordsCount();
      }
    }
  } catch (error) {
    p.result = { kind: 'neutral', message: error.message };
  } finally {
    finishingDrill = false;
  }
  p.phase = 'result';
  renderDrill();
}

function nextDrillWord() {
  const p = state.practice;
  if (p.index + 1 < p.queue.length) {
    p.index += 1;
    p.phase = 'idle';
    p.result = null;
  } else {
    p.phase = 'done';
  }
  renderDrill();
}

// ---------------------------------------------------------------------------
// Practice: whole script
// ---------------------------------------------------------------------------

let readTimer = null;

/** Practice texts in reading order. "All" takes one situation at a time in turn, so "Next" stays varied. */
function textsInOrder(situation) {
  if (situation !== 'all') return PRACTICE_TEXTS.filter((t) => t.situation === situation);
  const groups = SITUATIONS.map((s) => PRACTICE_TEXTS.filter((t) => t.situation === s.id));
  const out = [];
  for (let i = 0; out.length < PRACTICE_TEXTS.length; i++) {
    for (const group of groups) if (group[i]) out.push(group[i]);
  }
  return out;
}

function currentText() {
  const list = textsInOrder(state.texts.situation);
  return list[state.texts.index % list.length];
}

/** The text being read aloud: your own script, or a practice text. */
function readingText() {
  return state.practice.mode === 'texts' ? currentText().text : state.script;
}

function nextText() {
  const list = textsInOrder(state.texts.situation);
  state.texts.index = (state.texts.index + 1) % list.length;
  resetRead();
  renderRead();
}

/** A text with its risky words underlined, the same way as on the Check script page. */
function markedTextHtml(tokens) {
  return tokens
    .map((token) => {
      if (token.type !== 'word') return escapeHtml(token.text);
      const mark = visibleMark(token);
      return mark ? `<span class="mark mark--${mark} mark--static">${escapeHtml(token.text)}</span>` : escapeHtml(token.text);
    })
    .join('');
}

function textsHeaderHtml(tokens, busy) {
  const list = textsInOrder(state.texts.situation);
  const index = state.texts.index % list.length;
  const text = list[index];
  const situationName = SITUATIONS.find((s) => s.id === text.situation).name;
  const options = [{ id: 'all', name: 'All situations' }, ...SITUATIONS]
    .map((s) => `<option value="${s.id}" ${s.id === state.texts.situation ? 'selected' : ''}>${escapeHtml(s.name)}</option>`)
    .join('');
  const toWatch = new Set(tokens.filter((t) => t.type === 'word' && t.mark).map((t) => t.key)).size;
  return `
    <div class="sheet__bar">
      <span class="select select--small">
        <select id="text-situation" aria-label="Situation" ${busy ? 'disabled' : ''}>${options}</select>
      </span>
      <span class="texts__count">Text ${index + 1} of ${list.length}</span>
      <span class="spacer"></span>
      <button type="button" class="button" data-next-text ${busy ? 'disabled' : ''}>Next text</button>
    </div>
    <div class="texts__head">
      <p class="texts__situation">${escapeHtml(situationName)}</p>
      <h2 class="texts__title">${escapeHtml(text.title)}</h2>
      <p class="summary">${toWatch} ${toWatch === 1 ? 'word' : 'words'} to watch for ${escapeHtml(currentLanguage().speakers)}. Read it aloud at a natural pace.</p>
    </div>`;
}

function renderRead() {
  const el = $('#read');
  const r = state.read;
  const texts = state.practice.mode === 'texts';
  if (!texts && !state.script.trim()) {
    el.innerHTML = `<div class="drill"><div class="empty"><strong>No script yet.</strong>Write or paste your script on the <a href="#check">Check script</a> page, then come back to read it aloud. Or read one of the <button type="button" class="link-button" data-mode="texts">practice texts</button>.</div></div>`;
    return;
  }
  const source = readingText();
  const recording = r.phase === 'recording';
  const checking = r.phase === 'checking';
  const showResults = r.phase === 'result' && r.results && r.script === source;
  const marked = texts ? analyze(source) : null;

  let scriptHtml;
  let summary = '';
  if (showResults) {
    const { tokens, results, heardCount, total, missedWords } = r.results;
    let k = 0;
    scriptHtml = tokens
      .map((token) => {
        if (token.type !== 'word') return escapeHtml(token.text);
        const res = results[k++];
        if (res.status === 'ok') return `<span class="heard-ok">${escapeHtml(token.text)}</span>`;
        const was = res.heard ? `<span class="was">(heard “${escapeHtml(res.heard)}”)</span>` : '<span class="was">(not heard)</span>';
        return `<span class="heard-miss">${escapeHtml(token.text)}${was}</span>`;
      })
      .join('');
    summary = `
      <div class="sheet__bar read__result">
        <p class="summary" role="status"><strong>We heard ${heardCount} of ${total} words as written.</strong>
        ${missedWords.length ? `Words to practise: ${missedWords.map((w) => escapeHtml(w)).join(', ')}.` : 'Every word was heard as you wrote it.'}</p>
        ${missedWords.length ? `<p class="result__hint" style="margin: 0">Speech recognition can be wrong too, so a word that is marked once is only a hint.${modelTip()}</p>` : ''}
        <div class="read__actions">
          ${missedWords.length ? '<button type="button" class="button button--primary" id="read-practise-missed">Practise these words</button>' : ''}
          <button type="button" class="button" id="read-again">Read again</button>
          ${texts ? `<button type="button" class="button ${missedWords.length ? '' : 'button--primary'}" data-next-text>Next text</button>` : ''}
        </div>
      </div>`;
  } else {
    scriptHtml = texts ? markedTextHtml(marked) : escapeHtml(source);
  }

  el.innerHTML = `
    <div class="read">
      ${texts ? textsHeaderHtml(marked, recording || checking) : ''}
      ${summary}
      <div class="sheet__bar" ${showResults ? 'hidden' : ''}>
        <button type="button" class="record ${recording ? 'is-recording' : ''}" id="read-record" ${checking ? 'disabled' : ''}>
          ${recording ? 'Stop' : checking ? 'Checking…' : 'Start reading'}
        </button>
        <div class="meter" aria-hidden="true"><span id="read-meter"></span></div>
        <span class="timer" id="read-timer">${recording ? formatTime(recorder.elapsedSeconds()) : ''}</span>
      </div>
      ${checking ? '<p class="summary" id="read-status" role="status" style="padding: 0.75rem 1.25rem; margin: 0">Checking your reading. Long scripts can take a minute.</p>' : ''}
      ${r.error ? `<p class="alert" role="alert" style="margin: 1rem 1.25rem 0">${escapeHtml(r.error)}</p>` : ''}
      <div class="script-view">${scriptHtml}</div>
    </div>`;
}

async function startReadRecording() {
  const r = state.read;
  r.error = null;
  r.results = null;
  try {
    await recorder.start({
      maxSeconds: 300,
      onAutoStop: () => finishReadRecording(),
      onLevel: (level) => {
        const meter = $('#read-meter');
        if (meter) meter.style.width = `${Math.round(level * 100)}%`;
      },
    });
    r.phase = 'recording';
    readTimer = setInterval(() => {
      const timer = $('#read-timer');
      if (timer) timer.textContent = formatTime(recorder.elapsedSeconds());
    }, 500);
  } catch (error) {
    r.phase = 'idle';
    r.error = microphoneErrorMessage(error);
  }
  renderRead();
}

async function finishReadRecording() {
  const r = state.read;
  if (r.phase !== 'recording') return;
  const source = readingText();
  clearInterval(readTimer);
  r.phase = 'checking';
  renderRead();
  try {
    const { samples } = await recorder.stop();
    const speech = trimSilence(samples);
    if (!speech) throw new Error('We did not hear anything. Check that the right microphone is selected and try again.');
    const heard = await transcribeLong(recognizer, normalizeLevel(speech), (done, total) => {
      const status = $('#read-status');
      if (status && total > 1) status.textContent = `Checking your reading: part ${Math.min(done + 1, total)} of ${total}.`;
    });
    const tokens = tokenize(source);
    const expected = tokens.filter((t) => t.type === 'word').map((t) => normalizeWord(t.text));
    const results = alignWords(expected, heard, sameWord);
    const missedWords = [];
    expected.forEach((word, i) => {
      const key = describe(word)?.key ?? word;
      if (STOPWORDS.has(key) || /\d/.test(key)) return;
      const res = results[i];
      if (res.status !== 'ok') {
        profile.recordAttempt(key, false, res.heard);
        if (!missedWords.includes(key)) missedWords.push(key);
      } else {
        const info = describe(word);
        if (profile.hasHistory(key) || (info && info.level !== 'low')) profile.recordAttempt(key, true);
      }
    });
    const heardCount = results.filter((res) => res.status === 'ok').length;
    r.results = { tokens, results, heardCount, total: expected.length, missedWords };
    r.script = source;
    r.phase = 'result';
    updateWordsCount();
  } catch (error) {
    r.phase = 'idle';
    r.error = error.message;
  }
  renderRead();
}

// ---------------------------------------------------------------------------
// My words and settings
// ---------------------------------------------------------------------------

function renderWords() {
  const list = profile.listWords();
  const el = $('#words-list');
  updateWordsCount();
  if (!list.length) {
    el.innerHTML = `<div class="empty"><strong>No words yet.</strong>Practise your script and every word the speech model hears differently will be listed here.</div>`;
  } else {
    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">Word</th><th scope="col">Tries</th><th scope="col">Misheard</th><th scope="col">Last heard as</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            ${list
              .map(
                (w) => `<tr>
                  <td class="word">${w.flagged ? '<span class="flag" title="Still being misheard"></span><span class="visually-hidden">Still being misheard: </span>' : ''}${escapeHtml(w.word)}</td>
                  <td class="num">${w.tries}</td>
                  <td class="num">${w.misses}</td>
                  <td>${w.lastHeard ? `“${escapeHtml(w.lastHeard)}”` : '<span class="muted">none</span>'}</td>
                  <td style="white-space:nowrap; text-align:right">
                    <button type="button" class="button button--quiet" data-practise="${escapeHtml(w.word)}">Practise</button>
                    <button type="button" class="button button--quiet" data-remove="${escapeHtml(w.word)}" aria-label="Remove ${escapeHtml(w.word)}">Remove</button>
                  </td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>`;
  }
  for (const radio of $$('input[name="setting-model"]')) radio.checked = radio.value === settings.model;
  for (const radio of $$('input[name="setting-voice"]')) radio.checked = radio.value === settings.voice;
  $('#setting-gpu-row').hidden = !state.gpuAvailable;
  $('#setting-gpu').checked = settings.gpu;
}

function changeSettings(changes) {
  Object.assign(settings, profile.updateSettings(changes));
}

function downloadFile(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function bindEvents() {
  window.addEventListener('hashchange', () => setView(location.hash.slice(1)));
  window.addEventListener('storage', () => {
    profile.reload();
    Object.assign(settings, profile.getSettings());
    if (isLanguage(settings.language) && settings.language !== currentLanguage().code) changeLanguage(settings.language);
    renderExplainSwitch();
    updateWordsCount();
  });

  for (const select of $$('[data-language-select]')) {
    select.addEventListener('change', (event) => changeLanguage(event.target.value, { announce: event.target.id === 'setting-language' }));
  }
  document.addEventListener('change', (event) => {
    if (event.target.name === 'explain' || event.target.name === 'setting-explain') changeExplain(event.target.value);
  });

  $('.wordmark').addEventListener('click', (event) => {
    // Ctrl-, Cmd- and middle-clicks still open the home page in a new tab.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goHome();
  });
  $('#check-button').addEventListener('click', startChecking);
  $('#examples').addEventListener('click', (event) => {
    const button = event.target.closest('[data-example]');
    if (!button) return;
    $('#script-input').value = EXAMPLES[button.dataset.example];
    startChecking();
  });
  $('#edit-button').addEventListener('click', startEditing);
  $('#clear-button').addEventListener('click', () => {
    setScript('');
    $('#script-input').value = '';
    startEditing();
  });
  $('#copy-button').addEventListener('click', async () => {
    const text = state.editing ? $('#script-input').value : state.script;
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied your script.');
    } catch {
      toast('Copying is blocked here. Select the text and copy it by hand.');
    }
  });
  $('#script-input').addEventListener('input', (event) => {
    state.script = event.target.value;
    renderTextButtons();
  });
  $('#script-input').addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') startChecking();
  });
  $('#show-filter').addEventListener('change', (event) => {
    changeSettings({ show: event.target.value });
    renderCheck(false);
  });
  $('#script-view').addEventListener('click', (event) => {
    const target = event.target.closest('[data-index]');
    if (target) selectToken(Number(target.dataset.index));
  });
  $('#panel-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.selected !== null) closePanel();
  });

  // Delegated buttons used in several places.
  document.addEventListener('click', (event) => {
    const speakButton = event.target.closest('[data-speak]');
    if (speakButton) speak(speakButton.dataset.speak, settings.voice);
    const useButton = event.target.closest('[data-use]');
    if (useButton && state.selected !== null) useAlternative(state.selected, useButton.dataset.use);
    const practiseButton = event.target.closest('[data-practise]');
    if (practiseButton) practiceWord(practiseButton.dataset.practise);
    const removeButton = event.target.closest('[data-remove]');
    if (removeButton) {
      profile.removeWord(removeButton.dataset.remove);
      renderWords();
      toast(`Removed “${removeButton.dataset.remove}”.`);
    }
  });

  // Practice
  $('#setup').addEventListener('change', (event) => {
    if (event.target.name === 'setup-model') changeSettings({ model: event.target.value });
    if (event.target.name === 'setup-gpu') changeSettings({ gpu: event.target.checked });
    state.setup.error = null;
    modelIsCached().then((cached) => {
      state.setup.cached = cached;
      renderSetup();
    });
  });
  $('#setup').addEventListener('click', (event) => {
    if (event.target.closest('#start-model')) startModel();
  });
  $('#practice-body').addEventListener('change', (event) => {
    if (event.target.name === 'mode') {
      setPracticeMode(event.target.value);
      renderPractice();
    } else if (event.target.id === 'text-situation') {
      state.texts.situation = event.target.value;
      state.texts.index = 0;
      resetRead();
      renderRead();
    }
  });
  $('#drill').addEventListener('click', (event) => {
    const p = state.practice;
    if (event.target.closest('#drill-record')) {
      if (p.phase === 'recording') finishDrillRecording();
      else if (p.phase !== 'checking') startDrillRecording();
    } else if (event.target.closest('#drill-next') || event.target.closest('#drill-skip')) {
      nextDrillWord();
    } else if (event.target.closest('#drill-ignore')) {
      const word = p.queue[p.index];
      profile.discardLastAttempt(word);
      p.sessionResults.pop();
      p.phase = 'idle';
      p.result = null;
      updateWordsCount();
      renderDrill();
      toast('That recording was ignored.');
    } else if (event.target.closest('#drill-new')) {
      startBankRound();
      renderDrill();
    } else if (event.target.closest('#drill-restart')) {
      Object.assign(p, { index: 0, phase: 'idle', result: null, sessionResults: [] });
      renderDrill();
    } else if (event.target.closest('#drill-missed')) {
      const missed = [...new Set(p.sessionResults.filter((r) => !r.ok).map((r) => r.word))];
      buildQueue(missed);
      renderDrill();
    }
  });
  $('#drill').addEventListener('submit', (event) => {
    if (event.target.id !== 'add-word-form') return;
    event.preventDefault();
    const value = $('#add-word').value.trim().split(/\s+/)[0] ?? '';
    if (value) practiceWord(value);
  });
  $('#read').addEventListener('click', (event) => {
    const r = state.read;
    if (event.target.closest('#read-record')) {
      if (r.phase === 'recording') finishReadRecording();
      else if (r.phase !== 'checking') startReadRecording();
    } else if (event.target.closest('#read-again')) {
      r.phase = 'idle';
      r.results = null;
      renderRead();
    } else if (event.target.closest('[data-next-text]')) {
      nextText();
    } else if (event.target.closest('[data-mode]')) {
      setPracticeMode(event.target.closest('[data-mode]').dataset.mode);
      renderPractice();
    } else if (event.target.closest('#read-practise-missed')) {
      buildQueue(r.results.missedWords, { from: 'read' });
      state.practice.mode = 'drill';
      for (const radio of $$('input[name="mode"]')) radio.checked = radio.value === 'drill';
      renderPractice();
    }
  });

  // My words
  $('#export-button').addEventListener('click', () => {
    downloadFile(`presay-words-${new Date().toISOString().slice(0, 10)}.json`, profile.exportProfile());
    toast('Backup downloaded.');
  });
  $('#import-input').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const count = profile.importProfile(await file.text());
      renderWords();
      toast(`Imported ${count} ${count === 1 ? 'word' : 'words'}.`);
    } catch (error) {
      toast(error.message);
    }
  });
  $('#reset-button').addEventListener('click', () => {
    if (!profile.listWords().length) return;
    if (!confirm('Delete all words from your list? This cannot be undone. Export a backup first if you want to keep them.')) return;
    profile.resetWords();
    renderWords();
    toast('Your word list is empty now.');
  });
  $('.settings').addEventListener('change', (event) => {
    if (event.target.matches('[data-language-select]')) return; // has its own message
    if (event.target.name === 'setting-model') changeSettings({ model: event.target.value });
    if (event.target.name === 'setting-voice') changeSettings({ voice: event.target.value });
    if (event.target.id === 'setting-gpu') changeSettings({ gpu: event.target.checked });
    toast('Setting saved.');
  });
  $('#clear-model-button').addEventListener('click', async () => {
    const removed = await clearModelCache();
    toast(removed ? 'Downloaded model deleted. It will download again next time you practise.' : 'There was no downloaded model to delete.');
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

/** The logo: back to the first tab, at the top of the page. */
function goHome() {
  if (state.selected !== null) closePanel();
  if (location.hash) history.pushState(null, '', location.pathname + location.search);
  setView('check');
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

async function init() {
  renderLanguageSelects();
  renderLanguageList();
  renderExplainSwitch();
  bindEvents();
  // Every visit starts on the home page with an empty box. The word list and
  // settings are kept; the script is not.
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  $('#script-input').value = '';
  updateWordsCount();
  setView('check');
  renderCheck(false);
  renderPanel();

  try {
    await loadLexicon();
    if (!state.editing) {
      // The example was opened before the word data arrived.
      state.analysis = analyze(state.script);
      renderPanel();
    }
    renderCheck(false);
    // Practice was opened before the word data arrived: build its round again.
    const p = state.practice;
    if (p.queueFrom !== null && p.phase === 'idle' && !p.sessionResults.length) p.queue = [];
    if (p.phase !== 'recording' && state.read.phase !== 'recording') renderPractice();
    loadDetails()
      .then(() => {
        if (state.selected !== null) renderPanel();
        fetch(metaUrl())
          .then((r) => r.json())
          .then((meta) => {
            $('#data-meta').textContent = `Dictionary: ${meta.words.toLocaleString('en-GB')} words, built ${meta.builtAt}.`;
          })
          .catch(() => {});
      })
      .catch(() => {});
  } catch (error) {
    state.lexiconError = `The word data could not be loaded (${error.message}). Reload the page to try again.`;
    renderCheck(false);
    renderPractice();
  }
}

// Asking for a graphics adapter can wake the GPU, so only do it when the
// practice or settings screens need the answer.
let gpuCheck = null;
function checkGpu() {
  gpuCheck ??= webgpuAvailable().then((available) => {
    state.gpuAvailable = available;
    if (state.view === 'practice' && !recognizer.isReadyFor(recognizerSettings())) renderSetup();
    if (state.view === 'words') renderWords();
    return available;
  });
  return gpuCheck;
}

init();
