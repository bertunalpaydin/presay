// Explanations in German, shown when "Explanations in Deutsch" is on.
// They say the same as the English tips in languages.js and keep the same
// English example words.

export default {
  lang: 'de',
  dir: 'ltr',
  label: 'Deutsch',
  heading: 'Warum das schwer sein kann',
  stressTitle: (syllables) => `Langes Wort, ${syllables} Silben`,
  stressNote:
    'In langen englischen Wörtern ist eine Silbe viel stärker als die anderen, und die übrigen werden kürzer. Das Zeichen ˈ in der Aussprache zeigt, wo die Betonung liegt.',
  reasons: {
    TH: [
      'Der „th“-Laut /θ/',
      'Im Deutschen gibt es kein /θ/, deshalb wird es oft zu „s“ („think“ → „sink“). Leg die Zungenspitze zwischen die Zähne und puste.',
    ],
    DH: [
      'Der stimmhafte „th“-Laut /ð/',
      'Viele Deutschsprachige sagen dafür „d“ oder ein stimmhaftes „s“ wie in „Sonne“. Die Zunge liegt wie bei /θ/, aber mit Stimme.',
    ],
    W: [
      'Der /w/-Laut',
      'Das deutsche „w“ wird /v/ gesprochen, deshalb kann „west“ wie „vest“ klingen. Runde die Lippen wie bei „u“ und halte die Zähne von der Lippe fern.',
    ],
    V: [
      'Der /v/-Laut',
      'Wer sich sehr bemüht, „w“ nicht als /v/ zu sprechen, kippt leicht ins Gegenteil („vest“ → „west“). Das englische /v/ ist der Laut des deutschen „w“ in „Wasser“.',
    ],
    VW: [
      '/v/ und /w/ im selben Wort',
      'Halte sie auseinander: Bei /v/ liegen die Zähne auf der Unterlippe, bei /w/ werden nur die Lippen gerundet.',
    ],
    AE: [
      'Der Vokal /æ/ („bad“, „man“)',
      'Im Deutschen gibt es kein /æ/, deshalb können „bad“ und „bed“ gleich klingen. Öffne den Mund weiter, fast wie bei „a“.',
    ],
    STRUT: ['Der kurze Vokal /ʌ/ („cup“)', 'Kurz und entspannt, mit halb offenem Mund.'],
    ER: [
      'Der Vokal mit „r“ („bird“, „work“)',
      'Ein einziger langer Vokal, die Zunge nach hinten gezogen. Sprich das r nicht hinten im Rachen wie im Deutschen.',
    ],
    NG: ['Der /ŋ/-Laut („thing“)', 'Das ist das „ng“ in „singen“, ohne ein „g“ oder „k“ danach.'],
    S_CLUSTER: ['Beginnt mit s + Konsonant', 'Das englische „s“ bleibt vor p und t ein „s“: „street“, nicht „schtreet“.'],
    FINAL_VOICED: [
      'Endet auf einem stimmhaften Konsonanten',
      'Im Deutschen werden b, d, g und s am Wortende stimmlos („Hund“ endet auf /t/), deshalb kann „bad“ wie „bat“ und „eyes“ wie „ice“ klingen. Halte die Stimme bis zum Schluss.',
    ],
    FINAL_CLUSTER: [
      'Drei oder mehr Konsonanten am Ende',
      'Lass sie nicht weg und trenne sie nicht. Werde am Wortende langsamer.',
    ],
    SHORT_I: ['Der kurze Vokal /ɪ/ („ship“, „live“)', 'Das ist das kurze „i“ in „Schiff“, nicht das lange „ie“.'],
    SHORT_U: ['Der kurze Vokal /ʊ/ („full“, „book“)', 'Das ist das kurze „u“ in „Mutter“, nicht das lange „u“ in „gut“.'],
    SPELLING: [
      'Schreibung und Aussprache passen nicht zusammen',
      'Manche Buchstaben sind stumm oder eine Silbe fällt weg. Hör dir das Wort einmal an, statt es Buchstabe für Buchstabe zu lesen.',
    ],
    ED: [
      'Die Endung „-ed“',
      'Hier ist „-ed“ nur ein /t/- oder /d/-Laut, keine eigene Silbe („worked“ hat nur eine Silbe).',
    ],
  },
};
