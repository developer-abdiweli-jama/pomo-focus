export type MissionStatus = 'active' | 'completed' | 'archived'

export type GoalStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'carried_over'
  | 'cancelled'

export type SubgoalStatus = 'planned' | 'completed'

export type SessionStatus =
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'

export type MilestoneType =
  | 'first_session'
  | 'consistent_days'
  | 'streak'
  | 'focus_hours'
  | 'completed_sessions'
  | 'completed_mission'
