import type {
  GoalStatus,
  MilestoneType,
  MissionStatus,
  SessionStatus,
  SubgoalStatus,
} from './statuses'

export type EntityId = string
export type DateString = string
export type Timestamp = string

export type MonthlyMission = {
  id: EntityId
  title: string
  description: string
  startDate: DateString
  targetDate: DateString
  status: MissionStatus
  createdAt: Timestamp
  completedAt?: Timestamp
}

export type DailyGoal = {
  id: EntityId
  monthlyMissionId?: EntityId
  title: string
  date: DateString
  status: GoalStatus
  isCarryOver: boolean
  carriedFromGoalId?: EntityId
  carryOverCount: number
  createdAt: Timestamp
  completedAt?: Timestamp
}

export type Subgoal = {
  id: EntityId
  dailyGoalId: EntityId
  title: string
  status: SubgoalStatus
  order: number
  createdAt: Timestamp
  completedAt?: Timestamp
}

export type FocusSession = {
  id: EntityId
  dailyGoalId: EntityId
  subgoalId?: EntityId
  startedAt: Timestamp
  plannedEndAt: Timestamp
  pausedAt?: Timestamp
  endedAt?: Timestamp
  plannedDurationSeconds: number
  dailyTargetMinutes?: number
  actualDurationSeconds: number
  totalPausedSeconds: number
  status: SessionStatus
}

export type Distraction = {
  id: EntityId
  sessionId: EntityId
  note: string
  occurredAt: Timestamp
}

export type DailyReview = {
  id: EntityId
  date: DateString
  reflection: string
  focusMinutes: number
  completedGoal: boolean
  distractionCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type WeeklyReview = {
  id: EntityId
  weekStart: DateString
  weekEnd: DateString
  reflection: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type Milestone = {
  id: EntityId
  type: MilestoneType
  value: number
  title: string
  achievedAt: Timestamp
}

export type UserSettings = {
  id: 'default'
  focusDurationSeconds: number
  breakDurationSeconds: number
  dailyFocusTargetMinutes: number
  soundEnabled: boolean
  theme: 'dark' | 'light' | 'system'
}

export type NewMonthlyMission = Pick<
  MonthlyMission,
  'title' | 'description' | 'startDate' | 'targetDate'
>

export type NewDailyGoal = Pick<DailyGoal, 'title' | 'date'> & {
  monthlyMissionId?: EntityId
}

export type NewSubgoal = Pick<Subgoal, 'dailyGoalId' | 'title' | 'order'>

export type NewFocusSession = Pick<
  FocusSession,
  'dailyGoalId' | 'subgoalId' | 'plannedDurationSeconds' | 'dailyTargetMinutes'
>
