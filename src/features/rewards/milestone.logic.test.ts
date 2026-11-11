import { describe, expect, test } from 'vitest'
import { checkMilestones } from './milestone.logic'

const baseInput = {
  sessionCount: 0,
  currentStreak: 0,
  focusHours: 0,
  goalsCompleted: 0,
  existingTypes: [] as const,
}

describe('checkMilestones', () => {
  test('awards session milestone when sessionCount >= 1', () => {
    const result = checkMilestones({ ...baseInput, sessionCount: 1 })
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      type: 'session',
      value: 1,
      title: 'First session',
      achievedAt: expect.any(Number),
    })
  })

  test('does not re-award session when already in existingTypes', () => {
    const result = checkMilestones({
      ...baseInput,
      sessionCount: 5,
      existingTypes: ['session'],
    })
    expect(result).toEqual([])
  })

  test('awards streak threshold 3 when currentStreak >= 3', () => {
    const result = checkMilestones({ ...baseInput, currentStreak: 3 })
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      type: 'streak',
      value: 3,
      title: '3-day streak',
      achievedAt: expect.any(Number),
    })
  })

  test('awards streak thresholds 3 and 7 when currentStreak >= 7', () => {
    const result = checkMilestones({ ...baseInput, currentStreak: 7 })
    const streaks = result.filter((m) => m.type === 'streak')
    expect(streaks.map((m) => m.value)).toEqual([3, 7])
  })

  test('awards a higher streak threshold when the lower one already exists', () => {
    const result = checkMilestones({
      ...baseInput,
      currentStreak: 7,
      existingTypes: ['streak:3'],
    })
    expect(result.filter((milestone) => milestone.type === 'streak').map((m) => m.value)).toEqual([7])
  })

  test('awards focus milestone when focusHours >= 5', () => {
    const result = checkMilestones({ ...baseInput, focusHours: 5 })
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      type: 'focus',
      value: 5,
      title: '5 focus hours',
      achievedAt: expect.any(Number),
    })
  })

  test('awards goal milestone when goalsCompleted >= 5', () => {
    const result = checkMilestones({ ...baseInput, goalsCompleted: 5 })
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      type: 'goal',
      value: 5,
      title: '5 completed goals',
      achievedAt: expect.any(Number),
    })
  })

  test('does not re-award types already in existingTypes', () => {
    const result = checkMilestones({
      sessionCount: 10,
      currentStreak: 10,
      focusHours: 10,
      goalsCompleted: 10,
      existingTypes: ['session', 'streak', 'focus', 'goal'],
    })
    expect(result).toEqual([])
  })

  test('returns empty array when nothing reached', () => {
    const result = checkMilestones({ ...baseInput })
    expect(result).toEqual([])
  })
})
