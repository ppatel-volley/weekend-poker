/**
 * Achievement engine barrel export.
 */

export { ACHIEVEMENT_DEFINITIONS, getAchievementsByCategory, getAchievementById } from './definitions.js'
export { detectGameEventAchievements, detectStatBasedAchievements } from './detector.js'
export type { DetectedPersistentAchievement } from './detector.js'
export { persistAchievementsIfNew } from './persistent-achievements.js'
