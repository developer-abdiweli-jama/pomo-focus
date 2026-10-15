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
  const focusByDate = new Map<string, { seconds: number; targetMinutes: number; latestStartedAt: string }>()

  for (const session of sessions) {
    if (session.status !== 'completed' && session.status !== 'cancelled') continue

    const dateKey = toDateKey(new Date(session.startedAt))
    const current = focusByDate.get(dateKey)
    const targetMinutes = session.dailyTargetMinutes ?? dailyTargetMinutes
    focusByDate.set(dateKey, {
      seconds: (current?.seconds ?? 0) + session.actualDurationSeconds,
      targetMinutes: current && current.latestStartedAt > session.startedAt ? current.targetMinutes : targetMinutes,
      latestStartedAt: current && current.latestStartedAt > session.startedAt ? current.latestStartedAt : session.startedAt,
    })
  }

  return new Set(
    [...focusByDate.entries()]
      .filter(([, focus]) => focus.seconds >= focus.targetMinutes * 60)
      .map(([dateKey]) => dateKey),
  )
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)

  return toDateKey(date)
}

