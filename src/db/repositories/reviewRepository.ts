import { db } from '../database'
import type { DailyReview, WeeklyReview } from '../../domain/models'
import { createId } from '../../lib/ids'

type SaveDailyReviewInput = Pick<
  DailyReview,
  'date' | 'focusMinutes' | 'completedGoal' | 'distractionCount'
> & {
  reflection: string
}

export async function saveDailyReview(
  input: SaveDailyReviewInput,
): Promise<DailyReview> {
  const now = new Date().toISOString()
  const existingReview = await db.dailyReviews.where('date').equals(input.date).first()
  const review: DailyReview = {
    ...input,
    id: existingReview?.id ?? createId(),
    reflection: input.reflection.trim(),
    createdAt: existingReview?.createdAt ?? now,
    updatedAt: now,
  }

  await db.dailyReviews.put(review)
  return review
}

export async function getDailyReview(date: string): Promise<DailyReview | undefined> {
  return db.dailyReviews.where('date').equals(date).first()
}

type SaveWeeklyReviewInput = Pick<WeeklyReview, 'weekStart' | 'weekEnd'> & {
  reflection: string
}

export async function saveWeeklyReview(
  input: SaveWeeklyReviewInput,
): Promise<WeeklyReview> {
  const now = new Date().toISOString()
  const existingReview = await db.weeklyReviews.where('weekStart').equals(input.weekStart).first()
  const review: WeeklyReview = {
    ...input,
    id: existingReview?.id ?? createId(),
    reflection: input.reflection.trim(),
    createdAt: existingReview?.createdAt ?? now,
    updatedAt: now,
  }

  await db.weeklyReviews.put(review)
  return review
}

export async function getWeeklyReview(weekStart: string): Promise<WeeklyReview | undefined> {
  return db.weeklyReviews.where('weekStart').equals(weekStart).first()
}
