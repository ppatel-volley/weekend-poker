import { useEffect, useRef } from 'react'

/**
 * Registers a keydown listener for the given key map.
 * Callbacks are looked up by `KeyboardEvent.key`.
 *
 * @param keyMap  - Record mapping key names to handler functions
 * @param enabled - Whether the listener is active (default true)
 */
export function useKeyDown(
  keyMap: Record<string, () => void>,
  enabled = true,
): void {
  const keyMapRef = useRef(keyMap)
  keyMapRef.current = keyMap

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const cb = keyMapRef.current[e.key]
      if (cb) {
        e.preventDefault()
        cb()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])
}
