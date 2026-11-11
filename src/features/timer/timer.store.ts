import { create } from 'zustand'

export interface TimerStore {
  readonly isRunning: boolean
  readonly isPaused: boolean
  readonly startedAt: number | null // ms since epoch
  readonly plannedEndAt: number | null // ms since epoch
  readonly plannedDuration: number // minutes
  readonly sessionId: number | null
  readonly pausedAt: number | null // ms since epoch; internal, keeps elapsed accurate across pauses
  readonly activeBreak: { readonly startedAt: number; readonly endAt: number; readonly duration: number } | null
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
  startBreak: (duration: number, startedAt?: number) => void
  clearBreak: () => void
  reset: () => void
}

const MILLISECONDS_PER_MINUTE = 60_000
const BREAK_STORAGE_KEY = 'pomo-focus-active-break'

function readActiveBreak(): TimerStore['activeBreak'] {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(BREAK_STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as { startedAt?: unknown; endAt?: unknown; duration?: unknown }
    if (typeof value.startedAt !== 'number' || typeof value.endAt !== 'number' || typeof value.duration !== 'number') return null
    return { startedAt: value.startedAt, endAt: value.endAt, duration: value.duration }
  } catch {
    return null
  }
}

function writeActiveBreak(activeBreak: TimerStore['activeBreak']) {
  if (typeof window === 'undefined') return
  try {
    if (activeBreak) window.localStorage.setItem(BREAK_STORAGE_KEY, JSON.stringify(activeBreak))
    else window.localStorage.removeItem(BREAK_STORAGE_KEY)
  } catch {
    // The break remains available for this page session if browser storage is unavailable.
  }
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  isPaused: false,
  startedAt: null,
  plannedEndAt: null,
  plannedDuration: 0,
  sessionId: null,
  pausedAt: null,
  activeBreak: readActiveBreak(),

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

  startBreak: (duration, startedAt = Date.now()) => {
    const activeBreak = { startedAt, endAt: startedAt + duration * MILLISECONDS_PER_MINUTE, duration }
    writeActiveBreak(activeBreak)
    set({ activeBreak })
  },

  clearBreak: () => {
    writeActiveBreak(null)
    set({ activeBreak: null })
  },

  reset: () => {
    writeActiveBreak(null)
    set({
      isRunning: false,
      isPaused: false,
      startedAt: null,
      plannedEndAt: null,
      plannedDuration: 0,
      sessionId: null,
      pausedAt: null,
      activeBreak: null,
    })
  },
}))
