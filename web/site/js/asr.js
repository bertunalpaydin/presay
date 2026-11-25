// Talks to the speech recognition worker (asr.worker.js).

export const MODEL_INFO = {
  small: { label: 'Most accurate', size: { cpu: 250, gpu: 590 } },
  base: { label: 'Accurate', size: { cpu: 77, gpu: 206 } },
  tiny: { label: 'Fast', size: { cpu: 41, gpu: 120 } },
};

export async function webgpuAvailable() {
  try {
    return Boolean(await navigator.gpu?.requestAdapter());
  } catch {
    return false;
  }
}

/** Delete the downloaded speech model from the browser cache. */
export async function clearModelCache() {
  if (!('caches' in globalThis)) return false;
  return caches.delete('transformers-cache');
}

export class SpeechRecognizer {
  constructor() {
    this.worker = null;
    this.state = 'idle'; // idle | loading | ready | error
    this.device = null;
    this.loadKey = null;
    this.loadPromise = null;
    this.pending = new Map();
    this.nextId = 1;
    this.progressListeners = new Set();
    this.noticeListeners = new Set();
    this.loadHandlers = null;
  }

  // Tests can replace speech recognition with a fake (see tests/browser-smoke.mjs).
  get mock() {
    return globalThis.__PRESAY_MOCK_ASR__ ?? null;
  }

  onProgress(listener) {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  onNotice(listener) {
    this.noticeListeners.add(listener);
    return () => this.noticeListeners.delete(listener);
  }

  isReadyFor({ model, gpu }) {
    return this.state === 'ready' && this.loadKey === `${model}:${gpu}`;
  }

  ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker(new URL('./asr.worker.js', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', ({ data }) => this.handleMessage(data));
    this.worker.addEventListener('error', (event) => {
      this.failAll(new Error(event.message || 'The speech recognition worker stopped unexpectedly.'));
    });
  }

  handleMessage(data) {
    if (data.type === 'progress') {
      for (const listener of this.progressListeners) listener(data);
    } else if (data.type === 'notice') {
      for (const listener of this.noticeListeners) listener(data.message);
    } else if (data.type === 'ready') {
      this.state = 'ready';
      this.device = data.device;
      this.loadHandlers?.resolve();
      this.loadHandlers = null;
    } else if (data.type === 'result') {
      this.pending.get(data.id)?.resolve(data.text);
      this.pending.delete(data.id);
    } else if (data.type === 'error') {
      const error = new Error(data.message);
      if (data.id !== null && this.pending.has(data.id)) {
        this.pending.get(data.id).reject(error);
        this.pending.delete(data.id);
      } else {
        // Loading failed. The next try gets a fresh worker, which does not
        // remember a download that failed while the connection was down.
        this.failAll(error);
      }
    }
  }

  failAll(error) {
    this.state = 'error';
    this.loadHandlers?.reject(error);
    this.loadHandlers = null;
    this.loadPromise = null;
    for (const { reject } of this.pending.values()) reject(error);
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
  }

  /** Download (first time) and start the model. */
  load({ model, gpu }) {
    const key = `${model}:${gpu}`;
    if (this.mock) {
      this.state = 'ready';
      this.loadKey = key;
      this.device = 'mock';
      return Promise.resolve();
    }
    if (this.loadPromise && this.loadKey === key) return this.loadPromise;
    this.ensureWorker();
    this.state = 'loading';
    this.loadKey = key;
    this.loadPromise = new Promise((resolve, reject) => {
      this.loadHandlers = { resolve, reject };
    });
    // Self-hosting overrides; plain data only (see README).
    const options = JSON.parse(JSON.stringify(globalThis.PRESAY_CONFIG ?? {}));
    this.worker.postMessage({ type: 'load', model, gpu, options });
    return this.loadPromise;
  }

  /**
   * Turn up to 30 seconds of 16 kHz samples into text (see transcribe.js for
   * longer recordings).
   * @param {Float32Array} samples
   * @param {{maxNewTokens?: number}} options
   */
  transcribe(samples, { maxNewTokens } = {}) {
    if (this.mock) return Promise.resolve(this.mock.transcribe(samples, { maxNewTokens }));
    if (this.state !== 'ready') return Promise.reject(new Error('The speech model is not ready yet.'));
    const id = this.nextId++;
    const audio = new Float32Array(samples); // copy, so the original can still be used
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'transcribe', id, audio, maxNewTokens }, [audio.buffer]);
    });
  }
}
