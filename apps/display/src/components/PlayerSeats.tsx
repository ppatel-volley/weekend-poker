import { useStateSyncSelector } from '../hooks/useVGFHooks.js'
import { PlayerSeat } from './PlayerSeat.js'

/** Renders a PlayerSeat for every player in the game state. */
export function PlayerSeats() {
  const players = useStateSyncSelector((s) => s.players)
  const activePlayerIndex = useStateSyncSelector((s) => s.activePlayerIndex)

  return (
    <>
      {players.map((player, index) => (
        <PlayerSeat
          key={player.id}
          player={player}
          seatIndex={index}
          isActive={index === activePlayerIndex}
        />
      ))}
    </>
  )
}
