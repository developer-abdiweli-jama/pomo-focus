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
    this.version(4).stores({
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
    }).upgrade(async (transaction) => {
      await transaction.table('weeklyReviews').toCollection().modify((review) => {
        review.wins ??= ''
        review.challenges ??= ''
        review.adjustment ??= ''
        review.nextPriority ??= ''
      })
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

const REQUIRED_IMPORT_FIELDS: Readonly<Record<string, readonly string[]>> = {
  monthlyMissions: ['title', 'description', 'startDate', 'targetDate', 'status', 'createdAt', 'completedAt'],
  dailyGoals: ['monthlyMissionId', 'title', 'date', 'status', 'isCarryOver', 'completedAt', 'createdAt'],
  subgoals: ['dailyGoalId', 'title', 'status', 'completedAt', 'order'],
  focusSessions: ['dailyGoalId', 'subgoalId', 'startedAt', 'plannedEndAt', 'pausedAt', 'totalPausedTime', 'endedAt', 'plannedDuration', 'actualDuration', 'status'],
  distractions: ['sessionId', 'note', 'occurredAt'],
  dailyReviews: ['date', 'reflection', 'completedGoal', 'focusMinutes', 'distractionCount'],
  weeklyReviews: ['date', 'reflection', 'completedGoal', 'focusMinutes', 'distractionCount'],
  milestones: ['type', 'value', 'title', 'achievedAt'],
  userSettings: ['focusDuration', 'breakDuration', 'dailyFocusTarget', 'soundEnabled', 'theme'],
}

export function validateImportData(data: unknown): asserts data is DbExport {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid FocusSpan backup')
  }

  const backup = data as Record<string, unknown>
  for (const tableName of TABLE_ORDER) {
    const rows = backup[tableName]
    const requiredFields = REQUIRED_IMPORT_FIELDS[tableName]
    if (!Array.isArray(rows)) throw new Error(`Backup is missing ${tableName}`)
    for (const row of rows) {
      if (
        row === null ||
        typeof row !== 'object' ||
        Array.isArray(row) ||
        !Number.isSafeInteger((row as Record<string, unknown>).id) ||
        requiredFields.some((field) => !Object.prototype.hasOwnProperty.call(row, field))
      ) {
        throw new Error(`Backup contains an invalid ${tableName} record`)
      }
    }
  }
}

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
  data: unknown,
): Promise<void> {
  validateImportData(data)
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
