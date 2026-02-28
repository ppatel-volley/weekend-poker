import type { CasinoGameState } from '@weekend-casino/shared'
import { getWalletBalance } from '@weekend-casino/shared'
import { useSessionMemberSafe, useStateSync } from '../../hooks/useVGFHooks.js'

/**
 * Displays the player's chip balance from the shared wallet state.
 */
export function WalletDisplay() {
  const member = useSessionMemberSafe()
  const state = useStateSync() as CasinoGameState | null
  const playerId = member?.sessionMemberId ?? ''
  const balance = state?.wallet ? getWalletBalance(state.wallet, playerId) : 0

  return (
    <div
      data-testid="wallet-display"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
      }}
    >
      <span style={{ color: '#f39c12' }}>$</span>
      <span>{balance.toLocaleString()}</span>
    </div>
  )
}
