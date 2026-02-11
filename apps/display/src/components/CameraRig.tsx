import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PokerPhase } from '@weekend-poker/shared'

/* ------------------------------------------------------------------ */
/*  Camera presets — named positions for each game moment              */
/* ------------------------------------------------------------------ */

type Vec3Tuple = [number, number, number]

interface CameraPreset {
  position: Vec3Tuple
  lookAt: Vec3Tuple
  fov: number
}

type PresetName =
  | 'overview'
  | 'flopReveal'
  | 'showdownOrbit'
  | 'winnerCelebration'
  | 'dealerFocal'
  | 'idleDrift'

const CAMERA_PRESETS: Record<PresetName, CameraPreset> = {
  overview: {
    position: [0, 8, 10],
    lookAt: [0, 0.5, 0],
    fov: 45,
  },
  flopReveal: {
    position: [0, 4, 3],
    lookAt: [0, 0.3, -0.5],
    fov: 35,
  },
  showdownOrbit: {
    position: [0, 6, 8],
    lookAt: [0, 0.5, 0],
    fov: 40,
  },
  winnerCelebration: {
    position: [0, 5, 6],
    lookAt: [0, 0.5, 0],
    fov: 42,
  },
  dealerFocal: {
    position: [0, 3, 2],
    lookAt: [0, 1.5, -2],
    fov: 38,
  },
  idleDrift: {
    position: [0, 8, 10],
    lookAt: [0, 0.5, 0],
    fov: 45,
  },
}

/* ------------------------------------------------------------------ */
/*  Phase-to-preset mapping                                            */
/* ------------------------------------------------------------------ */

function presetForPhase(phase: PokerPhase): PresetName {
  switch (phase) {
    case PokerPhase.Lobby:
    case PokerPhase.PostingBlinds:
      return 'overview'

    case PokerPhase.DealingHoleCards:
      return 'dealerFocal'

    case PokerPhase.PreFlopBetting:
    case PokerPhase.FlopBetting:
    case PokerPhase.TurnBetting:
    case PokerPhase.RiverBetting:
      return 'overview'

    case PokerPhase.DealingFlop:
    case PokerPhase.DealingTurn:
    case PokerPhase.DealingRiver:
      return 'flopReveal'

    case PokerPhase.AllInRunout:
    case PokerPhase.Showdown:
      return 'showdownOrbit'

    case PokerPhase.PotDistribution:
      return 'winnerCelebration'

    case PokerPhase.HandComplete:
      return 'overview'

    default:
      return 'overview'
  }
}

/** Phases where gentle idle drift should be applied. */
const IDLE_DRIFT_PHASES = new Set<PokerPhase>([
  PokerPhase.Lobby,
  PokerPhase.PostingBlinds,
  PokerPhase.PreFlopBetting,
  PokerPhase.FlopBetting,
  PokerPhase.TurnBetting,
  PokerPhase.RiverBetting,
  PokerPhase.HandComplete,
])

/* ------------------------------------------------------------------ */
/*  Pre-allocated temp vectors (avoids GC pressure in useFrame)        */
/* ------------------------------------------------------------------ */

const _targetPos = new THREE.Vector3()
const _targetLookAt = new THREE.Vector3()
const _currentLookAt = new THREE.Vector3()

/* ------------------------------------------------------------------ */
/*  Idle drift constants                                               */
/* ------------------------------------------------------------------ */

/** Amplitude of the sinusoidal breathing motion. */
const DRIFT_AMPLITUDE = 0.1

/** Full period of the breathing cycle in seconds. */
const DRIFT_PERIOD = 6

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Phase-driven camera rig.
 *
 * Smoothly interpolates the camera between preset positions using
 * exponential lerp so the motion feels natural. During idle phases
 * a gentle sinusoidal "breathing" offset is added for visual interest.
 */
export function CameraRig({ phase }: { phase: PokerPhase }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const elapsedRef = useRef(0)
  const lookAtRef = useRef(new THREE.Vector3(0, 0.5, 0))

  useFrame((_state, delta) => {
    elapsedRef.current += delta

    const preset = CAMERA_PRESETS[presetForPhase(phase)]

    // Resolve target position and lookAt from the current preset
    _targetPos.set(...preset.position)
    _targetLookAt.set(...preset.lookAt)

    // Apply idle drift when in a suitable phase
    if (IDLE_DRIFT_PHASES.has(phase)) {
      const t = (elapsedRef.current * Math.PI * 2) / DRIFT_PERIOD
      _targetPos.y += Math.sin(t) * DRIFT_AMPLITUDE
      _targetPos.z += Math.cos(t * 0.7) * DRIFT_AMPLITUDE
    }

    // Exponential lerp — smoothly converges on target regardless of framerate
    const lerpFactor = 1 - Math.pow(0.001, delta)

    camera.position.lerp(_targetPos, lerpFactor)

    // Smoothly interpolate the lookAt target so we don't get jarring snaps
    _currentLookAt.copy(lookAtRef.current)
    _currentLookAt.lerp(_targetLookAt, lerpFactor)
    lookAtRef.current.copy(_currentLookAt)

    camera.lookAt(_currentLookAt)

    // Smoothly interpolate FOV
    camera.fov += (preset.fov - camera.fov) * lerpFactor
    camera.updateProjectionMatrix()
  })

  return null
}
