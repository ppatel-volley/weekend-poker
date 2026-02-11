import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CHIP_COLOURS } from '../constants/sceneConstants.js'

// ── Pre-allocated temporaries (module level, never GC'd) ─────────
const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _quaternion = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _color = new THREE.Color()

// ── Shared geometry (one allocation for all chip piles) ──────────
const CHIP_RADIUS = 0.15
const CHIP_HEIGHT = 0.03
const chipGeometry = new THREE.CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_HEIGHT, 16)

/** Maximum instances per pile to avoid run-away allocations. */
const MAX_CHIPS = 200

/** Denominations in descending order for greedy breakdown. */
const DENOMINATIONS = [1000, 500, 100, 25, 5] as const

// ── Chip layout calculation ──────────────────────────────────────

interface ChipInstance {
  x: number
  y: number
  z: number
  denomination: number
}

/**
 * Break an amount into chip denominations and arrange them in stacks.
 * Each denomination forms a column; chips stack vertically.
 * A slight random-ish offset is applied per chip for a natural look.
 */
export function calculateChipLayout(amount: number): ChipInstance[] {
  if (amount <= 0) return []

  const chips: ChipInstance[] = []
  let remaining = amount
  let columnIndex = 0

  for (const denom of DENOMINATIONS) {
    const count = Math.floor(remaining / denom)
    if (count === 0) continue

    remaining -= count * denom
    const columnX = columnIndex * 0.35

    for (let i = 0; i < count && chips.length < MAX_CHIPS; i++) {
      // Deterministic pseudo-random scatter based on index
      const seed = chips.length * 13.37
      const offsetX = (Math.sin(seed) * 0.02)
      const offsetZ = (Math.cos(seed) * 0.02)

      chips.push({
        x: columnX + offsetX,
        y: i * CHIP_HEIGHT,
        z: offsetZ,
        denomination: denom,
      })
    }

    columnIndex++
  }

  return chips
}

// ── Component ────────────────────────────────────────────────────

interface ChipPileProps {
  amount: number
  position: [number, number, number]
  scale?: number
}

export function ChipPile({ amount, position, scale: pileScale = 1 }: ChipPileProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const layout = calculateChipLayout(amount)
  const count = layout.length

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || count === 0) return

    for (let i = 0; i < count; i++) {
      const chip = layout[i]!
      _position.set(chip.x, chip.y, chip.z)
      _scale.set(pileScale, pileScale, pileScale)
      _matrix.compose(_position, _quaternion, _scale)
      mesh.setMatrixAt(i, _matrix)

      _color.set(CHIP_COLOURS[chip.denomination] ?? '#888888')
      mesh.setColorAt(i, _color)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [amount, pileScale, count, layout])

  if (count === 0) return null

  return (
    <group position={position}>
      <instancedMesh
        ref={meshRef}
        args={[chipGeometry, undefined, count]}
        castShadow
      >
        <meshStandardMaterial roughness={0.4} metalness={0.3} />
      </instancedMesh>
    </group>
  )
}
