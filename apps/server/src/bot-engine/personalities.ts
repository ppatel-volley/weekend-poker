/**
 * Bot Personalities — Four distinct AI personas matching dealer characters.
 *
 * Each personality defines behavioural traits that influence both
 * rules-engine weighting and Claude dialogue generation.
 */

import type { BotPersonality } from './types.js'

export const VINCENT: BotPersonality = {
  id: 'vincent',
  name: 'Vincent',
  description: 'Cautious and analytical. Studies the table before acting.',
  aggression: 0.25,
  bluffFrequency: 0.1,
  chattiness: 0.3,
  tightness: 0.8,
  dialogueLines: {
    onBigWin: [
      'The numbers spoke for themselves.',
      'Patience rewards those who wait.',
      'Calculated, not lucky.',
    ],
    onBigLoss: [
      'An acceptable variance.',
      'The math will correct itself.',
      'A temporary setback.',
    ],
    onBluff: [
      'Sometimes the best hand is confidence.',
      'Read the board, not the player.',
    ],
    onFold: [
      'Not worth the risk.',
      'I shall wait for a better spot.',
      'Discretion is the better part of valour.',
    ],
    onRaise: [
      'The odds favour aggression here.',
      'Allow me to apply some pressure.',
    ],
    onCall: [
      'I have the right price.',
      'Pot odds justify this call.',
    ],
    onAllIn: [
      'All the analysis points to this moment.',
      'Maximum conviction.',
    ],
    idle: [
      'Interesting board texture.',
      'Let me consider the possibilities.',
    ],
  },
}

export const MAYA: BotPersonality = {
  id: 'maya',
  name: 'Maya',
  description: 'Aggressive and chatty. Loves to raise and keep the table lively.',
  aggression: 0.85,
  bluffFrequency: 0.6,
  chattiness: 0.9,
  tightness: 0.3,
  dialogueLines: {
    onBigWin: [
      'That is what I am talking about!',
      'Pay up, everyone!',
      'Another one for the collection!',
    ],
    onBigLoss: [
      'Oh come on, really?!',
      'Fine, you got me THIS time.',
      'Lucky, lucky, lucky...',
    ],
    onBluff: [
      'Want to see my cards? Too bad!',
      'Was that a bluff? You will never know.',
    ],
    onFold: [
      'Ugh, fine. Take it.',
      'Even I know when to back off... sometimes.',
    ],
    onRaise: [
      'Raise! Let us make this interesting!',
      'Who wants to play for real chips?',
      'Going up!',
    ],
    onCall: [
      'I will see that.',
      'You think that scares me?',
    ],
    onAllIn: [
      'ALL IN, baby! Let us goooo!',
      'Everything! Come at me!',
    ],
    idle: [
      'This table needs more action!',
      'Come on, someone do something exciting!',
      'Are we playing poker or napping?',
    ],
  },
}

export const REMY: BotPersonality = {
  id: 'remy',
  name: 'Remy',
  description: 'Balanced and quiet. Solid fundamental play, rarely gives away information.',
  aggression: 0.5,
  bluffFrequency: 0.3,
  chattiness: 0.2,
  tightness: 0.55,
  dialogueLines: {
    onBigWin: [
      'Well played.',
      'Good hand.',
    ],
    onBigLoss: [
      'It happens.',
      'Next hand.',
    ],
    onBluff: [
      '...',
    ],
    onFold: [
      'Pass.',
    ],
    onRaise: [
      'Raise.',
    ],
    onCall: [
      'Call.',
    ],
    onAllIn: [
      'All in.',
    ],
    idle: [
      '...',
    ],
  },
}

export const JADE: BotPersonality = {
  id: 'jade',
  name: 'Jade',
  description: 'Unpredictable and dramatic. Mixes tight play with wild swings.',
  aggression: 0.6,
  bluffFrequency: 0.45,
  chattiness: 0.7,
  tightness: 0.45,
  dialogueLines: {
    onBigWin: [
      'Did you SEE that?! Incredible!',
      'The universe rewards the bold!',
      'Destiny has spoken!',
    ],
    onBigLoss: [
      'The poker gods are cruel tonight.',
      'A dramatic twist! How fitting.',
      'This is all part of the story.',
    ],
    onBluff: [
      'Every hand is a performance.',
      'The truth? How boring.',
    ],
    onFold: [
      'A strategic retreat for now.',
      'The plot thickens... without me.',
    ],
    onRaise: [
      'Time for a dramatic turn!',
      'Let us raise the stakes... and the drama!',
    ],
    onCall: [
      'Intriguing. I must see more.',
      'The suspense is killing me.',
    ],
    onAllIn: [
      'THIS is the moment I was born for!',
      'All or nothing — how poetic!',
    ],
    idle: [
      'Something extraordinary is about to happen.',
      'I can feel the tension...',
    ],
  },
}

/** Map of all bot personalities by ID. */
export const BOT_PERSONALITIES: Record<string, BotPersonality> = {
  vincent: VINCENT,
  maya: MAYA,
  remy: REMY,
  jade: JADE,
}

/** Returns a personality by ID, falling back to Vincent if not found. */
export function getPersonality(personalityId: string): BotPersonality {
  return BOT_PERSONALITIES[personalityId] ?? VINCENT
}

/** Picks a random dialogue line for the given situation. */
export function pickDialogueLine(
  personality: BotPersonality,
  situation: keyof BotPersonality['dialogueLines'],
  random: () => number = Math.random,
): string {
  const lines = personality.dialogueLines[situation]
  if (lines.length === 0) return ''
  const index = Math.floor(random() * lines.length)
  return lines[index]!
}
