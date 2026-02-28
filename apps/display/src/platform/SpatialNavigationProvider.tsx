import { useEffect, type ReactNode } from 'react'
import { init, destroy } from '@noriginmedia/norigin-spatial-navigation'
import { usePlatform } from './PlatformContext.js'

interface SpatialNavigationProviderProps {
  children: ReactNode
}

/**
 * Initialises norigin-spatial-navigation when running on a TV platform.
 *
 * On non-TV platforms (browser, Electron dev), this is a passthrough
 * that simply renders children without initialising spatial nav.
 */
export function SpatialNavigationProvider({ children }: SpatialNavigationProviderProps) {
  const { isTV } = usePlatform()

  useEffect(() => {
    if (!isTV) return

    init({
      debug: false,
      visualDebug: false,
    })

    return () => {
      destroy()
    }
  }, [isTV])

  return <>{children}</>
}
