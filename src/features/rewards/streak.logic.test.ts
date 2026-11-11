import { describe, expect, test } from 'vitest'
import { format, subDays } from 'date-fns'
import { calculateStreak } from './streak.logic'

const today = new Date()
const todayStr = format(today, 'yyyy-MM-dd')
const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd')
const twoDaysAgoStr = format(subDays(today, 2), 'yyyy-MM-dd')
const fiveDaysAgoStr = format(subDays(today, 5), 'yyyy-MM-dd')
const sixDaysAgoStr = format(subDays(today, 6), 'yyyy-MM-dd')
const sevenDaysAgoStr = format(subDays(today, 7), 'yyyy-MM-dd')

describe('calculateStreak', () => {
  test('empty array returns current 0 and longest 0', () => {
    expect(calculateStreak([])).toEqual({ current: 0, longest: 0 })
  })

  test('single date returns current 1 and longest 1', () => {
    expect(calculateStreak([todayStr])).toEqual({ current: 1, longest: 1 })
  })

  test('consecutive days increment current and longest', () => {
    expect(
      calculateStreak([twoDaysAgoStr, yesterdayStr, todayStr]),
    ).toEqual({ current: 3, longest: 3 })
  })

  test('a gap breaks current but longest keeps the best run', () => {
    expect(
      calculateStreak([
        todayStr,
        yesterdayStr,
        fiveDaysAgoStr,
        sixDaysAgoStr,
        sevenDaysAgoStr,
      ]),
    ).toEqual({ current: 2, longest: 3 })
  })

  test('today plus yesterday returns current 2', () => {
    expect(calculateStreak([yesterdayStr, todayStr])).toEqual({
      current: 2,
      longest: 2,
    })
  })

  test('duplicate dates do not double count', () => {
    expect(
      calculateStreak([todayStr, todayStr, yesterdayStr, yesterdayStr]),
    ).toEqual({ current: 2, longest: 2 })
  })

  test('dates out of order still work', () => {
    expect(calculateStreak([todayStr, twoDaysAgoStr, yesterdayStr])).toEqual({
      current: 3,
      longest: 3,
    })
  })
})
