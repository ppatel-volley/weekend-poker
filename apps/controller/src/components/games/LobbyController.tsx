import { useState } from 'react'
import type { CasinoGame } from '@weekend-casino/shared'
import { CASINO_GAME_LABELS, CASINO_GAME_DESCRIPTIONS, V1_GAMES, V2_0_GAMES } from '@weekend-casino/shared'
import {
  useClientActions,
  useSessionMemberSafe,
  useDispatch,
  useStateSync,
} from '../../hooks/useVGFHooks.js'

/** Suit icons to decorate game cards. */
const gameCardSuits: Record<string, string> = {
  holdem: '♠',
  five_card_draw: '♦',
  blackjack_classic: '♣',
  blackjack_competitive: '♥',
  roulette: '♦',
  three_card_poker: '♠',
}

/**
 * Lobby controller — game selection + ready-up UI.
 *
 * Extends the original ControllerLobby with game selection
 * when in GAME_SELECT phase, and keeps the name + ready flow.
 */
export function LobbyController() {
  const [name, setName] = useState('')
  const { toggleReady, updateState } = useClientActions()
  const dispatch = useDispatch()
  const member = useSessionMemberSafe()
  const state = useStateSync()
  const isReady = member?.isReady ?? false
  const selectedGame = state?.selectedGame ?? null

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    updateState({ displayName: value })
  }

  const handleReady = () => {
    if (!member?.sessionMemberId) return // Guard: wait for handshake
    toggleReady()
    if (name.trim()) {
      ;(dispatch as (name: string, ...args: unknown[]) => void)(
        'updatePlayerName', member.sessionMemberId, name.trim(),
      )
    }
    // Sync CasinoPlayer.isReady with VGF member ready state
    ;(dispatch as (name: string, ...args: unknown[]) => void)(
      'setPlayerReady', member.sessionMemberId, true,
    )
    ;(dispatch as (name: string, ...args: unknown[]) => void)(
      'checkLobbyReady',
    )
  }

  const handleSelectGame = (game: CasinoGame) => {
    if (!member?.sessionMemberId) return // Guard: wait for handshake
    ;(dispatch as (name: string, ...args: unknown[]) => void)(
      'setSelectedGame', game,
    )
  }

  const handleStartGame = () => {
    if (!member?.sessionMemberId) return
    ;(dispatch as (name: string, ...args: unknown[]) => void)(
      '_confirmGameSelectionInternal',
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 20px 40px',
        color: 'white',
        fontFamily: "'Georgia', 'Garamond', 'Times New Roman', serif",
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(0, 60, 40, 0.3) 0%, transparent 60%), ' +
          'linear-gradient(180deg, #0d1a2a 0%, #0a0f18 50%, #060a10 100%)',
      }}
    >
      {/* Keyframe animations — glow, shimmer, and pulse effects */}
      <style>{`
        @keyframes readyBtnPulse {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(74, 222, 128, 0.3),
                        0 0 40px rgba(74, 222, 128, 0.1),
                        inset 0 0 20px rgba(74, 222, 128, 0.05);
          }
          50% {
            box-shadow: 0 4px 35px rgba(74, 222, 128, 0.6),
                        0 0 60px rgba(74, 222, 128, 0.2),
                        0 0 100px rgba(74, 222, 128, 0.08),
                        inset 0 0 30px rgba(74, 222, 128, 0.1);
          }
        }
        @keyframes inputFocusGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(212, 175, 55, 0.3); }
          50% { box-shadow: 0 0 16px rgba(212, 175, 55, 0.5); }
        }
        @keyframes selectedCardShine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes gameCardGlow {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.03),
                        0 0 15px rgba(212, 175, 55, 0.06);
          }
          50% {
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.03),
                        0 0 25px rgba(212, 175, 55, 0.15),
                        0 0 50px rgba(212, 175, 55, 0.05);
          }
        }
        @keyframes selectedCardGlow {
          0%, 100% {
            box-shadow: 0 4px 16px rgba(74, 222, 128, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.05),
                        0 0 20px rgba(74, 222, 128, 0.15),
                        0 0 40px rgba(0, 204, 102, 0.08);
          }
          50% {
            box-shadow: 0 4px 20px rgba(74, 222, 128, 0.35),
                        inset 0 1px 0 rgba(255, 255, 255, 0.05),
                        0 0 35px rgba(74, 222, 128, 0.25),
                        0 0 60px rgba(0, 204, 102, 0.12);
          }
        }
        @keyframes titleShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes dividerGlow {
          0%, 100% {
            opacity: 0.5;
            box-shadow: 0 0 8px rgba(212, 175, 55, 0.2);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 16px rgba(212, 175, 55, 0.4), 0 0 30px rgba(212, 175, 55, 0.1);
          }
        }
        @keyframes readyCheckGlow {
          0%, 100% { text-shadow: 0 0 8px rgba(74, 222, 128, 0.4); }
          50% { text-shadow: 0 0 20px rgba(74, 222, 128, 0.8), 0 0 40px rgba(74, 222, 128, 0.3); }
        }
      `}</style>

      {/* Logo with shimmer overlay */}
      <div style={{ position: 'relative', marginBottom: '6px' }}>
        <img
          src="/weekend-casino-logo.png"
          alt="Weekend Casino"
          style={{
            width: 'min(200px, 55vw)',
            height: 'auto',
            filter: 'drop-shadow(0 2px 16px rgba(212, 175, 55, 0.5))',
          }}
        />
        {/* Shimmer overlay — animated gradient sweep across the logo area */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(110deg, transparent 30%, rgba(212, 175, 55, 0.12) 45%, rgba(255, 255, 255, 0.15) 50%, rgba(212, 175, 55, 0.12) 55%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'titleShimmer 4s ease-in-out infinite',
            pointerEvents: 'none',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Gold divider with animated glow */}
      <div
        style={{
          width: '120px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.6), transparent)',
          marginBottom: '20px',
          animation: 'dividerGlow 3s ease-in-out infinite',
        }}
      />

      {/* Name input */}
      <label
        htmlFor="player-name"
        style={{
          alignSelf: 'flex-start',
          marginBottom: '6px',
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(212, 175, 55, 0.6)',
          fontWeight: 400,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Your Name
      </label>
      <input
        id="player-name"
        type="text"
        value={name}
        onChange={handleNameChange}
        placeholder="Enter your name"
        maxLength={20}
        style={{
          width: '100%',
          padding: '14px 16px',
          fontSize: '16px',
          borderRadius: '12px',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.9) 0%, rgba(15, 22, 40, 0.9) 100%)',
          color: 'white',
          marginBottom: '24px',
          outline: 'none',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          fontFamily: 'system-ui, sans-serif',
          boxSizing: 'border-box',
          letterSpacing: '0.02em',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.6)'
          e.currentTarget.style.boxShadow = '0 0 12px rgba(212, 175, 55, 0.3)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.25)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />

      {/* Game selection grid */}
      <p
        style={{
          alignSelf: 'flex-start',
          fontSize: '11px',
          marginBottom: '10px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(212, 175, 55, 0.6)',
          fontWeight: 400,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Choose a game
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          width: '100%',
          marginBottom: '24px',
        }}
      >
        {[...V1_GAMES, ...V2_0_GAMES].map((game) => {
          const isSelected = selectedGame === game
          const suitChar = gameCardSuits[game] ?? '♠'
          const isRedSuit = suitChar === '♥' || suitChar === '♦'

          return (
            <button
              key={game}
              onClick={() => handleSelectGame(game)}
              style={{
                position: 'relative',
                padding: '16px 10px 14px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '14px',
                border: isSelected
                  ? '2px solid rgba(74, 222, 128, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected
                  ? 'linear-gradient(145deg, rgba(74, 222, 128, 0.15) 0%, rgba(74, 222, 128, 0.05) 100%)'
                  : 'linear-gradient(145deg, rgba(30, 40, 60, 0.8) 0%, rgba(20, 28, 45, 0.8) 100%)',
                color: 'white',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.25s ease',
                animation: isSelected
                  ? 'selectedCardGlow 2s ease-in-out infinite'
                  : 'gameCardGlow 3s ease-in-out infinite',
                fontFamily: 'system-ui, sans-serif',
                textAlign: 'center',
              }}
            >
              {/* Decorative suit watermark */}
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '8px',
                  fontSize: '28px',
                  opacity: isSelected ? 0.2 : 0.07,
                  color: isRedSuit ? '#b83030' : '#ffffff',
                  pointerEvents: 'none',
                  transition: 'opacity 0.25s ease',
                  lineHeight: 1,
                }}
              >
                {suitChar}
              </span>
              <span style={{ position: 'relative', zIndex: 1 }}>
                {CASINO_GAME_LABELS[game]}
              </span>
              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontSize: '10px',
                  fontWeight: 400,
                  color: isSelected ? 'rgba(74, 222, 128, 0.7)' : 'rgba(255, 255, 255, 0.4)',
                  display: 'block',
                  marginTop: '5px',
                  transition: 'color 0.25s ease',
                }}
              >
                {CASINO_GAME_DESCRIPTIONS[game]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Game Night mode button */}
      <button
        data-testid="game-night-button"
        onClick={() => {
          if (!member?.sessionMemberId) return
          ;(dispatch as (name: string, ...args: unknown[]) => void)(
            'gnInitGameNight',
            [...V1_GAMES, ...V2_0_GAMES].slice(0, 3),
            5,
            'classic',
          )
        }}
        style={{
          width: '100%',
          marginBottom: '16px',
          padding: '14px',
          fontSize: '15px',
          fontWeight: 'bold',
          borderRadius: '14px',
          border: '2px solid rgba(212, 175, 55, 0.5)',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(139, 105, 20, 0.3) 50%, rgba(212, 175, 55, 0.15) 100%)',
          color: '#f5d680',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 4px 20px rgba(212, 175, 55, 0.2), inset 0 0 20px rgba(212, 175, 55, 0.05)',
        }}
      >
        GAME NIGHT
      </button>

      <p
        style={{
          color: 'rgba(255, 255, 255, 0.25)',
          marginBottom: '20px',
          fontSize: '12px',
          fontStyle: 'italic',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Avatar selection coming soon
      </p>

      {/* Ready button — prominent with pulse when not yet ready */}
      <button
        style={{
          width: '100%',
          padding: '18px',
          fontSize: '18px',
          fontWeight: 'bold',
          borderRadius: '14px',
          border: isReady
            ? '2px solid rgba(74, 222, 128, 0.4)'
            : '2px solid rgba(74, 222, 128, 0.3)',
          cursor: 'pointer',
          background: isReady
            ? 'linear-gradient(135deg, #1a5c2a 0%, #1e4d28 100%)'
            : 'linear-gradient(135deg, #2d8a42 0%, #25733a 50%, #1f6030 100%)',
          color: 'white',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          animation: isReady ? 'none' : 'readyBtnPulse 2.5s ease-in-out infinite',
          boxShadow: isReady
            ? '0 2px 10px rgba(74, 222, 128, 0.15)'
            : '0 4px 20px rgba(74, 222, 128, 0.3)',
          transition: 'all 0.3s ease',
          fontFamily: 'system-ui, sans-serif',
        }}
        onClick={handleReady}
      >
        {isReady ? (
          <span style={{ animation: 'readyCheckGlow 1.5s ease-in-out infinite' }}>
            READY ✓
          </span>
        ) : 'READY'}
      </button>

      {/* Start Game button — shown only when ready and a game is selected */}
      {isReady && selectedGame && (
        <button
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '14px',
            border: '2px solid rgba(212, 175, 55, 0.4)',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #8B6914 0%, #6B4F10 100%)',
            color: 'white',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)',
          }}
          onClick={handleStartGame}
        >
          START {CASINO_GAME_LABELS[selectedGame].toUpperCase()}
        </button>
      )}

      <p
        style={{
          marginTop: '20px',
          color: 'rgba(255, 255, 255, 0.35)',
          fontSize: '13px',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.03em',
        }}
      >
        {isReady && selectedGame
          ? 'Tap START to begin!'
          : isReady
            ? 'Select a game to start'
            : 'Enter your name and tap READY'}
      </p>
    </div>
  )
}
