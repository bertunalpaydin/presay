// Irregular English word forms used by build-data.mjs to map inflected words
// (e.g. "thought") to their base form ("think") and back again.

// base past participle
const VERBS = `
arise arose arisen
awake awoke awoken
be was been
bear bore borne
beat beat beaten
become became become
begin began begun
bend bent bent
bet bet bet
bind bound bound
bite bit bitten
bleed bled bled
blow blew blown
break broke broken
breed bred bred
bring brought brought
broadcast broadcast broadcast
build built built
burn burnt burnt
burst burst burst
buy bought bought
catch caught caught
choose chose chosen
cling clung clung
come came come
cost cost cost
creep crept crept
cut cut cut
deal dealt dealt
dig dug dug
do did done
draw drew drawn
dream dreamt dreamt
drink drank drunk
drive drove driven
eat ate eaten
fall fell fallen
feed fed fed
feel felt felt
fight fought fought
find found found
flee fled fled
fling flung flung
fly flew flown
forbid forbade forbidden
forecast forecast forecast
forget forgot forgotten
forgive forgave forgiven
freeze froze frozen
get got gotten
give gave given
go went gone
grind ground ground
grow grew grown
hang hung hung
have had had
hear heard heard
hide hid hidden
hit hit hit
hold held held
hurt hurt hurt
keep kept kept
kneel knelt knelt
know knew known
lay laid laid
lead led led
lean leant leant
leap leapt leapt
learn learnt learnt
leave left left
lend lent lent
let let let
lie lay lain
light lit lit
lose lost lost
make made made
mean meant meant
meet met met
mislead misled misled
mistake mistook mistaken
overcome overcame overcome
overtake overtook overtaken
pay paid paid
prove proved proven
put put put
quit quit quit
read read read
rid rid rid
ride rode ridden
ring rang rung
rise rose risen
run ran run
say said said
see saw seen
seek sought sought
sell sold sold
send sent sent
set set set
sew sewed sewn
shake shook shaken
shed shed shed
shine shone shone
shoot shot shot
show showed shown
shrink shrank shrunk
shut shut shut
sing sang sung
sink sank sunk
sit sat sat
sleep slept slept
slide slid slid
speak spoke spoken
speed sped sped
spend spent spent
spin spun spun
split split split
spread spread spread
spring sprang sprung
stand stood stood
steal stole stolen
stick stuck stuck
sting stung stung
stink stank stunk
strike struck struck
strive strove striven
swear swore sworn
sweep swept swept
swim swam swum
swing swung swung
take took taken
teach taught taught
tear tore torn
tell told told
think thought thought
throw threw thrown
thrust thrust thrust
tread trod trodden
understand understood understood
undertake undertook undertaken
upset upset upset
wake woke woken
wear wore worn
weave wove woven
weep wept wept
win won won
wind wound wound
withdraw withdrew withdrawn
write wrote written
`;

// singular plural
const NOUNS = `
analysis analyses
axis axes
basis bases
child children
crisis crises
criterion criteria
diagnosis diagnoses
foot feet
goose geese
half halves
hypothesis hypotheses
knife knives
leaf leaves
life lives
loaf loaves
man men
medium media
mouse mice
person people
phenomenon phenomena
shelf shelves
thesis theses
tooth teeth
wife wives
wolf wolves
woman women
`;

// base comparative superlative
const ADJECTIVES = `
good better best
bad worse worst
far further furthest
little less least
many more most
much more most
well better best
`;

function rows(text) {
  return text.trim().split('\n').map((line) => line.trim().split(/\s+/));
}

export const IRREGULAR_VERBS = rows(VERBS).map(([base, past, participle]) => ({ base, past, participle }));
export const IRREGULAR_NOUNS = rows(NOUNS).map(([singular, plural]) => ({ singular, plural }));
export const IRREGULAR_ADJECTIVES = rows(ADJECTIVES).map(([base, comparative, superlative]) => ({
  base,
  comparative,
  superlative,
}));
