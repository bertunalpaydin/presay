// Explanations in Spanish, shown when "Explanations in Español" is on.
// They say the same as the English tips in languages.js and keep the same
// English example words.

export default {
  lang: 'es',
  dir: 'ltr',
  label: 'Español',
  heading: 'Por qué puede ser difícil',
  stressTitle: (syllables) => `Palabra larga, ${syllables} sílabas`,
  stressNote:
    'En las palabras largas del inglés, una sílaba es mucho más fuerte que las demás, y las otras se acortan. La marca ˈ en la pronunciación indica dónde va el acento.',
  reasons: {
    TH: [
      'El sonido «th» /θ/',
      'Muchos hispanohablantes lo pronuncian como «t» o «s». Pon la punta de la lengua suavemente entre los dientes y sopla aire, sin voz.',
    ],
    DH: [
      'El sonido «th» sonoro /ð/',
      'Muchos hispanohablantes lo pronuncian como una «d» fuerte. Es la «d» suave de «nada»: la lengua entre los dientes y con voz.',
    ],
    W: ['El sonido /w/', 'Redondea los labios como para decir «u» y no toques el labio inferior con los dientes.'],
    V: [
      'El sonido /v/',
      'En español la «b» y la «v» suenan igual, así que /v/ suele salir como «b» («vote» → «boat»). Apoya los dientes de arriba en el labio inferior y mantén la voz.',
    ],
    VW: ['/v/ y /w/ en la misma palabra', 'Sepáralos: para /v/, los dientes tocan el labio inferior; para /w/, solo se redondean los labios.'],
    AE: [
      'La vocal /æ/ («bad», «man»)',
      'Muchos hispanohablantes la pronuncian como «e» («bad» → «bed»). Abre la boca más que para la «e», casi como para una «a».',
    ],
    STRUT: [
      'La vocal corta /ʌ/ («cup»)',
      'Muchos hispanohablantes la pronuncian como «o» («luck» → «lock»). Corta y relajada, con la boca medio abierta.',
    ],
    ER: [
      'La vocal con «r» («bird», «work»)',
      'Es una sola vocal larga, con la lengua hacia atrás. No hagas vibrar la «r» ni pongas otra vocal delante.',
    ],
    NG: ['El sonido /ŋ/ («thing»)', 'Es la «n» de «tengo», pero sin la «g». Termina con la parte de atrás de la lengua.'],
    S_CLUSTER: [
      'Empieza por s + consonante',
      'En español ninguna palabra empieza por s + consonante, así que es fácil añadir una «e» («estudent»). Empieza directamente con la /s/.',
    ],
    CLUSTER: ['Grupo de consonantes al principio', 'Di las consonantes juntas, sin ninguna vocal entre ellas.'],
    FINAL_VOICED: [
      'Termina en consonante sonora',
      'Mantén la voz hasta el final. Una b, d, g, v o z final sin voz suena como p, t, k, f o s.',
    ],
    FINAL_CLUSTER: ['Tres o más consonantes al final', 'No las elimines ni las separes. Ve más despacio al final de la palabra.'],
    SHORT_I: [
      'La vocal corta /ɪ/ («ship», «live»)',
      'El español tiene una sola «i», así que «ship» y «sheep» pueden sonar igual. Haz la /ɪ/ más corta y relajada.',
    ],
    SHORT_U: [
      'La vocal corta /ʊ/ («full», «book»)',
      'Muchos hispanohablantes la pronuncian como una «u» larga («full» → «fool»). Hazla más corta y relajada.',
    ],
    SPELLING: [
      'La escritura no coincide con el sonido',
      'Algunas letras no se pronuncian o se pierde una sílaba. Escucha la palabra una vez en lugar de leerla letra por letra.',
    ],
    ED: ['La terminación «-ed»', 'Aquí «-ed» es solo un sonido /t/ o /d/, no una sílaba más («worked» tiene una sola sílaba).'],
    Z: [
      'El sonido /z/',
      'El español no tiene una /z/ zumbante, así que «zoo» puede sonar como «Sue» y «eyes» como «ice». Mantén la voz durante todo el sonido.',
    ],
    SH: [
      'El sonido /ʃ/ («she»)',
      '«Sh» y «ch» se confunden con facilidad («share» → «chair»). /ʃ/ es un siseo suave, sin ningún golpe antes.',
    ],
    CH: [
      'El sonido /tʃ/ («chair»)',
      'Algunos hispanohablantes lo pronuncian como «sh». Empieza con una /t/ breve y luego pasa a «sh».',
    ],
    H: ['El sonido /h/', 'Un soplo suave antes de la vocal. No lo raspes como la «j» española.'],
  },
};
