import { create } from 'zustand'
import type { DailyGoal, MonthlyMission, Subgoal } from '../../domain/models'
import * as goalRepository from '../../db/repositories/goalRepository'
import { validateGoalTitle } from '../../domain/validation'
import { format } from 'date-fns'

export interface GoalStore {
  readonly monthlyMissions: readonly MonthlyMission[]
  readonly dailyGoals: readonly DailyGoal[]
  readonly subgoals: readonly Subgoal[]
  readonly selectedDailyGoal: DailyGoal | null
  readonly isLoading: boolean
  init: () => Promise<void>
  loadMissions: () => Promise<void>
  loadToday: (date?: string) => Promise<void>
  setSelectedGoal: (goal: DailyGoal | null) => void
  createMission: (input: {
    readonly title: string
    readonly description: string
    readonly startDate: string
    readonly targetDate: string
  }) => Promise<number>
  createDailyGoal: (input: {
    readonly title: string
    readonly monthlyMissionId: number | null
    readonly date: string
  }) => Promise<number>
  addSubgoal: (input: { readonly dailyGoalId: number; readonly title: string }) => Promise<number>
  toggleSubgoal: (id: number) => Promise<void>
  completeGoal: (id: number) => Promise<void>
  editDailyGoal: (id: number, title: string) => Promise<void>
  cancelGoal: (id: number) => Promise<void>
  completeMission: (id: number) => Promise<void>
  carryGoalForward: (fromDate: string, toDate: string) => Promise<void>
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  monthlyMissions: [],
  dailyGoals: [],
  subgoals: [],
  selectedDailyGoal: null,
  isLoading: false,

  init: async () => {
    set({ isLoading: true })
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      await get().loadToday(today)
      await get().loadMissions()
    } finally {
      set({ isLoading: false })
    }
  },

  loadMissions: async () => {
    const missions = await goalRepository.getMonthlyMissions()
    set({ monthlyMissions: missions })
  },

  loadToday: async (date = format(new Date(), 'yyyy-MM-dd')) => {
    const goals = await goalRepository.getDailyGoals(date)
    const selected = goals.length > 0 ? goals[0] : null
    set({ dailyGoals: goals, selectedDailyGoal: selected, subgoals: [] })
    if (selected) {
      const subgoals = await goalRepository.getSubgoals(selected.id)
      set({ subgoals })
    }
  },

  setSelectedGoal: (goal) => set({ selectedDailyGoal: goal }),

  createMission: async (input) => {
    const validation = validateGoalTitle(input.title)
    if (!validation.ok) {
      throw new Error(validation.reason ?? 'Invalid goal title')
    }
    const id = await goalRepository.createMonthlyMission({
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      targetDate: input.targetDate,
      status: 'planned',
      createdAt: Date.now(),
      completedAt: null,
    })
    await get().loadMissions()
    return id
  },

  createDailyGoal: async (input) => {
    const validation = validateGoalTitle(input.title)
    if (!validation.ok) {
      throw new Error(validation.reason ?? 'Invalid goal title')
    }
    if (await goalRepository.getDailyGoalByDate(input.date)) {
      throw new Error('This day already has a main goal. Edit or carry it forward instead.')
    }
    const id = await goalRepository.createDailyGoal({
      monthlyMissionId: input.monthlyMissionId,
      title: input.title,
      date: input.date,
      status: 'planned',
      isCarryOver: false,
      completedAt: null,
      createdAt: Date.now(),
    })
    await get().loadToday(input.date)
    return id
  },

  addSubgoal: async (input) => {
    const existing = get().subgoals.filter(
      (subgoal) => subgoal.dailyGoalId === input.dailyGoalId,
    )
    const order =
      existing.length > 0
        ? Math.max(...existing.map((subgoal) => subgoal.order)) + 1
        : 1
    const id = await goalRepository.createSubgoal({
      dailyGoalId: input.dailyGoalId,
      title: input.title,
      status: 'planned',
      completedAt: null,
      order,
    })
    const subgoals = await goalRepository.getSubgoals(input.dailyGoalId)
    set({
      subgoals: [
        ...get().subgoals.filter(
          (subgoal) => subgoal.dailyGoalId !== input.dailyGoalId,
        ),
        ...subgoals,
      ],
    })
    return id
  },

  toggleSubgoal: async (id) => {
    const subgoal = get().subgoals.find((subgoal) => subgoal.id === id)
    if (!subgoal) {
      return
    }
    const isCompleting = subgoal.status !== 'completed'
    const updated: Subgoal = {
      ...subgoal,
      status: isCompleting ? 'completed' : 'planned',
      completedAt: isCompleting ? Date.now() : null,
    }
    set({
      subgoals: get().subgoals.map((subgoal) =>
        subgoal.id === id ? updated : subgoal,
      ),
    })
    await goalRepository.updateSubgoal(id, {
      status: updated.status,
      completedAt: updated.completedAt,
    })
  },

  completeGoal: async (id) => {
    set({
      dailyGoals: get().dailyGoals.map((goal) =>
        goal.id === id
          ? { ...goal, status: 'completed', completedAt: Date.now() }
          : goal,
      ),
    })
    await goalRepository.completeDailyGoal(id)
  },

  editDailyGoal: async (id, title) => {
    const validation = validateGoalTitle(title)
    if (!validation.ok) throw new Error(validation.reason ?? 'Invalid goal title')
    await goalRepository.updateDailyGoal(id, { title: title.trim() })
    await get().loadToday(get().dailyGoals.find((goal) => goal.id === id)?.date)
  },

  cancelGoal: async (id) => {
    await goalRepository.cancelDailyGoal(id)
    await get().loadToday(get().dailyGoals.find((goal) => goal.id === id)?.date)
  },

  completeMission: async (id) => {
    await goalRepository.completeMonthlyMission(id)
    await get().loadMissions()
  },

  carryGoalForward: async (fromDate, toDate) => {
    const newId = await goalRepository.carryGoalForward(fromDate, toDate)
    if (newId === null) {
      return
    }
    await get().loadToday(fromDate)
    await get().loadToday(toDate)
  },
}))

// Load today's data on store initialization. IndexedDB is unavailable in some
// environments (e.g. jsdom), so failures are swallowed and the store stays
// empty until loadToday/loadMissions is called again.
void useGoalStore.getState().init().catch(() => {
  // Intentionally empty: IndexedDB may not be available in this environment.
})
