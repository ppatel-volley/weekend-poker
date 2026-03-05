import { useState, useEffect, useCallback } from 'react'
import type { ActiveChallenge, ChallengeTier } from '@weekend-casino/shared'
import { usePlatformDeviceId } from '../hooks/usePlatformDeviceId.js'

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

const TIER_COLOURS: Record<ChallengeTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
}

const TIER_ORDER: ChallengeTier[] = ['bronze', 'silver', 'gold']

export function ChallengesView() {
  const deviceId = usePlatformDeviceId()
  const [challenges, setChallenges] = useState<ActiveChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)

  const fetchChallenges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${SERVER_URL}/api/challenges/${encodeURIComponent(deviceId)}`, {
        headers: { 'x-device-token': deviceId },
      })
      if (!res.ok) throw new Error(`Failed to load challenges (${res.status})`)
      const data = (await res.json()) as ActiveChallenge[]
      setChallenges(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    void fetchChallenges()
  }, [fetchChallenges])

  const handleClaim = async (challengeId: string) => {
    setClaimError(null)
    try {
      const res = await fetch(`${SERVER_URL}/api/challenges/${encodeURIComponent(deviceId)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-token': deviceId },
        body: JSON.stringify({ challengeId }),
      })
      if (res.ok) {
        void fetchChallenges()
      } else {
        const body = await res.json().catch(() => ({}))
        setClaimError(body.error ?? `Claim failed (${res.status})`)
      }
    } catch {
      setClaimError('Claim failed — try again')
    }
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#aaa' }}>Loading challenges...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#ff6b6b' }}>{error}</p>
      </div>
    )
  }

  // Sort by tier order and pad to 3 slots
  const sorted = TIER_ORDER.map(tier =>
    challenges.find(c => c.definition.tier === tier) ?? null
  )

  return (
    <div style={containerStyle}>
      <h2 style={{ fontSize: 18, color: '#d4af37', margin: '0 0 16px', textAlign: 'center' }}>
        Weekly Challenges
      </h2>

      {claimError && (
        <p style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', margin: '0 0 12px' }}>
          {claimError}
        </p>
      )}

      {sorted.map((challenge, i) => {
        const tier = TIER_ORDER[i]!
        const colour = TIER_COLOURS[tier]

        if (!challenge) {
          return (
            <div key={tier} style={{ ...cardStyle, borderColor: `${colour}33` }}>
              <p style={{ color: '#555', textAlign: 'center', margin: 0, textTransform: 'capitalize' }}>
                {tier} slot — no challenge
              </p>
            </div>
          )
        }

        const { definition, currentValue, completed, claimed } = challenge
        const progress = definition.targetValue > 0
          ? Math.min(currentValue / definition.targetValue, 1)
          : 0

        return (
          <div key={definition.id} style={{ ...cardStyle, borderColor: colour }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 'bold', color: colour, textTransform: 'capitalize' }}>
                {tier}
              </span>
              <span style={{ fontSize: 12, color: '#d4af37' }}>
                +{definition.rewardChips.toLocaleString()} chips
              </span>
            </div>

            <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 'bold' }}>
              {definition.title}
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#aaa' }}>
              {definition.description}
            </p>

            {/* Progress bar */}
            <div style={progressTrackStyle}>
              <div style={{
                height: '100%',
                width: `${progress * 100}%`,
                background: colour,
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
              <span>{currentValue} / {definition.targetValue}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>

            {completed && !claimed && (
              <button
                onClick={() => void handleClaim(definition.id)}
                style={claimButtonStyle}
              >
                Claim
              </button>
            )}

            {claimed && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#4caf50', textAlign: 'center' }}>
                Claimed
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  padding: 16,
  minHeight: '100%',
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  background: '#1a1a2e',
  overflowY: 'auto',
}

const cardStyle: React.CSSProperties = {
  padding: 14,
  marginBottom: 12,
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 10,
  border: '2px solid',
}

const progressTrackStyle: React.CSSProperties = {
  height: 8,
  background: 'rgba(255,255,255,0.1)',
  borderRadius: 4,
  overflow: 'hidden',
}

const claimButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 10,
  padding: '10px 0',
  background: '#d4af37',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: 6,
  fontWeight: 'bold',
  fontSize: 14,
  cursor: 'pointer',
}
