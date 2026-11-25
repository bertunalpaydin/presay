// Explanations in each profile's own language, by profile code.
// Each file is checked by tests/languages.test.mjs: every sound that counts for
// the language has a title and a tip, and the English example words are kept.

import ar from './ar.js';
import de from './de.js';
import es from './es.js';
import fr from './fr.js';
import hi from './hi.js';
import ja from './ja.js';
import pt from './pt.js';
import ru from './ru.js';
import tr from './tr.js';
import zh from './zh.js';

export const NATIVE = Object.freeze({ ar, de, es, fr, hi, ja, pt, ru, tr, zh });
