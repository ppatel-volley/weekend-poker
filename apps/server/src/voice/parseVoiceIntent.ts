import type { VoiceIntent, ParsedVoiceCommand } from '@weekend-poker/shared'

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
  { intent: 'all_in', pattern: /\b(all\s*in|shove|push)\b/ },
  { intent: 'fold', pattern: /\b(fold|muck)\b/ },
  { intent: 'check', pattern: /\bcheck\b/ },
  { intent: 'raise', pattern: /\braise\b/ },
  { intent: 'bet', pattern: /\bbet\b/ },
  { intent: 'call', pattern: /\bcall\b/ },
  { intent: 'ready', pattern: /\bready\b/ },
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

      // Extract amount for raise/bet intents
      if (intent === 'raise' || intent === 'bet') {
        const amount = parseAmount(normalised)
        if (amount !== undefined) {
          entities.amount = amount
        }
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
