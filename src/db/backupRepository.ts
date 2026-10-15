import { db } from './database'
import type {
  DailyGoal,
  DailyReview,
  Distraction,
  FocusSession,
  Milestone,
  MonthlyMission,
  Subgoal,
  UserSettings,
  WeeklyReview,
} from '../domain/models'

export type DatabaseBackup = {
  formatVersion: 1
  exportedAt: string
  data: {
    monthlyMissions: MonthlyMission[]
    dailyGoals: DailyGoal[]
    subgoals: Subgoal[]
    focusSessions: FocusSession[]
    distractions: Distraction[]
    dailyReviews: DailyReview[]
    milestones: Milestone[]
    settings: UserSettings[]
    weeklyReviews: WeeklyReview[]
  }
}

export async function exportDatabase(): Promise<DatabaseBackup> {
  const [monthlyMissions, dailyGoals, subgoals, focusSessions, distractions, dailyReviews, milestones, settings, weeklyReviews] = await Promise.all([
    db.monthlyMissions.toArray(),
    db.dailyGoals.toArray(),
    db.subgoals.toArray(),
    db.focusSessions.toArray(),
    db.distractions.toArray(),
    db.dailyReviews.toArray(),
    db.milestones.toArray(),
    db.settings.toArray(),
    db.weeklyReviews.toArray(),
  ])

  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      monthlyMissions,
      dailyGoals,
      subgoals,
      focusSessions,
      distractions,
      dailyReviews,
      milestones,
      settings,
      weeklyReviews,
    },
  }
}

export async function importDatabase(input: unknown): Promise<void> {
  const backup = validateBackup(input)

  await db.transaction(
    'rw',
    [
      db.monthlyMissions,
      db.dailyGoals,
      db.subgoals,
      db.focusSessions,
      db.distractions,
      db.dailyReviews,
      db.milestones,
      db.settings,
      db.weeklyReviews,
    ],
    async () => {
      await clearDatabase()
      await db.monthlyMissions.bulkPut(backup.data.monthlyMissions)
      await db.dailyGoals.bulkPut(backup.data.dailyGoals)
      await db.subgoals.bulkPut(backup.data.subgoals)
      await db.focusSessions.bulkPut(backup.data.focusSessions)
      await db.distractions.bulkPut(backup.data.distractions)
      await db.dailyReviews.bulkPut(backup.data.dailyReviews)
      await db.milestones.bulkPut(backup.data.milestones)
      await db.settings.bulkPut(backup.data.settings)
      await db.weeklyReviews.bulkPut(backup.data.weeklyReviews)
    },
  )
}

export async function clearDatabase(): Promise<void> {
  await Promise.all([
    db.monthlyMissions.clear(),
    db.dailyGoals.clear(),
    db.subgoals.clear(),
    db.focusSessions.clear(),
    db.distractions.clear(),
    db.dailyReviews.clear(),
    db.milestones.clear(),
    db.settings.clear(),
    db.weeklyReviews.clear(),
  ])
}

function validateBackup(input: unknown): DatabaseBackup {
  if (!isRecord(input) || input.formatVersion !== 1 || !isRecord(input.data)) {
    throw new Error('This file is not a valid Pomo Focus backup.')
  }

  const data = input.data

  const tableNames = [
    'monthlyMissions',
    'dailyGoals',
    'subgoals',
    'focusSessions',
    'distractions',
    'dailyReviews',
    'milestones',
    'settings',
    'weeklyReviews',
  ] as const

  if (tableNames.some((tableName) => !Array.isArray(data[tableName]))) {
    throw new Error('This backup is missing one or more Pomo Focus data tables.')
  }

  return input as unknown as DatabaseBackup
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
