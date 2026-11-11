export type Status =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'carried_over'
  | 'cancelled'

export type Theme = 'dark' | 'light' | 'system'

export type MilestoneType = 'session' | 'streak' | 'focus' | 'goal'

export interface MonthlyMission {
  readonly id: number
  readonly title: string
  readonly description: string
  readonly startDate: string // ISO 'YYYY-MM-DD'
  readonly targetDate: string // ISO 'YYYY-MM-DD'
  readonly status: Status
  readonly createdAt: number // ms since epoch
  readonly completedAt: number | null
}

export interface DailyGoal {
  readonly id: number
  readonly monthlyMissionId: number | null
  readonly title: string
  readonly date: string // ISO 'YYYY-MM-DD'
  readonly status: Status
  readonly isCarryOver: boolean
  readonly completedAt: number | null
  readonly createdAt: number // ms since epoch
}

export interface Subgoal {
  readonly id: number
  readonly dailyGoalId: number
  readonly title: string
  readonly status: Status
  readonly completedAt: number | null
  readonly order: number
}

export interface FocusSession {
  readonly id: number
  readonly dailyGoalId: number
  readonly subgoalId: number | null
  readonly startedAt: number // ms since epoch
  readonly plannedEndAt: number // ms since epoch; advances while paused or extended
  readonly pausedAt: number | null // ms since epoch
  readonly totalPausedTime: number // accumulated paused ms
  readonly endedAt: number | null // ms since epoch
  readonly plannedDuration: number // minutes
  readonly actualDuration: number | null // minutes
  readonly status: Status
}

export interface Distraction {
  readonly id: number
  readonly sessionId: number
  readonly note: string
  readonly occurredAt: number // ms since epoch
}

export interface DailyReview {
  readonly id: number
  readonly date: string // ISO 'YYYY-MM-DD'
  readonly reflection: string
  readonly completedGoal: boolean
  readonly focusMinutes: number
  readonly distractionCount: number
}

export interface WeeklyReview extends Omit<DailyReview, 'id'> {
  readonly id: number
}

export interface Milestone {
  readonly id: number
  readonly type: MilestoneType
  readonly value: number
  readonly title: string
  readonly achievedAt: number // ms since epoch
}

export interface UserSettings {
  readonly id: number
  readonly focusDuration: number // minutes
  readonly breakDuration: number // minutes
  readonly dailyFocusTarget: number // minutes
  readonly soundEnabled: boolean
  readonly theme: Theme
}
