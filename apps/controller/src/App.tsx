import { useState, useMemo } from 'react'
import {
  VGFProvider,
  createSocketIOClientTransport,
} from '@volley/vgf/client'
import { ClientType } from '@volley/vgf/types'
import { GameRouter } from './components/GameRouter.js'
import { WalletDisplay } from './components/shared/WalletDisplay.js'
import { PlayerInfo } from './components/shared/PlayerInfo.js'
import { VoiceButton } from './components/shared/VoiceButton.js'
import { ReactionBar } from './components/shared/ReactionBar.js'
import { ProfileView } from './components/ProfileView.js'
import { ChallengesView } from './components/ChallengesView.js'
import { CosmeticsView } from './components/CosmeticsView.js'
import { usePhase } from './hooks/useVGFHooks.js'
import { useDeviceToken } from './hooks/useDeviceToken.js'

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

type ControllerTab = 'game' | 'profile' | 'challenges' | 'cosmetics'

export function App() {
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('sessionId')
  }, [])

  const { deviceToken: userId } = useDeviceToken()

  if (!sessionId) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          background: '#1a1a2e',
          textAlign: 'center',
        }}
      >
        <h2 style={{ marginBottom: '16px' }}>No Session Found</h2>
        <p style={{ color: '#aaa', maxWidth: '280px', lineHeight: 1.5 }}>
          Please scan the QR code displayed on the TV to join a game.
        </p>
      </div>
    )
  }

  const transport = useMemo(
    () => createSocketIOClientTransport({
      url: SERVER_URL,
      query: {
        sessionId,
        userId,
        clientType: ClientType.Controller,
      },
      socketOptions: {
        transports: ['polling', 'websocket'],
        query: { deviceToken: userId },
      },
    }),
    [sessionId, userId],
  )

  return (
    <VGFProvider transport={transport}>
      <ConnectedController />
    </VGFProvider>
  )
}

/**
 * Inner controller UI — only renders PlayerInfo/WalletDisplay once
 * the VGF connection is established and the session member is registered.
 */
function ConnectedController() {
  const phase = usePhase()
  const [activeTab, setActiveTab] = useState<ControllerTab>('game')

  if (!phase) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#1a1a2e',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p>Connecting to game...</p>
      </div>
    )
  }

  const isGameplay = phase !== 'LOBBY' && phase !== 'GAME_SELECT'

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileView />
      case 'challenges':
        return <ChallengesView />
      case 'cosmetics':
        return <CosmeticsView />
      case 'game':
      default:
        return (
          <>
            {/* Game-specific content */}
            <div style={{ flex: 1 }}>
              <GameRouter />
            </div>

            {/* Reaction bar — only visible during gameplay, not in lobby */}
            {isGameplay && <ReactionBar />}

            {/* Voice button footer */}
            <div style={{ padding: '12px 16px 16px' }}>
              <VoiceButton />
            </div>
          </>
        )
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#1a1a2e',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Top bar: player info + wallet */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <PlayerInfo />
        <WalletDisplay />
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderTabContent()}
      </div>

      {/* Bottom tab navigation — visible during gameplay */}
      {isGameplay && (
        <div style={tabBarStyle}>
          <TabButton
            label="Game"
            active={activeTab === 'game'}
            onClick={() => setActiveTab('game')}
          />
          <TabButton
            label="Profile"
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          />
          <TabButton
            label="Challenges"
            active={activeTab === 'challenges'}
            onClick={() => setActiveTab('challenges')}
          />
          <TabButton
            label="Cosmetics"
            active={activeTab === 'cosmetics'}
            onClick={() => setActiveTab('cosmetics')}
          />
        </div>
      )}
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 0',
        background: 'none',
        border: 'none',
        color: active ? '#d4af37' : '#666',
        fontWeight: active ? 'bold' : 'normal',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        cursor: 'pointer',
        borderTop: active ? '2px solid #d4af37' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  )
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  background: '#16162a',
}
