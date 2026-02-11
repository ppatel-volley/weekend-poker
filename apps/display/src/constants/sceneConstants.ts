// Scene layout constants for the poker table display.

/** Seat positions (world coordinates) — 4 players around oval table. */
export const SEAT_POSITIONS: [number, number, number][] = [
  [0, 0, 3.5],    // Seat 0: closest to camera (bottom)
  [-3.2, 0, 0],   // Seat 1: left
  [0, 0, -3.5],   // Seat 2: far side (top, near dealer)
  [3.2, 0, 0],    // Seat 3: right
]

/** Dealer character position behind the far side of the table. */
export const DEALER_POSITION: [number, number, number] = [0, 0, -4.5]

/** Chip denomination colours. */
export const CHIP_COLOURS: Record<number, string> = {
  5: '#FFFFFF',    // White
  25: '#C23B22',   // Red
  100: '#1A1A1D',  // Black
  500: '#6B21A8',  // Purple
  1000: '#C9A84C', // Gold
}

/** Action indicator colours (matches PlayerAction type + 'waiting'). */
export const ACTION_COLOURS: Record<string, string> = {
  fold: '#4A4845',
  check: '#2D8B4E',
  call: '#2D5F8B',
  bet: '#C9A84C',
  raise: '#C9A84C',
  all_in: '#C23B22',
  waiting: '#2A2A2E',
}

/** Action display labels. */
export const ACTION_LABELS: Record<string, string> = {
  fold: 'FOLD',
  check: 'CHECK',
  call: 'CALL',
  bet: 'BET',
  raise: 'RAISE',
  all_in: 'ALL IN',
  post_small_blind: 'SB',
  post_big_blind: 'BB',
  waiting: '',
}
