#!/usr/bin/env node
// End-to-end check in a real (headless) Chrome:
//   - the first-language picker changes the marks and tips,
//     and explanations switch between English and the first language
//   - the script view marks risky words and the word panel works
//   - replacing a word with an easier alternative updates the script
//   - word-by-word practice and whole-script practice record, compare and save
//   - "My words" lists the results
// Speech recognition is replaced by a fake that returns prepared text, because
// the real model cannot be downloaded in CI. The microphone is Chrome's fake
// device. Everything else is the real app.
//
// Run with:  npm run test:browser   (set CHROME_PATH if Chrome is elsewhere)

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 5199;
const BASE = `http://localhost:${PORT}/`;
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const SHOTS = process.env.SHOTS_DIR ?? null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(condition, message) {
  if (condition) console.log(`  ok  ${message}`);
  else {
    failures++;
    console.log(`  FAIL ${message}`);
  }
}

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/serve.mjs')], { env: { ...process.env, PORT: String(PORT) } });
await sleep(600);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-background-networking', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});

const errors = [];
async function newPage(viewport, { mock = true } = {}) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('dialog', (d) => d.accept());
  await page.setViewport(viewport);
  // Fake speech recognition: returns the next prepared answer.
  if (mock) {
    await page.evaluateOnNewDocument(() => {
      window.__answers = [];
      window.__PRESAY_MOCK_ASR__ = { transcribe: () => window.__answers.shift() ?? '' };
    });
  }
  return page;
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
}

// A typical interview answer. Several checks below expect the marks it gets.
const SCRIPT = `Thank you for having me. I'm in the final year of my computer science degree, and over the last three years I've worked on several projects, including a property management system and a voice assistant.

What I enjoy most is turning a rough idea into something people actually use. In my group project I was responsible for testing, which taught me how to communicate clearly and handle deadlines.

I think my strongest skills are problem solving and attention to detail, and I would love to bring them to your team.`;

/** Type a script into the box and press "Check script". */
async function checkScript(page, text = SCRIPT) {
  await page.$eval(
    '#script-input',
    (el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    text,
  );
  await page.click('#check-button');
  await page.waitForSelector('#script-view .mark');
}

try {
  console.log('Fresh start');
  const page = await newPage({ width: 1366, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  const freshStart = (p) =>
    p.evaluate(
      () =>
        !document.querySelector('[data-view="check"]').hidden &&
        !document.querySelector('#script-input').hidden &&
        document.querySelector('#script-input').value === '' &&
        document.querySelector('#script-view').hidden &&
        location.hash === '',
    );
  check(await freshStart(page), 'the site opens on the home page with an empty box');
  const exampleNames = await page.$$eval('#examples [data-example]', (els) => els.map((e) => e.textContent.trim()));
  check(
    (await page.$eval('#examples', (e) => !e.hidden)) && exampleNames.join('|') === 'Job interview|Presentation|Team meeting',
    `an empty box offers three examples (${exampleNames.join(', ')})`,
  );
  check(await page.$eval('#copy-button', (e) => e.hidden), 'copy and clear stay hidden until there is text');
  for (const name of ['interview', 'talk', 'meeting']) {
    await page.click(`[data-example="${name}"]`);
    await page.waitForSelector('#script-view .mark');
    const count = await page.$$eval('#script-view .mark', (els) => els.length);
    check(count >= 6, `the ${name} example is filled in and checked (${count} marks)`);
    await page.click('#clear-button');
    await sleep(100);
  }
  check(await freshStart(page), 'Clear goes back to the empty box');
  await page.$eval('#script-input', (el) => {
    el.value = 'Hello';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  check(await page.$eval('#examples', (e) => e.hidden), 'the examples step aside once you start typing');
  await checkScript(page);

  console.log('First language');
  const markedWords = () => page.$$eval('#script-view .mark', (els) => els.map((e) => e.firstChild.textContent));
  const explainNative = () => page.$eval('input[name="explain"][value="native"]', (e) => e.checked);
  check((await page.$eval('#language-select', (e) => e.value)) === 'tr' && !(await explainNative()), 'an English-only browser starts with Turkish rules and English explanations');
  check((await page.$$eval('#language-select option', (els) => els.length)) === 10, 'the picker lists the ten languages');
  check(!(await page.$$eval('#language-select option', (els) => els.some((e) => /another/i.test(e.textContent)))), 'there is no "Another language" choice');
  await page.select('#language-select', 'ja');
  await sleep(400);
  const japanese = await markedWords();
  check(japanese.includes('clearly'), 'Japanese marks r/l words such as "clearly"');
  await page.select('#language-select', 'tr');
  await sleep(400);
  check(!(await markedWords()).includes('clearly'), 'Turkish marks a different set of words');
  check(await explainNative(), 'choosing a language turns on explanations in that language');
  check((await page.$eval('[data-native-label]', (e) => e.textContent)) === 'Türkçe', 'the explanations switch offers Türkçe');
  await page.select('#language-select', 'ar');
  await sleep(400);
  await page.evaluate(() => [...document.querySelectorAll('#script-view .mark')].find((e) => e.firstChild.textContent === 'property').click());
  await page.waitForSelector('#panel-content section[lang="ar"][dir="rtl"] .reasons');
  check(true, 'the word panel explains the word in Arabic, right to left');
  await page.click('input[name="explain"][value="en"] + span');
  await sleep(200);
  check(/Why it can be hard/.test(await page.$eval('#panel-content', (e) => e.innerText)), 'switching to English changes the panel at once');
  await page.click('input[name="explain"][value="native"] + span');
  await page.select('#language-select', 'tr');
  await sleep(400);
  await page.click('#panel-close').catch(() => {});
  await page.reload({ waitUntil: 'networkidle0' });
  check((await page.$eval('#language-select', (e) => e.value)) === 'tr' && (await explainNative()), 'the choices are remembered after a reload');
  check(await freshStart(page), 'the script is not: a reload starts with an empty box again');
  await page.click('input[name="explain"][value="en"] + span');
  await checkScript(page);

  console.log('Check script');
  const marks = await markedWords();
  check(marks.includes('three') && marks.includes('think'), `sample script is marked (${marks.length} marks)`);
  check(!marks.includes('the'), 'common words like "the" are not marked');
  await shot(page, '1-check');

  await page.evaluate(() => [...document.querySelectorAll('#script-view .mark')].find((e) => e.firstChild.textContent === 'three').click());
  await page.waitForFunction(() => document.querySelector('#panel-content .ipa'), { timeout: 10000 });
  const panel = await page.$eval('#panel-content', (e) => e.innerText);
  check(panel.includes('/θri/'), 'panel shows the pronunciation of "three"');
  check(/free|tree/.test(panel), 'panel lists words "three" may be heard as');
  check(/θ → t/.test(panel), 'each of those words says which sound slipped');
  const summary = await page.$eval('#summary', (e) => e.innerText);
  check(/10 words to watch/.test(summary) && /3 high risk/.test(summary), `summary counts the marks (${summary.replace(/\s+/g, ' ')})`);

  await page.evaluate(() => [...document.querySelectorAll('#script-view .mark')].find((e) => e.firstChild.textContent === 'think').click());
  await page.waitForSelector('#panel-content [data-use]');
  const alternative = await page.$eval('#panel-content [data-use]', (e) => e.dataset.use);
  await page.click('#panel-content [data-use]');
  await sleep(200);
  const scriptText = await page.$eval('#script-input', (e) => e.value);
  check(scriptText.includes(` ${alternative} my strongest`), `using an alternative replaces "think" with "${alternative}"`);
  await shot(page, '2-panel');

  await page.click('input[name="show"][value="high"] + span');
  const highOnly = await page.$$eval('#script-view .mark', (els) => els.every((e) => !e.classList.contains('mark--medium')));
  check(highOnly, '"Most risky" hides medium marks');
  await page.click('input[name="show"][value="all"] + span');

  await page.click('#edit-button');
  check(await page.$eval('#script-input', (e) => !e.hidden), 'Edit text switches back to the text box');
  await page.click('#check-button');
  check(await page.$eval('#script-view', (e) => !e.hidden), 'Check script shows the marked view again');

  console.log('Practice, word by word');
  await page.click('a[data-nav="practice"]');
  await page.waitForSelector('#start-model', { visible: true });
  const setupText = await page.$eval('#setup', (e) => e.innerText);
  check(/about 77 MB/i.test(setupText), 'setup explains the one-time download size');
  await page.click('#start-model');
  await page.waitForSelector('#drill-record', { visible: true });
  const firstWord = await page.$eval('.drill__word', (e) => e.textContent);
  check(firstWord === 'thank', `the drill starts with the riskiest word ("${firstWord}")`);
  await page.evaluate(() => window.__answers.push('Tank.'));
  await page.click('#drill-record');
  await sleep(1500);
  // Recording stops by itself after a pause; stop it by hand if it has not.
  if (await page.$('#drill-record.is-recording')) await page.click('#drill-record');
  await page.waitForSelector('.result', { timeout: 10000 });
  const miss = await page.$eval('.result', (e) => e.innerText);
  check(miss.includes('tank'), `a different word is reported ("${miss.trim()}")`);
  await shot(page, '3-drill-miss');

  await page.evaluate(() => window.__answers.push('Thank.'));
  check(await page.$eval('#drill-record', (e) => e.textContent.trim() === 'Record again'), 'the record button offers to record again');
  await page.click('#drill-record');
  await sleep(1500);
  if (await page.$('#drill-record.is-recording')) await page.click('#drill-record');
  await page.waitForSelector('.result--ok', { timeout: 10000 });
  check(true, 'the right word is reported as heard correctly');

  await page.click('#drill-ignore');
  await sleep(100);
  const afterIgnore = await page.evaluate(() => JSON.parse(localStorage.getItem('presay.profile.v1')).words.thank.attempts.length);
  check(afterIgnore === 1, '"Ignore this recording" removes the last try');

  console.log('Practice, whole script');
  await page.click('input[name="mode"][value="read"] + span');
  await page.waitForSelector('#read-record');
  const script = await page.$eval('#script-input', (e) => e.value);
  await page.evaluate((s) => window.__answers.push(s.replace('three', 'tree').replace('strongest', 'strong')), script);
  await page.click('#read-record');
  await sleep(1500);
  await page.click('#read-record');
  await page.waitForSelector('.heard-miss', { timeout: 10000 });
  const missed = await page.$$eval('.heard-miss', (els) => els.map((e) => e.firstChild.textContent));
  check(missed.includes('three') && missed.includes('strongest'), `changed words are marked (${missed.join(', ')})`);
  const readSummary = await page.$eval('#read .summary', (e) => e.innerText);
  check(/We heard \d+ of \d+ words/.test(readSummary), `summary: ${readSummary.split('\n')[0]}`);
  await shot(page, '4-read');

  console.log('My words');
  await page.click('a[data-nav="words"]');
  await page.waitForSelector('#words-list tbody tr');
  const rows = await page.$$eval('#words-list tbody tr', (els) => els.map((e) => e.querySelector('.word').lastChild.textContent));
  check(rows.includes('three') && rows.includes('thank') && rows.includes('strongest'), `misheard words are listed (${rows.join(', ')})`);
  check(!rows.includes('worked'), 'words that were always heard correctly are not listed');
  const exported = await page.evaluate(async () => {
    const mod = await import('./js/profile.js');
    return JSON.parse(mod.exportProfile());
  });
  check(exported.app === 'presay' && exported.words.three, 'export contains the word list');
  await shot(page, '5-words');
  await page.click('#reset-button');
  await sleep(200);
  check(await page.$eval('#words-list', (e) => e.innerText.includes('No words yet')), 'Delete all words empties the list');

  console.log('Logo');
  await page.click('a[data-nav="about"]');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(200);
  check(await page.evaluate(() => window.scrollY > 200), 'the About page is scrolled down');
  await page.click('.wordmark');
  await sleep(1200); // smooth scrolling
  const afterLogo = await page.evaluate(() => ({
    home: !document.querySelector('[data-view="check"]').hidden,
    current: document.querySelector('[data-nav="check"]').getAttribute('aria-current'),
    hash: location.hash,
    top: window.scrollY,
    script: document.querySelector('#script-input').value,
  }));
  check(afterLogo.home && afterLogo.current === 'page' && afterLogo.hash === '', 'clicking the logo goes back to the first tab');
  check(afterLogo.top < 2, `and to the top of the page (scrollY ${Math.round(afterLogo.top)})`);
  check(afterLogo.script.length > 0, 'the text written in this visit is kept');
  await page.goBack();
  await sleep(300);
  check(await page.$eval('[data-view="about"]', (e) => !e.hidden), 'the back button returns to the page before');
  check(await page.$eval('.wordmark', (e) => e.getAttribute('href') === '/' && e.textContent.trim() === 'Presay'), 'the logo link points to the home page and is named "Presay"');

  console.log('Practice texts');
  const fresh = await newPage({ width: 1280, height: 860 });
  await fresh.goto(BASE, { waitUntil: 'networkidle0' });
  await fresh.click('a[data-nav="practice"]');
  await fresh.waitForSelector('#start-model', { visible: true });
  check(/Most accurate/.test(await fresh.$eval('#setup', (e) => e.innerText)), 'setup offers the most accurate speech model too');
  await fresh.click('#start-model');
  await fresh.waitForSelector('#read .texts__title', { visible: true });
  check(await fresh.$eval('input[name="mode"][value="texts"]', (e) => e.checked), 'with no script of your own, Practice opens on the practice texts');
  const titleOf = () => fresh.$eval('#read .texts__title', (e) => e.textContent);
  const countOf = () => fresh.$eval('#read .texts__count', (e) => e.textContent);
  const totalTexts = (await import('../site/js/practice-texts.js')).PRACTICE_TEXTS.length;
  check((await countOf()) === `Text 1 of ${totalTexts}`, `all ${totalTexts} texts are offered (${await countOf()})`);
  const toWatch = await fresh.$$eval('#read .script-view .mark', (els) => els.length);
  check(toWatch >= 4, `the words to watch are underlined before reading (${toWatch})`);
  const firstTitle = await titleOf();
  const body = await fresh.$eval('#read .script-view', (e) => e.innerText);
  await fresh.evaluate((t) => window.__answers.push(t.replace('Thanks', 'Tanks')), body);
  await fresh.click('#read-record');
  await sleep(1200);
  await fresh.click('#read-record');
  await fresh.waitForSelector('#read .heard-miss', { timeout: 10000 });
  const textMisses = await fresh.$$eval('#read .heard-miss', (els) => els.map((e) => e.firstChild.textContent));
  check(textMisses.join() === 'Thanks', `the misheard word is shown (${textMisses.join(', ')})`);
  const onList = await fresh.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('presay.profile.v1')).words).some((w) => w.startsWith('thank')));
  check(onList, 'and goes on your word list');
  await fresh.click('.read__actions [data-next-text]');
  await sleep(200);
  check((await titleOf()) !== firstTitle && (await countOf()) === `Text 2 of ${totalTexts}`, `Next text moves on ("${await titleOf()}")`);
  check(await fresh.$eval('#read-record', (e) => !e.closest('[hidden]') && /Start reading/.test(e.textContent)), 'the next text is ready to read');
  await fresh.select('#text-situation', 'interview');
  await sleep(200);
  check(/^Text 1 of \d$/.test(await countOf()) && (await fresh.$eval('#read .texts__situation', (e) => e.textContent)) === 'Job interviews', `choosing a situation shows only its texts (${await countOf()})`);
  await fresh.click('input[name="mode"][value="read"] + span');
  check(/No script yet/.test(await fresh.$eval('#read', (e) => e.innerText)), '"My script" asks for a script first');
  await fresh.click('#read [data-mode="texts"]');
  check(await fresh.$eval('input[name="mode"][value="texts"]', (e) => e.checked), 'and links back to the practice texts');
  await shot(fresh, '9-texts');

  console.log('Word practice with no script');
  await fresh.click('input[name="mode"][value="drill"] + span');
  await fresh.waitForSelector('.drill__word');
  const roundWords = async () => fresh.evaluate(() => document.querySelector('.drill__count').textContent);
  check(/^Word 1 of 10$/.test(await roundWords()) && (await fresh.$('.drill__source')) !== null, `a round of ten everyday words starts by itself (${await roundWords()})`);
  const drillWord = () => fresh.$eval('.drill__word', (e) => e.textContent);
  const say = async (answer) => {
    await fresh.evaluate((a) => window.__answers.push(a), answer);
    await fresh.click('#drill-record');
    await sleep(1500);
    if (await fresh.$('#drill-record.is-recording')) await fresh.click('#drill-record');
    await fresh.waitForSelector('.result', { timeout: 10000 });
  };
  const target = await drillWord();
  await say(target === 'thank' ? 'Thanks for watching.' : 'Thank you.');
  check(await fresh.$eval('.result', (e) => e.classList.contains('result--neutral')), 'a stock phrase from silence is not counted as a miss');
  await say(target.endsWith('s') ? `${target}.` : `${target}s.`);
  check(await fresh.$eval('.result', (e) => e.classList.contains('result--ok')), `"${target}" heard with an added ending still counts`);
  await say('Elephant umbrella.');
  check(await fresh.$eval('.result', (e) => e.classList.contains('result--miss') && /can be wrong too/.test(e.innerText)), 'a real miss says that recognition can be wrong too');
  await fresh.click('#drill-ignore');
  await fresh.click('#drill-new');
  await sleep(200);
  const nextFirst = await drillWord();
  check(/^Word 1 of 10$/.test(await roundWords()) && nextFirst !== target, `"New set of words" starts a round of different words (now "${nextFirst}")`);

  console.log('A short script is topped up with everyday words');
  await fresh.evaluate(async () => {
    const profile = await import('./js/profile.js');
    profile.recordAttempt('weather', false, 'whether');
    profile.recordAttempt('weather', false, 'whether');
  });
  await fresh.click('a[data-nav="check"]');
  await checkScript(fresh, 'Thank you for the three ideas.');
  await fresh.click('a[data-nav="practice"]');
  await fresh.waitForSelector('.drill__word');
  check(/^Word 1 of 10$/.test(await roundWords()), `a script with few marked words still gives ten words (${await roundWords()})`);
  const sources = [];
  for (let i = 0; i < 10; i++) {
    sources.push(await fresh.$eval('.drill__source', (e) => e.textContent));
    if (i < 9) await fresh.click('#drill-skip');
  }
  check(sources[0] === 'From your script', `the script's own words come first ("${sources[0]}")`);
  check(sources.indexOf('From your word list') > sources.lastIndexOf('From your script'), 'then words flagged on My words');
  check(sources.at(-1).startsWith('Everyday word to watch for'), `and everyday words fill the rest ("${sources.at(-1)}")`);

  console.log('Phone layout');
  const phone = await newPage({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await phone.goto(BASE, { waitUntil: 'networkidle0' });
  const phoneOverflow = () => phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!(await phoneOverflow()), 'the empty home page fits a phone, examples included');
  await checkScript(phone);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, 'no horizontal scrolling on a phone');
  await shot(phone, '6-phone');
  await phone.evaluate(() => document.querySelector('#script-view .mark--high').click());
  await sleep(400);
  check(await phone.$eval('#panel', (e) => e.classList.contains('is-open')), 'the word panel opens as a bottom sheet');
  await shot(phone, '7-phone-panel');
  await phone.click('#panel-close');
  await sleep(400);
  check(await phone.$eval('#panel', (e) => !e.classList.contains('is-open')), 'the bottom sheet closes');
  check(await phone.$eval('#panel', (e) => getComputedStyle(e).visibility === 'hidden'), 'the closed sheet is hidden from keyboard and screen readers');

  console.log('Real speech worker (offline here, so it must fail politely)');
  const real = await newPage({ width: 1280, height: 860 }, { mock: false });
  await real.goto(`${BASE}#practice`, { waitUntil: 'networkidle0' });
  check(await freshStart(real), 'an old link to #practice still opens on the home page');
  await real.click('a[data-nav="practice"]');
  await real.waitForSelector('#start-model', { visible: true });
  await real.click('#start-model');
  await real.waitForSelector('#setup .alert', { timeout: 90000 });
  const message = await real.$eval('#setup .alert', (e) => e.innerText);
  check(/could not be downloaded|failed/i.test(message), `worker loads and reports a clear error: "${message}"`);
  check(await real.$eval('#start-model', (e) => !e.disabled), 'the start button can be pressed again after an error');
  await shot(real, '8-setup-error');
} catch (error) {
  failures++;
  console.error(error);
} finally {
  await browser.close();
  server.kill();
}

const realErrors = errors.filter((e) => !/No available adapters|Failed to load resource|ERR_TUNNEL|ERR_CONNECTION|huggingface|jsdelivr|unpkg/i.test(e));
check(realErrors.length === 0, `no errors in the browser console${realErrors.length ? `: ${realErrors.join(' | ')}` : ''}`);
console.log(failures ? `\n${failures} check(s) failed` : '\nAll browser checks passed');
process.exit(failures ? 1 : 0);
