import { startOfDay } from 'date-fns'

// One day in milliseconds.
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export interface StreakResult {
  readonly current: number
  readonly longest: number
}

export function calculateStreak(
  qualifiedDates: readonly string[],
): StreakResult {
  const stamps = new Set(
    Array.from(new Set(qualifiedDates)).map(
      (date) => startOfDay(new Date(date)).getTime(),
    ),
  )

  let longest = 0
  let run = 0
  let previous: number | null = null
  for (const stamp of [...stamps].sort((a, b) => a - b)) {
    if (previous === null || stamp === previous + MILLISECONDS_PER_DAY) {
      run += 1
    } else {
      run = 1
    }
    if (run > longest) {
      longest = run
    }
    previous = stamp
  }

  let current = 0
  let stamp = startOfDay(new Date()).getTime()
  while (stamps.has(stamp)) {
    current += 1
    stamp -= MILLISECONDS_PER_DAY
  }

  return { current, longest }
}

export function qualifyDay(params: {
  readonly hasCompletedSession: boolean
  readonly hasReview: boolean
}): boolean {
  return params.hasCompletedSession && params.hasReview
}
