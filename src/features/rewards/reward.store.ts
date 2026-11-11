import { create } from 'zustand'
import { db } from '../../db/database'
import * as goalRepository from '../../db/repositories/goalRepository'
import * as reviewRepository from '../../db/repositories/reviewRepository'
import * as sessionRepository from '../../db/repositories/sessionRepository'
import type { Milestone } from '../../domain/models'
import { calculateStreak } from './streak.logic'
import { checkMilestones, type NewMilestone } from './milestone.logic'
import { format, subYears } from 'date-fns'

export interface RewardStore {
  readonly currentStreak: number
  readonly longestStreak: number
  readonly totalFocusMinutes: number
  readonly completedGoalsCount: number
  readonly focusHours: number
  readonly sessionCount: number
  readonly goalsCompleted: number
  readonly missionsCompleted: number
  readonly milestones: readonly Milestone[]
  refreshMetrics: (from?: string, to?: string) => Promise<void>
  checkAndAwardMilestones: () => readonly NewMilestone[]
}

export const useRewardStore = create<RewardStore>((set, get) => ({
  currentStreak: 0,
  longestStreak: 0,
  totalFocusMinutes: 0,
  completedGoalsCount: 0,
  focusHours: 0,
  sessionCount: 0,
  goalsCompleted: 0,
  missionsCompleted: 0,
  milestones: [],

  refreshMetrics: async (from, to) => {
    const fromDate = from ?? format(subYears(new Date(), 1), 'yyyy-MM-dd')
    const toDate = to ?? format(new Date(), 'yyyy-MM-dd')

    const [sessions, allSessions, reviews, goals, missions] = await Promise.all([
      sessionRepository.getSessionsForRange(fromDate, toDate),
      sessionRepository.getAllSessions(),
      reviewRepository.getAllReviews(),
      goalRepository.getDailyGoals(),
      goalRepository.getMonthlyMissions(),
    ])

    const completedSessions = sessions.filter(
      (session) => session.status === 'completed' && session.actualDuration !== null,
    )
    const totalFocusMinutes = completedSessions.reduce(
      (sum, session) => sum + (session.actualDuration ?? 0),
      0,
    )

    const allCompletedSessions = allSessions.filter(
      (session) => session.status === 'completed' && session.actualDuration !== null,
    )
    const reviewDates = new Set(reviews.map((review) => review.date))
    const completedSessionDates = new Set(
      allCompletedSessions.map((session) =>
        format(new Date(session.startedAt), 'yyyy-MM-dd'),
      ),
    )
    const qualifiedDates = [...completedSessionDates].filter((date) =>
      reviewDates.has(date),
    )
    const streak = calculateStreak(qualifiedDates)

    const goalsCompleted = goals.filter((goal) => goal.status === 'completed')
      .length
    const missionsCompleted = missions.filter(
      (mission) => mission.status === 'completed',
    ).length
    const lifetimeFocusMinutes = allCompletedSessions.reduce(
      (sum, session) => sum + (session.actualDuration ?? 0),
      0,
    )
    const focusHours = lifetimeFocusMinutes / 60

    set({
      currentStreak: streak.current,
      longestStreak: streak.longest,
      totalFocusMinutes,
      completedGoalsCount: goalsCompleted,
      focusHours,
      sessionCount: allSessions.length,
      goalsCompleted,
      missionsCompleted,
    })

    const existing = await db.milestones.toArray()
    const newly = checkMilestones({
      sessionCount: allSessions.length,
      currentStreak: streak.current,
      focusHours,
      goalsCompleted,
      existingTypes: existing.map((milestone) => `${milestone.type}:${milestone.value}`),
    })
    if (newly.length > 0) {
      const ids = (await db.milestones.bulkAdd(
        newly as unknown as Milestone[],
      )) as unknown as number[]
      const saved = newly.map((milestone, index) => ({
        ...milestone,
        id: ids[index],
      }))
      set({ milestones: [...existing, ...saved] })
    } else {
      set({ milestones: existing })
    }
  },

  checkAndAwardMilestones: () => {
    const state = get()
    return checkMilestones({
      sessionCount: state.sessionCount,
      currentStreak: state.currentStreak,
      focusHours: state.focusHours,
      goalsCompleted: state.goalsCompleted,
      existingTypes: state.milestones.map((milestone) => `${milestone.type}:${milestone.value}`),
    })
  },
}))
