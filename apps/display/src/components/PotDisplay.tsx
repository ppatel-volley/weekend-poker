import { Text } from '@react-three/drei'
import { useStateSyncSelector } from '../hooks/useVGFHooks.js'
import { ChipPile } from './ChipPile.js'

/** Displays the main pot and up to 2 side pots at the centre of the table. */
export function PotDisplay() {
  const pot = useStateSyncSelector((s) => s.pot)
  const sidePots = useStateSyncSelector((s) => s.sidePots)

  if (pot <= 0) return null

  return (
    <group position={[0, 0.3, 0]}>
      {/* Main pot */}
      <ChipPile amount={pot} position={[0, 0, 0]} />
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.14}
        color="#C9A84C"
        anchorX="center"
        anchorY="middle"
      >
        {`$${pot.toLocaleString()}`}
      </Text>

      {/* Side pots (up to 2) */}
      {sidePots.slice(0, 2).map((sp, i) => (
        <group key={i} position={[0.8 * (i + 1), 0, 0.3]}>
          <ChipPile amount={sp.amount} position={[0, 0, 0]} scale={0.7} />
          <Text
            position={[0, 0.35, 0]}
            fontSize={0.09}
            color="#C9A84C"
            anchorX="center"
            anchorY="middle"
          >
            {`SIDE POT: $${sp.amount.toLocaleString()}`}
          </Text>
        </group>
      ))}
    </group>
  )
}
