import { Dexie, type Table } from 'dexie'
import type {
  DailyGoal,
  DailyReview,
  WeeklyReview,
  Distraction,
  FocusSession,
  MonthlyMission,
  Milestone,
  Subgoal,
  UserSettings,
} from '../domain/models'

export type DbExport = Record<string, readonly unknown[]>

export class PomoFocusDatabase extends Dexie {
  monthlyMissions!: Table<MonthlyMission, number>
  dailyGoals!: Table<DailyGoal, number>
  subgoals!: Table<Subgoal, number>
  focusSessions!: Table<FocusSession, number>
  distractions!: Table<Distraction, number>
  dailyReviews!: Table<DailyReview, number>
  weeklyReviews!: Table<WeeklyReview, number>
  milestones!: Table<Milestone, number>
  userSettings!: Table<UserSettings, number>

  constructor() {
    super('pomo-focus-db')
    this.version(1).stores({
      monthlyMissions: '++id, title, startDate, targetDate, status, createdAt, completedAt',
      dailyGoals: '++id, monthlyMissionId, title, date, status, isCarryOver, completedAt, createdAt',
      subgoals: '++id, dailyGoalId, title, status, completedAt, order',
      focusSessions:
        '++id, subgoalId, startedAt, endedAt, plannedDuration, actualDuration, status, [dailyGoalId+startedAt]',
      distractions: '++id, sessionId, note, occurredAt',
      dailyReviews:
        '++id, date, reflection, completedGoal, focusMinutes, distractionCount, [date+id]',
      milestones: '++id, type, value, title, achievedAt',
      userSettings: '++id, focusDuration, breakDuration, dailyFocusTarget, soundEnabled, theme',
    })
    this.version(2)
      .stores({
        monthlyMissions: '++id, title, startDate, targetDate, status, createdAt, completedAt',
        dailyGoals: '++id, monthlyMissionId, title, date, status, isCarryOver, completedAt, createdAt',
        subgoals: '++id, dailyGoalId, title, status, completedAt, order',
        focusSessions:
          '++id, subgoalId, startedAt, endedAt, plannedDuration, actualDuration, status, [dailyGoalId+startedAt]',
        distractions: '++id, sessionId, note, occurredAt',
        dailyReviews:
          '++id, date, reflection, completedGoal, focusMinutes, distractionCount, [date+id]',
        milestones: '++id, type, value, title, achievedAt',
        userSettings: '++id, focusDuration, breakDuration, dailyFocusTarget, soundEnabled, theme',
      })
      .upgrade(async (transaction) => {
        await transaction.table('focusSessions').toCollection().modify((session) => {
          session.totalPausedTime ??= 0
          session.pausedAt ??= null
          session.plannedEndAt ??=
            session.startedAt + session.plannedDuration * 60_000 + session.totalPausedTime
        })
      })
    this.version(3).stores({
      monthlyMissions: '++id, title, startDate, targetDate, status, createdAt, completedAt',
      dailyGoals: '++id, monthlyMissionId, title, date, status, isCarryOver, completedAt, createdAt',
      subgoals: '++id, dailyGoalId, title, status, completedAt, order',
      focusSessions:
        '++id, subgoalId, startedAt, endedAt, plannedDuration, actualDuration, status, [dailyGoalId+startedAt]',
      distractions: '++id, sessionId, note, occurredAt',
      dailyReviews:
        '++id, date, reflection, completedGoal, focusMinutes, distractionCount, [date+id]',
      weeklyReviews:
        '++id, date, reflection, completedGoal, focusMinutes, distractionCount, [date+id]',
      milestones: '++id, type, value, title, achievedAt',
      userSettings: '++id, focusDuration, breakDuration, dailyFocusTarget, soundEnabled, theme',
    })
  }
}

export const db = new PomoFocusDatabase()

// Dexie types Table.add() with the full row type (id included), but the
// auto-increment key is generated at runtime when id is omitted.
export async function addEntry<T>(
  table: Table<T, number>,
  entry: Omit<T, 'id'>,
): Promise<number> {
  return table.add(entry as unknown as T)
}

async function replaceTableContents<T>(
  table: Table<T, number>,
  rows: readonly unknown[],
): Promise<void> {
  await table.clear()
  if (rows.length > 0) {
    await table.bulkAdd(rows as unknown as T[])
  }
}

const TABLE_ORDER: readonly string[] = [
  'monthlyMissions',
  'dailyGoals',
  'subgoals',
  'focusSessions',
  'distractions',
  'dailyReviews',
  'weeklyReviews',
  'milestones',
  'userSettings',
]

export async function exportAllData(): Promise<DbExport> {
  return {
    monthlyMissions: await db.monthlyMissions.toArray(),
    dailyGoals: await db.dailyGoals.toArray(),
    subgoals: await db.subgoals.toArray(),
    focusSessions: await db.focusSessions.toArray(),
    distractions: await db.distractions.toArray(),
    dailyReviews: await db.dailyReviews.toArray(),
    weeklyReviews: await db.weeklyReviews.toArray(),
    milestones: await db.milestones.toArray(),
    userSettings: await db.userSettings.toArray(),
  }
}

export async function importAllData(
  data: Record<string, readonly unknown[]>,
): Promise<void> {
  const tables = [
    db.monthlyMissions,
    db.dailyGoals,
    db.subgoals,
    db.focusSessions,
    db.distractions,
    db.dailyReviews,
    db.weeklyReviews,
    db.milestones,
    db.userSettings,
  ] as const
  await db.transaction('rw', tables, async () => {
      // Parent tables are cleared and reloaded first so foreign keys stay valid.
      for (const tableName of TABLE_ORDER) {
        switch (tableName) {
          case 'monthlyMissions':
            await replaceTableContents(db.monthlyMissions, data[tableName] ?? [])
            break
          case 'dailyGoals':
            await replaceTableContents(db.dailyGoals, data[tableName] ?? [])
            break
          case 'subgoals':
            await replaceTableContents(db.subgoals, data[tableName] ?? [])
            break
          case 'focusSessions':
            await replaceTableContents(db.focusSessions, data[tableName] ?? [])
            break
          case 'distractions':
            await replaceTableContents(db.distractions, data[tableName] ?? [])
            break
          case 'dailyReviews':
            await replaceTableContents(db.dailyReviews, data[tableName] ?? [])
            break
          case 'weeklyReviews':
            await replaceTableContents(db.weeklyReviews, data[tableName] ?? [])
            break
          case 'milestones':
            await replaceTableContents(db.milestones, data[tableName] ?? [])
            break
          case 'userSettings':
            await replaceTableContents(db.userSettings, data[tableName] ?? [])
            break
        }
      }
    },
  )
}
