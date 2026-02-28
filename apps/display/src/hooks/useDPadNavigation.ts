import { useCallback, useState } from 'react'

export interface DPadNavigationOptions {
  /** Total number of navigable items. */
  itemCount: number
  /** Number of columns for grid mode. Omit or set to 1 for list mode. */
  columns?: number
  /** Called when Enter is pressed on the focused item. */
  onSelect?: (index: number) => void
  /** Whether to wrap around at boundaries (default false). */
  wrap?: boolean
}

export interface DPadNavigationResult {
  /** Currently focused item index. */
  focusIndex: number
  /** Manually set the focus index. */
  setFocusIndex: (index: number) => void
  /** Pass this to a keydown handler (or use with useKeyDown). */
  handleKeyDown: (e: KeyboardEvent) => void
}

/**
 * Grid/list navigation hook for D-pad / arrow-key input.
 *
 * ArrowUp/Down for vertical movement, ArrowLeft/Right for horizontal.
 * Enter triggers onSelect, Escape resets to index 0.
 */
export function useDPadNavigation(
  options: DPadNavigationOptions,
): DPadNavigationResult {
  const { itemCount, columns = 1, onSelect, wrap = false } = options
  const [focusIndex, setFocusIndex] = useState(0)

  const clamp = useCallback(
    (next: number): number => {
      if (itemCount === 0) return 0
      if (wrap) {
        return ((next % itemCount) + itemCount) % itemCount
      }
      return Math.max(0, Math.min(next, itemCount - 1))
    },
    [itemCount, wrap],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (itemCount === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusIndex((prev) => clamp(prev + columns))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusIndex((prev) => clamp(prev - columns))
          break
        case 'ArrowRight':
          e.preventDefault()
          setFocusIndex((prev) => clamp(prev + 1))
          break
        case 'ArrowLeft':
          e.preventDefault()
          setFocusIndex((prev) => clamp(prev - 1))
          break
        case 'Enter':
          e.preventDefault()
          onSelect?.(focusIndex)
          break
        case 'Escape':
          e.preventDefault()
          setFocusIndex(0)
          break
      }
    },
    [itemCount, columns, clamp, onSelect, focusIndex],
  )

  return { focusIndex, setFocusIndex, handleKeyDown }
}
