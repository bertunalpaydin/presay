// Runs Whisper speech recognition in a background thread, inside the browser.
// The model files are downloaded once from Hugging Face and cached by the
// browser; audio never leaves the device.

import { ORT_VERSION, TRANSFORMERS_VERSION } from '../vendor/versions.js';

// Transformers.js is loaded from a public CDN, like the WebAssembly runtime
// below, so the repository holds no copy of the minified library. A local copy
// made by `npm run vendor` is the last fallback, for working offline.
const LIBRARY_MIRRORS = [
  `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/dist/transformers.min.js`,
  `https://unpkg.com/@huggingface/transformers@${TRANSFORMERS_VERSION}/dist/transformers.min.js`,
  new URL('../vendor/transformers.min.js', import.meta.url).href,
];

const MODELS = {
  small: 'onnx-community/whisper-small.en',
  base: 'onnx-community/whisper-base.en',
  tiny: 'onnx-community/whisper-tiny.en',
};

// The WebAssembly runtime is too large for Cloudflare Pages' 25 MiB file limit,
// so it is loaded from a public CDN, with a second CDN as a fallback.
const WASM_MIRRORS = [
  `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`,
  `https://unpkg.com/onnxruntime-web@${ORT_VERSION}/dist/`,
];

const SETTINGS = {
  gpu: { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } },
  cpu: { device: 'wasm', dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' } },
};

let library = null;
let transcriber = null;
let loadedKey = null;
let loadedDevice = null;

self.addEventListener('message', async ({ data }) => {
  try {
    if (data.type === 'load') await load(data);
    else if (data.type === 'transcribe') await transcribe(data);
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id ?? null, message: friendlyMessage(error) });
  }
});

function forwardProgress(info) {
  if (info.status === 'progress_total' || info.status === 'progress') {
    self.postMessage({
      type: 'progress',
      status: info.status,
      file: info.file ?? null,
      loaded: info.loaded ?? 0,
      total: info.total ?? 0,
      progress: info.progress ?? 0,
    });
  }
}

// Optional overrides for self-hosting (window.PRESAY_CONFIG, see README):
//   modelHost:  where model files live instead of Hugging Face
//   wasmBase:   where the WebAssembly runtime lives instead of the CDNs
//   libraryUrl: where transformers.min.js lives instead of the CDNs
//   models:     other model ids, e.g. { base: 'my-org/whisper-base.en' }
let config = {};

async function loadLibrary() {
  if (library) return library;
  let lastError = null;
  for (const url of config.libraryUrl ? [config.libraryUrl, ...LIBRARY_MIRRORS] : LIBRARY_MIRRORS) {
    try {
      library = await import(url);
      library.env.allowLocalModels = false;
      library.env.useBrowserCache = true;
      return library;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function createPipeline(model, mode) {
  const { pipeline, env } = await loadLibrary();
  let lastError = null;
  const mirrors = config.wasmBase ? [config.wasmBase, ...WASM_MIRRORS] : WASM_MIRRORS;
  for (const mirror of mirrors) {
    env.backends.onnx.wasm.wasmPaths = mirror;
    try {
      return await pipeline('automatic-speech-recognition', config.models?.[model] ?? MODELS[model], {
        ...SETTINGS[mode],
        progress_callback: forwardProgress,
      });
    } catch (error) {
      lastError = error;
      // Only try the next CDN when the runtime itself failed to load.
      if (!/wasm|onnxruntime|fetch|import|module/i.test(String(error?.message ?? error))) break;
    }
  }
  throw lastError;
}

async function load({ model, gpu, options = {} }) {
  if (!MODELS[model]) throw new Error(`Unknown model "${model}".`);
  config = options;
  const { env } = await loadLibrary();
  if (config.modelHost) env.remoteHost = config.modelHost;
  const key = `${model}:${gpu ? 'gpu' : 'cpu'}`;
  if (transcriber && loadedKey === key) {
    self.postMessage({ type: 'ready', device: loadedDevice });
    return;
  }
  await transcriber?.dispose?.();
  transcriber = null;
  let mode = gpu ? 'gpu' : 'cpu';
  try {
    transcriber = await createPipeline(model, mode);
  } catch (error) {
    if (mode !== 'gpu') throw error;
    // The graphics card path failed (unsupported or out of memory): use the CPU.
    self.postMessage({ type: 'notice', message: 'Graphics card mode did not work here, so Presay switched to the CPU.' });
    mode = 'cpu';
    transcriber = await createPipeline(model, mode);
  }
  loadedKey = `${model}:${mode}`;
  loadedDevice = SETTINGS[mode].device;
  self.postMessage({ type: 'ready', device: loadedDevice });
}

// Audio arrives in pieces of at most 25 seconds (see transcribe.js), so no
// chunking is needed here. max_new_tokens stops runaway repetition.
async function transcribe({ id, audio, maxNewTokens }) {
  if (!transcriber) throw new Error('The speech model is not loaded yet.');
  const output = await transcriber(audio, { max_new_tokens: maxNewTokens ?? 24 });
  const text = (Array.isArray(output) ? output.map((o) => o.text).join(' ') : output.text) ?? '';
  self.postMessage({ type: 'result', id, text: text.trim() });
}

function friendlyMessage(error) {
  const message = String(error?.message ?? error);
  if (/failed to fetch|networkerror|load failed|network|dynamically imported module|importing a module/i.test(message)) {
    return 'The speech model could not be downloaded. Check your internet connection and try again.';
  }
  if (/memory|allocation|out of range|oom/i.test(message)) {
    return 'This device ran out of memory while loading the speech model. Choose the Fast model in Settings and try again.';
  }
  return `Speech recognition failed: ${message}`;
}
