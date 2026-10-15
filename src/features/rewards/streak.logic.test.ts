import { describe, expect, it } from 'vitest'
import type { FocusSession } from '../../domain/models'
import { calculateCurrentStreak } from './streak.logic'

function session(id: string, startedAt: string, actualDurationSeconds: number): FocusSession {
  return {
    id,
    dailyGoalId: `goal-${id}`,
    startedAt,
    plannedEndAt: startedAt,
    endedAt: startedAt,
    plannedDurationSeconds: actualDurationSeconds,
    actualDurationSeconds,
    totalPausedSeconds: 0,
    status: 'completed',
  }
}

describe('calculateCurrentStreak', () => {
  it('counts consecutive days that reach the daily target', () => {
    const sessions = [
      session('one', '2026-10-13T08:00:00.000Z', 50 * 60),
      session('two', '2026-10-14T08:00:00.000Z', 25 * 60),
      session('three', '2026-10-14T09:00:00.000Z', 25 * 60),
      session('four', '2026-10-15T08:00:00.000Z', 50 * 60),
    ]

    expect(calculateCurrentStreak(sessions, 50, '2026-10-15')).toBe(3)
  })

  it('keeps yesterday qualifying while today is still in progress', () => {
    const sessions = [session('one', '2026-10-14T08:00:00.000Z', 50 * 60)]

    expect(calculateCurrentStreak(sessions, 50, '2026-10-15')).toBe(1)
  })

  it('does not count a day below the target', () => {
    const sessions = [session('one', '2026-10-15T08:00:00.000Z', 49 * 60)]

    expect(calculateCurrentStreak(sessions, 50, '2026-10-15')).toBe(0)
  })
})
