// Explanations in Brazilian Portuguese, shown when "Explanations in Português"
// is on. They say the same as the English tips in languages.js and keep the
// same English example words.

export default {
  lang: 'pt-BR',
  dir: 'ltr',
  label: 'Português',
  heading: 'Por que pode ser difícil',
  stressTitle: (syllables) => `Palavra longa, ${syllables} sílabas`,
  stressNote:
    'Nas palavras longas do inglês, uma sílaba é bem mais forte que as outras, e as outras ficam mais curtas. A marca ˈ na pronúncia mostra onde fica a sílaba tônica.',
  reasons: {
    TH: [
      'O som “th” /θ/',
      'Muitos brasileiros falam como “t”, “s” ou “f”. Coloque a ponta da língua levemente entre os dentes e sopre o ar, sem voz.',
    ],
    DH: ['O som “th” sonoro /ð/', 'Muitos brasileiros falam como “d”. A língua fica na mesma posição do /θ/, mas agora com voz.'],
    W: ['O som /w/', 'Arredonde os lábios como para dizer “u” e não encoste os dentes no lábio de baixo.'],
    AE: [
      'A vogal /æ/ (“bad”, “man”)',
      'Muitos brasileiros falam como “é” (“bad” → “bed”). Abra mais a boca do que para o “é”, quase como um “a”.',
    ],
    STRUT: ['A vogal curta /ʌ/ (“cup”)', 'Curta e relaxada, com a boca meio aberta.'],
    ER: [
      'A vogal com “r” (“bird”, “work”)',
      'É uma única vogal longa, com a língua puxada para trás, parecida com o “r caipira” de “porta”. Não coloque outra vogal antes.',
    ],
    NG: ['O som /ŋ/ (“thing”)', 'Termine com a parte de trás da língua, sem acrescentar um “g” ou “k” forte no final.'],
    S_CLUSTER: ['Começa com s + consoante', 'Não coloque um “e” antes (“school”, não “eschool”). Comece direto no /s/.'],
    CLUSTER: ['Grupo de consoantes no início', 'Fale as consoantes juntas, sem nenhuma vogal entre elas.'],
    FINAL_VOICED: [
      'Termina em consoante sonora',
      'Mantenha a voz até o fim. Um b, d, g, v ou z final sem voz soa como p, t, k, f ou s.',
    ],
    FINAL_CLUSTER: ['Três ou mais consoantes no final', 'Não corte nem separe essas consoantes. Vá mais devagar no final da palavra.'],
    SHORT_I: [
      'A vogal curta /ɪ/ (“ship”, “live”)',
      'O português não tem o /ɪ/ curto, então “ship” e “sheep” podem soar iguais. Faça o som mais curto e relaxado que o “i”.',
    ],
    SHORT_U: [
      'A vogal curta /ʊ/ (“full”, “book”)',
      'Muitos brasileiros falam como um “u” longo (“full” → “fool”). Faça o som mais curto e relaxado.',
    ],
    SPELLING: [
      'A escrita não corresponde ao som',
      'Algumas letras não são pronunciadas ou uma sílaba some. Ouça a palavra uma vez em vez de ler letra por letra.',
    ],
    ED: ['A terminação “-ed”', 'Aqui o “-ed” é só um som de /t/ ou /d/, não uma sílaba a mais (“worked” tem uma sílaba só).'],
    R: [
      'O /r/ do inglês',
      'No português do Brasil, o “r” no começo da palavra soa como /h/, então “red” pode soar como “head”. Em vez disso, curve a língua para trás.',
    ],
    H: ['O som /h/', 'Um sopro leve antes da vogal, como o “rr” de “carro”. Não deixe de pronunciá-lo.'],
    T_I: [
      '/t/ ou /d/ antes de som de “i” (“team”, “deep”)',
      'Antes de som de “i”, o português do Brasil transforma t e d em “tch” e “dj” (“tip” → “chip”). Mantenha o t e o d limpos.',
    ],
    FINAL_STOP: [
      'Termina em consoante oclusiva (“big”, “light”)',
      'É tentador colocar um “i” curto depois da última consoante (“big” → “bigi”). Pare de forma limpa na consoante.',
    ],
  },
};
