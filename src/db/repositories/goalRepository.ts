import { addEntry, db } from '../database'
import type { DailyGoal, MonthlyMission, Subgoal } from '../../domain/models'

export async function getMonthlyMissions(): Promise<readonly MonthlyMission[]> {
  const missions = await db.monthlyMissions.toArray()
  return missions.slice().sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
}

export async function createMonthlyMission(
  mission: Omit<MonthlyMission, 'id'>,
): Promise<number> {
  return addEntry(db.monthlyMissions, mission)
}

export async function updateMonthlyMission(
  id: number,
  changes: Partial<Omit<MonthlyMission, 'id'>>,
): Promise<void> {
  await db.monthlyMissions.update(id, changes)
}

export async function completeMonthlyMission(id: number): Promise<void> {
  await db.monthlyMissions.update(id, {
    status: 'completed',
    completedAt: Date.now(),
  })
}

export async function getDailyGoals(date?: string): Promise<readonly DailyGoal[]> {
  const goals = date
    ? await db.dailyGoals.where('date').equals(date).toArray()
    : await db.dailyGoals.toArray()
  return goals.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getDailyGoalByDate(
  date: string,
): Promise<DailyGoal | null> {
  return (await db.dailyGoals.where('date').equals(date).first()) ?? null
}

export async function getDailyGoalById(id: number): Promise<DailyGoal | null> {
  return (await db.dailyGoals.get(id)) ?? null
}

export async function createDailyGoal(
  goal: Omit<DailyGoal, 'id'>,
): Promise<number> {
  const existing = await getDailyGoalByDate(goal.date)
  if (existing) throw new Error('This day already has a main goal. Edit or carry it forward instead.')
  return addEntry(db.dailyGoals, goal)
}

export async function updateDailyGoal(
  id: number,
  changes: Partial<Omit<DailyGoal, 'id'>>,
): Promise<void> {
  await db.dailyGoals.update(id, changes)
}

export async function completeDailyGoal(id: number): Promise<void> {
  await db.dailyGoals.update(id, {
    status: 'completed',
    completedAt: Date.now(),
  })
}

export async function cancelDailyGoal(id: number): Promise<void> {
  await db.dailyGoals.update(id, { status: 'cancelled', completedAt: null })
}

export async function carryGoalForward(
  fromDate: string,
  toDate: string,
): Promise<number | null> {
  const goal = await getDailyGoalByDate(fromDate)
  if (!goal || goal.status === 'completed' || goal.status === 'carried_over' || goal.status === 'cancelled') {
    return null
  }
  const targetGoal = await getDailyGoalByDate(toDate)
  if (targetGoal) return targetGoal.id
  return db.transaction('rw', [db.dailyGoals, db.subgoals], async () => {
    await db.dailyGoals.update(goal.id, { status: 'carried_over' })
    const newId = await addEntry(db.dailyGoals, {
      monthlyMissionId: goal.monthlyMissionId,
      title: `${goal.title} (carried over)`,
      date: toDate,
      status: 'planned',
      isCarryOver: true,
      completedAt: null,
      createdAt: Date.now(),
    })
    const subgoals = await getSubgoals(goal.id)
    for (const subgoal of subgoals) {
      await addEntry(db.subgoals, {
        dailyGoalId: newId,
        title: subgoal.title,
        status: subgoal.status,
        completedAt: subgoal.completedAt,
        order: subgoal.order,
      })
    }
    return newId
  })
}

export async function getSubgoals(
  dailyGoalId: number,
): Promise<readonly Subgoal[]> {
  const subgoals = await db.subgoals
    .where('dailyGoalId')
    .equals(dailyGoalId)
    .toArray()
  return subgoals.slice().sort((a, b) => a.order - b.order)
}

export async function createSubgoal(
  subgoal: Omit<Subgoal, 'id'>,
): Promise<number> {
  return addEntry(db.subgoals, subgoal)
}

export async function updateSubgoal(
  id: number,
  changes: Partial<Omit<Subgoal, 'id'>>,
): Promise<void> {
  await db.subgoals.update(id, changes)
}

export async function completeSubgoal(id: number): Promise<void> {
  await db.subgoals.update(id, {
    status: 'completed',
    completedAt: Date.now(),
  })
}
