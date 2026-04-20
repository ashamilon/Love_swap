// Reaction lines. Pure static. No AI needed.

const REACTIONS = {
  hit: [
    "Soulmate-level read. Lock it in.",
    "Damn. You two share a brain.",
    "Telepathy confirmed.",
    "That was almost illegal.",
  ],
  close: [
    "Not exact, but the vibe matches.",
    "Close enough to save face tonight.",
    "Half credit. You were in the ballpark.",
    "Kinda. We'll allow it.",
  ],
  miss: [
    "Oof. Someone is sleeping on the couch.",
    "Big miss. Hope dinner was good.",
    "That was wild. Defend it later.",
    "The streets are talking.",
  ],
  bluffCaught: [
    "Lie detected. Smooth move busting them.",
    "You saw right through that one.",
    "Busted. Nothing gets past you.",
  ],
  bluffMissed: [
    "They fooled you. Respectfully.",
    "Legendary bluff. Poker nights are ruined.",
    "You believed every word. Gold star for the actor.",
  ],
  steal: [
    "Point stolen. Brutal.",
    "The other couple just took lunch money.",
    "Heist complete.",
  ],
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]

export function reactionFor(points, { kind } = {}) {
  if (kind === 'bluffCaught') return pick(REACTIONS.bluffCaught)
  if (kind === 'bluffMissed') return pick(REACTIONS.bluffMissed)
  if (kind === 'steal') return pick(REACTIONS.steal)
  if (points >= 2) return pick(REACTIONS.hit)
  if (points === 1) return pick(REACTIONS.close)
  return pick(REACTIONS.miss)
}
