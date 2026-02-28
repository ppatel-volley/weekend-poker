import { ClientType } from '@volley/vgf/client'
import { QRCodeSVG } from 'qrcode.react'
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useSessionMembers } from '../hooks/useVGFHooks.js'
import { useSessionId } from '../hooks/useSessionId.js'
import { MAX_PLAYERS } from '@weekend-casino/shared'
import { usePlatform } from '../platform/PlatformContext.js'

/** Focus indicator styles for TV remote navigation. */
const focusOutline = '2px solid #4ade80'
const focusShadow = '0 0 12px rgba(74, 222, 128, 0.5)'

/** Card suit symbols for decorative accents. */
const suits = ['♠', '♥', '♦', '♣']

/**
 * Lobby view displayed on the shared screen whilst waiting for players to join.
 *
 * Shows a title, join URL, and the list of connected players with ready state.
 * When on a TV platform, player list items are focusable via D-pad navigation.
 */
export function LobbyView() {
  const sessionId = useSessionId()
  const members = useSessionMembers()
  const { isTV } = usePlatform()
  const { ref: lobbyRef, focused: lobbyFocused } = useFocusable({
    focusKey: 'LOBBY',
    trackChildren: true,
    isFocusBoundary: true,
  })

  const baseControllerUrl = import.meta.env['VITE_CONTROLLER_URL'] as string | undefined
  const controllerUrl = baseControllerUrl
    ? `${baseControllerUrl}?sessionId=${sessionId}`
    : `http://${window.location.hostname}:5174?sessionId=${sessionId}`

  // Filter to only show Controller-type members (not Display or Orchestrator)
  const players = Object.values(members).filter(
    (m) => m.clientType === ClientType.Controller,
  )

  const readyCount = players.filter((p) => p.isReady).length
  const allReady = players.length >= 2 && readyCount === players.length

  return (
    <div
      ref={lobbyRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'white',
        fontFamily: "'Georgia', 'Garamond', 'Times New Roman', serif",
        background:
          'radial-gradient(ellipse at center, rgba(13, 31, 45, 0.55) 0%, rgba(7, 14, 21, 0.7) 60%, rgba(3, 6, 8, 0.8) 100%)',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      {/* Keyframe animations */}
      <style>{`
        @keyframes qrGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.3), 0 0 40px rgba(212, 175, 55, 0.1); }
          50% { box-shadow: 0 0 30px rgba(212, 175, 55, 0.5), 0 0 60px rgba(212, 175, 55, 0.2); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes floatSuit {
          0%, 100% { transform: translateY(0px); opacity: 0.06; }
          50% { transform: translateY(-8px); opacity: 0.12; }
        }
        @keyframes readyGlow {
          0%, 100% { text-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
          50% { text-shadow: 0 0 25px rgba(74, 222, 128, 0.8), 0 0 40px rgba(74, 222, 128, 0.3); }
        }
      `}</style>

      {/* Decorative background suit symbols */}
      {suits.map((suit, i) => (
        <span
          key={suit}
          style={{
            position: 'absolute',
            fontSize: '8rem',
            color: suit === '♥' || suit === '♦' ? 'rgba(180, 40, 40, 0.06)' : 'rgba(255, 255, 255, 0.04)',
            top: ['8%', '15%', '65%', '72%'][i],
            left: ['5%', '85%', '8%', '82%'][i],
            animation: `floatSuit ${3 + i * 0.7}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {suit}
        </span>
      ))}

      {/* Logo image replacing plain text heading */}
      <img
        src="/weekend-casino-logo.png"
        alt="Weekend Casino"
        style={{
          width: 'min(500px, 40vw)',
          height: 'auto',
          marginBottom: '1.5rem',
          filter: 'drop-shadow(0 4px 20px rgba(212, 175, 55, 0.3))',
        }}
      />

      {/* Decorative gold divider */}
      <div
        style={{
          width: '200px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.6), transparent)',
          marginBottom: '1.5rem',
        }}
      />

      {/* Subtitle */}
      <p
        style={{
          fontSize: '1rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(212, 175, 55, 0.7)',
          marginBottom: '1.5rem',
          fontWeight: 300,
        }}
      >
        Scan to join
      </p>

      {/* QR code container with animated gold glow */}
      <div
        style={{
          padding: '20px',
          background: 'white',
          borderRadius: 16,
          marginBottom: '0.75rem',
          animation: 'qrGlow 3s ease-in-out infinite',
          border: '2px solid rgba(212, 175, 55, 0.4)',
        }}
      >
        <QRCodeSVG value={controllerUrl} size={200} />
      </div>
      <a
        href={controllerUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          opacity: 0.5,
          fontSize: '0.75rem',
          marginBottom: '2rem',
          color: 'rgba(180, 200, 255, 0.7)',
          textDecoration: 'none',
          cursor: 'pointer',
          wordBreak: 'break-all',
          maxWidth: '90vw',
          textAlign: 'center',
          borderBottom: '1px solid rgba(180, 200, 255, 0.2)',
          paddingBottom: '2px',
          transition: 'opacity 0.2s ease',
          letterSpacing: '0.02em',
        }}
      >
        {controllerUrl}
      </a>

      {/* Connected players */}
      <div style={{ marginBottom: '1.5rem', minWidth: 320 }}>
        <h2
          style={{
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
            textAlign: 'center',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'rgba(212, 175, 55, 0.6)',
            fontWeight: 400,
          }}
        >
          Players ({players.length}/{MAX_PLAYERS})
        </h2>
        {players.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {players.map((p) => (
              <FocusablePlayerItem
                key={p.sessionMemberId}
                displayName={(p.state.displayName as string) || 'Unnamed'}
                isReady={p.isReady}
                isConnected={p.connectionState === 'CONNECTED'}
                isTV={isTV}
              />
            ))}
          </ul>
        ) : (
          <p
            style={{
              opacity: 0.4,
              textAlign: 'center',
              fontStyle: 'italic',
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            No players yet
          </p>
        )}
      </div>

      {/* TODO: Add dealer character selection UI */}
      {/* TODO: Add blind level configuration */}

      {allReady ? (
        <p
          style={{
            color: '#4ade80',
            fontSize: '1.2rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            animation: 'readyGlow 2s ease-in-out infinite',
          }}
        >
          All players ready! Game starting...
        </p>
      ) : (
        <p
          style={{
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.35)',
            letterSpacing: '0.1em',
            animation: 'statusPulse 3s ease-in-out infinite',
          }}
        >
          Waiting for players...
        </p>
      )}
    </div>
  )
}

function FocusablePlayerItem({
  displayName,
  isReady,
  isConnected,
  isTV,
}: {
  displayName: string
  isReady: boolean
  isConnected: boolean
  isTV: boolean
}) {
  const { ref, focused } = useFocusable({ focusable: isTV })

  return (
    <li
      ref={ref}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.6rem 1rem',
        marginBottom: '0.4rem',
        opacity: isConnected ? 1 : 0.4,
        borderRadius: 10,
        outline: focused ? focusOutline : 'none',
        boxShadow: focused
          ? focusShadow
          : '0 1px 4px rgba(0, 0, 0, 0.3)',
        transition: 'outline 0.15s ease, box-shadow 0.15s ease, background 0.2s ease',
        background: isReady
          ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.08) 0%, rgba(74, 222, 128, 0.03) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
        border: isReady
          ? '1px solid rgba(74, 222, 128, 0.2)'
          : '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Status indicator — chip-style circle */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: isReady ? '#4ade80' : '#4a4a5a',
          border: isReady ? '2px solid rgba(74, 222, 128, 0.4)' : '2px solid rgba(100, 100, 120, 0.4)',
          boxShadow: isReady ? '0 0 8px rgba(74, 222, 128, 0.4)' : 'none',
          flexShrink: 0,
          transition: 'all 0.3s ease',
        }}
      />
      <span
        style={{
          fontSize: '1rem',
          fontWeight: 500,
          letterSpacing: '0.03em',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {displayName}
      </span>
      {isReady && (
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(74, 222, 128, 0.7)',
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Ready
        </span>
      )}
    </li>
  )
}
