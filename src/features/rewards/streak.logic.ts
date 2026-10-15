import type { FocusSession } from '../../domain/models'
import { toDateKey } from '../../lib/dates'

export function calculateCurrentStreak(
  sessions: FocusSession[],
  dailyTargetMinutes: number,
  today: string,
): number {
  const qualifiedDates = getQualifiedDates(sessions, dailyTargetMinutes)
  let cursor = today

  if (!qualifiedDates.has(cursor)) {
    cursor = shiftDateKey(cursor, -1)
  }

  let streak = 0
  while (qualifiedDates.has(cursor)) {
    streak += 1
    cursor = shiftDateKey(cursor, -1)
  }

  return streak
}

function getQualifiedDates(sessions: FocusSession[], dailyTargetMinutes: number): Set<string> {
  const focusSecondsByDate = new Map<string, number>()

  for (const session of sessions) {
    if (session.status !== 'completed') continue

    const dateKey = toDateKey(new Date(session.startedAt))
    focusSecondsByDate.set(dateKey, (focusSecondsByDate.get(dateKey) ?? 0) + session.actualDurationSeconds)
  }

  const targetSeconds = dailyTargetMinutes * 60
  return new Set(
    [...focusSecondsByDate.entries()]
      .filter(([, focusSeconds]) => focusSeconds >= targetSeconds)
      .map(([dateKey]) => dateKey),
  )
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)

  return toDateKey(date)
}

