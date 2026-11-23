import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'

export interface StreakResult {
  readonly current: number
  readonly longest: number
}

export function calculateStreak(
  qualifiedDates: readonly string[],
): StreakResult {
  let longest = 0
  let run = 0
  let previous: string | null = null
  const dates = [...new Set(qualifiedDates)].sort()
  for (const date of dates) {
    if (previous === null || differenceInCalendarDays(parseISO(date), parseISO(previous)) === 1) {
      run += 1
    } else {
      run = 1
    }
    if (run > longest) {
      longest = run
    }
    previous = date
  }

  let current = 0
  let date = format(new Date(), 'yyyy-MM-dd')
  const qualified = new Set(dates)
  while (qualified.has(date)) {
    current += 1
    date = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')
  }

  return { current, longest }
}

export function qualifyDay(params: {
  readonly hasCompletedSession: boolean
  readonly hasReview: boolean
}): boolean {
  return params.hasCompletedSession && params.hasReview
}
