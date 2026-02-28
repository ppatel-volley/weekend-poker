import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { InputMode } from '@weekend-casino/shared'
import { usePlatform } from './PlatformContext.js'

/** Context value for InputMode tracking. */
export interface InputModeContextValue {
  /** Current active input mode. */
  inputMode: InputMode
  /** Manually set the input mode (overrides auto-detection until next event). */
  setInputMode: (mode: InputMode) => void
}

export const InputModeContext = createContext<InputModeContextValue>({
  inputMode: 'touch',
  setInputMode: () => {},
})

/**
 * Hook to access the current input mode and setter.
 */
export function useInputMode(): InputModeContextValue {
  return useContext(InputModeContext)
}

interface InputModeProviderProps {
  children: ReactNode
  /** Override the default input mode (defaults to platform's defaultInputMode). */
  defaultMode?: InputMode
}

/**
 * Tracks the current input mode by listening for user interaction events.
 *
 * Detection:
 *   - Keyboard/remote events (keydown) -> 'remote'
 *   - Touch events (touchstart) -> 'touch'
 *   - Custom 'voiceActivity' events -> 'voice'
 *   - Initial mode from platform detection or explicit defaultMode prop.
 *
 * The provider listens on the window object for these events and
 * automatically updates the current mode.
 */
export function InputModeProvider({ children, defaultMode }: InputModeProviderProps) {
  const { defaultInputMode } = usePlatform()
  const [inputMode, setInputModeState] = useState<InputMode>(defaultMode ?? defaultInputMode)

  const setInputMode = useCallback((mode: InputMode) => {
    setInputModeState(mode)
  }, [])

  useEffect(() => {
    const handleKeyDown = () => {
      setInputModeState((prev) => (prev !== 'remote' ? 'remote' : prev))
    }

    const handleTouchStart = () => {
      setInputModeState((prev) => (prev !== 'touch' ? 'touch' : prev))
    }

    const handleVoiceActivity = () => {
      setInputModeState((prev) => (prev !== 'voice' ? 'voice' : prev))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('voiceActivity', handleVoiceActivity)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('voiceActivity', handleVoiceActivity)
    }
  }, [])

  return (
    <InputModeContext value={{ inputMode, setInputMode }}>
      {children}
    </InputModeContext>
  )
}
