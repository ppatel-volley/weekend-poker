import { useEffect, useRef, useState } from 'react'

export interface ResultData {
  /** Net result amount (positive = win, 0 = push, negative = loss). */
  amount: number
  /** Whether the player surrendered. */
  surrendered: boolean
  /** Display label: 'WON $X', 'LOST $X', 'PUSH', 'SURRENDERED'. */
  label: string
  /** 'win' | 'loss' | 'push'. */
  outcome: 'win' | 'loss' | 'push'
}

export interface LastResultState {
  /** Whether the toast should currently be visible. */
  isShowing: boolean
  /** The result data (null if nothing to show). */
  result: ResultData | null
  /** Manually dismiss the toast. */
  dismiss: () => void
}

const DISPLAY_DURATION_MS = 5_000

/**
 * Snapshot result data when the phase transitions away from a settlement/result
 * phase back to a betting phase. Shows for 5 seconds, auto-dismisses.
 *
 * @param phase - Current VGF phase string.
 * @param roundResult - Net chip result for the player this round.
 * @param surrendered - Whether the player surrendered (BJ classic only).
 */
export function useLastResult(
  phase: string | null,
  roundResult: number | undefined,
  surrendered = false,
): LastResultState {
  const [showing, setShowing] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const prevPhaseRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (prev === null || phase === null) return
    if (roundResult === undefined) return

    // Detect transition from settlement/result phase to betting phase
    const wasSettlement = prev.includes('SETTLEMENT') || prev.includes('HAND_COMPLETE')
      || prev.includes('SHOWDOWN')
    const isBetting = phase.includes('PLACE_BETS')

    if (wasSettlement && isBetting) {
      const isWin = roundResult > 0
      const isPush = roundResult === 0 && !surrendered

      const data: ResultData = {
        amount: roundResult,
        surrendered,
        label: surrendered
          ? 'SURRENDERED'
          : isWin
            ? `WON $${roundResult}`
            : isPush
              ? 'PUSH'
              : `LOST $${Math.abs(roundResult)}`,
        outcome: isWin ? 'win' : isPush ? 'push' : 'loss',
      }

      setResult(data)
      setShowing(true)

      // Clear any existing timer
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setShowing(false), DISPLAY_DURATION_MS)
    }
  }, [phase, roundResult, surrendered])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return {
    isShowing: showing,
    result,
    dismiss: () => {
      setShowing(false)
      if (timerRef.current) clearTimeout(timerRef.current)
    },
  }
}
