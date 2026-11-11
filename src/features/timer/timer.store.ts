import { create } from 'zustand'

export interface TimerStore {
  readonly isRunning: boolean
  readonly isPaused: boolean
  readonly startedAt: number | null // ms since epoch
  readonly plannedEndAt: number | null // ms since epoch
  readonly plannedDuration: number // minutes
  readonly sessionId: number | null
  readonly pausedAt: number | null // ms since epoch; internal, keeps elapsed accurate across pauses
  start: (plannedDuration: number, sessionId: number, startedAt?: number) => void
  restore: (session: {
    id: number
    startedAt: number
    plannedEndAt: number
    plannedDuration: number
    pausedAt: number | null
    totalPausedTime: number
  }) => void
  extend: (minutes: number) => void
  pause: (pausedAt?: number) => void
  resume: (resumedAt?: number) => void
  tick: () => number // elapsed ms computed from timestamps
  reset: () => void
}

const MILLISECONDS_PER_MINUTE = 60_000

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  isPaused: false,
  startedAt: null,
  plannedEndAt: null,
  plannedDuration: 0,
  sessionId: null,
  pausedAt: null,

  start: (plannedDuration, sessionId, startTime = Date.now()) => {
    set({
      isRunning: true,
      isPaused: false,
      startedAt: startTime,
      plannedEndAt: startTime + plannedDuration * MILLISECONDS_PER_MINUTE,
      plannedDuration,
      sessionId,
      pausedAt: null,
    })
  },

  restore: (session) => {
    set({
      isRunning: session.pausedAt === null,
      isPaused: session.pausedAt !== null,
      startedAt: session.startedAt + session.totalPausedTime,
      plannedEndAt: session.plannedEndAt,
      plannedDuration: session.plannedDuration,
      sessionId: session.id,
      pausedAt: session.pausedAt,
    })
  },

  extend: (minutes) => {
    if (minutes <= 0) return
    set((state) => ({
      plannedDuration: state.plannedDuration + minutes,
      plannedEndAt: state.plannedEndAt === null
        ? null
        : state.plannedEndAt + minutes * MILLISECONDS_PER_MINUTE,
    }))
  },

  pause: (pausedAt = Date.now()) => {
    const { isRunning, isPaused } = get()
    if (!isRunning || isPaused) {
      return
    }
    set({ isRunning: false, isPaused: true, pausedAt })
  },

  resume: (resumedAt = Date.now()) => {
    const { isPaused, startedAt, pausedAt } = get()
    if (!isPaused || startedAt === null || pausedAt === null) {
      return
    }
    const pauseDuration = resumedAt - pausedAt
    const plannedEndAt = get().plannedEndAt
    set({
      isRunning: true,
      isPaused: false,
      startedAt: startedAt + pauseDuration,
      plannedEndAt: plannedEndAt === null ? null : plannedEndAt + pauseDuration,
      pausedAt: null,
    })
  },

  tick: () => {
    const { isRunning, isPaused, startedAt, pausedAt } = get()
    if (startedAt === null) {
      return 0
    }
    const now = Date.now()
    if (isRunning) {
      return now - startedAt
    }
    if (isPaused && pausedAt !== null) {
      return pausedAt - startedAt
    }
    return 0
  },

  reset: () => {
    set({
      isRunning: false,
      isPaused: false,
      startedAt: null,
      plannedEndAt: null,
      plannedDuration: 0,
      sessionId: null,
      pausedAt: null,
    })
  },
}))
