import { addEntry, db } from '../database'
import { differenceInMinutes, endOfDay, startOfDay } from 'date-fns'
import type { FocusSession } from '../../domain/models'

export async function createFocusSession(
  session: Omit<FocusSession, 'id'>,
): Promise<number> {
  return addEntry(db.focusSessions, session)
}

export async function pauseSession(id: number, pausedAt = Date.now()): Promise<void> {
  const session = await db.focusSessions.get(id)
  if (!session) throw new Error(`Focus session ${id} not found`)
  if (session.status !== 'in_progress' || session.pausedAt !== null) return
  await db.focusSessions.update(id, { pausedAt })
}

export async function resumeSession(id: number, resumedAt = Date.now()): Promise<void> {
  const session = await db.focusSessions.get(id)
  if (!session) throw new Error(`Focus session ${id} not found`)
  if (session.status !== 'in_progress' || session.pausedAt === null) return
  const pauseDuration = Math.max(0, resumedAt - session.pausedAt)
  await db.focusSessions.update(id, {
    pausedAt: null,
    totalPausedTime: session.totalPausedTime + pauseDuration,
    plannedEndAt: session.plannedEndAt + pauseDuration,
  })
}

export async function extendSession(id: number, minutes: number): Promise<void> {
  const session = await db.focusSessions.get(id)
  if (!session) throw new Error(`Focus session ${id} not found`)
  if (session.status !== 'in_progress' || minutes <= 0) return
  await db.focusSessions.update(id, {
    plannedDuration: session.plannedDuration + minutes,
    plannedEndAt: session.plannedEndAt + minutes * 60_000,
  })
}

export async function getSession(id: number): Promise<FocusSession | null> {
  return (await db.focusSessions.get(id)) ?? null
}

export async function updateFocusSession(
  id: number,
  changes: Partial<Omit<FocusSession, 'id'>>,
): Promise<void> {
  await db.focusSessions.update(id, changes)
}

export async function endSession(id: number, endedAt: number): Promise<void> {
  const session = await db.focusSessions.get(id)
  if (!session) {
    throw new Error(`Focus session ${id} not found`)
  }
  const pausedNow = session.pausedAt === null ? 0 : Math.max(0, endedAt - session.pausedAt)
  const actualDuration = Math.max(
    0,
    differenceInMinutes(endedAt - session.totalPausedTime - pausedNow, session.startedAt),
  )
  await db.focusSessions.update(id, {
    endedAt,
    actualDuration,
    pausedAt: null,
    status: 'completed',
  })
}

export async function getSessionsForDay(
  date: string,
): Promise<readonly FocusSession[]> {
  const from = startOfDay(new Date(date)).getTime()
  const to = endOfDay(new Date(date)).getTime()
  const sessions = await db.focusSessions.where('startedAt').between(from, to).toArray()
  return sessions.slice().sort((a, b) => a.startedAt - b.startedAt)
}

export async function getSessionsForRange(
  from: string,
  to: string,
): Promise<readonly FocusSession[]> {
  const fromMs = startOfDay(new Date(from)).getTime()
  const toMs = endOfDay(new Date(to)).getTime()
  const sessions = await db.focusSessions.where('startedAt').between(fromMs, toMs).toArray()
  return sessions.slice().sort((a, b) => a.startedAt - b.startedAt)
}

export async function getAllSessions(): Promise<readonly FocusSession[]> {
  return db.focusSessions.toArray()
}

export async function getActiveSession(): Promise<FocusSession | null> {
  const sessions = await db.focusSessions.where('status').equals('in_progress').toArray()
  if (sessions.length === 0) {
    return null
  }
  return sessions.reduce(
    (latest, session) => (session.startedAt > latest.startedAt ? session : latest),
    sessions[0],
  )
}
