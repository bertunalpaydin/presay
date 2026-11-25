// Explanations in Turkish, shown when "Explanations in Türkçe" is on.
// They say the same as the English tips in languages.js and keep the same
// English example words.

export default {
  lang: 'tr',
  dir: 'ltr',
  label: 'Türkçe',
  heading: 'Neden zor olabilir',
  stressTitle: (syllables) => `Uzun kelime, ${syllables} hece`,
  stressNote:
    'Türkçede vurgu genellikle son hecededir; İngilizcede çoğu zaman öyle değildir. Telaffuzdaki ˈ işareti vurgunun nereye düştüğünü gösterir.',
  reasons: {
    TH: [
      '“th” sesi /θ/',
      'Türkçede /θ/ olmadığı için çoğu zaman “t”, “s” ya da “f” gibi çıkar. Dilinin ucunu hafifçe dişlerinin arasına koy ve ses çıkarmadan hava üfle.',
    ],
    DH: ['Yumuşak “th” sesi /ð/', 'Çoğu zaman “d” ya da “z” gibi çıkar. Dil /θ/ ile aynı yerde dursun, ama bu kez ses tellerin titreşsin.'],
    W: ['/w/ sesi', 'Türkçe konuşanlar burada çoğu zaman “v” der (“west”, “vest” olur). Dudaklarını “u” der gibi yuvarla, dişlerin dudağına değmesin.'],
    VW: ['Aynı kelimede hem /v/ hem /w/', 'İkisini ayır: /v/ için üst dişler alt dudağa değer, /w/ için yalnızca dudaklar yuvarlanır.'],
    AE: ['/æ/ ünlüsü (“bad”, “man”)', '“e” ile karışması kolaydır, o zaman “bad” “bed” gibi duyulur. Ağzını daha çok aç, “a”ya yaklaştır.'],
    STRUT: ['Kısa /ʌ/ ünlüsü (“cup”)', 'Kısa ve gevşek; Türkçedeki “a” ile “ı” arasında bir ses. Kısa tut.'],
    ER: ['r’li uzun ünlü (“bird”, “work”)', 'Türkçede karşılığı yok. r’yi titretme; tek ve uzun bir ünlü gibi söyle.'],
    NG: ['/ŋ/ sesi (“thing”)', 'Dilin arka kısmıyla bitir; sonuna sert bir “g” ya da “k” ekleme.'],
    S_CLUSTER: ['s + ünsüzle başlıyor', 'Önüne ya da arasına ünlü ekleme (“school”, “ıschool” ya da “sıchool” değil).'],
    CLUSTER: ['Başta ünsüz kümesi', 'Ünsüzleri arada ünlü olmadan, birlikte söyle.'],
    FINAL_VOICED: [
      'Yumuşak ünsüzle bitiyor',
      'Türkçede kelime sonundaki b, d, g, z sertleşir; bu yüzden “bad” “bat”, “eyes” de “ice” gibi duyulabilir. Ses tellerin sona kadar titreşsin.',
    ],
    FINAL_CLUSTER: ['Sonda üç ya da daha fazla ünsüz', 'Bunları düşürme ya da bölme. Kelimenin sonunda yavaşla.'],
    SHORT_I: ['Kısa /ɪ/ ünlüsü (“ship”, “live”)', 'Türkçedeki “i”den daha kısa ve gevşek; yoksa “ship” “sheep” gibi duyulabilir.'],
    SHORT_U: ['Kısa /ʊ/ ünlüsü (“full”, “book”)', '“u”dan daha kısa; yoksa “full” “fool” gibi duyulabilir.'],
    SPELLING: ['Yazılışı okunuşuna uymuyor', 'Bazı harfler okunmuyor ya da bir hece düşüyor. Harf harf okumak yerine kelimeyi bir kez dinle.'],
    ED: ['“-ed” eki', 'Burada “-ed” ayrı bir hece değil, sadece /t/ ya da /d/ sesidir (“worked” tek hecedir).'],
  },
};
