import { db } from '../database'
import type { Distraction, EntityId } from '../../domain/models'
import { requireText } from '../../domain/validation'
import { createId } from '../../lib/ids'

export async function recordDistraction(
  sessionId: EntityId,
  note: string,
): Promise<Distraction> {
  const distraction: Distraction = {
    id: createId(),
    sessionId,
    note: requireText(note, 'Distraction note'),
    occurredAt: new Date().toISOString(),
  }

  await db.distractions.add(distraction)
  return distraction
}

export async function listDistractionsForSession(
  sessionId: EntityId,
): Promise<Distraction[]> {
  return db.distractions.where('sessionId').equals(sessionId).sortBy('occurredAt')
}
