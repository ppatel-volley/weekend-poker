import { useState, useCallback, useRef } from 'react'
import type { ReactionType, ReactionEvent } from '@weekend-casino/shared'
import { REACTION_TYPES, REACTION_RATE_LIMIT } from '@weekend-casino/shared'
import { useDispatch, useStateSync, useSessionMemberSafe } from '../../hooks/useVGFHooks.js'

/** Map reaction types to display characters and labels. */
const REACTION_DISPLAY: Record<ReactionType, { icon: string; label: string }> = {
  thumbs_up: { icon: '\uD83D\uDC4D', label: 'Thumbs Up' },
  fire: { icon: '\uD83D\uDD25', label: 'Fire' },
  laugh: { icon: '\uD83D\uDE02', label: 'Laugh' },
  clap: { icon: '\uD83D\uDC4F', label: 'Clap' },
  wow: { icon: '\uD83D\uDE2E', label: 'Wow' },
  cry: { icon: '\uD83D\uDE22', label: 'Cry' },
}

const barStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  padding: '8px',
}

const buttonStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  padding: '8px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.1)',
  cursor: 'pointer',
  transition: 'transform 0.1s, opacity 0.2s',
  width: '44px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const disabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.4,
  cursor: 'not-allowed',
}

/**
 * Row of 6 reaction buttons for the controller.
 * Dispatches sendReaction on tap. Shows visual cooldown when rate-limited.
 */
export function ReactionBar() {
  const dispatch = useDispatch()
  const member = useSessionMemberSafe()
  const state = useStateSync()
  const playerId = member?.sessionMemberId ?? ''
  const [cooldown, setCooldown] = useState(false)
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isRateLimited = useCallback(() => {
    if (!state?.reactions || !playerId) return false
    const now = Date.now()
    const windowStart = now - REACTION_RATE_LIMIT.windowMs
    const recentCount = state.reactions.filter(
      (r: ReactionEvent) => r.playerId === playerId && r.timestamp >= windowStart,
    ).length
    return recentCount >= REACTION_RATE_LIMIT.maxReactions
  }, [state?.reactions, playerId])

  const handleReaction = useCallback((type: ReactionType) => {
    if (!playerId || isRateLimited()) return

    dispatch('sendReaction', playerId, type)

    // Show brief visual cooldown feedback
    setCooldown(true)
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
    cooldownTimerRef.current = setTimeout(() => setCooldown(false), 300)
  }, [dispatch, playerId, isRateLimited])

  const limited = isRateLimited()

  return (
    <div style={barStyle} data-testid="reaction-bar">
      {REACTION_TYPES.map(type => (
        <button
          key={type}
          data-testid={`reaction-${type}`}
          style={limited || cooldown ? disabledStyle : buttonStyle}
          disabled={limited || cooldown}
          onClick={() => handleReaction(type)}
          aria-label={REACTION_DISPLAY[type].label}
          type="button"
        >
          {REACTION_DISPLAY[type].icon}
        </button>
      ))}
    </div>
  )
}
