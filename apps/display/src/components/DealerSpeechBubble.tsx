import { useEffect, useRef, useState } from 'react'
import { Text } from '@react-three/drei'
import { useStateSyncSelector } from '../hooks/useVGFHooks.js'

/** Auto-dismiss delay in milliseconds. */
const DISMISS_MS = 6_000

/**
 * Speech bubble displayed near the dealer position.
 * Appears when dealerMessage changes and auto-dismisses after 6 seconds.
 */
export function DealerSpeechBubble() {
  const dealerMessage = useStateSyncSelector((s) => s.dealerMessage)
  const prevMessageRef = useRef<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (dealerMessage && dealerMessage !== prevMessageRef.current) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), DISMISS_MS)
      prevMessageRef.current = dealerMessage
      return () => clearTimeout(timer)
    }

    if (!dealerMessage) {
      setVisible(false)
      prevMessageRef.current = null
    }
  }, [dealerMessage])

  if (!visible || !dealerMessage) return null

  return (
    <group position={[0, 2.5, -2]}>
      {/* Background panel */}
      <mesh>
        <planeGeometry args={[2.5, 0.8]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.9} transparent opacity={0.85} />
      </mesh>

      {/* Message text */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.07}
        color="#F5F2ED"
        maxWidth={2.0}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {dealerMessage}
      </Text>
    </group>
  )
}
