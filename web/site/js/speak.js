// "Listen" buttons: the browser's built-in text-to-speech (free, on device
// for most systems). Hidden when the browser has no English voice.

let voices = [];

function refreshVoices() {
  voices = globalThis.speechSynthesis?.getVoices?.() ?? [];
}

if (globalThis.speechSynthesis) {
  refreshVoices();
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

export function canSpeak() {
  return Boolean(globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance);
}

function pickVoice(lang) {
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  return (
    english.find((v) => v.lang === lang && v.localService) ??
    english.find((v) => v.lang === lang) ??
    english.find((v) => v.lang?.startsWith(lang.slice(0, 2))) ??
    null
  );
}

/** Say a word or phrase. `lang` is "en-GB" or "en-US". */
export function speak(text, lang = 'en-GB', rate = 0.85) {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}
