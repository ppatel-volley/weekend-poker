import { useState, useEffect, useRef } from 'react'
import type { ReactionEvent, ReactionType } from '@weekend-casino/shared'
import { useStateSyncSelector } from '../hooks/useVGFHooks.js'

/** Map reaction types to display characters. */
const REACTION_DISPLAY: Record<ReactionType, string> = {
  thumbs_up: '\uD83D\uDC4D',
  fire: '\uD83D\uDD25',
  laugh: '\uD83D\uDE02',
  clap: '\uD83D\uDC4F',
  wow: '\uD83D\uDE2E',
  cry: '\uD83D\uDE22',
}

interface FloatingReaction {
  id: string
  event: ReactionEvent
  x: number
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
  zIndex: 15,
}

/**
 * Renders floating reaction animations from state.reactions.
 * Purely visual overlay — no game state interaction.
 */
export function ReactionOverlay() {
  const reactions = useStateSyncSelector((s) => s.reactions) as ReactionEvent[] | undefined
  const [floats, setFloats] = useState<FloatingReaction[]>([])
  const processedRef = useRef(new Set<string>())

  useEffect(() => {
    if (!reactions || reactions.length === 0) return

    const newFloats: FloatingReaction[] = []
    for (const event of reactions) {
      const key = `${event.playerId}-${event.timestamp}-${event.type}`
      if (!processedRef.current.has(key)) {
        processedRef.current.add(key)
        newFloats.push({
          id: key,
          event,
          x: 20 + Math.random() * 60,
        })
      }
    }

    if (newFloats.length > 0) {
      setFloats(prev => [...prev, ...newFloats])

      // Remove after animation completes (2s)
      const ids = newFloats.map(f => f.id)
      setTimeout(() => {
        setFloats(prev => prev.filter(f => !ids.includes(f.id)))
      }, 2000)
    }

    // Clean up processed set periodically to avoid memory leak
    if (processedRef.current.size > 100) {
      const reactionKeys = new Set(
        reactions.map(e => `${e.playerId}-${e.timestamp}-${e.type}`),
      )
      for (const key of processedRef.current) {
        if (!reactionKeys.has(key)) {
          processedRef.current.delete(key)
        }
      }
    }
  }, [reactions])

  if (floats.length === 0) return null

  return (
    <div style={overlayStyle} data-testid="reaction-overlay">
      {floats.map(f => (
        <div
          key={f.id}
          data-testid="floating-reaction"
          style={{
            position: 'absolute',
            left: `${f.x}%`,
            bottom: '10%',
            fontSize: '3rem',
            animation: 'reactionFloat 2s ease-out forwards',
            opacity: 0,
          }}
        >
          {REACTION_DISPLAY[f.event.type]}
        </div>
      ))}
      <style>{`
        @keyframes reactionFloat {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          10% { opacity: 1; transform: translateY(-20px) scale(1); }
          80% { opacity: 0.8; }
          100% { transform: translateY(-200px) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
