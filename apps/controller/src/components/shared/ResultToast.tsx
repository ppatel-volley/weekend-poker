import type { LastResultState } from '../../hooks/useLastResult.js'

const OUTCOME_COLOURS: Record<string, string> = {
  win: '#27ae60',
  loss: '#c0392b',
  push: '#f39c12',
}

/**
 * Overlay toast that shows the last round result for 5 seconds.
 * Renders on top of the current view (e.g. bet placement).
 * Tap to dismiss.
 */
export function ResultToast({ lastResult }: { lastResult: LastResultState }) {
  if (!lastResult.isShowing || !lastResult.result) return null

  const { result, dismiss } = lastResult
  const bg = OUTCOME_COLOURS[result.outcome] ?? '#555'

  return (
    <div
      data-testid="result-toast"
      onClick={dismiss}
      style={{
        position: 'absolute',
        top: '60px',
        left: '16px',
        right: '16px',
        zIndex: 100,
        padding: '16px',
        borderRadius: '12px',
        background: bg,
        color: 'white',
        fontWeight: 'bold',
        fontSize: '22px',
        textAlign: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        animation: 'resultToastIn 0.3s ease-out',
      }}
    >
      {result.label}
      <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '4px', opacity: 0.8 }}>
        Tap to dismiss
      </div>
    </div>
  )
}
