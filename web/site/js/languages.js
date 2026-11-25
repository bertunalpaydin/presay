// First-language profiles.
//
// Each profile says how much each sound feature counts (weights), which slips
// are typical (rules), and gives a few tips in plain English. The tendencies
// are the ones commonly described in language-teaching material. They are a
// starting point: speakers differ by region and by the other languages they
// know, and your own practice results always take priority.
//
// Feature names are listed in risk-rules.js. Weights are points; a word with
// 3 or more points is marked medium risk, 5 or more high risk.

import { compileProfile, SLIPS, hasSlip } from './risk-rules.js';
import { NATIVE } from './native/index.js';

const DEFINITIONS = [
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    label: 'Arabic (العربية)',
    detect: ['ar'],
    speakers: 'Arabic speakers',
    weights: {
      TH: 1, DH: 1, AE: 1, STRUT: 0.5, ER: 0.5, NG: 0.5, S_CLUSTER: 2.5, CLUSTER: 0.5, FINAL_VOICED: 0.5,
      FINAL_CLUSTER: 2, SHORT_I: 1, SHORT_U: 1.5, SPELLING: 2, ED: 1, P: 1, V: 2, CH: 1.5,
    },
    rules: ['P_B', 'V_F', 'IH_EH', 'AE_EH', 'UH_UW', 'CH_SH', 'TH_T', 'TH_S', 'DH_D', 'DH_Z'],
    tips: {
      P: 'Arabic has no /p/, so it often comes out as “b” (“park” → “bark”). Push a small puff of air through closed lips, with no voice.',
      V: 'Arabic has no /v/, so it often comes out as “f” (“very” → “fairy”). It is like “ف” with your voice on: top teeth on the lower lip.',
      S_CLUSTER: 'Arabic words do not start with two consonants, so it is tempting to add a vowel (“istreet”). Start straight on the /s/.',
      CH: 'Many Arabic dialects have no “ch”, so it can become “sh” (“chair” → “share”). Start it with a short /t/, then “ش”.',
      SHORT_I: 'Arabic has three vowel qualities, so /ɪ/ and /ɛ/ are easy to mix up (“bit” → “bet”). Keep /ɪ/ short, close to a kasra.',
      TH: 'This is the “ث” of Standard Arabic, which many dialects say as “t” or “s”. Put your tongue between your teeth and blow, without voice.',
      DH: 'This is the Arabic “ذ”, which many dialects say as “d” or “z”. Same tongue position as /θ/, with your voice on.',
      SHORT_U: 'Arabic speakers often say it as a long “oo” (“full” → “fool”). Make it short, like a damma.',
    },
  },
  {
    code: 'zh',
    name: 'Chinese (Mandarin)',
    nativeName: '中文',
    label: 'Chinese (Mandarin, 中文)',
    detect: ['zh'],
    speakers: 'Mandarin speakers',
    weights: {
      TH: 2.5, DH: 2, W: 0.5, V: 2, VW: 1, AE: 1, STRUT: 0.5, ER: 0.5, NG: 0.5, S_CLUSTER: 1, CLUSTER: 0.5,
      FINAL_VOICED: 0.5, FINAL_CLUSTER: 2, SHORT_I: 1, SHORT_U: 1, SPELLING: 1.5, ED: 1, R: 0.5, RL: 0.5,
      Z: 0.5, SH: 0.5, FINAL_STOP: 0.5,
    },
    rules: ['TH_S', 'TH_F', 'DH_D', 'DH_Z', 'V_W', 'V_F', 'R_L', 'AE_EH', 'IH_IY', 'IY_IH', 'UH_UW', 'Z_S', 'DEVOICE', 'FINAL_DROP'],
    stressNote: 'Mandarin gives every syllable its own tone; English makes one syllable strong and squeezes the others.',
    tips: {
      TH: 'Mandarin has no /θ/, so it often becomes “s” or “f” (“think” → “sink”). Put the tip of your tongue between your teeth and blow.',
      V: 'Mandarin has no /v/, so it often comes out as “w” or “f” (“vest” → “west”). Rest your top teeth on your lower lip and keep your voice on.',
      FINAL_STOP: 'Mandarin syllables end only in n or ng, so final consonants get swallowed (“light” → “lie”). Finish the consonant clearly.',
      FINAL_CLUSTER: 'Mandarin syllables never end in a cluster, so it is easy to drop part of it. Slow down and say every consonant.',
      ED: 'The “-ed” ending is easy to drop. Say the final /t/ or /d/ so the past tense is heard.',
      ER: 'It is close to the Mandarin “儿”: one long vowel with the tongue pulled back.',
      NG: 'It is the “ng” in Mandarin “ang”. Do not add a hard “g” or “k” after it.',
      R: 'Some Mandarin speakers say it as “l”. The Mandarin “r” in “日” is a good starting point: curl the tongue back without touching anything.',
      Z: 'Mandarin speakers often say it as “s”. It is not the pinyin “z”, which sounds like “ts”: keep your voice on and buzz.',
      SH: 'It is between the pinyin “sh” and “x”, with slightly rounded lips and no stop before it.',
    },
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    label: 'French (Français)',
    detect: ['fr'],
    speakers: 'French speakers',
    weights: {
      TH: 3, DH: 2.5, W: 0.5, AE: 1.5, STRUT: 1, ER: 1, NG: 1, S_CLUSTER: 0.5, CLUSTER: 0.5, FINAL_VOICED: 0.5,
      FINAL_CLUSTER: 1, SHORT_I: 1.5, SHORT_U: 1.5, SPELLING: 1.5, ED: 1, H: 2.5, CH: 1, R: 0.5,
    },
    rules: ['TH_S', 'TH_T', 'DH_Z', 'DH_D', 'H_DROP', 'IH_IY', 'IY_IH', 'UH_UW', 'AE_EH', 'CH_SH'],
    stress: 1.2,
    stressNote: 'French puts the weight at the end of a phrase; English stresses one syllable in each word, and it is often not the last.',
    tips: {
      H: 'French drops every h, so it is easy to drop it in English too (“hair” → “air”). Breathe out softly before the vowel.',
      TH: 'French has no /θ/, so it often becomes “s” (“think” → “sink”). Put the tip of your tongue between your teeth and blow.',
      DH: 'It often comes out as “z” (“this” → “zis”). Same tongue position as /θ/, but with your voice on.',
      SHORT_I: 'French has one “i” sound, so “ship” and “sheep” can merge. Make /ɪ/ shorter and looser.',
      CH: '“Ch” can come out as “sh” (“chair” → “share”). Start it with a short /t/, like the “tch” in French “tchèque”.',
      W: 'It is the sound at the start of French “oui”. Keep your teeth off your lower lip.',
      ER: 'One long vowel with the tongue pulled back. Do not make the r in the throat as in French.',
      NG: 'It is the ending of French “parking”. Do not add a hard “g” or “k” after it.',
      R: 'Pull your tongue back without letting it touch the roof of your mouth. Do not make it in the throat like the French r.',
    },
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    label: 'German (Deutsch)',
    detect: ['de'],
    speakers: 'German speakers',
    weights: {
      TH: 3, DH: 2, W: 3, V: 1.5, VW: 1.5, AE: 2, STRUT: 1, ER: 0.5, NG: 0.5, S_CLUSTER: 0.5,
      FINAL_VOICED: 1.5, FINAL_CLUSTER: 0.5, SHORT_I: 0.5, SHORT_U: 0.5, SPELLING: 1.5, ED: 1,
    },
    rules: ['TH_S', 'TH_T', 'DH_Z', 'DH_D', 'W_V', 'V_W', 'V_F', 'AE_EH', 'DEVOICE'],
    stress: 0.8,
    tips: {
      W: 'German “w” is said /v/, so “west” can sound like “vest”. Round your lips like “u” and keep your teeth off your lip.',
      V: 'Working hard to avoid /v/ for “w” can flip it the other way (“vest” → “west”). /v/ is the sound of German “w” in “Wasser”.',
      FINAL_VOICED: 'German makes final b, d, g and s voiceless (“Hund” ends in /t/), so “bad” can sound like “bat” and “eyes” like “ice”. Keep your voice on to the end.',
      AE: 'German has no /æ/, so “bad” and “bed” can sound the same. Open your mouth wider, almost like “a”.',
      TH: 'German has no /θ/, so it often becomes “s” (“think” → “sink”). Put the tip of your tongue between your teeth and blow.',
      ER: 'One long vowel with the tongue pulled back. Do not make the r in the throat as in German.',
      NG: 'It is the “ng” in German “singen”, without a “g” or “k” after it.',
      S_CLUSTER: 'An English “s” stays an “s” before p and t: “street”, not “shtreet”.',
      SHORT_I: 'It is the short “i” in German “Schiff”, not the long “ie”.',
      SHORT_U: 'It is the short “u” in German “Mutter”, not the long “u” in “gut”.',
    },
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    label: 'Hindi (हिन्दी)',
    detect: ['hi'],
    speakers: 'Hindi speakers',
    weights: {
      TH: 2, DH: 1.5, W: 2, V: 1.5, VW: 2, AE: 1.5, STRUT: 0.5, ER: 0.5, NG: 0.5, S_CLUSTER: 2.5, CLUSTER: 0.5,
      FINAL_VOICED: 0.5, FINAL_CLUSTER: 1, SHORT_I: 1, SHORT_U: 1, SPELLING: 1.5, ED: 1, Z: 2, F: 0.5,
    },
    rules: ['TH_T', 'DH_D', 'W_V', 'V_W', 'Z_JH', 'F_P', 'AE_EH', 'IY_IH', 'UH_UW'],
    stress: 1.2,
    tips: {
      VW: 'Hindi has one sound in between /v/ and /w/. Keep them apart: /v/ is teeth on lip, /w/ is rounded lips with no teeth.',
      W: 'Round your lips like “oo” and keep your teeth away from your lip, or “west” can sound like “vest”.',
      V: 'Rest your top teeth on your lower lip, or “vest” can sound like “west”.',
      Z: 'Many speakers say /z/ as “j” (“zero” → “jero”). It is the Hindi “ज़” with a dot, not “ज”.',
      S_CLUSTER: 'It is tempting to add a vowel before s + consonant (“school” → “ischool”). Start straight on the /s/.',
      F: 'Some speakers say /f/ as a breathy “p” (“fun” → “phun”). It is the Hindi “फ़” with a dot, not “फ”.',
      TH: 'It often comes out as the Hindi “थ”, so “thin” can sound like “tin”. Put the tip of your tongue between your teeth and blow, without voice.',
      AE: 'Hindi speakers often say it as “e” (“bad” → “bed”). It is closer to the Hindi “ऐ” in “है”: open your mouth wider.',
      STRUT: 'Short and relaxed. It is close to the Hindi “अ”.',
      SHORT_I: 'It is close to the short Hindi “इ”, not the long “ई”.',
      SHORT_U: 'Hindi speakers often say it as “oo” (“full” → “fool”). Use the short Hindi “उ”, not the long “ऊ”.',
    },
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    label: 'Japanese (日本語)',
    detect: ['ja'],
    speakers: 'Japanese speakers',
    weights: {
      TH: 2.5, DH: 2, W: 0.5, V: 2, AE: 1, STRUT: 0.5, ER: 1, S_CLUSTER: 1.5, CLUSTER: 0.5, FINAL_VOICED: 0.5,
      FINAL_CLUSTER: 1.5, SHORT_I: 1, SHORT_U: 1, SPELLING: 1.5, ED: 1, R: 0.5, L: 0.5, RL: 1.5, F: 0.5,
      YI: 1, WU: 1, S_I: 1,
    },
    rules: ['TH_S', 'DH_Z', 'V_B', 'R_L', 'L_R', 'F_H', 'AE_EH', 'STRUT_AA', 'IH_IY', 'IY_IH', 'UH_UW', 'YI_I', 'SI_SHI', 'TI_CHI'],
    stress: 0.75,
    stressNote: 'Japanese marks words with pitch rather than stress. English makes one syllable louder and longer, and squeezes the others.',
    tips: {
      RL: 'Japanese has one sound for both. For /l/ the tongue tip touches the ridge behind your teeth; for /r/ it touches nothing.',
      R: 'Pull your tongue back without touching anything. The Japanese tap can sound like /l/ or /d/ to English ears.',
      L: 'Press the tip of your tongue to the ridge behind your top teeth and hold it there, or “light” can sound like “right”.',
      V: 'Japanese has no /v/, so it often comes out as “b” (“vote” → “boat”). Rest your top teeth on your lower lip and keep your voice on.',
      S_I: 'Japanese has “shi” but no “si”, so “seat” can sound like “sheet” and “sit” like a rude word. Keep the /s/ sharp, tongue forward.',
      S_CLUSTER: 'Japanese puts a vowel after almost every consonant (“school” → “sukuuru”). Start straight on the /s/.',
      CLUSTER: 'Japanese puts a vowel after almost every consonant (“tree” → “turii”). Say the consonants together.',
      YI: 'Japanese has no “yi”, so “year” can sound like “ear”. Start with a clear “y” glide.',
      WU: 'Japanese has no “wu”, so the /w/ in “wood” or “woman” is easy to skip. Round your lips first.',
      ER: 'It often comes out as a long “a” (“bird” → “baado”). Pull your tongue back and keep it there through the vowel.',
      F: 'The Japanese “fu” is made with the lips only, so /f/ can sound like /h/ (“fold” → “hold”). Touch your top teeth to your lower lip.',
      STRUT: 'Saying it like the Japanese “a” can make “luck” sound like “lock”. Keep it short and relaxed, with your mouth half open.',
    },
  },
  {
    code: 'pt',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português',
    label: 'Portuguese (Brazil, Português)',
    detect: ['pt'],
    speakers: 'Brazilian speakers',
    weights: {
      TH: 2.5, DH: 2, W: 0.5, AE: 1, STRUT: 1, ER: 0.5, NG: 0.5, S_CLUSTER: 2, CLUSTER: 1, FINAL_VOICED: 0.5,
      FINAL_CLUSTER: 1.5, SHORT_I: 1, SHORT_U: 1.5, SPELLING: 2, ED: 1, R: 0.5, H: 0.5, T_I: 1, FINAL_STOP: 0.5,
    },
    rules: ['TH_T', 'TH_F', 'TH_S', 'DH_D', 'R_H', 'AE_EH', 'IH_IY', 'IY_IH', 'UH_UW', 'TI_CHI'],
    tips: {
      R: 'In Brazilian Portuguese an “r” at the start of a word sounds like /h/, so “red” can sound like “head”. Curl your tongue back instead.',
      T_I: 'Before an “ee” sound, Brazilian Portuguese turns t and d into “ch” and “j” (“tip” → “chip”). Keep them clean.',
      FINAL_STOP: 'It is tempting to add a short “i” after the last consonant (“big” → “bigi”). Stop cleanly on the consonant.',
      S_CLUSTER: 'Do not add an “e” before it (“school”, not “eschool”). Start straight on the /s/.',
      SHORT_I: 'Portuguese has no short /ɪ/, so “ship” and “sheep” can merge. Make it shorter and looser than “i”.',
      ER: 'One long vowel with the tongue pulled back, close to the “r caipira” in “porta”. Do not put another vowel in front of it.',
      H: 'A soft breath before the vowel, like the “rr” in Portuguese “carro”. Do not drop it.',
    },
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    label: 'Russian (Русский)',
    detect: ['ru'],
    speakers: 'Russian speakers',
    weights: {
      TH: 3, DH: 2.5, W: 2.5, V: 0.5, VW: 1, AE: 1.5, STRUT: 1, ER: 0.5, NG: 0.5, FINAL_VOICED: 1.5, FINAL_CLUSTER: 0.5,
      SHORT_I: 1.5, SHORT_U: 1.5, SPELLING: 1.5, ED: 1, H: 1,
    },
    rules: ['TH_S', 'TH_F', 'TH_T', 'DH_Z', 'DH_D', 'W_V', 'AE_EH', 'IH_IY', 'IY_IH', 'UH_UW', 'DEVOICE'],
    tips: {
      TH: 'Russian has no /θ/, so it often becomes “s” or “f” (“think” → “sink”). Put the tip of your tongue between your teeth and blow.',
      W: 'Russian has no /w/, so it often becomes “v” (“west” → “vest”). Round your lips like “u” and keep your teeth off your lip.',
      FINAL_VOICED: 'Russian makes final b, d, g and z voiceless, so “bad” can sound like “bat”. Keep your voice on to the end.',
      AE: 'There is no /æ/ in Russian, so “bad” can sound like “bed”. Open your mouth wider, almost like “a”.',
      V: 'This is the Russian “в”: top teeth on the lower lip, voice on.',
      STRUT: 'Short and relaxed, close to the first “а” in Russian “трава”.',
      H: 'A soft breath before the vowel. Do not scrape it like the Russian “х”.',
    },
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    label: 'Spanish (Español)',
    detect: ['es'],
    speakers: 'Spanish speakers',
    weights: {
      TH: 2, DH: 1.5, W: 0.5, V: 2, VW: 0.5, AE: 1, STRUT: 1, ER: 0.5, NG: 0.5, S_CLUSTER: 3, CLUSTER: 0.5,
      FINAL_VOICED: 0.5, FINAL_CLUSTER: 1.5, SHORT_I: 1.5, SHORT_U: 1.5, SPELLING: 2, ED: 1, Z: 1, SH: 1,
      CH: 0.5, H: 0.5,
    },
    rules: ['TH_T', 'TH_S', 'DH_D', 'V_B', 'AE_EH', 'STRUT_AA', 'IH_IY', 'IY_IH', 'UH_UW', 'SH_CH', 'CH_SH', 'Z_S'],
    tips: {
      V: 'Spanish “b” and “v” sound the same, so /v/ often comes out as “b” (“vote” → “boat”). Rest your top teeth on your lower lip and keep your voice on.',
      S_CLUSTER: 'Spanish words never start with s + consonant, so it is tempting to add an “e” (“estudent”). Start straight on the /s/.',
      SHORT_I: 'Spanish has one “i” sound, so “ship” and “sheep” can merge. Make /ɪ/ shorter and more relaxed.',
      Z: 'Spanish has no buzzing /z/, so “zoo” can sound like “Sue” and “eyes” like “ice”. Keep your voice on through the sound.',
      SH: '“Sh” and “ch” are easy to mix up (“share” → “chair”). /ʃ/ is a smooth hiss with no stop before it.',
      DH: 'Spanish speakers often say it as a hard “d”. It is the soft “d” in Spanish “nada”: tongue between the teeth, voice on.',
      NG: 'It is the “n” in Spanish “tengo”, without the “g”. End on the back of the tongue.',
      CH: 'Some Spanish speakers say it as “sh”. Start with a short /t/, then let it go into “sh”.',
      H: 'A soft breath before the vowel. Do not scrape it like the Spanish “j”.',
    },
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    label: 'Turkish (Türkçe)',
    detect: ['tr'],
    speakers: 'Turkish speakers',
    weights: {
      TH: 3, DH: 2, W: 2.5, VW: 1, AE: 1.5, STRUT: 0.75, ER: 1, NG: 1, S_CLUSTER: 2, CLUSTER: 0.5,
      FINAL_VOICED: 1.5, FINAL_CLUSTER: 1.5, SHORT_I: 1, SHORT_U: 1, SPELLING: 2, ED: 1,
    },
    rules: ['TH_T', 'TH_S', 'TH_F', 'DH_D', 'DH_Z', 'W_V', 'AE_EH', 'IH_IY', 'IY_IH', 'UH_UW', 'DEVOICE'],
    stressNote: 'Turkish usually stresses the last syllable; English often does not.',
    tips: {
      TH: 'Turkish has no /θ/, so it often comes out as “t”, “s” or “f”. Put your tongue lightly between your teeth and blow air, without voice.',
      DH: 'Often comes out as “d” or “z”. Same tongue position as /θ/, but switch your voice on.',
      W: 'Turkish speakers often say “v” here (“west” becomes “vest”). Round your lips like “u”, keep your teeth off your lip.',
      AE: 'Easy to merge with “e”, so “bad” sounds like “bed”. Open your mouth wider, closer to “a”.',
      STRUT: 'Short and relaxed, between Turkish “a” and “ı”. Keep it short.',
      ER: 'There is no Turkish equivalent. Do not roll the r; it is one long vowel sound.',
      S_CLUSTER: 'Do not add a vowel before or inside it (“school”, not “ıschool” or “sıchool”).',
      FINAL_VOICED: 'Turkish makes final b/d/g/z sounds voiceless, so “bad” can sound like “bat” and “eyes” like “ice”. Keep your voice on to the end.',
      SHORT_I: 'Shorter and looser than Turkish “i”; otherwise “ship” can sound like “sheep”.',
      SHORT_U: 'Shorter than “u”; otherwise “full” can sound like “fool”.',
    },
  },
];

export const LANGUAGES = Object.freeze(
  DEFINITIONS.map((definition) => Object.freeze({ ...compileProfile(definition), native: NATIVE[definition.code] })),
);
// Used when the browser's languages are not on the list.
export const DEFAULT_LANGUAGE = 'tr';

const byCode = new Map(LANGUAGES.map((profile) => [profile.code, profile]));

export function getLanguage(code) {
  return byCode.get(code) ?? byCode.get(DEFAULT_LANGUAGE);
}

export function isLanguage(code) {
  return byCode.has(code);
}

/** The profile for the first listed browser language that has one, or null. */
export function detectLanguage(tags = []) {
  for (const tag of tags) {
    const primary = String(tag).toLowerCase().split(/[-_]/)[0];
    const match = LANGUAGES.find((profile) => profile.detect.includes(primary));
    if (match) return match.code;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Explanations shown in the word panel
// ---------------------------------------------------------------------------

const REASONS = {
  TH: ['The “th” sound /θ/', 'Put the tip of your tongue lightly between your teeth and blow air, without voice.'],
  DH: ['The voiced “th” sound /ð/', 'Same tongue position as /θ/, but switch your voice on.'],
  W: ['The /w/ sound', 'Round your lips like “oo” and keep your teeth off your lower lip.'],
  VW: ['Both /v/ and /w/ in one word', 'Keep them apart: /v/ uses teeth on the lower lip, /w/ uses rounded lips only.'],
  AE: ['The /æ/ vowel (“bad”, “man”)', 'Open your mouth wider than for “e”, closer to “a”.'],
  STRUT: ['The short /ʌ/ vowel (“cup”)', 'Short and relaxed, with your mouth half open.'],
  ER: ['The r-coloured vowel (“bird”, “work”)', 'One long vowel with the tongue pulled back. Do not roll an r or put another vowel in front of it.'],
  NG: ['The /ŋ/ sound (“thing”)', 'End on the back of the tongue, without adding a hard “g” or “k” after it.'],
  S_CLUSTER: ['Starts with s + consonant', 'Do not add a vowel before or inside it (“school”, not “eschool” or “sechool”).'],
  CLUSTER: ['Consonant cluster at the start', 'Say the consonants together, with no vowel between them.'],
  FINAL_VOICED: ['Ends in a voiced consonant', 'Keep your voice on to the very end. A final b, d, g, v or z without voice sounds like p, t, k, f or s.'],
  FINAL_CLUSTER: ['Three or more consonants at the end', 'Do not drop or split them. Slow down on the ending.'],
  SHORT_I: ['The short /ɪ/ vowel (“ship”, “live”)', 'Make it shorter and looser than “ee”.'],
  SHORT_U: ['The short /ʊ/ vowel (“full”, “book”)', 'Make it shorter and looser than “oo”.'],
  SPELLING: ['Spelling does not match the sound', 'Some letters are silent or a syllable is dropped. Listen to it once instead of reading it letter by letter.'],
  ED: ['The “-ed” ending', 'Here “-ed” is just a /t/ or /d/ sound, not an extra syllable (“worked” is one syllable).'],
  R: ['The English /r/', 'Pull your tongue back without letting it touch the roof of your mouth. Do not tap or roll it.'],
  L: ['The /l/ sound', 'Press the tip of your tongue to the ridge behind your top teeth.'],
  RL: ['Both /r/ and /l/ in one word', 'Keep them apart: for /l/ the tongue tip touches the ridge behind your teeth, for /r/ it touches nothing.'],
  V: ['The /v/ sound', 'Rest your top teeth on your lower lip and keep your voice on.'],
  P: ['The /p/ sound', 'Push a small puff of air through closed lips, with no voice.'],
  F: ['The /f/ sound', 'Rest your top teeth on your lower lip and blow, without closing your lips.'],
  Z: ['The /z/ sound', 'A buzzing /s/: keep your voice on and your tongue off the roof of your mouth.'],
  SH: ['The /ʃ/ sound (“she”)', 'A smooth hiss with rounded lips and no stop before it.'],
  CH: ['The /tʃ/ sound (“chair”)', 'Start with a short /t/, then let it go into “sh”.'],
  H: ['The /h/ sound', 'A soft breath before the vowel. Do not drop it and do not scrape it.'],
  YI: ['A “y” before an “ee” sound (“year”)', 'Start with a clear “y” glide before the vowel.'],
  WU: ['A /w/ before an “oo” sound (“wood”)', 'Round your lips for /w/ first, then say the vowel.'],
  S_I: ['An /s/ before an “ee” sound (“seat”, “sit”)', 'Keep it a sharp /s/ with your tongue forward.'],
  T_I: ['A /t/ or /d/ before an “ee” sound (“team”, “deep”)', 'Keep it a clean /t/ or /d/.'],
  FINAL_STOP: ['Ends in a stop consonant (“big”, “light”)', 'Finish the consonant clearly, without dropping it or adding a vowel after it.'],
};

// Which slips belong to which feature, for the "often comes out as" line.
const FEATURE_SLIPS = {
  TH: ['TH_T', 'TH_S', 'TH_F'],
  DH: ['DH_D', 'DH_Z'],
  W: ['W_V'],
  V: ['V_B', 'V_F', 'V_W'],
  P: ['P_B'],
  F: ['F_P', 'F_H'],
  R: ['R_L', 'R_H'],
  L: ['L_R'],
  H: ['H_DROP'],
  AE: ['AE_EH'],
  STRUT: ['STRUT_AA'],
  SHORT_I: ['IH_IY', 'IH_EH'],
  SHORT_U: ['UH_UW'],
  SH: ['SH_CH'],
  CH: ['CH_SH'],
  Z: ['Z_S', 'Z_JH'],
  YI: ['YI_I'],
  S_I: ['SI_SHI'],
  T_I: ['TI_CHI'],
  FINAL_VOICED: ['DEVOICE'],
  FINAL_STOP: ['FINAL_DROP'],
};

const SLIP_SOUNDS = {
  TH_T: '“t”', TH_S: '“s”', TH_F: '“f”', DH_D: '“d”', DH_Z: '“z”', W_V: '“v”', V_W: '“w”', V_B: '“b”', V_F: '“f”',
  P_B: '“b”', F_P: '“p”', F_H: '“h”', L_R: '“r”', R_L: '“l”', R_H: '“h”', AE_EH: '“e” (“bad” → “bed”)',
  STRUT_AA: '“o” (“luck” → “lock”)', IH_IY: '“ee” (“ship” → “sheep”)', IH_EH: '“e” (“bit” → “bet”)',
  UH_UW: '“oo” (“full” → “fool”)', SH_CH: '“ch”', CH_SH: '“sh”', Z_S: '“s”', Z_JH: '“j”',
  SI_SHI: '“sh”', TI_CHI: '“ch” or “j”',
};

const DROPPED = new Set(['H_DROP', 'YI_I', 'FINAL_DROP']);

function joinOr(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/** "Spanish speakers often say it as “t” or “s”." for a feature, or ''. */
function slipLine(profile, feature) {
  const slips = (FEATURE_SLIPS[feature] ?? []).filter((rule) => hasSlip(profile, rule));
  if (!slips.length) return '';
  if (slips.some((rule) => DROPPED.has(rule))) return `${profile.speakers} often drop it.`;
  if (slips.includes('DEVOICE')) return `${profile.speakers} often make it voiceless (“bad” → “bat”).`;
  return `${profile.speakers} often say it as ${joinOr(slips.map((rule) => SLIP_SOUNDS[rule]))}.`;
}

/**
 * Title and tip for one feature, in the words of the given profile: in English,
 * or in the profile's own language when inNative is true.
 */
export function reasonFor(profile, feature, inNative = false) {
  const native = inNative ? profile.native?.reasons[feature] : null;
  if (native) return { flag: feature, title: native[0], tip: native[1] };
  const [title, fix] = REASONS[feature];
  const override = profile.tips[feature];
  if (override) return { flag: feature, title, tip: override };
  const line = slipLine(profile, feature);
  return { flag: feature, title, tip: line ? `${line} ${fix}` : fix };
}

export function stressNoteFor(profile) {
  return profile.stressNote ?? 'In long English words one syllable is much stronger than the rest, and the others get shorter.';
}

/** The "long word" reason, in English or in the profile's own language. */
export function stressReasonFor(profile, syllables, inNative = false) {
  if (inNative && profile.native) return { title: profile.native.stressTitle(syllables), tip: profile.native.stressNote };
  return {
    title: `Long word, ${syllables} syllables`,
    tip: `${stressNoteFor(profile)} The ˈ mark in the pronunciation shows where the stress goes.`,
  };
}

/** Heading of the reasons list in the word panel. */
export function reasonsHeadingFor(profile, inNative = false) {
  return inNative && profile.native ? profile.native.heading : 'Why it can be hard';
}

/** lang and dir attributes for text in English or in the profile's own language. */
export function textDirection(profile, inNative = false) {
  return inNative && profile.native ? { lang: profile.native.lang, dir: profile.native.dir } : { lang: 'en', dir: 'ltr' };
}

// Short labels for "might be heard as" chips.
const SLIP_LABELS = {
  TH_T: 'θ → t', TH_S: 'θ → s', TH_F: 'θ → f', DH_D: 'ð → d', DH_Z: 'ð → z', W_V: 'w → v', V_W: 'v → w',
  V_B: 'v → b', V_F: 'v → f', P_B: 'p → b', F_P: 'f → p', F_H: 'f → h', L_R: 'l → r', R_L: 'r → l', R_H: 'r → h',
  H_DROP: 'h dropped', AE_EH: 'æ → e', STRUT_AA: 'ʌ → ɑ', IH_IY: 'ɪ → i', IY_IH: 'i → ɪ', IH_EH: 'ɪ → e',
  UH_UW: 'ʊ → u', SH_CH: 'ʃ → tʃ', CH_SH: 'tʃ → ʃ', Z_S: 'z → s', Z_JH: 'z → dʒ', YI_I: 'y dropped',
  SI_SHI: 's → ʃ', TI_CHI: 't → tʃ', DEVOICE: 'voice lost', FINAL_DROP: 'end dropped',
};

export function slipLabel(rule) {
  return SLIP_LABELS[rule] ?? rule;
}

// Every slip needs a label; fail loudly during tests if one is added without.
for (const rule of SLIPS) if (!SLIP_LABELS[rule]) throw new Error(`No label for slip ${rule}`);
