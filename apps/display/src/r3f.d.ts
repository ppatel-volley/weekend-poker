// React 19 moved JSX types from the global JSX namespace to React.JSX.
// R3F v8 still augments the old global JSX.IntrinsicElements.
// This shim bridges the gap by augmenting React.JSX.IntrinsicElements
// with the R3F elements used in this project.
// Remove this once R3F ships React 19-native types.

import type { JSX as ReactJSX } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any
      mesh: any
      ambientLight: any
      directionalLight: any
      pointLight: any
      spotLight: any
      cylinderGeometry: any
      torusGeometry: any
      boxGeometry: any
      planeGeometry: any
      sphereGeometry: any
      meshStandardMaterial: any
      meshBasicMaterial: any
      meshPhysicalMaterial: any
      primitive: any
    }
  }
}
