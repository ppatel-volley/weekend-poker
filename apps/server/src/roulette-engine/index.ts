export {
  EUROPEAN_WHEEL_ORDER,
  RED_NUMBERS,
  BLACK_NUMBERS,
  getNumberColour,
  isOdd,
  isEven,
  isLow,
  isHigh,
  getDozen,
  getColumn,
  getAdjacentNumbers,
  generateWinningNumber,
} from './wheel.js'
export type { RouletteColour } from './wheel.js'

export {
  getNumbersForBet,
  isInsideBet,
  isOutsideBet,
  areGridAdjacent,
  isValidStreet,
  isValidCorner,
  isValidSixLine,
  isValidBet,
} from './bet-types.js'

export {
  getPayoutMultiplier,
  resolveBet,
  resolveAllBets,
} from './payout-calculator.js'
export type { BetResolution } from './payout-calculator.js'
