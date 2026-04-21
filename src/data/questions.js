// Static question bank. Two question types:
//   - "open":   the answerer types a free-text answer
//   - "choice": the answerer taps one of the provided options
// Each question has a spice level (1 = tame, 5 = spicy) and a category.
// Mode picks which categories are in the pool.
//
// Question text uses placeholders so the SAME question reads correctly
// for both players:
//   {name}    -> "you"  (answerer's view) / answerer's name (guesser's view)
//   {their}   -> "your" (answerer's view) / "<name>'s"     (guesser's view)
//   {partner} -> partner's name (answerer's view) / "you"  (guesser's view)
//   {partners}-> "<partner>'s"  (answerer's view) / "your" (guesser's view)

export const CATEGORIES = ['preferences', 'memories', 'scenarios', 'whatWouldThey']

export const QUESTIONS = {
  preferences: [
    { type: 'open', spice: 1, text: "What snack would {name} pick on movie night?" },
    { type: 'open', spice: 1, text: "What's {their} comfort drink?" },
    { type: 'open', spice: 1, text: "What's {their} favorite way to relax after a long day?" },
    { type: 'open', spice: 1, text: "What's {their} go-to breakfast?" },
    { type: 'open', spice: 1, text: "Which season does {name} love the most?" },
    { type: 'open', spice: 2, text: "What song would {name} play on repeat this week?" },
    { type: 'open', spice: 2, text: "Which movie could {name} rewatch over and over?" },
    { type: 'open', spice: 2, text: "What's {their} favorite thing about {partners} laugh?" },
    { type: 'open', spice: 3, text: "What's {their} guilty pleasure?" },
    { type: 'open', spice: 3, text: "What makes {name} instantly feel safe with {partner}?" },
    { type: 'open', spice: 4, text: "What's the sexiest compliment someone could give {name}?" },
    { type: 'open', spice: 4, text: "What part of {partners} body does {name} find most attractive?" },
    { type: 'open', spice: 5, text: "What's {their} biggest turn-on?" },
    { type: 'open', spice: 5, text: "What scent or taste instantly turns {name} on?" },

    {
      type: 'choice', spice: 1,
      text: "What would {name} grab first at a cafe?",
      options: ['Iced coffee', 'Hot tea', 'Hot chocolate', 'A pastry'],
    },
    {
      type: 'choice', spice: 1,
      text: "How does {name} prefer to spend a Sunday morning?",
      options: ['Sleeping in', 'Long breakfast', 'Walk outside', 'Watching a show'],
    },
    {
      type: 'choice', spice: 1,
      text: "Which weather does {name} love most?",
      options: ['Warm and sunny', 'Cool and breezy', 'Rainy and cozy', 'Crisp and snowy'],
    },
    {
      type: 'choice', spice: 2,
      text: "Which vibe is more {their} style?",
      options: ['Cozy cafe', 'Rooftop bar', 'Quiet beach', 'Dance floor'],
    },
    {
      type: 'choice', spice: 2,
      text: "Pick a scent {name} would love.",
      options: ['Fresh citrus', 'Warm vanilla', 'Ocean breeze', 'Spicy cedar'],
    },
    {
      type: 'choice', spice: 2,
      text: "Which midnight snack is most {their} style?",
      options: ['Something salty', 'Something sweet', 'Leftovers from dinner', 'Anything chocolate'],
    },
    {
      type: 'choice', spice: 3,
      text: "What's {their} love language?",
      options: ['Words', 'Touch', 'Quality time', 'Gifts', 'Acts of service'],
    },
    {
      type: 'choice', spice: 3,
      text: "Which quality attracts {name} the most?",
      options: ['Confidence', 'Humor', 'Mystery', 'Kindness'],
    },
    {
      type: 'choice', spice: 3,
      text: "{name} feels most loved when {partner}...",
      options: ['Says something sweet', 'Initiates physical touch', 'Plans a date', 'Does something thoughtful'],
    },
    {
      type: 'choice', spice: 4,
      text: "Which outfit does {name} feel most confident in?",
      options: ['All dressed up', 'Casual weekend fit', 'Gym / sporty', 'Just woke up look'],
    },
    {
      type: 'choice', spice: 4,
      text: "What turns {name} on the fastest?",
      options: ['A lingering look', 'A deep voice', 'A confident touch', 'Playful teasing'],
    },
    {
      type: 'choice', spice: 5,
      text: "What does {name} think is {their} own sexiest feature?",
      options: ['Eyes', 'Smile', 'Voice', 'Hands', 'Something else'],
    },
    {
      type: 'choice', spice: 5,
      text: "Which kind of kiss does {name} crave most?",
      options: ['Slow and deep', 'Quick and hungry', 'Playful and biting', 'Gentle on the neck'],
    },
  ],

  memories: [
    { type: 'open', spice: 1, text: "Where was your first official date together?" },
    { type: 'open', spice: 1, text: "What was the first meal you ever cooked together?" },
    { type: 'open', spice: 1, text: "What's the first thing {name} noticed about {partner}?" },
    { type: 'open', spice: 2, text: "What moment together does {name} still laugh about?" },
    { type: 'open', spice: 2, text: "Which photo of you two is {their} favorite?" },
    { type: 'open', spice: 2, text: "What was {name} thinking on your first date?" },
    { type: 'open', spice: 3, text: "Which trip or day out does {name} consider your best together?" },
    { type: 'open', spice: 3, text: "What's a small moment that made {name} realize they were falling?" },
    { type: 'open', spice: 4, text: "What's the most romantic thing {name} has ever done in this relationship?" },
    { type: 'open', spice: 4, text: "What's the most thoughtful thing {partner} has ever done for {name}?" },
    { type: 'open', spice: 5, text: "What unforgettable night does {name} secretly replay?" },
    { type: 'open', spice: 5, text: "Which moment together made {name} weak in the knees?" },

    {
      type: 'choice', spice: 1,
      text: "When did {name} feel the first real spark between you?",
      options: ['On the first date', 'Texting before meeting', 'A random moment later', 'When you first kissed'],
    },
    {
      type: 'choice', spice: 1,
      text: "Where does {name} remember your best laugh together?",
      options: ['At home on the couch', 'Out at a restaurant', 'On a trip', 'In bed late at night'],
    },
    {
      type: 'choice', spice: 2,
      text: "What was {their} very first impression when you met?",
      options: ['Shy but cute', 'Confident', 'Mysterious', 'Hilarious'],
    },
    {
      type: 'choice', spice: 2,
      text: "Which inside joke is {their} favorite?",
      options: ['The old one you both still laugh at', 'A recent one', 'Something weird only you get', 'The ones about food'],
    },
    {
      type: 'choice', spice: 3,
      text: "Which gift meant the most to {name}?",
      options: ['Something handmade', 'Something expensive', 'A small surprise', 'An experience together'],
    },
    {
      type: 'choice', spice: 3,
      text: "Which argument does {name} still think about?",
      options: ['The silly one', 'The one you resolved quickly', 'The big one', 'None, we barely fight'],
    },
    {
      type: 'choice', spice: 4,
      text: "Which relationship milestone meant the most to {name}?",
      options: ['First I love you', 'First trip together', "Meeting each other's family", 'Moving in / staying over first time'],
    },
    {
      type: 'choice', spice: 4,
      text: "Which moment made {name} fall the hardest?",
      options: ['A deep conversation', 'A small caring gesture', 'Sharing a vulnerable moment', 'A physical moment'],
    },
    {
      type: 'choice', spice: 5,
      text: "Which private memory does {name} replay most?",
      options: ['Your first kiss', 'Your first night together', 'A lazy morning in bed', 'A surprise after a long day'],
    },
  ],

  scenarios: [
    { type: 'open', spice: 1, text: "Where would {name} go on a free weekend trip?" },
    { type: 'open', spice: 1, text: "What would {name} cook for a cozy date night?" },
    { type: 'open', spice: 2, text: "If {name} planned the perfect date night, what would it look like?" },
    { type: 'open', spice: 2, text: "What song would {name} pick for a slow dance with {partner}?" },
    { type: 'open', spice: 3, text: "What compliment would instantly make {name} melt?" },
    { type: 'open', spice: 3, text: "If {name} had to write a love note right now, how would it start?" },
    { type: 'open', spice: 4, text: "What would {name} want on a perfect late-night date?" },
    { type: 'open', spice: 4, text: "Describe {partners} perfect massage from {name}." },
    { type: 'open', spice: 5, text: "What's one fantasy {name} has hinted at?" },
    { type: 'open', spice: 5, text: "If {name} had a secret hotel night with {partner}, how would it start?" },

    {
      type: 'choice', spice: 1,
      text: "For a free weekend, {name} would pick...",
      options: ['Cozy staycation', 'Road trip', 'Beach getaway', 'City adventure'],
    },
    {
      type: 'choice', spice: 1,
      text: "A perfect morning together for {name} starts with...",
      options: ['Coffee in bed', 'A long walk', 'Making breakfast together', 'Not getting out of bed'],
    },
    {
      type: 'choice', spice: 2,
      text: "The perfect surprise for {name} would be...",
      options: ['A thoughtful gift', 'A planned night out', 'Cooking dinner together', 'A love note'],
    },
    {
      type: 'choice', spice: 2,
      text: "What's {their} dream date vibe?",
      options: ['Candlelit and quiet', 'Fun and silly', 'Adventurous and wild', 'Sensual and slow'],
    },
    {
      type: 'choice', spice: 3,
      text: "Which sweet gesture would melt {name}?",
      options: ['A handwritten note', 'Unexpected flowers', 'Favorite snack delivered', 'A long, slow hug'],
    },
    {
      type: 'choice', spice: 3,
      text: "Reuniting after a week apart, {name} wants...",
      options: ['A long slow kiss', 'To just talk and hold hands', 'To cook together', 'To skip straight to bed'],
    },
    {
      type: 'choice', spice: 4,
      text: "What does {name} want first after a night apart?",
      options: ['A long kiss', 'A big hug', 'To cuddle in bed', 'To hear about your day'],
    },
    {
      type: 'choice', spice: 4,
      text: "On a secret getaway, {name} would pick...",
      options: ['A candlelit hotel suite', 'A quiet cabin in the woods', 'A beach bungalow', 'A rooftop in a new city'],
    },
    {
      type: 'choice', spice: 5,
      text: "With 24 hours alone together, {name} would want to...",
      options: ['Stay in bed all day', 'Try something new together', 'Cook and slow dance', 'Go somewhere private'],
    },
    {
      type: 'choice', spice: 5,
      text: "{name}'s ideal intimate evening starts with...",
      options: ['Music and candles', 'A long shower together', 'A slow hand on the lower back', 'A whispered confession'],
    },
  ],

  whatWouldThey: [
    { type: 'open', spice: 1, text: "What would {name} order at a new cafe?" },
    { type: 'open', spice: 1, text: "What would {name} buy first with $500 to spoil {partner}?" },
    { type: 'open', spice: 2, text: "What would {name} do on a totally free day?" },
    { type: 'open', spice: 2, text: "If {partner} had a bad day, how would {name} cheer them up?" },
    { type: 'open', spice: 3, text: "How would {name} flirt with {partner} in public without saying a word?" },
    { type: 'open', spice: 3, text: "What nickname would {name} secretly love {partner} to call them?" },
    { type: 'open', spice: 4, text: "What would {name} whisper to drive {partner} crazy?" },
    { type: 'open', spice: 4, text: "What would {name} do if {partner} walked out of the shower right now?" },
    { type: 'open', spice: 5, text: "What move would {name} pull when trying to seduce {partner}?" },
    { type: 'open', spice: 5, text: "How would {name} start a spontaneous makeout with {partner}?" },

    {
      type: 'choice', spice: 1,
      text: "What would {name} do if {partner} showed up 10 minutes late?",
      options: ['Text "everything okay?"', 'Wait patiently', 'Call immediately', 'Tease them for it later'],
    },
    {
      type: 'choice', spice: 1,
      text: "If {partner} was upset, {name} would first...",
      options: ['Give space', 'Offer a hug', 'Ask what happened', 'Distract with a joke'],
    },
    {
      type: 'choice', spice: 2,
      text: "How would {name} react if {partner} cooked dinner out of nowhere?",
      options: ['Get emotional', 'Joke and then hug them', 'Eat it silently and happy', 'Post it everywhere'],
    },
    {
      type: 'choice', spice: 2,
      text: "What does {name} do first when stressed?",
      options: ['Vent it out', 'Go quiet', 'Distract themselves', 'Come to {partner} for comfort'],
    },
    {
      type: 'choice', spice: 3,
      text: "What would {name} do if {partner} wore something extra hot?",
      options: ['Compliment out loud', 'Stare and go quiet', 'Pull them closer', 'Tease them the whole night'],
    },
    {
      type: 'choice', spice: 3,
      text: "If {name} had to brag about {partner} in one word, it would be...",
      options: ['Gorgeous', 'Brilliant', 'Funny', 'Mine'],
    },
    {
      type: 'choice', spice: 4,
      text: "How does {name} flirt when nobody is watching?",
      options: ["Whispers in {partners} ear", 'A slow touch on the back', 'A long deep look', 'A cheeky smile'],
    },
    {
      type: 'choice', spice: 4,
      text: "In a crowded room, {name} catches {partners} eye by...",
      options: ['Biting their lip', 'A slow wink', 'A suggestive smile', 'Mouthing something dirty'],
    },
    {
      type: 'choice', spice: 5,
      text: "What move drives {name} wild?",
      options: ['A soft neck kiss', 'A sudden pull close', 'A deep compliment', 'Playful teasing'],
    },
    {
      type: 'choice', spice: 5,
      text: "{name}'s go-to seduction move is...",
      options: ['Eye contact and silence', 'A bold, direct touch', 'Whispered words', 'Pinning {partner} against the wall'],
    },
  ],
}

export const MODES = {
  fun: ['preferences', 'memories', 'whatWouldThey'],
  romantic: ['memories', 'scenarios', 'preferences'],
  flirty: ['scenarios', 'whatWouldThey', 'preferences'],
}

// Render a question's text from a specific viewer's perspective.
// viewerIsResponder = true  -> the reader is the one answering about themselves
// viewerIsResponder = false -> the reader is guessing what their partner said
export function formatQuestion(text, { viewerIsResponder, responderName, partnerName }) {
  if (!text) return ''
  const safeResp = responderName && responderName.trim() ? responderName.trim() : 'your partner'
  const safePart = partnerName && partnerName.trim() ? partnerName.trim() : 'your partner'

  const name = viewerIsResponder ? 'you' : safeResp
  const their = viewerIsResponder
    ? 'your'
    : safeResp === 'your partner'
      ? "your partner's"
      : `${safeResp}'s`
  const partner = viewerIsResponder ? safePart : 'you'
  const partners = viewerIsResponder
    ? safePart === 'your partner'
      ? "your partner's"
      : `${safePart}'s`
    : 'your'

  return text
    .replace(/\{partners\}/g, partners)
    .replace(/\{partner\}/g, partner)
    .replace(/\{their\}/g, their)
    .replace(/\{name\}/g, name)
}

// Returns a shuffled list of questions matching mode + spice ceiling.
export function buildQuestionPool(mode, spiceLevel, count) {
  const categories = MODES[mode] ?? MODES.flirty
  const pool = []

  categories.forEach((category) => {
    QUESTIONS[category].forEach((q) => {
      if (q.spice <= spiceLevel) pool.push({ ...q, category })
    })
  })

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  if (pool.length >= count) return pool.slice(0, count)

  const filler = []
  let idx = 0
  while (filler.length + pool.length < count) {
    filler.push(pool[idx % pool.length])
    idx += 1
  }
  return [...pool, ...filler]
}
