// Words Presay never suggests as an alternative and never prints as a
// "might be heard as" word. When a slip would turn a word into one of these,
// the app only says that it can sound like a rude word.
//
// The dictionaries behind the data are general-purpose, so without this list
// "click" would be offered "chink" and "beach" would show its famous slip.

export const BLOCKED = new Set(
  `
  arse arses ass asses balls bastard bastards bitch bitches bitchy bloody bollocks boob boobs bugger buggers
  chink chinks cock cocks coon coons crap crappy cunt cunts dago damn damned dick dicks dyke dykes fag fags
  faggot faggots fart farts fuck fucked fucker fucking fucks git gook gooks gyp gypped homo homos horny jap japs
  kike kikes knob knobs midget midgets minger negro negroes nigga nigger niggers nob paki pakis piss pissed
  pisses porn porno prick pricks pussy queer queers rape raped rapes rapist retard retarded retards sexy shag
  shit shits shitty slag slags slut sluts sod sods spastic spaz spic spics tit tits titty tosser tranny turd turds
  twat twats wank wanker wankers whore whores wop wops
  `
    .split(/\s+/)
    .filter(Boolean),
);

// Slang and very informal words. They are real words a listener might hear,
// but not good advice for an interview or a talk, so they are never suggested.
export const INFORMAL = new Set(
  `
  bloke blokes bonkers booze buck bucks chap chaps cop cops crackers daft darn dope dude dudes fruitcake fruitcakes
  gonna gotta guy guys haywire hombre hooey jolly kinda lashings loony ma mom mum mummy nab nabs nipper nope nuts
  nutty ok okay pa pal pals rattling scads shucks snitch sorta telly tummy wads wanna yeah yep
  `
    .split(/\s+/)
    .filter(Boolean),
);
