/**
 * Video overlay system for the Display (TV).
 *
 * Renders HTML <video> elements layered on top of (or behind) the R3F canvas.
 * Three render modes:
 *   - 'overlay': semi-transparent backdrop, video centred, max-width 80%
 *   - 'full_screen': covers entire viewport above everything
 *   - 'background': loops behind the canvas at low opacity
 *
 * Trigger detection is client-side — watches game phase and blackjack state
 * to enqueue videos at the right moments. The queue is priority-sorted and
 * prevents duplicates within a round via roundNumber keying.
 *
 * Missing video files are handled gracefully (error listener hides the element).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePhase, useStateSyncSelector } from '../hooks/useVGFHooks.js'
import type { BlackjackGameState } from '@weekend-casino/shared'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VideoTrigger {
  key: string
  src: string
  mode: 'overlay' | 'full_screen' | 'background'
  duration: number
  priority: number
}

interface QueuedVideo extends VideoTrigger {
  /** Composite dedup key: `${roundNumber}:${key}` */
  dedup: string
}

/* ------------------------------------------------------------------ */
/*  Trigger map — Blackjack Classic                                    */
/* ------------------------------------------------------------------ */

const BJ_VIDEO_TRIGGERS: Record<string, VideoTrigger> = {
  // Phase-enter triggers
  BJ_PLACE_BETS: {
    key: 'bj_place_bets_prompt',
    src: '/assets/blackjack/videos/bj_place_bets_prompt.mp4',
    mode: 'overlay',
    duration: 1500,
    priority: 1,
  },
  BJ_DEAL_INITIAL: {
    key: 'bj_deal_cinematic',
    src: '/assets/blackjack/videos/bj_deal_cinematic.mp4',
    mode: 'overlay',
    duration: 2000,
    priority: 2,
  },

  // State-change triggers
  natural_blackjack: {
    key: 'bj_natural_blackjack',
    src: '/assets/blackjack/videos/bj_natural_blackjack.mp4',
    mode: 'overlay',
    duration: 3000,
    priority: 5,
  },
  insurance_offered: {
    key: 'bj_insurance_dramatic',
    src: '/assets/blackjack/videos/bj_insurance_dramatic.mp4',
    mode: 'overlay',
    duration: 2000,
    priority: 3,
  },
  player_doubled: {
    key: 'bj_double_down_bold',
    src: '/assets/blackjack/videos/bj_double_down_bold.mp4',
    mode: 'overlay',
    duration: 1500,
    priority: 2,
  },
  player_split: {
    key: 'bj_split_action',
    src: '/assets/blackjack/videos/bj_split_action.mp4',
    mode: 'overlay',
    duration: 1500,
    priority: 2,
  },
  player_bust: {
    key: 'bj_player_bust',
    src: '/assets/blackjack/videos/bj_player_bust.mp4',
    mode: 'overlay',
    duration: 2000,
    priority: 3,
  },
  player_21: {
    key: 'bj_twenty_one',
    src: '/assets/blackjack/videos/bj_twenty_one.mp4',
    mode: 'overlay',
    duration: 2000,
    priority: 3,
  },
  hole_card_reveal: {
    key: 'bj_hole_card_reveal',
    src: '/assets/blackjack/videos/bj_hole_card_reveal.mp4',
    mode: 'overlay',
    duration: 2500,
    priority: 4,
  },
  dealer_bust: {
    key: 'bj_dealer_bust',
    src: '/assets/blackjack/videos/bj_dealer_bust.mp4',
    mode: 'overlay',
    duration: 3000,
    priority: 3,
  },
  dealer_blackjack: {
    key: 'bj_dealer_blackjack',
    src: '/assets/blackjack/videos/bj_dealer_blackjack.mp4',
    mode: 'overlay',
    duration: 2500,
    priority: 4,
  },
  big_win: {
    key: 'bj_big_win',
    src: '/assets/blackjack/videos/bj_big_win.mp4',
    mode: 'full_screen',
    duration: 4000,
    priority: 5,
  },
  side_bet_win: {
    key: 'bj_side_bet_win',
    src: '/assets/blackjack/videos/bj_side_bet_win.mp4',
    mode: 'overlay',
    duration: 2500,
    priority: 3,
  },
  perfect_pair: {
    key: 'bj_perfect_pair',
    src: '/assets/blackjack/videos/bj_perfect_pair.mp4',
    mode: 'overlay',
    duration: 3000,
    priority: 4,
  },
  suited_triple: {
    key: 'bj_suited_triple',
    src: '/assets/blackjack/videos/bj_suited_triple.mp4',
    mode: 'full_screen',
    duration: 5000,
    priority: 5,
  },
}

/* ------------------------------------------------------------------ */
/*  Ambient background video                                           */
/* ------------------------------------------------------------------ */

const AMBIENT_BJ_SRC = '/assets/blackjack/videos/bj_ambient_table.mp4'

function AmbientVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // Autoplay muted is required by browsers; play() may still reject
    video.play().catch(() => {
      // Autoplay blocked — not critical, just hide
      setHasError(true)
    })
  }, [])

  if (hasError) return null

  return (
    <video
      ref={videoRef}
      src={src}
      loop
      muted
      playsInline
      onError={() => setHasError(true)}
      style={ambientVideoStyle}
    />
  )
}

const ambientVideoStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  opacity: 0.35,
  zIndex: 0,
  pointerEvents: 'none',
}

/* ------------------------------------------------------------------ */
/*  Foreground video player                                            */
/* ------------------------------------------------------------------ */

function ForegroundVideo({
  video,
  onComplete,
}: {
  video: QueuedVideo
  onComplete: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    el.play().catch(() => {
      // If the file is missing or autoplay blocked, dismiss immediately
      onComplete()
    })

    // Safety timeout — dismiss even if 'ended' event never fires
    const timer = window.setTimeout(onComplete, video.duration + 500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [video.duration, onComplete])

  const isFullScreen = video.mode === 'full_screen'

  return (
    <div style={isFullScreen ? fullScreenBackdropStyle : overlayBackdropStyle}>
      <video
        ref={videoRef}
        src={video.src}
        muted={false}
        playsInline
        onEnded={onComplete}
        onError={onComplete}
        style={isFullScreen ? fullScreenVideoStyle : overlayVideoStyle}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const overlayBackdropStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  zIndex: 20,
  pointerEvents: 'none',
}

const overlayVideoStyle: React.CSSProperties = {
  maxWidth: '80%',
  maxHeight: '80%',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
}

const fullScreenBackdropStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundColor: '#000',
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const fullScreenVideoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
}

/* ------------------------------------------------------------------ */
/*  Preloader — prefetch likely next videos                            */
/* ------------------------------------------------------------------ */

const preloadedUrls = new Set<string>()

function preloadVideo(src: string): void {
  if (preloadedUrls.has(src)) return
  preloadedUrls.add(src)

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = 'video'
  link.href = src
  document.head.appendChild(link)
}

/** Preload videos that are likely to play next based on current phase. */
function usePreloader(phase: string | null): void {
  useEffect(() => {
    if (phase === 'BJ_PLAYER_TURNS' || phase === 'BJ_DEALER_TURN') {
      preloadVideo(BJ_VIDEO_TRIGGERS['dealer_bust']!.src)
      preloadVideo(BJ_VIDEO_TRIGGERS['dealer_blackjack']!.src)
      preloadVideo(BJ_VIDEO_TRIGGERS['hole_card_reveal']!.src)
    }
    if (phase === 'BJ_DEAL_INITIAL') {
      preloadVideo(BJ_VIDEO_TRIGGERS['natural_blackjack']!.src)
      preloadVideo(BJ_VIDEO_TRIGGERS['insurance_offered']!.src)
    }
    if (phase === 'BJ_SETTLEMENT') {
      preloadVideo(BJ_VIDEO_TRIGGERS['big_win']!.src)
    }
  }, [phase])
}

/* ------------------------------------------------------------------ */
/*  Main overlay component                                             */
/* ------------------------------------------------------------------ */

/**
 * Video overlay for Blackjack Classic.
 *
 * Renders:
 * 1. An ambient background video behind the canvas (z-index 0)
 * 2. Foreground overlay/full-screen videos on top of the canvas (z-index 20/50)
 *
 * Trigger detection watches phase transitions and blackjack state changes.
 * Videos are queued by priority; duplicates within a round are suppressed.
 */
export function BlackjackVideoOverlay() {
  const phase = usePhase() as string | null
  const bj = useStateSyncSelector(s => s.blackjack) as BlackjackGameState | undefined

  const [queue, setQueue] = useState<QueuedVideo[]>([])
  const [currentVideo, setCurrentVideo] = useState<QueuedVideo | null>(null)
  const playedRef = useRef(new Set<string>())
  const prevRoundRef = useRef<number>(-1)

  // Reset played set when round number changes
  const roundNumber = bj?.roundNumber ?? 0
  useEffect(() => {
    if (roundNumber !== prevRoundRef.current) {
      prevRoundRef.current = roundNumber
      playedRef.current.clear()
    }
  }, [roundNumber])

  // Preload likely next videos
  usePreloader(phase)

  const queueVideo = useCallback(
    (triggerId: string) => {
      const trigger = BJ_VIDEO_TRIGGERS[triggerId]
      if (!trigger) return

      const dedup = `${roundNumber}:${trigger.key}`
      if (playedRef.current.has(dedup)) return
      playedRef.current.add(dedup)

      const queued: QueuedVideo = { ...trigger, dedup }
      setQueue(prev => [...prev, queued].sort((a, b) => b.priority - a.priority))
    },
    [roundNumber],
  )

  // ── Phase-enter triggers ──────────────────────────────────────────
  useEffect(() => {
    if (phase === 'BJ_PLACE_BETS') queueVideo('BJ_PLACE_BETS')
    if (phase === 'BJ_DEAL_INITIAL') queueVideo('BJ_DEAL_INITIAL')
    if (phase === 'BJ_DEALER_TURN') queueVideo('hole_card_reveal')
  }, [phase, queueVideo])

  // ── State-change triggers ─────────────────────────────────────────
  useEffect(() => {
    if (!bj) return

    // Natural blackjack (during deal phase)
    const hasNaturalBj = bj.playerStates.some(ps => ps.hands[0]?.isBlackjack)
    if (hasNaturalBj && phase === 'BJ_DEAL_INITIAL') {
      queueVideo('natural_blackjack')
    }

    // Dealer blackjack
    if (bj.dealerHand.isBlackjack && bj.dealerHand.holeCardRevealed) {
      queueVideo('dealer_blackjack')
    }

    // Dealer bust
    if (bj.dealerHand.busted) {
      queueVideo('dealer_bust')
    }

    // Player bust
    const anyBust = bj.playerStates.some(ps => ps.hands.some(h => h.busted))
    if (anyBust) {
      queueVideo('player_bust')
    }

    // Player 21 (not natural blackjack)
    const any21 = bj.playerStates.some(ps =>
      ps.hands.some(h => h.value === 21 && !h.isBlackjack),
    )
    if (any21) {
      queueVideo('player_21')
    }

    // Player doubled down
    const anyDoubled = bj.playerStates.some(ps => ps.hands.some(h => h.doubled))
    if (anyDoubled) {
      queueVideo('player_doubled')
    }

    // Player split
    const anySplit = bj.playerStates.some(ps => ps.hands.length > 1)
    if (anySplit) {
      queueVideo('player_split')
    }

    // Insurance offered
    const anyInsurance = bj.playerStates.some(ps => ps.insuranceBet > 0)
    if (anyInsurance) {
      queueVideo('insurance_offered')
    }

    // Big win (settlement phase, payout > 2x bet)
    if (phase === 'BJ_SETTLEMENT' && bj.settlementComplete) {
      const bigWin = bj.playerStates.some(
        ps => ps.roundResult > (ps.hands[0]?.bet ?? 0) * 2,
      )
      if (bigWin) {
        queueVideo('big_win')
      }
    }
  }, [bj, phase, queueVideo])

  // ── Dequeue: play next video when current finishes ────────────────
  useEffect(() => {
    if (currentVideo !== null) return
    if (queue.length === 0) return

    const [next, ...rest] = queue
    if (next) {
      setCurrentVideo(next)
      setQueue(rest)
    }
  }, [queue, currentVideo])

  const handleVideoComplete = useCallback(() => {
    setCurrentVideo(null)
  }, [])

  // Determine whether to show BJ ambient video
  const isBjPhase = typeof phase === 'string' && phase.startsWith('BJ_')

  return (
    <>
      {/* Ambient background — behind the canvas */}
      {isBjPhase && <AmbientVideo src={AMBIENT_BJ_SRC} />}

      {/* Foreground overlay — above the canvas */}
      {currentVideo && (
        <ForegroundVideo
          video={currentVideo}
          onComplete={handleVideoComplete}
        />
      )}
    </>
  )
}
