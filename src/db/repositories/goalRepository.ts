import { db } from '../database'
import type {
  DailyGoal,
  EntityId,
  MonthlyMission,
  NewDailyGoal,
  NewMonthlyMission,
  NewSubgoal,
  Subgoal,
} from '../../domain/models'
import { requireDateRange, requireText } from '../../domain/validation'
import { createId } from '../../lib/ids'

export async function createMonthlyMission(
  input: NewMonthlyMission,
): Promise<MonthlyMission> {
  const title = requireText(input.title, 'Mission title')
  requireDateRange(input.startDate, input.targetDate)

  const mission: MonthlyMission = {
    ...input,
    id: createId(),
    title,
    description: input.description.trim(),
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  await db.monthlyMissions.add(mission)
  return mission
}

export async function updateMonthlyMission(
  id: EntityId,
  input: NewMonthlyMission,
): Promise<void> {
  const title = requireText(input.title, 'Mission title')
  requireDateRange(input.startDate, input.targetDate)

  await db.monthlyMissions.update(id, {
    title,
    description: input.description.trim(),
    startDate: input.startDate,
    targetDate: input.targetDate,
  })
}

export async function createDailyGoal(input: NewDailyGoal): Promise<DailyGoal> {
  const goal = buildDailyGoal(input)

  await db.dailyGoals.add(goal)
  return goal
}

type DailyGoalWithSubgoalsInput = NewDailyGoal & {
  subgoalTitles: string[]
}

export async function createDailyGoalWithSubgoals(
  input: DailyGoalWithSubgoalsInput,
): Promise<{ goal: DailyGoal; subgoals: Subgoal[] }> {
  const goal = buildDailyGoal(input)
  const subgoals = input.subgoalTitles.map((title, index) => ({
    id: createId(),
    dailyGoalId: goal.id,
    title: requireText(title, 'Subgoal title'),
    order: index,
    status: 'planned' as const,
    createdAt: new Date().toISOString(),
  }))

  await db.transaction('rw', db.dailyGoals, db.subgoals, async () => {
    await db.dailyGoals.add(goal)
    await db.subgoals.bulkAdd(subgoals)
  })

  return { goal, subgoals }
}

function buildDailyGoal(input: NewDailyGoal): DailyGoal {
  return {
    ...input,
    id: createId(),
    title: requireText(input.title, 'Goal title'),
    status: 'planned',
    isCarryOver: false,
    carryOverCount: 0,
    createdAt: new Date().toISOString(),
  }
}

export async function getGoalForDate(date: string): Promise<DailyGoal | undefined> {
  return db.dailyGoals.where('date').equals(date).first()
}

export async function linkGoalToMission(
  goalId: EntityId,
  monthlyMissionId: EntityId,
): Promise<void> {
  await db.dailyGoals.update(goalId, { monthlyMissionId })
}

export async function unlinkGoalFromMission(goalId: EntityId): Promise<void> {
  await db.dailyGoals.update(goalId, { monthlyMissionId: undefined })
}

export async function listSubgoals(dailyGoalId: EntityId): Promise<Subgoal[]> {
  return db.subgoals.where('dailyGoalId').equals(dailyGoalId).sortBy('order')
}

export async function addSubgoal(input: NewSubgoal): Promise<Subgoal> {
  const subgoal: Subgoal = {
    ...input,
    id: createId(),
    title: requireText(input.title, 'Subgoal title'),
    status: 'planned',
    createdAt: new Date().toISOString(),
  }

  await db.subgoals.add(subgoal)
  await syncDailyGoalStatus(input.dailyGoalId)
  return subgoal
}

export async function completeSubgoal(id: EntityId): Promise<void> {
  await toggleSubgoal(id, true)
}

export async function toggleSubgoal(
  id: EntityId,
  completed?: boolean,
): Promise<void> {
  const subgoal = await db.subgoals.get(id)

  if (!subgoal) {
    throw new Error('Cannot update a subgoal that does not exist.')
  }

  const shouldComplete = completed ?? subgoal.status !== 'completed'
  await db.subgoals.update(id, {
    status: shouldComplete ? 'completed' : 'planned',
    completedAt: shouldComplete ? new Date().toISOString() : undefined,
  })
  await syncDailyGoalStatus(subgoal.dailyGoalId)
}

export async function updateSubgoalTitle(
  id: EntityId,
  title: string,
): Promise<void> {
  await db.subgoals.update(id, {
    title: requireText(title, 'Subgoal title'),
  })
}

export async function syncDailyGoalStatus(dailyGoalId: EntityId): Promise<void> {
  const [goal, subgoals] = await Promise.all([
    db.dailyGoals.get(dailyGoalId),
    listSubgoals(dailyGoalId),
  ])

  if (!goal || goal.status === 'cancelled' || goal.status === 'carried_over') {
    return
  }

  const completedCount = subgoals.filter((subgoal) => subgoal.status === 'completed').length
  const nextStatus = subgoals.length > 0 && completedCount === subgoals.length
    ? 'completed'
    : completedCount > 0
      ? 'in_progress'
      : 'planned'
  const nextCompletedAt = nextStatus === 'completed'
    ? goal.completedAt ?? new Date().toISOString()
    : undefined

  if (goal.status !== nextStatus || goal.completedAt !== nextCompletedAt) {
    await db.dailyGoals.update(dailyGoalId, {
      status: nextStatus,
      completedAt: nextCompletedAt,
    })
  }
}

export async function completeDailyGoal(id: EntityId): Promise<void> {
  await db.dailyGoals.update(id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  })
}

export async function carryGoalForward(
  id: EntityId,
  newDate: string,
): Promise<DailyGoal> {
  const originalGoal = await db.dailyGoals.get(id)

  if (!originalGoal) {
    throw new Error('Cannot carry forward a goal that does not exist.')
  }

  const carriedGoal: DailyGoal = {
    ...originalGoal,
    id: createId(),
    date: newDate,
    status: 'planned',
    isCarryOver: true,
    carriedFromGoalId: originalGoal.id,
    carryOverCount: originalGoal.carryOverCount + 1,
    createdAt: new Date().toISOString(),
    completedAt: undefined,
  }

  await db.transaction('rw', db.dailyGoals, async () => {
    await db.dailyGoals.update(originalGoal.id, { status: 'carried_over' })
    await db.dailyGoals.add(carriedGoal)
  })

  return carriedGoal
}
