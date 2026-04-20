// Local similarity + scoring helpers. No external API needed.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on',
  'for', 'with', 'and', 'or', 'but', 'my', 'your', 'our', 'their', 'his',
  'her', 'it', 'that', 'this', 'at', 'as', 'by', 'from', 'about', 'some',
  'any', 'all', 'do', 'does', 'did', 'just', 'really', 'very', 'so',
])

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokenize = (value) =>
  normalize(value)
    .split(' ')
    .filter((word) => word && !STOP_WORDS.has(word))

// Levenshtein-based fuzzy closeness 0..1 (for typos / plural / tense).
function fuzzyCloseness(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i += 1) dp[i][0] = i
  for (let j = 0; j <= n; j += 1) dp[0][j] = j
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }
  const distance = dp[m][n]
  return 1 - distance / Math.max(m, n)
}

// Returns 0..1 similarity combining token overlap + fuzzy string match.
export function getSimilarity(answer, guess) {
  const normA = normalize(answer)
  const normG = normalize(guess)
  if (!normA || !normG) return 0
  if (normA === normG) return 1

  const tokensA = tokenize(answer)
  const tokensG = tokenize(guess)

  let overlapScore = 0
  if (tokensA.length && tokensG.length) {
    let matches = 0
    tokensA.forEach((word) => {
      const hit = tokensG.some((other) => fuzzyCloseness(word, other) >= 0.8)
      if (hit) matches += 1
    })
    const recall = matches / tokensA.length
    const precision = matches / tokensG.length
    overlapScore = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  }

  const stringScore = fuzzyCloseness(normA, normG)

  return Math.max(overlapScore, stringScore)
}

export function pointsFromSimilarity(similarity, { multiplier = 1 } = {}) {
  let base = 0
  if (similarity > 0.8) base = 2
  else if (similarity > 0.5) base = 1
  return base * multiplier
}
