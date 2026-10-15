import Dexie, { type EntityTable } from 'dexie'
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

export class PomoDatabase extends Dexie {
  monthlyMissions!: EntityTable<MonthlyMission, 'id'>
  dailyGoals!: EntityTable<DailyGoal, 'id'>
  subgoals!: EntityTable<Subgoal, 'id'>
  focusSessions!: EntityTable<FocusSession, 'id'>
  distractions!: EntityTable<Distraction, 'id'>
  dailyReviews!: EntityTable<DailyReview, 'id'>
  milestones!: EntityTable<Milestone, 'id'>
  settings!: EntityTable<UserSettings, 'id'>
  weeklyReviews!: EntityTable<WeeklyReview, 'id'>

  constructor() {
    super('pomo-focus-db')

    this.version(1).stores({
      monthlyMissions: 'id, status, startDate, targetDate',
      dailyGoals: 'id, monthlyMissionId, date, status',
      subgoals: 'id, dailyGoalId, order, status',
      focusSessions: 'id, dailyGoalId, subgoalId, startedAt, endedAt, status',
      distractions: 'id, sessionId, occurredAt',
      dailyReviews: 'id, &date, createdAt',
      milestones: 'id, type, achievedAt',
      settings: 'id',
    })
    this.version(2).stores({
      weeklyReviews: 'id, &weekStart, updatedAt',
    })
  }
}

export const db = new PomoDatabase()
