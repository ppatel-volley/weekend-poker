import { describe, it, expect } from 'vitest'
import { App } from '../App.js'
import { ControllerPhaseRouter } from '../components/ControllerPhaseRouter.js'
import { ControllerLobby } from '../components/ControllerLobby.js'
import { ControllerGameplay } from '../components/ControllerGameplay.js'
import { GameRouter } from '../components/GameRouter.js'
import { HoldemController } from '../components/games/HoldemController.js'
import { FiveCardDrawController } from '../components/games/FiveCardDrawController.js'
import { BlackjackController } from '../components/games/BlackjackController.js'
import { ThreeCardPokerController } from '../components/games/ThreeCardPokerController.js'
import { LobbyController } from '../components/games/LobbyController.js'
import { WalletDisplay } from '../components/shared/WalletDisplay.js'
import { VoiceButton } from '../components/shared/VoiceButton.js'
import { PlayerInfo } from '../components/shared/PlayerInfo.js'

describe('Controller components', () => {
  it('exports App component', () => {
    expect(App).toBeDefined()
    expect(typeof App).toBe('function')
  })

  it('exports ControllerPhaseRouter', () => {
    expect(ControllerPhaseRouter).toBeDefined()
    expect(typeof ControllerPhaseRouter).toBe('function')
  })

  it('exports ControllerLobby', () => {
    expect(ControllerLobby).toBeDefined()
    expect(typeof ControllerLobby).toBe('function')
  })

  it('exports ControllerGameplay', () => {
    expect(ControllerGameplay).toBeDefined()
    expect(typeof ControllerGameplay).toBe('function')
  })

  it('exports GameRouter', () => {
    expect(GameRouter).toBeDefined()
    expect(typeof GameRouter).toBe('function')
  })

  it('exports per-game controllers', () => {
    expect(typeof HoldemController).toBe('function')
    expect(typeof FiveCardDrawController).toBe('function')
    expect(typeof BlackjackController).toBe('function')
    expect(typeof ThreeCardPokerController).toBe('function')
    expect(typeof LobbyController).toBe('function')
  })

  it('exports shared components', () => {
    expect(typeof WalletDisplay).toBe('function')
    expect(typeof VoiceButton).toBe('function')
    expect(typeof PlayerInfo).toBe('function')
  })
})
