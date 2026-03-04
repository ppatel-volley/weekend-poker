import { type Page, expect } from '@playwright/test'
import { holdemCallOrCheck, bjPlaceBet, bjStand, bjcStand, tcpPlaceAnte, tcpPlay, rouletteBetRed, rouletteConfirmBets, crapsPassLine, crapsConfirmBets, crapsRoll, drawCallOrCheck, drawKeepAll } from './game-actions'

/**
 * Play one round of Hold'em: always call/check through all betting rounds.
 * Bot fills automatically so we just need to act on our turn.
 */
export async function playHoldemRound(page: Page): Promise<void> {
  // Hold'em has up to 4 betting phases: pre-flop, flop, turn, river
  // We call/check whenever it's our turn, up to 4 times
  for (let phase = 0; phase < 4; phase++) {
    const myTurn = page.getByText('Your turn!')
    const result = page.getByText(/WON \$|LOST \$|Hand complete/i)

    // Wait for either our turn or a result
    await expect(myTurn.or(result)).toBeVisible({ timeout: 30_000 })

    // If we see a result, the hand is over
    if (await result.isVisible().catch(() => false)) break

    // It's our turn — call or check
    await holdemCallOrCheck(page)
    // Small wait for server processing
    await page.waitForTimeout(1_000)
  }
}

/**
 * Play one round of Blackjack Classic: place min bet, then stand immediately.
 */
export async function playBlackjackRound(page: Page): Promise<void> {
  // Place bet phase
  const placeBetBtn = page.getByTestId('place-bet-btn')
  const alreadyInGame = page.getByTestId('hit-btn').or(page.getByTestId('stand-btn'))

  await expect(placeBetBtn.or(alreadyInGame)).toBeVisible({ timeout: 30_000 })

  if (await placeBetBtn.isVisible().catch(() => false)) {
    await bjPlaceBet(page)
  }

  // Wait for player turns
  const standBtn = page.getByTestId('stand-btn')
  const result = page.getByText(/WON \$|LOST \$|PUSH|BUST|BLACKJACK/i)
  await expect(standBtn.or(result)).toBeVisible({ timeout: 30_000 })

  // If we can act, just stand
  if (await standBtn.isVisible().catch(() => false)) {
    await bjStand(page)
  }
}

/**
 * Play one round of Competitive Blackjack: auto-ante, then stand.
 */
export async function playBjcRound(page: Page): Promise<void> {
  // BJC has auto-ante, wait for player turns
  const standBtn = page.getByTestId('stand-btn')
  const result = page.getByText(/WON \$|LOST \$|WINNER/i)
  await expect(standBtn.or(result)).toBeVisible({ timeout: 30_000 })

  if (await standBtn.isVisible().catch(() => false)) {
    await bjcStand(page)
  }
}

/**
 * Play one round of Three Card Poker: place ante, then always play.
 */
export async function playTcpRound(page: Page): Promise<void> {
  // Place ante
  const anteBtn = page.getByTestId('confirm-ante-btn')
  const playBtn = page.getByTestId('play-btn')
  const result = page.getByText(/WON \$|LOST \$|PUSH|FOLDED/i)

  await expect(anteBtn.or(playBtn).or(result)).toBeVisible({ timeout: 30_000 })

  if (await anteBtn.isVisible().catch(() => false)) {
    await tcpPlaceAnte(page)
  }

  // Wait for decision phase
  await expect(playBtn.or(result)).toBeVisible({ timeout: 30_000 })

  if (await playBtn.isVisible().catch(() => false)) {
    await tcpPlay(page)
  }
}

/**
 * Play one round of Roulette: bet red, confirm.
 */
export async function playRouletteRound(page: Page): Promise<void> {
  const redBtn = page.getByTestId('red-btn')
  const result = page.getByText(/WON \$|LOST \$|NO BET/i)

  await expect(redBtn.or(result)).toBeVisible({ timeout: 30_000 })

  if (await redBtn.isVisible().catch(() => false)) {
    await rouletteBetRed(page)
    await rouletteConfirmBets(page)
  }
}

/**
 * Play one round of Craps: pass line, confirm, roll if shooter.
 * Handles the point phase with a loop (max 10 iterations).
 */
export async function playCrapsRound(page: Page): Promise<void> {
  const passLineBtn = page.getByTestId('pass-line-btn')
  const confirmBtn = page.getByTestId('confirm-bets-btn')
  const rollBtn = page.getByTestId('roll-btn')
  const result = page.getByTestId('outcome-text')
  const waitingForRoll = page.getByTestId('waiting-for-roll')

  // Come-out betting
  await expect(passLineBtn.or(result)).toBeVisible({ timeout: 30_000 })

  if (await passLineBtn.isVisible().catch(() => false)) {
    await crapsPassLine(page)
    // Confirm if button appears
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await crapsConfirmBets(page)
    }
  }

  // Roll or wait for shooter
  for (let i = 0; i < 10; i++) {
    await expect(rollBtn.or(waitingForRoll).or(result)).toBeVisible({ timeout: 30_000 })

    if (await result.isVisible().catch(() => false)) break

    if (await rollBtn.isVisible().catch(() => false)) {
      await crapsRoll(page)
      await page.waitForTimeout(2_000) // Wait for dice animation
    }

    // Check if we need to place more bets (point phase)
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await crapsConfirmBets(page)
    }

    await page.waitForTimeout(1_000)
  }
}

/**
 * Play one round of 5-Card Draw: call/check, keep all, call/check.
 */
export async function playDrawRound(page: Page): Promise<void> {
  const result = page.getByText(/YOUR HAND|Hand complete/i)

  // Betting round 1
  const myTurn1 = page.getByText('Your turn!')
  const keepAll = page.getByTestId('keep-all-btn')
  await expect(myTurn1.or(keepAll).or(result)).toBeVisible({ timeout: 30_000 })

  if (await myTurn1.isVisible().catch(() => false)) {
    await drawCallOrCheck(page)
    await page.waitForTimeout(1_000)
  }

  // Discard phase
  await expect(keepAll.or(result)).toBeVisible({ timeout: 30_000 })
  if (await keepAll.isVisible().catch(() => false)) {
    await drawKeepAll(page)
    await page.waitForTimeout(1_000)
  }

  // Betting round 2
  const myTurn2 = page.getByText('Your turn!')
  await expect(myTurn2.or(result)).toBeVisible({ timeout: 30_000 })
  if (await myTurn2.isVisible().catch(() => false)) {
    await drawCallOrCheck(page)
  }
}

/**
 * Detect current game from heading and play one round.
 */
export async function playCurrentGameRound(page: Page): Promise<void> {
  const heading = page.getByTestId('game-heading')
  await expect(heading).toBeVisible({ timeout: 30_000 })
  const text = (await heading.textContent()) ?? ''

  if (text.includes("Hold'em")) {
    await playHoldemRound(page)
  } else if (text.includes('5-Card Draw')) {
    await playDrawRound(page)
  } else if (text.includes('Blackjack Arena') || text.includes('Competitive')) {
    await playBjcRound(page)
  } else if (text.includes('Blackjack')) {
    await playBlackjackRound(page)
  } else if (text.includes('Three Card')) {
    await playTcpRound(page)
  } else if (text.includes('Roulette')) {
    await playRouletteRound(page)
  } else if (text.includes('Craps')) {
    await playCrapsRound(page)
  } else {
    throw new Error(`Unknown game heading: "${text}"`)
  }
}
