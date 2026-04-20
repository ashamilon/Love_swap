// Static question bank. Two question types:
//   - "open":   the answerer types a free-text answer
//   - "choice": the answerer taps one of the provided options
// Each question has a spice level (1 = tame, 5 = spicy) and a category.
// Mode picks which categories are in the pool.
//
// Question text uses placeholders so the SAME question reads correctly
// for both players:
//   {name}  -> "you" (answerer's view) / answerer's name (guesser's view)
//   {their} -> "your" (answerer's view) / "<name>'s" (guesser's view)

export const CATEGORIES = ['preferences', 'memories', 'scenarios', 'whatWouldThey']

export const QUESTIONS = {
  preferences: [
    { type: 'open', spice: 1, text: "What snack would {name} pick on movie night?" },
    { type: 'open', spice: 1, text: "What's {their} comfort drink?" },
    { type: 'open', spice: 1, text: "What's {their} favorite way to relax after a long day?" },
    { type: 'open', spice: 2, text: "What song would {name} play on repeat this week?" },
    { type: 'open', spice: 3, text: "What's {their} guilty pleasure?" },
    { type: 'open', spice: 4, text: "What's the sexiest compliment someone could give {name}?" },
    { type: 'open', spice: 5, text: "What's {their} biggest turn-on?" },

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
      type: 'choice', spice: 4,
      text: "Which outfit does {name} feel most confident in?",
      options: ['All dressed up', 'Casual weekend fit', 'Gym / sporty', 'Just woke up look'],
    },
    {
      type: 'choice', spice: 5,
      text: "What does {name} think is {their} own sexiest feature?",
      options: ['Eyes', 'Smile', 'Voice', 'Hands', 'Something else'],
    },
  ],

  memories: [
    { type: 'open', spice: 1, text: "Where was your first official date together?" },
    { type: 'open', spice: 1, text: "What was the first meal you ever cooked together?" },
    { type: 'open', spice: 2, text: "What moment together does {name} still laugh about?" },
    { type: 'open', spice: 3, text: "Which trip or day out does {name} consider your best together?" },
    { type: 'open', spice: 4, text: "What's the most romantic thing {name} has ever done in this relationship?" },
    { type: 'open', spice: 5, text: "What unforgettable night does {name} secretly replay?" },

    {
      type: 'choice', spice: 1,
      text: "When did {name} feel the first real spark between you?",
      options: ['On the first date', 'Texting before meeting', 'A random moment later', 'When you first kissed'],
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
      type: 'choice', spice: 4,
      text: "Which relationship milestone meant the most to {name}?",
      options: ['First I love you', 'First trip together', 'Meeting each other\'s family', 'Moving in / staying over first time'],
    },
  ],

  scenarios: [
    { type: 'open', spice: 1, text: "Where would {name} go on a free weekend trip?" },
    { type: 'open', spice: 2, text: "If {name} planned the perfect date night, what would it look like?" },
    { type: 'open', spice: 3, text: "What compliment would instantly make {name} melt?" },
    { type: 'open', spice: 4, text: "What would {name} want on a perfect late-night date?" },
    { type: 'open', spice: 5, text: "What's one fantasy {name} has hinted at?" },

    {
      type: 'choice', spice: 1,
      text: "For a free weekend, {name} would pick...",
      options: ['Cozy staycation', 'Road trip', 'Beach getaway', 'City adventure'],
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
      type: 'choice', spice: 4,
      text: "What does {name} want first after a night apart?",
      options: ['A long kiss', 'A big hug', 'To cuddle in bed', 'To hear about your day'],
    },
    {
      type: 'choice', spice: 5,
      text: "With 24 hours alone together, {name} would want to...",
      options: ['Stay in bed all day', 'Try something new together', 'Cook and slow dance', 'Go somewhere private'],
    },
  ],

  whatWouldThey: [
    { type: 'open', spice: 1, text: "What would {name} order at a new cafe?" },
    { type: 'open', spice: 2, text: "What would {name} do on a totally free day?" },
    { type: 'open', spice: 3, text: "How would {name} flirt with you in public without saying a word?" },
    { type: 'open', spice: 4, text: "What would {name} whisper to drive you crazy?" },
    { type: 'open', spice: 5, text: "What move would {name} pull when trying to seduce you?" },

    {
      type: 'choice', spice: 1,
      text: "What would {name} do if you were 10 minutes late?",
      options: ['Text "everything okay?"', 'Wait patiently', 'Call immediately', 'Tease you for it later'],
    },
    {
      type: 'choice', spice: 2,
      text: "How would {name} react if you cooked dinner out of nowhere?",
      options: ['Get emotional', 'Joke and then hug you', 'Eat it silently and happy', 'Post it everywhere'],
    },
    {
      type: 'choice', spice: 2,
      text: "What does {name} do first when stressed?",
      options: ['Vent it out', 'Go quiet', 'Distract themselves', 'Come to you for comfort'],
    },
    {
      type: 'choice', spice: 3,
      text: "What would {name} do if you wore something extra hot?",
      options: ['Compliment out loud', 'Stare and go quiet', 'Pull you closer', 'Tease you the whole night'],
    },
    {
      type: 'choice', spice: 4,
      text: "How does {name} flirt when nobody is watching?",
      options: ['Whispers in your ear', 'A slow touch on the back', 'A long deep look', 'A cheeky smile'],
    },
    {
      type: 'choice', spice: 5,
      text: "What move drives {name} wild?",
      options: ['A soft neck kiss', 'A sudden pull close', 'A deep compliment', 'Playful teasing'],
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
export function formatQuestion(text, { viewerIsResponder, responderName }) {
  if (!text) return ''
  const safeName = responderName && responderName.trim() ? responderName.trim() : 'your partner'
  const who = viewerIsResponder ? 'you' : safeName
  const whose = viewerIsResponder
    ? 'your'
    : safeName === 'your partner'
      ? "your partner's"
      : `${safeName}'s`
  return text.replace(/\{name\}/g, who).replace(/\{their\}/g, whose)
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
