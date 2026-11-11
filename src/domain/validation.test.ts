import { describe, expect, test } from 'vitest'
import { validateGoalTitle } from './validation'

describe('validateGoalTitle', () => {
  test('empty string is not ok', () => {
    const result = validateGoalTitle('')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Goal title is required')
  })

  test('whitespace-only string is not ok', () => {
    const result = validateGoalTitle('   ')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Goal title is required')
  })

  test('string shorter than 5 characters is not ok', () => {
    const result = validateGoalTitle('abc')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe(
      'Goal title must be at least 5 characters long',
    )
  })

  test('vague words are not ok', () => {
    for (const word of ['study', 'work', 'learn']) {
      const result = validateGoalTitle(`${word} something`)
      expect(result.ok).toBe(false)
      expect(result.reason).toBe(
        'Goal title is too vague; please be more specific',
      )
    }
  })

  test('code is not ok because it is shorter than 5 characters', () => {
    const result = validateGoalTitle('code')
    expect(result.ok).toBe(false)
  })

  test('a long title containing code but no vague word is ok', () => {
    const result = validateGoalTitle('build code now')
    expect(result.ok).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  test('specific title is ok', () => {
    const result = validateGoalTitle('Finish the async/await exercise')
    expect(result.ok).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  test('allows a specific title that contains a formerly blocked generic verb', () => {
    expect(validateGoalTitle('Review existing records').ok).toBe(true)
  })

  test('returns { ok, reason? } shape', () => {
    const okResult = validateGoalTitle('Finish the async/await exercise')
    expect(typeof okResult.ok).toBe('boolean')
    expect(Object.keys(okResult)).toEqual(['ok'])

    const badResult = validateGoalTitle('')
    expect(typeof badResult.ok).toBe('boolean')
    expect(typeof badResult.reason).toBe('string')
  })
})
