import { useState, useEffect, useCallback } from 'react'
import type { CosmeticCategory, OwnedCosmetics } from '@weekend-casino/shared'
import { COSMETIC_DEFINITIONS } from '@weekend-casino/shared'
import { usePlatformDeviceId } from '../hooks/usePlatformDeviceId.js'

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

const CATEGORIES: { key: CosmeticCategory; label: string }[] = [
  { key: 'card_back', label: 'Card Backs' },
  { key: 'table_felt', label: 'Table Felts' },
  { key: 'avatar_frame', label: 'Avatar Frames' },
]

export function CosmeticsView() {
  const deviceId = usePlatformDeviceId()
  const [cosmetics, setCosmetics] = useState<OwnedCosmetics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [equipError, setEquipError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<CosmeticCategory>('card_back')

  const fetchCosmetics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${SERVER_URL}/api/cosmetics/${encodeURIComponent(deviceId)}`, {
        headers: { 'x-device-token': deviceId },
      })
      if (!res.ok) throw new Error(`Failed to load cosmetics (${res.status})`)
      const data = (await res.json()) as OwnedCosmetics
      setCosmetics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    void fetchCosmetics()
  }, [fetchCosmetics])

  const handleEquip = async (cosmeticId: string, category: CosmeticCategory) => {
    setEquipError(null)
    try {
      const res = await fetch(`${SERVER_URL}/api/cosmetics/${encodeURIComponent(deviceId)}/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-token': deviceId },
        body: JSON.stringify({ cosmeticId, category }),
      })
      if (res.ok) {
        void fetchCosmetics()
      } else {
        const body = await res.json().catch(() => ({}))
        setEquipError(body.error ?? `Equip failed (${res.status})`)
      }
    } catch {
      setEquipError('Equip failed — try again')
    }
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#aaa' }}>Loading cosmetics...</p>
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

  const items = COSMETIC_DEFINITIONS.filter(c => c.category === activeTab)
  const ownedIds = new Set(cosmetics?.ownedIds ?? [])

  const equippedForCategory = cosmetics?.equipped
    ? activeTab === 'card_back' ? cosmetics.equipped.cardBack
    : activeTab === 'table_felt' ? cosmetics.equipped.tableFelt
    : cosmetics.equipped.avatarFrame
    : null

  return (
    <div style={containerStyle}>
      <h2 style={{ fontSize: 18, color: '#d4af37', margin: '0 0 12px', textAlign: 'center' }}>
        Cosmetics
      </h2>

      {/* Category tabs */}
      <div style={tabBarStyle}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            style={{
              ...tabStyle,
              ...(activeTab === cat.key ? activeTabStyle : {}),
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {equipError && (
        <p style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', margin: '0 0 12px' }}>
          {equipError}
        </p>
      )}

      {/* Grid */}
      <div style={gridStyle}>
        {items.map(item => {
          const owned = ownedIds.has(item.id)
          const equipped = equippedForCategory === item.id

          return (
            <div
              key={item.id}
              style={{
                ...itemCardStyle,
                opacity: owned ? 1 : 0.4,
                border: equipped
                  ? '2px solid #d4af37'
                  : '2px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>
                {owned ? getIcon(item.category) : '\u{1f512}'}
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 'bold' }}>
                {item.name}
              </p>

              {equipped && (
                <span style={equippedBadgeStyle}>Equipped</span>
              )}

              {owned && !equipped && (
                <button
                  onClick={() => void handleEquip(item.id, item.category)}
                  style={equipButtonStyle}
                >
                  Equip
                </button>
              )}

              {!owned && (
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#888' }}>
                  {item.unlockedBy.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getIcon(category: CosmeticCategory): string {
  switch (category) {
    case 'card_back': return '\u{1f0cf}'
    case 'table_felt': return '\u{1f7e9}'
    case 'avatar_frame': return '\u{1f5bc}'
  }
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

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginBottom: 16,
}

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 0',
  background: 'rgba(255,255,255,0.06)',
  color: '#aaa',
  border: 'none',
  borderRadius: 6,
  fontSize: 12,
  cursor: 'pointer',
}

const activeTabStyle: React.CSSProperties = {
  background: 'rgba(212,175,55,0.2)',
  color: '#d4af37',
  fontWeight: 'bold',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 10,
}

const itemCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: 12,
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 10,
  textAlign: 'center',
}

const equippedBadgeStyle: React.CSSProperties = {
  marginTop: 6,
  padding: '2px 8px',
  fontSize: 10,
  background: 'rgba(212,175,55,0.2)',
  color: '#d4af37',
  borderRadius: 4,
  fontWeight: 'bold',
}

const equipButtonStyle: React.CSSProperties = {
  marginTop: 6,
  padding: '4px 12px',
  background: 'rgba(255,255,255,0.1)',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 4,
  fontSize: 11,
  cursor: 'pointer',
}
