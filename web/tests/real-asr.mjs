#!/usr/bin/env node
// Runs the real speech worker with a real Whisper model in headless Chrome,
// with every file served locally (no internet needed):
//
//   MODELS_DIR  folder with <model id>/... files (e.g. Xenova/whisper-tiny/config.json, onnx/*.onnx)
//   SAMPLE      a 16 kHz speech recording (e.g. the public-domain JFK "ask not" clip)
//   MODEL_ID    model id inside MODELS_DIR (default Xenova/whisper-tiny)
//   EXPECT      words the transcript must contain
//
// This checks the parts the browser smoke test has to fake: the worker, the
// pipeline settings (q8 files, short and long audio) and the result format.
// Transformers.js comes from a second local origin, the way the site loads it
// from the CDN.
//
// Run with:  MODELS_DIR=... SAMPLE=... node tests/real-asr.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 5299;
const BASE = `http://localhost:${PORT}`;
const MODELS_DIR = process.env.MODELS_DIR;
const SAMPLE = process.env.SAMPLE;
const MODEL_ID = process.env.MODEL_ID ?? 'Xenova/whisper-tiny';
const EXPECT = (process.env.EXPECT ?? 'ask not what your country can do for you').toLowerCase();
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';

if (!MODELS_DIR || !SAMPLE) {
  console.log('Skipped: set MODELS_DIR and SAMPLE to run this test.');
  process.exit(0);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.wasm': 'application/wasm', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

function resolveFile(pathname) {
  if (pathname.startsWith('/test-models/')) {
    return path.join(MODELS_DIR, pathname.slice('/test-models/'.length).replace('/resolve/main/', '/'));
  }
  if (pathname.startsWith('/test-ort/')) return path.join(ROOT, 'node_modules/onnxruntime-web/dist', pathname.slice('/test-ort/'.length));
  if (pathname === '/test-sample.wav') return SAMPLE;
  return path.join(ROOT, 'site', pathname === '/' ? 'index.html' : pathname);
}

const server = http.createServer((req, res) => {
  const file = resolveFile(decodeURIComponent(new URL(req.url, BASE).pathname));
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, headers).end('not found');
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(PORT, resolve));

// A second origin stands in for the CDN that serves Transformers.js, with the
// same CORS headers, so the cross-origin import is tested under COEP.
const LIBRARY_URL = 'http://localhost:5300/transformers.min.js';
let libraryRequests = 0;
const libraryServer = http.createServer((req, res) => {
  libraryRequests++;
  res.writeHead(200, {
    'Content-Type': 'text/javascript',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  fs.createReadStream(path.join(ROOT, 'node_modules/@huggingface/transformers/dist/transformers.min.js')).pipe(res);
});
await new Promise((resolve) => libraryServer.listen(5300, resolve));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-background-networking'] });
let failed = false;
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.evaluateOnNewDocument(
    (config) => {
      window.PRESAY_CONFIG = config;
    },
    { modelHost: `${BASE}/test-models/`, wasmBase: `${BASE}/test-ort/`, libraryUrl: LIBRARY_URL, models: { tiny: MODEL_ID } },
  );
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });

  const started = Date.now();
  const result = await page.evaluate(async () => {
    const { SpeechRecognizer } = await import('/js/asr.js');
    const { decodeTo16k, trimSilence } = await import('/js/audio.js');
    const { transcribeShort, transcribeLong } = await import('/js/transcribe.js');
    const recognizer = new SpeechRecognizer();
    let progressEvents = 0;
    recognizer.onProgress(() => progressEvents++);
    const t0 = performance.now();
    await recognizer.load({ model: 'tiny', gpu: false });
    const loadMs = performance.now() - t0;
    const samples = await decodeTo16k(await (await fetch('/test-sample.wav')).blob());
    const speech = trimSilence(samples) ?? samples;
    const t1 = performance.now();
    const short = (await transcribeShort(recognizer, speech.slice(0, 16000 * 3))).join(' ');
    const shortMs = performance.now() - t1;
    const full = (await transcribeLong(recognizer, speech)).join(' ');
    // Three copies with gaps: over 30 seconds, so the long-audio path chunks it.
    const gap = new Float32Array(16000);
    const long = new Float32Array(speech.length * 3 + gap.length * 2);
    long.set(speech, 0);
    long.set(speech, speech.length + gap.length);
    long.set(speech, 2 * (speech.length + gap.length));
    const t2 = performance.now();
    let parts = 0;
    const longText = (await transcribeLong(recognizer, long, (done, total) => (parts = total))).join(' ');
    const longMs = performance.now() - t2;
    return { short, shortMs, full, longText, parts, longSeconds: long.length / 16000, longMs, loadMs, progressEvents, device: recognizer.device, isolated: crossOriginIsolated };
  });

  const plain = (text) => text.toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`Loaded in ${(result.loadMs / 1000).toFixed(1)} s on ${result.device} (cross-origin isolated: ${result.isolated}), ${result.progressEvents} progress events`);
  console.log(`Short (3 s, ${(result.shortMs / 1000).toFixed(1)} s): "${result.short}"`);
  console.log(`Full: "${result.full}"`);
  console.log(`Long (${result.longSeconds.toFixed(0)} s audio in ${result.parts} parts, ${(result.longMs / 1000).toFixed(1)} s): "${result.longText}"`);
  const countryCount = (plain(result.longText).match(/country/g) ?? []).length;
  const checks = [
    [libraryRequests > 0, 'Transformers.js loads from another origin, as from the CDN'],
    [result.progressEvents > 0, 'download progress is reported'],
    [result.short.trim().length > 0, 'a short clip gives text'],
    [plain(result.full).includes(EXPECT), `the full clip contains "${EXPECT}"`],
    [result.parts >= 2, 'a recording over 30 seconds is split into parts'],
    [countryCount >= 5 && countryCount <= 7, `the long recording keeps every part and repeats nothing extra ("country" ${countryCount} times, expected 6)`],
  ];
  for (const [ok, label] of checks) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`);
    if (!ok) failed = true;
  }
  if (failed) console.log(logs.join('\n'));
  console.log(`Total ${((Date.now() - started) / 1000).toFixed(1)} s`);
} catch (error) {
  failed = true;
  console.error(error);
} finally {
  await browser.close();
}

// Full app flow: the sample plays through Chrome's fake microphone, and the
// "Whole script" practice records, transcribes and compares it.
console.log('\nWhole-script practice through the microphone');
const micBrowser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-background-networking',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${path.resolve(SAMPLE)}`,
  ],
});
try {
  const page = await micBrowser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluateOnNewDocument(
    (config) => {
      window.PRESAY_CONFIG = config;
      if (!localStorage.getItem('presay.profile.v1')) {
        localStorage.setItem('presay.profile.v1', JSON.stringify({ version: 1, words: {}, settings: { model: 'tiny' } }));
      }
    },
    { modelHost: `${BASE}/test-models/`, wasmBase: `${BASE}/test-ort/`, libraryUrl: LIBRARY_URL, models: { tiny: MODEL_ID } },
  );
  const script = process.env.SCRIPT ?? 'And so, my fellow Americans, ask not what your country can do for you; ask what you can do for your country.';
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  await page.$eval('#script-input', (e, text) => {
    e.value = text;
    e.dispatchEvent(new Event('input', { bubbles: true }));
  }, script);
  await page.click('#check-button');
  await page.click('a[data-nav="practice"]');
  await page.waitForSelector('#start-model', { visible: true });
  await page.click('#start-model');
  await page.waitForSelector('#practice-body:not([hidden])', { timeout: 120000 });
  await page.click('input[name="mode"][value="read"] + span');
  await page.waitForSelector('#read-record');
  await page.click('#read-record');
  await new Promise((r) => setTimeout(r, 12500));
  await page.click('#read-record');
  await page.waitForSelector('#read .read__result .summary', { timeout: 120000 });
  const summary = await page.$eval('#read .read__result .summary', (e) => e.innerText);
  const [, heard, total] = summary.match(/We heard (\d+) of (\d+)/) ?? [];
  console.log(`  ${summary.split('\n')[0]}`);
  const ok = Number(heard) / Number(total) >= 0.8;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} most words of the recorded speech are matched to the script`);
  console.log(`  ${errors.length ? 'FAIL' : 'ok  '} no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  if (!ok || errors.length) failed = true;
  if (process.env.SHOTS_DIR) await page.screenshot({ path: path.join(process.env.SHOTS_DIR, '9-real-read.png') });
} catch (error) {
  failed = true;
  console.error(error);
} finally {
  await micBrowser.close();
  server.close();
  libraryServer.close();
}
process.exit(failed ? 1 : 0);
