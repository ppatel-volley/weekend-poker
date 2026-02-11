import { describe, it, expect } from 'vitest'
import { ControllerPhaseRouter } from '../components/ControllerPhaseRouter.js'
import { ControllerLobby } from '../components/ControllerLobby.js'
import { ControllerGameplay } from '../components/ControllerGameplay.js'

describe('Controller components', () => {
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
})
