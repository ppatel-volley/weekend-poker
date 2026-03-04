import { type Page } from '@playwright/test'

// ── Hold'em ──
export async function holdemCallOrCheck(page: Page): Promise<void> {
  const check = page.getByTestId('check-btn')
  const call = page.getByTestId('call-btn')
  if (await check.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await check.click()
  } else {
    await call.click({ timeout: 5_000 })
  }
}

export async function holdemFold(page: Page): Promise<void> {
  await page.getByTestId('fold-btn').click({ timeout: 5_000 })
}

// ── Blackjack Classic ──
export async function bjPlaceBet(page: Page): Promise<void> {
  await page.getByTestId('place-bet-btn').click({ timeout: 10_000 })
}

export async function bjHit(page: Page): Promise<void> {
  await page.getByTestId('hit-btn').click({ timeout: 5_000 })
}

export async function bjStand(page: Page): Promise<void> {
  await page.getByTestId('stand-btn').click({ timeout: 5_000 })
}

// ── Competitive Blackjack ──
export async function bjcHit(page: Page): Promise<void> {
  await page.getByTestId('hit-btn').click({ timeout: 5_000 })
}

export async function bjcStand(page: Page): Promise<void> {
  await page.getByTestId('stand-btn').click({ timeout: 5_000 })
}

// ── Three Card Poker ──
export async function tcpPlaceAnte(page: Page): Promise<void> {
  await page.getByTestId('confirm-ante-btn').click({ timeout: 10_000 })
}

export async function tcpPlay(page: Page): Promise<void> {
  await page.getByTestId('play-btn').click({ timeout: 10_000 })
}

// ── Roulette ──
export async function rouletteBetRed(page: Page): Promise<void> {
  await page.getByTestId('red-btn').click({ timeout: 5_000 })
}

export async function rouletteConfirmBets(page: Page): Promise<void> {
  await page.getByTestId('confirm-bets-btn').click({ timeout: 5_000 })
}

// ── Craps ──
export async function crapsPassLine(page: Page): Promise<void> {
  await page.getByTestId('pass-line-btn').click({ timeout: 5_000 })
}

export async function crapsConfirmBets(page: Page): Promise<void> {
  await page.getByTestId('confirm-bets-btn').click({ timeout: 5_000 })
}

export async function crapsRoll(page: Page): Promise<void> {
  await page.getByTestId('roll-btn').click({ timeout: 10_000 })
}

// ── 5-Card Draw ──
export async function drawCallOrCheck(page: Page): Promise<void> {
  const check = page.getByTestId('check-btn')
  const call = page.getByTestId('call-btn')
  if (await check.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await check.click()
  } else {
    await call.click({ timeout: 5_000 })
  }
}

export async function drawKeepAll(page: Page): Promise<void> {
  await page.getByTestId('keep-all-btn').click({ timeout: 10_000 })
}
