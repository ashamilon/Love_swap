// Static question bank. No AI / no backend needed.
// Each category has questions tagged by spice level (1 = tame, 5 = spicy).
// Mode just picks which categories are in the pool.

export const CATEGORIES = ['preferences', 'memories', 'scenarios', 'whatWouldThey']

export const QUESTIONS = {
  preferences: [
    { spice: 1, text: "What snack would your partner pick on movie night?" },
    { spice: 1, text: "What's your partner's comfort drink?" },
    { spice: 1, text: "What's your partner's favorite way to relax after a long day?" },
    { spice: 2, text: "What song would your partner play on repeat this week?" },
    { spice: 2, text: "What would your partner wear on a first date if they could redo it?" },
    { spice: 3, text: "What's your partner's guilty pleasure?" },
    { spice: 3, text: "What's your partner's idea of the perfect lazy Sunday?" },
    { spice: 4, text: "What's your partner's favorite thing about your body?" },
    { spice: 5, text: "What's your partner's biggest turn-on?" },
  ],
  memories: [
    { spice: 1, text: "Where was your first official date?" },
    { spice: 1, text: "What was the first meal you ever cooked together?" },
    { spice: 2, text: "What's a moment together your partner still laughs about?" },
    { spice: 2, text: "What was the most thoughtful gift your partner ever received from you?" },
    { spice: 3, text: "Which trip or day out do they consider your best together?" },
    { spice: 3, text: "What's a small moment your partner probably still thinks about?" },
    { spice: 4, text: "What's the most romantic thing you've ever done for them?" },
    { spice: 5, text: "What's the most unforgettable night you've spent together?" },
  ],
  scenarios: [
    { spice: 1, text: "If you won a free weekend trip, where would your partner pick?" },
    { spice: 1, text: "What would your partner order on a surprise dinner date?" },
    { spice: 2, text: "If your partner planned the perfect date night, what would it look like?" },
    { spice: 3, text: "What compliment would instantly make your partner melt?" },
    { spice: 3, text: "What's the sweetest surprise you could pull off for them?" },
    { spice: 4, text: "What would your partner do on a perfect late-night date?" },
    { spice: 4, text: "If you had the house to yourselves for 24 hours, what would they want to do first?" },
    { spice: 5, text: "What's one fantasy your partner has hinted at?" },
  ],
  whatWouldThey: [
    { spice: 1, text: "What would your partner order at a new cafe?" },
    { spice: 1, text: "What movie would your partner pick tonight?" },
    { spice: 2, text: "What would your partner do if they had a totally free day?" },
    { spice: 2, text: "How would your partner react to a surprise dance in the kitchen?" },
    { spice: 3, text: "How would your partner flirt with you in public without saying a word?" },
    { spice: 3, text: "What would your partner do to cheer you up on a bad day?" },
    { spice: 4, text: "What would your partner whisper if they wanted to drive you crazy?" },
    { spice: 5, text: "What move would your partner pull if they were trying to seduce you?" },
  ],
}

export const MODES = {
  fun: ['preferences', 'memories', 'whatWouldThey'],
  romantic: ['memories', 'scenarios', 'preferences'],
  flirty: ['scenarios', 'whatWouldThey', 'preferences'],
}

// Returns a shuffled list of unique questions suited for mode + spice level.
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
