import { db } from '../database'
import type {
  FocusSession,
  EntityId,
  NewFocusSession,
} from '../../domain/models'
import { requirePositiveNumber } from '../../domain/validation'
import { createId } from '../../lib/ids'

export async function startFocusSession(
  input: NewFocusSession,
): Promise<FocusSession> {
  requirePositiveNumber(input.plannedDurationSeconds, 'Focus duration')

  const startedAt = new Date()
  const session: FocusSession = {
    ...input,
    id: createId(),
    startedAt: startedAt.toISOString(),
    plannedEndAt: new Date(
      startedAt.getTime() + input.plannedDurationSeconds * 1000,
    ).toISOString(),
    plannedDurationSeconds: input.plannedDurationSeconds,
    actualDurationSeconds: 0,
    totalPausedSeconds: 0,
    status: 'running',
  }

  await db.focusSessions.add(session)
  return session
}

export async function pauseFocusSession(id: EntityId): Promise<void> {
  const session = await db.focusSessions.get(id)

  if (!session || session.status !== 'running') {
    throw new Error('This focus session is not running.')
  }

  const pausedAt = new Date()
  const remainingSeconds = Math.max(
    0,
    Math.ceil((new Date(session.plannedEndAt).getTime() - pausedAt.getTime()) / 1000),
  )

  await db.focusSessions.update(id, {
    status: 'paused',
    pausedAt: pausedAt.toISOString(),
    plannedEndAt: new Date(pausedAt.getTime() + remainingSeconds * 1000).toISOString(),
  })
}

export async function resumeFocusSession(id: EntityId): Promise<FocusSession> {
  const session = await db.focusSessions.get(id)

  if (!session || !session.pausedAt) {
    throw new Error('This focus session is not paused.')
  }

  const resumedAt = new Date()
  const pausedSeconds = Math.max(
    0,
    Math.round((resumedAt.getTime() - new Date(session.pausedAt).getTime()) / 1000),
  )
  const remainingSeconds = Math.max(
    0,
    Math.ceil((new Date(session.plannedEndAt).getTime() - new Date(session.pausedAt).getTime()) / 1000),
  )
  const plannedEndAt = new Date(resumedAt.getTime() + remainingSeconds * 1000).toISOString()

  await db.focusSessions.update(id, {
    status: 'running',
    pausedAt: undefined,
    plannedEndAt,
    totalPausedSeconds: session.totalPausedSeconds + pausedSeconds,
  })

  return {
    ...session,
    status: 'running',
    pausedAt: undefined,
    plannedEndAt,
    totalPausedSeconds: session.totalPausedSeconds + pausedSeconds,
  }
}

export async function completeFocusSession(
  id: EntityId,
  actualDurationSeconds: number,
): Promise<void> {
  requirePositiveNumber(actualDurationSeconds, 'Actual focus duration')

  await db.focusSessions.update(id, {
    status: 'completed',
    endedAt: new Date().toISOString(),
    actualDurationSeconds,
  })
}

export async function cancelFocusSession(id: EntityId): Promise<void> {
  await db.focusSessions.update(id, {
    status: 'cancelled',
    endedAt: new Date().toISOString(),
  })
}
