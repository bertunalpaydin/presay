// Pronunciation risk rules.
//
// This module is shared by the browser app and by scripts/build-data.mjs, so the
// scores used to pick "easier" synonyms at build time are exactly the scores the
// app shows at run time.
//
// Each word in the lexicon is stored as a number, or as [number, slips]:
//   number = syllables + 16 * flags   (flags: the sound features in FLAGS)
//   slips  = bit mask of the SLIPS that turn the word into another common word
//            (for example W_V turns "west" into "vest")
//
// How much each feature and slip counts depends on the speaker's first language.
// The profiles live in languages.js. They describe general tendencies, not any
// one speaker: the personal word list (built from your own recordings) always
// takes priority over these rules.

export const FLAGS = Object.freeze({
  TH: 1 << 0, //             /θ/ as in "think"
  DH: 1 << 1, //             /ð/ as in "weather"
  W: 1 << 2, //              /w/ as in "west"
  AE: 1 << 3, //             /æ/ as in "bad"
  STRUT: 1 << 4, //          stressed /ʌ/ as in "cup"
  ER: 1 << 5, //             r-coloured vowel as in "bird"
  NG: 1 << 6, //             /ŋ/ as in "thing"
  S_CLUSTER: 1 << 7, //      starts with s + consonant ("school")
  CLUSTER: 1 << 8, //        other consonant cluster at the start ("tree")
  FINAL_VOICED: 1 << 9, //   ends in a voiced consonant ("bad", "eyes")
  FINAL_CLUSTER: 1 << 10, // 3+ consonants at the end ("months")
  SHORT_I: 1 << 11, //       stressed /ɪ/ as in "ship"
  SHORT_U: 1 << 12, //       /ʊ/ as in "full"
  SPELLING: 1 << 13, //      silent letters or fewer syllables than letters suggest
  ED: 1 << 14, //            "-ed" ending without an extra syllable ("worked")
  R: 1 << 15, //             consonant /r/ ("right")
  L: 1 << 16, //             /l/ ("light")
  V: 1 << 17, //             /v/ ("very")
  P: 1 << 18, //             /p/ ("park")
  F: 1 << 19, //             /f/ ("fine")
  Z: 1 << 20, //             /z/ before the last sound ("zero", "busy")
  SH: 1 << 21, //            /ʃ/ ("she")
  CH: 1 << 22, //            /tʃ/ ("chair")
  H: 1 << 23, //             /h/ ("hair")
  YI: 1 << 24, //            /j/ before an "ee" sound ("year")
  WU: 1 << 25, //            /w/ before an "oo" sound ("wood")
  S_I: 1 << 26, //           /s/ before an "ee" sound ("see", "sit")
  T_I: 1 << 27, //           /t/ or /d/ before an "ee" sound ("team", "deep")
  FINAL_STOP: 1 << 28, //    ends in a stop or "ch"/"j" sound ("big", "light")
});

export const FLAG_NAMES = Object.freeze(Object.keys(FLAGS));

// Features made of two flags. They are scored, but not stored.
export const COMBINED = Object.freeze({
  VW: FLAGS.V | FLAGS.W, //  both /v/ and /w/ ("view", "wives")
  RL: FLAGS.R | FLAGS.L, //  both /r/ and /l/ ("really", "rural")
});

export const FEATURE_NAMES = Object.freeze([...FLAG_NAMES, ...Object.keys(COMBINED)]);
export const featureMask = (name) => FLAGS[name] ?? COMBINED[name];

// Typical slips. Each one changes one sound; when the result is another common
// word, the word can be misheard as that word.
export const SLIPS = Object.freeze([
  'TH_T', //       /θ/ -> /t/   three -> tree
  'TH_S', //       /θ/ -> /s/   think -> sink
  'TH_F', //       /θ/ -> /f/   three -> free
  'DH_D', //       /ð/ -> /d/   they -> day
  'DH_Z', //       /ð/ -> /z/   breathe -> breeze
  'W_V', //        /w/ -> /v/   west -> vest
  'V_W', //        /v/ -> /w/   vest -> west
  'V_B', //        /v/ -> /b/   very -> berry
  'V_F', //        /v/ -> /f/   van -> fan
  'P_B', //        /p/ -> /b/   park -> bark
  'F_P', //        /f/ -> /p/   coffee -> copy
  'F_H', //        /f/ -> /h/ before "oo"/"oh"   fold -> hold
  'L_R', //        /l/ -> /r/   light -> right
  'R_L', //        /r/ -> /l/   rice -> lice
  'R_H', //        /r/ -> /h/ at the start   red -> head
  'H_DROP', //     /h/ dropped  hair -> air
  'AE_EH', //      /æ/ -> /ɛ/   bad -> bed
  'STRUT_AA', //   /ʌ/ -> /ɑ/   cut -> cot
  'IH_IY', //      /ɪ/ -> /i/   ship -> sheep
  'IY_IH', //      /i/ -> /ɪ/   leave -> live
  'IH_EH', //      /ɪ/ -> /ɛ/   bit -> bet
  'UH_UW', //      /ʊ/ -> /u/   full -> fool
  'SH_CH', //      /ʃ/ -> /tʃ/  share -> chair
  'CH_SH', //      /tʃ/ -> /ʃ/  chair -> share
  'Z_S', //        /z/ -> /s/   zoo -> sue
  'Z_JH', //       /z/ -> /dʒ/  zest -> jest
  'YI_I', //       /j/ dropped before "ee"   year -> ear
  'SI_SHI', //     /s/ -> /ʃ/ before "ee"    see -> she
  'TI_CHI', //     /t/, /d/ -> /tʃ/, /dʒ/ before "ee"   tip -> chip
  'DEVOICE', //    last sound loses its voice   bad -> bat
  'FINAL_DROP', // last stop dropped   light -> lie
]);

export const SLIP = Object.freeze(Object.fromEntries(SLIPS.map((name, i) => [name, i])));

// A word that a typical slip turns into another common word gets this extra weight.
export const SLIP_WEIGHT = 1.5;

export function makeEntry(flags, syllables, slips = 0) {
  const packed = Math.min(syllables, 15) + 16 * flags;
  return slips ? [packed, slips >>> 0] : packed;
}

export function decodeEntry(entry) {
  const packed = typeof entry === 'number' ? entry : entry[0];
  const syllables = packed % 16;
  return { flags: (packed - syllables) / 16, syllables, slips: typeof entry === 'number' ? 0 : entry[1] };
}

export const syllablesOf = (entry) => decodeEntry(entry).syllables;
export const flagsOf = (entry) => decodeEntry(entry).flags;
export const slipsOf = (entry) => decodeEntry(entry).slips;

/** Names of every feature the word has, including the combined ones. */
export function featureNames(entry) {
  const { flags } = decodeEntry(entry);
  return FEATURE_NAMES.filter((name) => {
    const mask = featureMask(name);
    return (flags & mask) === mask;
  });
}

// Long words carry a stress risk: the strong syllable is often not where a
// learner expects it ("DEvelopment" vs "deVElopment").
export function stressWeight(syllables) {
  if (syllables < 3) return 0;
  return Math.min(2.5, 1 + 0.5 * (syllables - 3));
}

/**
 * Turn a language definition (see languages.js) into what riskScore needs.
 * @param {{weights: object, rules: string[], stress?: number}} definition
 */
export function compileProfile(definition) {
  const weightList = [];
  for (const [name, weight] of Object.entries(definition.weights)) {
    const mask = featureMask(name);
    if (mask === undefined) throw new Error(`Unknown feature ${name} in ${definition.code}`);
    if (weight) weightList.push([mask, weight]);
  }
  let slipMask = 0;
  for (const rule of definition.rules) {
    if (!(rule in SLIP)) throw new Error(`Unknown slip ${rule} in ${definition.code}`);
    slipMask |= 1 << SLIP[rule];
  }
  return { ...definition, stress: definition.stress ?? 1, weightList, slipMask: slipMask >>> 0 };
}

export function weightOf(profile, name) {
  return profile.weights[name] ?? 0;
}

export function hasSlip(profile, rule) {
  return (profile.slipMask & (1 << SLIP[rule])) !== 0;
}

export function riskScore(entry, profile) {
  const { flags, syllables, slips } = decodeEntry(entry);
  let score = 0;
  for (const [mask, weight] of profile.weightList) {
    if ((flags & mask) === mask) score += weight;
  }
  score += profile.stress * stressWeight(syllables);
  if ((slips & profile.slipMask) !== 0) score += SLIP_WEIGHT;
  return Math.round(score * 100) / 100;
}

// Thresholds for the colour levels in the script view.
export const LEVELS = Object.freeze({ MEDIUM: 3, HIGH: 5 });

export function levelOf(score) {
  if (score >= LEVELS.HIGH) return 'high';
  if (score >= LEVELS.MEDIUM) return 'medium';
  return 'low';
}

// Synonyms are only offered for words at least this risky, and only when they
// are at least MIN_IMPROVEMENT points easier.
export const MIN_SCORE_FOR_ALTERNATIVES = LEVELS.MEDIUM - 0.5;
export const MIN_IMPROVEMENT = 1;
