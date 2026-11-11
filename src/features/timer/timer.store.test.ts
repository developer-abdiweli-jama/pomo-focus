import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest'
import { useTimerStore } from './timer.store'

const MIN = 60_000
const now = new Date('2026-01-01T10:00:00Z').getTime()

describe('useTimerStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    useTimerStore.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('start sets isRunning, startedAt and plannedEndAt', () => {
    const store = useTimerStore.getState()
    store.start(25, 1)
    const state = useTimerStore.getState()
    expect(state.isRunning).toBe(true)
    expect(state.isPaused).toBe(false)
    expect(state.startedAt).toBe(now)
    expect(state.plannedEndAt).toBe(now + 25 * MIN)
    expect(state.plannedDuration).toBe(25)
    expect(state.sessionId).toBe(1)
    expect(state.pausedAt).toBeNull()
  })

  test('pause sets isPaused true, isRunning false, pausedAt', () => {
    const store = useTimerStore.getState()
    store.start(25, 1)
    vi.advanceTimersByTime(5 * MIN)
    store.pause()
    const state = useTimerStore.getState()
    expect(state.isRunning).toBe(false)
    expect(state.isPaused).toBe(true)
    expect(state.pausedAt).toBe(now + 5 * MIN)
  })

  test('pause when not running does nothing', () => {
    const store = useTimerStore.getState()
    store.pause()
    expect(useTimerStore.getState().isPaused).toBe(false)
    expect(useTimerStore.getState().isRunning).toBe(false)
  })

  test('resume clears pausedAt and advances startedAt by paused duration', () => {
    const store = useTimerStore.getState()
    store.start(25, 1)
    vi.advanceTimersByTime(5 * MIN)
    store.pause()
    vi.advanceTimersByTime(10 * MIN)
    store.resume()
    const state = useTimerStore.getState()
    expect(state.isRunning).toBe(true)
    expect(state.isPaused).toBe(false)
    expect(state.pausedAt).toBeNull()
    expect(state.startedAt).toBe(now + 10 * MIN)
  })

  test('tick returns elapsed ms while running', () => {
    const store = useTimerStore.getState()
    store.start(25, 1)
    vi.advanceTimersByTime(7 * MIN + 30_000)
    expect(useTimerStore.getState().tick()).toBe(7 * MIN + 30_000)
  })

  test('tick returns elapsed at pause while paused', () => {
    const store = useTimerStore.getState()
    store.start(25, 1)
    vi.advanceTimersByTime(5 * MIN)
    store.pause()
    vi.advanceTimersByTime(10 * MIN)
    expect(useTimerStore.getState().tick()).toBe(5 * MIN)
  })

  test('restores a paused session and adds a new interval when extended', () => {
    const store = useTimerStore.getState()
    store.restore({
      id: 12,
      startedAt: now,
      plannedEndAt: now + 25 * MIN,
      plannedDuration: 25,
      pausedAt: now + 5 * MIN,
      totalPausedTime: 0,
    })
    expect(useTimerStore.getState().isPaused).toBe(true)
    expect(useTimerStore.getState().sessionId).toBe(12)
    store.extend(25)
    expect(useTimerStore.getState().plannedDuration).toBe(50)
    expect(useTimerStore.getState().plannedEndAt).toBe(now + 50 * MIN)
  })

  test('resume extends the deadline by the paused duration', () => {
    const store = useTimerStore.getState()
    store.start(25, 1)
    vi.advanceTimersByTime(5 * MIN)
    store.pause()
    const originalDeadline = useTimerStore.getState().plannedEndAt
    vi.advanceTimersByTime(10 * MIN)
    store.resume()
    expect(useTimerStore.getState().plannedEndAt).toBe(originalDeadline! + 10 * MIN)
  })

  test('tick returns 0 before start', () => {
    expect(useTimerStore.getState().tick()).toBe(0)
  })

  test('reset clears all state', () => {
    const store = useTimerStore.getState()
    store.start(25, 1)
    vi.advanceTimersByTime(5 * MIN)
    store.pause()
    store.reset()
    const state = useTimerStore.getState()
    expect(state.isRunning).toBe(false)
    expect(state.isPaused).toBe(false)
    expect(state.startedAt).toBeNull()
    expect(state.plannedEndAt).toBeNull()
    expect(state.plannedDuration).toBe(0)
    expect(state.sessionId).toBeNull()
    expect(state.pausedAt).toBeNull()
  })
})
