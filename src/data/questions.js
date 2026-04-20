// Static question bank. Two question types:
//   - "open":   partner types a free-text answer
//   - "choice": partner taps one of the provided options
// Each question has a spice level (1 = tame, 5 = spicy) and a category.
// Mode picks which categories are in the pool.

export const CATEGORIES = ['preferences', 'memories', 'scenarios', 'whatWouldThey']

export const QUESTIONS = {
  preferences: [
    { type: 'open', spice: 1, text: "What snack would your partner pick on movie night?" },
    { type: 'open', spice: 1, text: "What's your partner's comfort drink?" },
    { type: 'open', spice: 1, text: "What's your partner's favorite way to relax after a long day?" },
    { type: 'open', spice: 2, text: "What song would your partner play on repeat this week?" },
    { type: 'open', spice: 3, text: "What's your partner's guilty pleasure?" },
    { type: 'open', spice: 4, text: "What's your partner's favorite thing about your body?" },
    { type: 'open', spice: 5, text: "What's your partner's biggest turn-on?" },

    {
      type: 'choice', spice: 1,
      text: "What would your partner grab first at a cafe?",
      options: ['Iced coffee', 'Hot tea', 'Hot chocolate', 'A pastry'],
    },
    {
      type: 'choice', spice: 1,
      text: "How does your partner prefer to spend a Sunday morning?",
      options: ['Sleeping in', 'Long breakfast', 'Walk outside', 'Watching a show'],
    },
    {
      type: 'choice', spice: 2,
      text: "Which vibe is more your partner's style?",
      options: ['Cozy cafe', 'Rooftop bar', 'Quiet beach', 'Dance floor'],
    },
    {
      type: 'choice', spice: 2,
      text: "Pick a scent your partner would love.",
      options: ['Fresh citrus', 'Warm vanilla', 'Ocean breeze', 'Spicy cedar'],
    },
    {
      type: 'choice', spice: 3,
      text: "What's your partner's love language?",
      options: ['Words', 'Touch', 'Quality time', 'Gifts', 'Acts of service'],
    },
    {
      type: 'choice', spice: 3,
      text: "Your partner secretly finds which attractive?",
      options: ['Confidence', 'Humor', 'Mystery', 'Kindness'],
    },
    {
      type: 'choice', spice: 4,
      text: "Which outfit of yours does your partner find most attractive?",
      options: ['All dressed up', 'Casual weekend fit', 'Gym / sporty', 'Just woke up look'],
    },
    {
      type: 'choice', spice: 5,
      text: "What would your partner say is your sexiest feature?",
      options: ['Eyes', 'Smile', 'Voice', 'Hands', 'Something else'],
    },
  ],

  memories: [
    { type: 'open', spice: 1, text: "Where was your first official date?" },
    { type: 'open', spice: 1, text: "What was the first meal you ever cooked together?" },
    { type: 'open', spice: 2, text: "What's a moment together your partner still laughs about?" },
    { type: 'open', spice: 3, text: "Which trip or day out do they consider your best together?" },
    { type: 'open', spice: 4, text: "What's the most romantic thing you've ever done for them?" },
    { type: 'open', spice: 5, text: "What's the most unforgettable night you've spent together?" },

    {
      type: 'choice', spice: 1,
      text: "Where did your partner feel the first real spark between you two?",
      options: ['On the first date', 'Texting before meeting', 'A random moment later', 'When you first kissed'],
    },
    {
      type: 'choice', spice: 2,
      text: "What was your partner's first impression of you?",
      options: ['Shy but cute', 'Confident', 'Mysterious', 'Hilarious'],
    },
    {
      type: 'choice', spice: 2,
      text: "Which of your inside jokes is your partner's favorite?",
      options: ['The old one you both still laugh at', 'A recent one', 'Something weird only you get', 'The ones about food'],
    },
    {
      type: 'choice', spice: 3,
      text: "Which gift from you meant the most to your partner?",
      options: ['Something handmade', 'Something expensive', 'A small surprise', 'An experience together'],
    },
    {
      type: 'choice', spice: 4,
      text: "Which milestone meant the most to your partner?",
      options: ['First I love you', 'First trip together', 'Meeting each other\'s family', 'Moving in / staying over first time'],
    },
  ],

  scenarios: [
    { type: 'open', spice: 1, text: "If you won a free weekend trip, where would your partner pick?" },
    { type: 'open', spice: 2, text: "If your partner planned the perfect date night, what would it look like?" },
    { type: 'open', spice: 3, text: "What compliment would instantly make your partner melt?" },
    { type: 'open', spice: 4, text: "What would your partner do on a perfect late-night date?" },
    { type: 'open', spice: 5, text: "What's one fantasy your partner has hinted at?" },

    {
      type: 'choice', spice: 1,
      text: "If you had a free weekend, your partner would pick...",
      options: ['Cozy staycation', 'Road trip', 'Beach getaway', 'City adventure'],
    },
    {
      type: 'choice', spice: 2,
      text: "Perfect surprise from you would be...",
      options: ['A thoughtful gift', 'A planned night out', 'Cooking dinner at home', 'A love note'],
    },
    {
      type: 'choice', spice: 2,
      text: "Your partner's dream date vibe is...",
      options: ['Candlelit and quiet', 'Fun and silly', 'Adventurous and wild', 'Sensual and slow'],
    },
    {
      type: 'choice', spice: 3,
      text: "Which sweet gesture would melt your partner?",
      options: ['A handwritten note', 'Unexpected flowers', 'Favorite snack delivered', 'A long, slow hug'],
    },
    {
      type: 'choice', spice: 4,
      text: "What would your partner want first after a night apart?",
      options: ['A long kiss', 'A big hug', 'To cuddle in bed', 'To hear about your day'],
    },
    {
      type: 'choice', spice: 5,
      text: "If you had 24 hours alone, your partner would want to...",
      options: ['Stay in bed all day', 'Try something new together', 'Cook and slow dance', 'Go somewhere private'],
    },
  ],

  whatWouldThey: [
    { type: 'open', spice: 1, text: "What would your partner order at a new cafe?" },
    { type: 'open', spice: 2, text: "What would your partner do if they had a totally free day?" },
    { type: 'open', spice: 3, text: "How would your partner flirt with you in public without saying a word?" },
    { type: 'open', spice: 4, text: "What would your partner whisper if they wanted to drive you crazy?" },
    { type: 'open', spice: 5, text: "What move would your partner pull if they were trying to seduce you?" },

    {
      type: 'choice', spice: 1,
      text: "What would your partner do if you were 10 minutes late?",
      options: ['Text "everything okay?"', 'Wait patiently', 'Call immediately', 'Tease you for it later'],
    },
    {
      type: 'choice', spice: 2,
      text: "How would your partner react if you cooked them dinner out of nowhere?",
      options: ['Get emotional', 'Joke and then hug you', 'Eat it silently and happy', 'Post it everywhere'],
    },
    {
      type: 'choice', spice: 2,
      text: "Pick what your partner does first when they are stressed.",
      options: ['Vent it out', 'Go quiet', 'Distract themselves', 'Come to you for comfort'],
    },
    {
      type: 'choice', spice: 3,
      text: "What would your partner do if you wore something extra hot?",
      options: ['Compliment out loud', 'Stare and go quiet', 'Pull you closer', 'Tease you the whole night'],
    },
    {
      type: 'choice', spice: 4,
      text: "How does your partner flirt when nobody is watching?",
      options: ['Whispers in your ear', 'A slow touch on the back', 'A long deep look', 'A cheeky smile and bite lip'],
    },
    {
      type: 'choice', spice: 5,
      text: "What move drives your partner wild?",
      options: ['A soft neck kiss', 'A sudden pull close', 'A deep compliment', 'Playful teasing'],
    },
  ],
}

export const MODES = {
  fun: ['preferences', 'memories', 'whatWouldThey'],
  romantic: ['memories', 'scenarios', 'preferences'],
  flirty: ['scenarios', 'whatWouldThey', 'preferences'],
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
