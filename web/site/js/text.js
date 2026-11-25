// Splitting text into words, and comparing words that may be spelled
// differently but sound the same.

const WORD = /[A-Za-zÀ-ÖØ-öø-ÿĀ-ſ]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿĀ-ſ]+)*|\d+(?:[.,:]\d+)*/g;

/**
 * Split text into word and non-word tokens, keeping their positions so a word
 * can be replaced in place.
 * @returns {{type: 'word'|'other', text: string, start: number, end: number}[]}
 */
export function tokenize(text) {
  const tokens = [];
  let last = 0;
  for (const match of text.matchAll(WORD)) {
    if (match.index > last) tokens.push({ type: 'other', text: text.slice(last, match.index), start: last, end: match.index });
    tokens.push({ type: 'word', text: match[0], start: match.index, end: match.index + match[0].length });
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ type: 'other', text: text.slice(last), start: last, end: text.length });
  return tokens;
}

/** Lower-case a word and straighten curly apostrophes. */
export function normalizeWord(word) {
  return word.toLowerCase().replace(/’/g, "'");
}

export function isNumber(word) {
  return /\d/.test(word);
}

/** Lower-case words of a text, without punctuation. */
export function words(text) {
  return tokenize(text)
    .filter((t) => t.type === 'word')
    .map((t) => normalizeWord(t.text));
}

// British and American spellings map to one key: "organise" -> "organize".
// The rules are narrow on purpose, so different words never share a key
// ("four" and "for", "filled" and "filed" stay apart).
export function spellingKey(word) {
  return word
    .replace(/(col|hon|fav|behavi|neighb|lab|flav|harb|hum|rum|sav|vig|arm|endeav|parl|od|vap|cand|clam|glam|ard|ferv|rig|splend|tum|val|ranc)our/, '$1or')
    .replace(/([a-z]{3,})is(e|ed|es|ing|ation|ations|er|ers)$/, '$1iz$2')
    .replace(/([a-z]{3,})ys(e|ed|es|ing)$/, '$1yz$2')
    .replace(/([a-z]{2,})tre(s?)$/, '$1ter$2')
    .replace(/(cat|dial|monol|anal|prol|epil)ogue(s?)$/, '$1og$2')
    .replace(/(def|off|lic|pret)ence(s?)$/, '$1ense$2')
    .replace(/([a-z]{3,}[aeiou])ll(ed|ing|er|ers)$/, '$1l$2');
}

const CONTRACTIONS = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "it's": 'it is',
  "that's": 'that is', "there's": 'there is', "what's": 'what is', "here's": 'here is', "who's": 'who is',
  "he's": 'he is', "she's": 'she is', "let's": 'let us', "don't": 'do not', "doesn't": 'does not',
  "didn't": 'did not', "can't": 'can not', cannot: 'can not', "won't": 'will not', "isn't": 'is not',
  "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not',
  "hasn't": 'has not', "hadn't": 'had not', "wouldn't": 'would not', "shouldn't": 'should not',
  "couldn't": 'could not', "i've": 'i have', "we've": 'we have', "you've": 'you have', "they've": 'they have',
  "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will', "he'll": 'he will',
  "she'll": 'she will', "it'll": 'it will', "i'd": 'i would', "you'd": 'you would', "he'd": 'he would',
  "she'd": 'she would', "we'd": 'we would', "they'd": 'they would', okay: 'ok', gonna: 'going to',
  wanna: 'want to',
};

/**
 * Expand contractions so "I'm" and "I am" line up word by word.
 * Each output item remembers which input word it came from.
 * @param {string[]} list
 * @returns {{word: string, from: number}[]}
 */
export function expandContractions(list) {
  const out = [];
  list.forEach((word, i) => {
    const expansion = CONTRACTIONS[word];
    if (expansion) for (const part of expansion.split(' ')) out.push({ word: part, from: i });
    else out.push({ word, from: i });
  });
  return out;
}

/**
 * Remove runaway repetition, a known speech-model glitch: when the same run of
 * words repeats back to back (3+ words three times, or 1-2 words four times),
 * keep a single copy. Natural speech almost never does this.
 * @param {string[]} list
 */
export function collapseLoops(list) {
  const out = [...list];
  for (let size = 1; size <= 12; size++) {
    const needed = size < 3 ? 4 : 3; // "very very" is fine; "you you you you" is not
    let i = 0;
    while (i + size * needed <= out.length) {
      const chunk = out.slice(i, i + size).join(' ');
      let repeats = 1;
      while (out.slice(i + repeats * size, i + (repeats + 1) * size).join(' ') === chunk) repeats++;
      if (repeats >= needed) out.splice(i + size, (repeats - 1) * size);
      else i++;
    }
  }
  return out;
}

/** Match the capitalisation of `like` ("Think" -> "Believe"). */
export function matchCase(replacement, like) {
  if (like.length > 1 && like === like.toUpperCase()) return replacement.toUpperCase();
  if (like[0] === like[0].toUpperCase() && like[0] !== like[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
