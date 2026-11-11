import { addEntry, db } from '../database'
import { endOfDay, startOfDay } from 'date-fns'
import type { Distraction } from '../../domain/models'

export async function saveDistraction(
  distraction: Omit<Distraction, 'id'>,
): Promise<number> {
  return addEntry(db.distractions, distraction)
}

export async function getDistractionsForSession(
  sessionId: number,
): Promise<readonly Distraction[]> {
  const distractions = await db.distractions
    .where('sessionId')
    .equals(sessionId)
    .toArray()
  return distractions.slice().sort((a, b) => a.occurredAt - b.occurredAt)
}

export async function getDistractionsForDay(
  date: string,
): Promise<readonly Distraction[]> {
  const from = startOfDay(new Date(date)).getTime()
  const to = endOfDay(new Date(date)).getTime()
  return db.distractions.where('occurredAt').between(from, to).toArray()
}

export async function getDistractionsForRange(
  fromDate: string,
  toDate: string,
): Promise<readonly Distraction[]> {
  const from = startOfDay(new Date(fromDate)).getTime()
  const to = endOfDay(new Date(toDate)).getTime()
  return db.distractions.where('occurredAt').between(from, to, true, true).toArray()
}

export async function countDistractionsForRange(
  from: string,
  to: string,
): Promise<number> {
  const fromMs = startOfDay(new Date(from)).getTime()
  const toMs = endOfDay(new Date(to)).getTime()
  return db.distractions.where('occurredAt').between(fromMs, toMs).count()
}
