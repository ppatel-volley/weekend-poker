import type { VoiceIntent, ParsedVoiceCommand } from '@weekend-casino/shared'

// ── Word-to-number mapping for common poker amounts ──────────

const WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  'twenty five': 25,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  'one hundred': 100,
  'two hundred': 200,
  'three hundred': 300,
  'four hundred': 400,
  'five hundred': 500,
  thousand: 1000,
  'one thousand': 1000,
  'two thousand': 2000,
}

/**
 * Parse a textual amount into a numeric value.
 *
 * - Numeric strings: "200" -> 200
 * - Word amounts: "two hundred" -> 200
 * - Relative: "half pot" -> -1, "pot" -> -2
 *   ("half pot" must be checked before bare "pot")
 * - Returns undefined when no amount is found.
 */
function parseAmount(text: string): number | undefined {
  // Check relative amounts first (order matters: half pot before pot)
  if (/\bhalf\s+pot\b/.test(text)) return -1
  if (/\bpot\b/.test(text)) return -2

  // Try to find a plain numeric amount
  const numericMatch = text.match(/\b(\d+)\b/)
  if (numericMatch) return Number(numericMatch[1])

  // Try word-based amounts (longest phrases first to avoid partial matches)
  const sortedPhrases = Object.keys(WORD_NUMBERS).sort(
    (a, b) => b.length - a.length,
  )
  for (const phrase of sortedPhrases) {
    if (text.includes(phrase)) {
      return WORD_NUMBERS[phrase]
    }
  }

  return undefined
}

// ── Intent patterns in priority order ────────────────────────

const INTENT_PATTERNS: Array<{ intent: VoiceIntent; pattern: RegExp }> = [
  // Multi-word / compound intents first (most specific)
  { intent: 'bj_double', pattern: /\b(double\s*(down|me)?)\b/ },
  { intent: 'bj_insurance', pattern: /\b(insurance|even\s*money)\b/ },
  { intent: 'bj_surrender', pattern: /\b(surrender|give\s*up)\b/ },
  { intent: 'stand_pat', pattern: /\b(stand\s*pat|keep\s*(all|them)?)\b/ },
  // Roulette split (before bj_split — more specific, requires numbers)
  { intent: 'roulette_split', pattern: /\bsplit\s+\d+\s*(and|&)\s*\d+\b/ },
  // Blackjack single-word intents (after stand_pat to avoid "stand" matching "stand pat")
  { intent: 'bj_split', pattern: /\bsplit\b/ },
  { intent: 'bj_hit', pattern: /\b(hit\s*(me)?|gimme\s*a?\s*card|card)\b/ },
  { intent: 'bj_stand', pattern: /\b(stand|stay|hold)\b/ },
  // TCP-specific intents
  { intent: 'tcp_pair_plus', pattern: /\b(pair\s*plus|side\s*bet)\b/ },
  { intent: 'tcp_ante', pattern: /\b(ante\s*(up)?)\b/ },
  { intent: 'tcp_play', pattern: /\b(play|i'?m\s*in)\b/ },
  { intent: 'tcp_fold', pattern: /\b(i'?m\s*out)\b/ },
  { intent: 'tcp_confirm', pattern: /\bconfirm\b/ },
  // 5-Card Draw intents
  { intent: 'draw', pattern: /\b(draw\s*(cards?)?)\b/ },
  { intent: 'discard', pattern: /\b(discard)\b/ },
  // Roulette intents
  { intent: 'roulette_repeat', pattern: /\b(repeat|same\s*again|repeat\s*last)\b/ },
  { intent: 'roulette_clear', pattern: /\b(clear\s*(all)?|remove\s*all)\b/ },
  { intent: 'roulette_confirm', pattern: /\b(confirm|done|that'?s\s*it)\b/ },
  { intent: 'roulette_no_bet', pattern: /\b(no\s*bet|skip)\b/ },
  { intent: 'roulette_red', pattern: /\b(on\s*)?red\b/ },
  { intent: 'roulette_black', pattern: /\b(on\s*)?black\b/ },
  { intent: 'roulette_odd', pattern: /\bodd\b/ },
  { intent: 'roulette_even', pattern: /\beven\b/ },
  { intent: 'roulette_high', pattern: /\b(high|19\s*to\s*36)\b/ },
  { intent: 'roulette_low', pattern: /\b(low|1\s*to\s*18)\b/ },
  { intent: 'roulette_dozen', pattern: /\b(first|second|third)\s*dozen\b/ },
  { intent: 'roulette_straight', pattern: /\b(number\s*\d+|straight\s*up\s*\d+)\b/ },
  // Generic poker intents
  { intent: 'all_in', pattern: /\b(all\s*in|shove|push)\b/ },
  { intent: 'fold', pattern: /\b(fold|muck)\b/ },
  { intent: 'check', pattern: /\bcheck\b/ },
  { intent: 'raise', pattern: /\braise\b/ },
  { intent: 'bet', pattern: /\bbet\b/ },
  { intent: 'call', pattern: /\bcall\b/ },
  { intent: 'ready', pattern: /\b(ready|deal\s*me\s*in)\b/ },
  { intent: 'start', pattern: /\b(start|deal)\b/ },
  { intent: 'settings', pattern: /\b(settings|options)\b/ },
]

/**
 * Parse a raw voice transcript into a structured command.
 *
 * Normalises input (lowercase, trim), matches against intent patterns
 * in priority order, and extracts amount entities for raise/bet intents.
 */
export function parseVoiceIntent(transcript: string): ParsedVoiceCommand {
  const normalised = transcript.toLowerCase().trim()

  for (const { intent, pattern } of INTENT_PATTERNS) {
    if (pattern.test(normalised)) {
      const entities: ParsedVoiceCommand['entities'] = {}

      // Extract amount for raise/bet/ante intents
      if (intent === 'raise' || intent === 'bet' || intent === 'tcp_ante') {
        const amount = parseAmount(normalised)
        if (amount !== undefined) {
          entities.amount = amount
        }
      }

      // Extract discard count for draw intents (e.g. "discard 3")
      if (intent === 'discard' || intent === 'draw') {
        const amount = parseAmount(normalised)
        if (amount !== undefined) {
          entities.amount = amount
        }
      }

      // Extract number for roulette straight-up bets (e.g. "number 17")
      if (intent === 'roulette_straight') {
        const numMatch = normalised.match(/\b(\d+)\b/)
        if (numMatch) {
          entities.amount = Number(numMatch[1])
        }
      }

      // Extract numbers for roulette split bets (e.g. "split 17 and 20")
      if (intent === 'roulette_split') {
        const splitMatch = normalised.match(/split\s+(\d+)\s*(?:and|&)\s*(\d+)/)
        if (splitMatch) {
          entities.amount = Number(splitMatch[1])
          entities.splitTarget = Number(splitMatch[2])
        }
      }

      // Extract dozen number for roulette dozen bets
      if (intent === 'roulette_dozen') {
        if (normalised.includes('first')) entities.amount = 1
        else if (normalised.includes('second')) entities.amount = 2
        else if (normalised.includes('third')) entities.amount = 3
      }

      return {
        intent,
        entities,
        confidence: 1.0,
        rawTranscript: transcript,
      }
    }
  }

  return {
    intent: 'unknown',
    entities: {},
    confidence: 0.0,
    rawTranscript: transcript,
  }
}
