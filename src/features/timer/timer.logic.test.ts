import { describe, expect, it } from 'vitest'
import { formatDuration, getRemainingSeconds } from './timer.logic'

describe('timer logic', () => {
  it('calculates remaining seconds from a real end time', () => {
    const now = new Date('2026-10-15T10:00:00.000Z')
    const plannedEndAt = new Date('2026-10-15T10:12:30.000Z').toISOString()

    expect(getRemainingSeconds(plannedEndAt, now)).toBe(750)
  })

  it('never returns negative remaining time', () => {
    const now = new Date('2026-10-15T11:00:00.000Z')
    const plannedEndAt = new Date('2026-10-15T10:00:00.000Z').toISOString()

    expect(getRemainingSeconds(plannedEndAt, now)).toBe(0)
  })

  it('formats focus time as minutes and seconds', () => {
    expect(formatDuration(50 * 60)).toBe('50:00')
    expect(formatDuration(65)).toBe('01:05')
  })
})
