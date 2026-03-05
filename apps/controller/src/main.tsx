import { createRoot } from 'react-dom/client'
import { App } from './App.js'

// Suppress VGF DispatchTimeoutError — the default 10s ack timeout fires during
// lobby→game phase cascades, but the server processes the dispatch successfully.
// These are non-fatal: the game state arrives via broadcast regardless of ack.
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.constructor?.name === 'DispatchTimeoutError') {
    console.warn('[VGF] Dispatch ack timed out (non-fatal — state will sync via broadcast)')
    event.preventDefault()
  }
})

// StrictMode disabled: VGF's transport.disconnect() calls removeAllListeners()
// which destroys message handlers registered in the PartyTimeClient constructor.
// StrictMode's double-mount cycle triggers this, breaking state sync permanently.
const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(<App />)
