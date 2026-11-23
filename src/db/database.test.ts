import { describe, expect, test } from 'vitest'
import { validateImportData } from './database'

const emptyBackup = {
  monthlyMissions: [],
  dailyGoals: [],
  subgoals: [],
  focusSessions: [],
  distractions: [],
  dailyReviews: [],
  weeklyReviews: [],
  milestones: [],
  userSettings: [],
}

describe('validateImportData', () => {
  test('accepts a complete empty FocusSpan backup', () => {
    expect(() => validateImportData(emptyBackup)).not.toThrow()
  })

  test('rejects a JSON object with no backup tables', () => {
    expect(() => validateImportData({})).toThrow('Backup is missing monthlyMissions')
  })

  test('rejects a row with an invalid record shape', () => {
    expect(() => validateImportData({ ...emptyBackup, dailyGoals: [{}] })).toThrow(
      'Backup contains an invalid dailyGoals record',
    )
  })
})
