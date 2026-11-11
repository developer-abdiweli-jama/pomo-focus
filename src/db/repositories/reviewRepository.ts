import { addEntry, db } from '../database'
import type { DailyReview } from '../../domain/models'

export async function saveDailyReview(
  review: Omit<DailyReview, 'id'>,
): Promise<number> {
  const existing = await db.dailyReviews.where('date').equals(review.date).first()
  if (existing) {
    await db.dailyReviews.update(existing.id, review)
    return existing.id
  }
  return addEntry(db.dailyReviews, review)
}

export async function getReview(date: string): Promise<DailyReview | null> {
  return (await db.dailyReviews.where('date').equals(date).first()) ?? null
}

export async function getReviewsForRange(
  from: string,
  to: string,
): Promise<readonly DailyReview[]> {
  const reviews = await db.dailyReviews.where('date').between(from, to, true, true).toArray()
  return reviews.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
}

export async function getAllReviews(): Promise<readonly DailyReview[]> {
  return db.dailyReviews.toArray()
}
