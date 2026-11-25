// Microphone recording. Produces 16 kHz mono samples, the format Whisper expects.

const SAMPLE_RATE = 16000;

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find((type) => MediaRecorder.isTypeSupported?.(type)) ?? '';
}

export function canRecord() {
  return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
}

/** Explain a getUserMedia error in plain words. */
export function microphoneErrorMessage(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone access is blocked. Allow it in your browser’s site settings, then try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone was found. Connect one and try again.';
    case 'NotReadableError':
      return 'Your microphone is being used by another app. Close it and try again.';
    default:
      return `The microphone could not start (${error?.message ?? 'unknown error'}).`;
  }
}

export class Recorder {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.context = null;
    this.levelTimer = null;
    this.stopTimer = null;
    this.startedAt = 0;
  }

  get recording() {
    return this.recorder?.state === 'recording';
  }

  /**
   * Start recording.
   * @param {{onLevel?: (level: number) => void, maxSeconds?: number, onAutoStop?: () => void}} options
   */
  async start({ onLevel, maxSeconds = 300, onAutoStop } = {}) {
    if (this.recording) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mimeType = pickMimeType();
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
    this.recorder.start();
    this.startedAt = performance.now();

    if (onLevel) {
      this.context = new AudioContext();
      const source = this.context.createMediaStreamSource(this.stream);
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      this.levelTimer = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (const v of buffer) sum += v * v;
        onLevel(Math.min(1, Math.sqrt(sum / buffer.length) * 4));
      }, 60);
    }
    this.stopTimer = setTimeout(() => onAutoStop?.(), maxSeconds * 1000);
  }

  elapsedSeconds() {
    return this.recording ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  /** Stop and return {samples, seconds, peak}. */
  async stop() {
    if (!this.recorder) throw new Error('Not recording.');
    const recorder = this.recorder;
    const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }));
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
    const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
    this.cleanup();
    const samples = await decodeTo16k(blob);
    return { samples, seconds: samples.length / SAMPLE_RATE, peak: peakLevel(samples) };
  }

  cancel() {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.cleanup();
  }

  cleanup() {
    clearInterval(this.levelTimer);
    clearTimeout(this.stopTimer);
    this.levelTimer = null;
    this.stopTimer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.context?.close().catch(() => {});
    this.context = null;
    this.recorder = null;
  }
}

/** Decode a recording and resample it to 16 kHz mono. */
export async function decodeTo16k(blob) {
  const data = await blob.arrayBuffer();
  const decoder = new AudioContext();
  let decoded;
  try {
    decoded = await decoder.decodeAudioData(data);
  } finally {
    decoder.close().catch(() => {});
  }
  const length = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

function frameLevels(samples, frame = 320) {
  const levels = [];
  for (let i = 0; i < samples.length; i += frame) {
    let sum = 0;
    const end = Math.min(samples.length, i + frame);
    for (let k = i; k < end; k++) sum += samples[k] * samples[k];
    levels.push(Math.sqrt(sum / Math.max(1, end - i)));
  }
  return levels;
}

export function peakLevel(samples) {
  return frameLevels(samples).reduce((max, v) => Math.max(max, v), 0);
}

/**
 * Split a long recording into pieces of at most `maxSeconds`, cutting in the
 * quietest moment (a pause between words) after `minSeconds`. Whisper hears 30
 * seconds at a time, and transcribing pause-to-pause pieces separately avoids
 * the repeated-text glitches its built-in chunking can produce.
 * @returns {Float32Array[]}
 */
export function splitIntoSegments(samples, { minSeconds = 12, maxSeconds = 25 } = {}) {
  const frame = 320; // 20 ms
  const levels = frameLevels(samples, frame);
  const perSecond = SAMPLE_RATE / frame;
  const minFrames = Math.round(minSeconds * perSecond);
  const maxFrames = Math.round(maxSeconds * perSecond);
  const segments = [];
  let start = 0;
  while (levels.length - start > maxFrames) {
    // Quietest 300 ms window between minSeconds and maxSeconds from the start.
    const windowFrames = 15;
    let bestFrame = start + maxFrames;
    let bestLevel = Infinity;
    for (let f = start + minFrames; f + windowFrames <= start + maxFrames; f++) {
      let sum = 0;
      for (let k = f; k < f + windowFrames; k++) sum += levels[k];
      if (sum < bestLevel) {
        bestLevel = sum;
        bestFrame = f + Math.floor(windowFrames / 2);
      }
    }
    segments.push(samples.slice(start * frame, bestFrame * frame));
    start = bestFrame;
  }
  segments.push(samples.slice(start * frame));
  return segments.filter((s) => s.length > SAMPLE_RATE * 0.2);
}

/**
 * Cut silence from both ends (keeps a little padding). Returns null when the
 * recording is basically silent, so we never ask the model to guess words
 * out of noise.
 */
export function trimSilence(samples, { minPeak = 0.012, padSeconds = 0.25 } = {}) {
  const frame = 320; // 20 ms
  const levels = frameLevels(samples, frame);
  const peak = levels.reduce((max, v) => Math.max(max, v), 0);
  if (peak < minPeak) return null;
  const threshold = Math.max(minPeak * 0.6, peak * 0.08);
  const first = levels.findIndex((v) => v >= threshold);
  let last = levels.length - 1;
  while (last > first && levels[last] < threshold) last--;
  const pad = Math.round(padSeconds * SAMPLE_RATE);
  const start = Math.max(0, first * frame - pad);
  const end = Math.min(samples.length, (last + 1) * frame + pad);
  return samples.slice(start, end);
}

/**
 * Remove any DC offset and bring the loudest point to a clear level. Quiet
 * recordings are raised (at most ten times), loud ones are lowered so they do
 * not clip. Whisper hears level speech more reliably.
 */
export function normalizeLevel(samples, { target = 0.9, maxGain = 10 } = {}) {
  if (!samples.length) return samples;
  let mean = 0;
  for (const v of samples) mean += v;
  mean /= samples.length;
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v - mean));
  if (peak === 0) return samples;
  const gain = Math.min(maxGain, target / peak);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = (samples[i] - mean) * gain;
  return out;
}
