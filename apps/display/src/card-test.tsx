/**
 * Standalone card rendering test — no VGF, no game state.
 * Open: http://localhost:5173/?test=cards
 */
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'

const DECK_GLB_PATH = '/52-card_deck.glb'

function DebugLog({ messages }: { messages: string[] }) {
  return (
    <div style={{
      position: 'fixed', top: 10, left: 10, zIndex: 100,
      background: 'rgba(0,0,0,0.9)', padding: 12, borderRadius: 8,
      fontSize: 13, maxWidth: 500, maxHeight: '50vh', overflow: 'auto',
      fontFamily: 'monospace', lineHeight: 1.6,
    }}>
      <h3 style={{ margin: '0 0 8px', color: '#fbbf24' }}>Card Rendering Test</h3>
      {messages.map((m, i) => (
        <div key={i} style={{ color: m.startsWith('ERROR') ? '#ef4444' : m.startsWith('OK') ? '#22c55e' : '#ccc' }}>{m}</div>
      ))}
    </div>
  )
}

function CardTestScene({ onLog }: { onLog: (msg: string) => void }) {
  const gltf = useGLTF(DECK_GLB_PATH)
  const [cards, setCards] = useState<THREE.Object3D[]>([])

  useEffect(() => {
    onLog(`GLB loaded. Scene type: ${gltf.scene.type}, children: ${gltf.scene.children.length}`)

    // Inspect nodes
    const nodes = (gltf as any).nodes as Record<string, THREE.Object3D> | undefined
    if (nodes) {
      const nodeNames = Object.keys(nodes)
      onLog(`gltf.nodes: ${nodeNames.length} total`)

      const withSpaceOf = nodeNames.filter(n => n.includes(' of '))
      const withUnderscoreOf = nodeNames.filter(n => n.includes('_of_'))
      onLog(`  ' of ' (spaces): ${withSpaceOf.length}`)
      onLog(`  '_of_' (underscores): ${withUnderscoreOf.length}`)

      if (withSpaceOf.length === 0 && withUnderscoreOf.length === 0) {
        onLog('ERROR: No card nodes found by either pattern!')
        onLog('First 10 node names:')
        nodeNames.slice(0, 10).forEach(n => onLog(`  "${n}"`))
      }
    } else {
      onLog('ERROR: gltf.nodes is undefined')
    }

    // Build mesh map
    const meshMap = new Map<string, THREE.Object3D>()

    // Try from nodes first
    if (nodes) {
      for (const [rawName, node] of Object.entries(nodes)) {
        const hasSpaceOf = rawName.includes(' of ')
        const hasUnderscoreOf = rawName.includes('_of_')
        if (!hasSpaceOf && !hasUnderscoreOf) continue
        const separator = hasSpaceOf ? ' of ' : '_of_'
        const afterOf = rawName.split(separator)[1] ?? ''
        if (afterOf.includes('_') || afterOf.includes(' - ')) continue
        const name = rawName.replace(/_/g, ' ')
        meshMap.set(name, node)
      }
    }

    // Fallback: traverse scene
    if (meshMap.size === 0) {
      onLog('Nodes approach found 0 cards. Trying scene traversal...')
      gltf.scene.traverse((child) => {
        const hasSpaceOf = child.name.includes(' of ')
        const hasUnderscoreOf = child.name.includes('_of_')
        if (!hasSpaceOf && !hasUnderscoreOf) return
        if (child.children.length === 0) return
        const separator = hasSpaceOf ? ' of ' : '_of_'
        const afterOf = child.name.split(separator)[1] ?? ''
        if (afterOf.includes('_') || afterOf.includes(' - ')) return
        const name = child.name.replace(/_/g, ' ')
        meshMap.set(name, child)
      })
    }

    onLog(`Mesh map: ${meshMap.size} cards`)

    if (meshMap.size === 0) {
      onLog('ERROR: Zero cards in mesh map! Trying brute force...')
      // Brute force: just grab any nodes with children and render them
      const allGroups: THREE.Object3D[] = []
      gltf.scene.traverse((child) => {
        if (child.children.length > 0 && child.children.length <= 5 && child !== gltf.scene) {
          allGroups.push(child)
        }
      })
      onLog(`Brute force groups: ${allGroups.length}`)
      allGroups.slice(0, 3).forEach(g => {
        onLog(`  "${g.name}" type=${g.type} children=${g.children.length}`)
      })

      // Try rendering the first few groups directly
      const bruteClones = allGroups.slice(4, 9).map(g => {
        const c = g.clone(true)
        c.visible = true
        c.traverse(ch => { ch.visible = true })
        return c
      })
      setCards(bruteClones)
      onLog(`Rendering ${bruteClones.length} brute-force groups`)
      return
    }

    // Clone test cards
    const testNames = ['Ace of Spades', 'King of Hearts', 'Queen of Diamonds', 'Jack of Clubs', 'Ten of Spades']
    const clones: THREE.Object3D[] = []

    for (const name of testNames) {
      const source = meshMap.get(name)
      if (!source) {
        onLog(`MISSING: "${name}"`)
        continue
      }
      const clone = source.clone(true)
      clone.visible = true
      clone.traverse(child => { child.visible = true })

      const box = new THREE.Box3().setFromObject(clone)
      const size = box.getSize(new THREE.Vector3())
      onLog(`OK: "${name}" size: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`)

      clones.push(clone)
    }

    if (clones.length > 0) {
      setCards(clones)
      onLog(`OK: Rendering ${clones.length} cards`)
    } else {
      onLog('ERROR: No cards could be cloned')
    }
  }, [gltf, onLog])

  return (
    <group>
      {cards.map((clone, i) => (
        <primitive
          key={i}
          object={clone}
          position={[(i - 2) * 2, 1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}
    </group>
  )
}

export function CardTestPage() {
  const [logs, setLogs] = useState<string[]>(['Initialising...'])

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg])
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      <DebugLog messages={logs} />
      <Canvas
        camera={{ position: [0, 5, 8], fov: 45 }}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace,
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Bright lighting */}
        <ambientLight intensity={1.0} />
        <directionalLight position={[5, 10, 5]} intensity={2} />
        <pointLight position={[-5, 5, 5]} intensity={1.5} />

        {/* Green felt floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#1a5a2a" />
        </mesh>

        {/* Reference: red box (proves R3F rendering works) */}
        <mesh position={[0, 0.5, -3]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ff4444" />
        </mesh>

        {/* Reference: green sphere */}
        <mesh position={[-4, 0.3, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#44ff44" />
        </mesh>

        {/* Card test */}
        <CardTestScene onLog={addLog} />

        <OrbitControls />
      </Canvas>
    </div>
  )
}
