import { addEntry, db } from '../database'
import type { WeeklyReview } from '../../domain/models'

export async function saveWeeklyReview(
  review: Omit<WeeklyReview, 'id'>,
): Promise<number> {
  const existing = await db.weeklyReviews.where('date').equals(review.date).first()
  if (existing) {
    await db.weeklyReviews.update(existing.id, review)
    return existing.id
  }
  return addEntry(db.weeklyReviews, review)
}

export async function getWeeklyReview(date: string): Promise<WeeklyReview | null> {
  return (await db.weeklyReviews.where('date').equals(date).first()) ?? null
}

export async function getWeeklyReviewsForRange(
  from: string,
  to: string,
): Promise<readonly WeeklyReview[]> {
  const reviews = await db.weeklyReviews.where('date').between(from, to, true, true).toArray()
  return reviews.slice().sort((a, b) => a.date.localeCompare(b.date))
}
