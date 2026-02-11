import { createRoot } from 'react-dom/client'
import { App } from './App.js'

// StrictMode disabled: VGF's transport.disconnect() calls removeAllListeners()
// which destroys message handlers registered in the PartyTimeClient constructor.
// StrictMode's double-mount cycle triggers this, breaking state sync permanently.
const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(<App />)
