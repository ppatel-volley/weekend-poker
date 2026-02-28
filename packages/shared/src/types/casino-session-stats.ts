import type { CasinoGame } from './casino-game.js'

/**
 * Session Statistics — Cross-game stats accumulated during a casino session.
 *
 * Tracks wins, losses, chip results, and highlights across all games played
 * in a single session. Used for end-of-session summary and Game Night scoring.
 */
export interface SessionStats {
  // ─── Session Metadata ───
  sessionStartedAt: number         // unix timestamp

  // ─── Cross-Game Aggregate ───
  gamesPlayed: Record<CasinoGame, number>  // count per game
  handsPlayed: number              // total hands across all poker variants
  totalChipsWon: number            // aggregate winnings
  totalChipsLost: number           // aggregate losses
  biggestPot: number               // largest single pot seen

  // ─── Highlights ───
  biggestWin: {
    playerId: string
    amount: number
    game: CasinoGame
  } | null

  worstBeat: {
    playerId: string
    amount: number
    game: CasinoGame
  } | null

  // ─── Per-Player Stats ───
  playerStats: Record<string, PlayerSessionStats>
}

/**
 * Per-Player Statistics within a session.
 */
export interface PlayerSessionStats {
  // ─── Overall ───
  handsPlayed: number
  handsWon: number
  netChipResult: number            // positive = won, negative = lost

  // ─── Game-Specific ───
  gamesPlayed: CasinoGame[]         // list of games this player participated in
  gameStats: Record<CasinoGame, GameResultStats>

  // ─── Highlights ───
  biggestWin: number
  biggestLoss: number
}

/**
 * Per-Game result statistics for a player within a session.
 */
export interface GameResultStats {
  handsPlayed: number
  handsWon: number
  netResult: number                // this game only
  winRate: number                  // handsWon / handsPlayed
}

/**
 * Initialize a new session stats object.
 */
export function createSessionStats(startedAt: number): SessionStats {
  return {
    sessionStartedAt: startedAt,
    gamesPlayed: {
      holdem: 0,
      five_card_draw: 0,
      blackjack_classic: 0,
      blackjack_competitive: 0,
      roulette: 0,
      three_card_poker: 0,
      craps: 0,
    },
    handsPlayed: 0,
    totalChipsWon: 0,
    totalChipsLost: 0,
    biggestPot: 0,
    biggestWin: null,
    worstBeat: null,
    playerStats: {},
  }
}

/**
 * Initialize per-player stats.
 */
export function createPlayerSessionStats(): PlayerSessionStats {
  return {
    handsPlayed: 0,
    handsWon: 0,
    netChipResult: 0,
    gamesPlayed: [],
    gameStats: {
      holdem: { handsPlayed: 0, handsWon: 0, netResult: 0, winRate: 0 },
      five_card_draw: { handsPlayed: 0, handsWon: 0, netResult: 0, winRate: 0 },
      blackjack_classic: { handsPlayed: 0, handsWon: 0, netResult: 0, winRate: 0 },
      blackjack_competitive: { handsPlayed: 0, handsWon: 0, netResult: 0, winRate: 0 },
      roulette: { handsPlayed: 0, handsWon: 0, netResult: 0, winRate: 0 },
      three_card_poker: { handsPlayed: 0, handsWon: 0, netResult: 0, winRate: 0 },
      craps: { handsPlayed: 0, handsWon: 0, netResult: 0, winRate: 0 },
    },
    biggestWin: 0,
    biggestLoss: 0,
  }
}
