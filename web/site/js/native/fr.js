// Explanations in French, shown when "Explanations in Français" is on.
// They say the same as the English tips in languages.js and keep the same
// English example words. French spacing: a narrow no-break space inside
// « » and before ; and :.

const NNBSP = ' ';
const q = (text) => `«${NNBSP}${text}${NNBSP}»`;

export default {
  lang: 'fr',
  dir: 'ltr',
  label: 'Français',
  heading: 'Pourquoi c’est difficile',
  stressTitle: (syllables) => `Mot long, ${syllables} syllabes`,
  stressNote: `En français, l’accent tombe à la fin du groupe de mots${NNBSP}; en anglais, chaque mot a une syllabe accentuée, et ce n’est souvent pas la dernière. Le signe ˈ dans la prononciation indique où tombe l’accent.`,
  reasons: {
    TH: [
      `Le son ${q('th')} /θ/`,
      `Le français n’a pas de /θ/, il devient donc souvent ${q('s')} (${q('think')} → ${q('sink')}). Placez le bout de la langue entre les dents et soufflez.`,
    ],
    DH: [
      `Le son ${q('th')} sonore /ð/`,
      `Il devient souvent ${q('z')} (${q('this')} → ${q('zis')}). Même position de la langue que pour /θ/, mais en faisant vibrer la voix.`,
    ],
    W: ['Le son /w/', `C’est le son du début de ${q('oui')}. Ne touchez pas la lèvre inférieure avec les dents.`],
    AE: [
      `La voyelle /æ/ (${q('bad')}, ${q('man')})`,
      `Beaucoup de francophones la prononcent comme ${q('è')} (${q('bad')} → ${q('bed')}). Ouvrez la bouche plus grand que pour ${q('è')}, presque comme pour ${q('a')}.`,
    ],
    STRUT: [`La voyelle courte /ʌ/ (${q('cup')})`, 'Courte et détendue, la bouche à moitié ouverte.'],
    ER: [
      `La voyelle en ${q('r')} (${q('bird')}, ${q('work')})`,
      'Une seule voyelle longue, la langue tirée vers l’arrière. Ne prononcez pas le r au fond de la gorge comme en français.',
    ],
    NG: [
      `Le son /ŋ/ (${q('thing')})`,
      `C’est la fin de ${q('parking')} en français. N’ajoutez pas de ${q('g')} ou de ${q('k')} dur après.`,
    ],
    S_CLUSTER: [
      'Commence par s + consonne',
      `N’ajoutez pas de voyelle avant ou au milieu (${q('school')}, pas ${q('eschool')} ni ${q('sechool')}).`,
    ],
    CLUSTER: ['Groupe de consonnes au début', 'Prononcez les consonnes ensemble, sans voyelle entre elles.'],
    FINAL_VOICED: [
      'Finit par une consonne sonore',
      'Gardez la voix jusqu’au bout. Un b, d, g, v ou z final sans voix sonne comme p, t, k, f ou s.',
    ],
    FINAL_CLUSTER: ['Trois consonnes ou plus à la fin', 'Ne les supprimez pas et ne les séparez pas. Ralentissez sur la fin du mot.'],
    SHORT_I: [
      `La voyelle courte /ɪ/ (${q('ship')}, ${q('live')})`,
      `Le français n’a qu’un seul ${q('i')}, donc ${q('ship')} et ${q('sheep')} peuvent se confondre. Faites un /ɪ/ plus court et plus relâché.`,
    ],
    SHORT_U: [
      `La voyelle courte /ʊ/ (${q('full')}, ${q('book')})`,
      `Beaucoup de francophones la prononcent comme un ${q('ou')} long (${q('full')} → ${q('fool')}). Faites-la plus courte et plus relâchée.`,
    ],
    SPELLING: [
      'L’orthographe ne correspond pas au son',
      'Certaines lettres sont muettes ou une syllabe disparaît. Écoutez le mot une fois au lieu de le lire lettre par lettre.',
    ],
    ED: [
      `La terminaison ${q('-ed')}`,
      `Ici, ${q('-ed')} n’est qu’un son /t/ ou /d/, pas une syllabe en plus (${q('worked')} n’a qu’une syllabe).`,
    ],
    H: [
      'Le son /h/',
      `En français, le h ne se prononce jamais, donc on l’oublie facilement en anglais (${q('hair')} → ${q('air')}). Soufflez doucement avant la voyelle.`,
    ],
    CH: [
      `Le son /tʃ/ (${q('chair')})`,
      `Le ${q('ch')} anglais peut sortir comme le ${q('ch')} français (${q('chair')} → ${q('share')}). Commencez par un /t/ bref, comme le ${q('tch')} de ${q('tchèque')}.`,
    ],
    R: [
      'Le /r/ anglais',
      'Tirez la langue vers l’arrière sans toucher le palais. Ne le prononcez pas au fond de la gorge comme le r français.',
    ],
  },
};
