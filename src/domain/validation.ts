export interface ValidationResult {
  readonly ok: boolean
  readonly reason?: string
}

// Reject generic titles while allowing those words in specific tasks such as
// "Review existing records" or "Write the session repository tests".
const VAGUE_TITLES: readonly string[] = [
  'study', 'study something',
  'work', 'working', 'work something', 'work on something',
  'learn', 'learning', 'learn something',
  'practice', 'practice something',
  'review', 'review something',
  'read', 'read something',
  'write', 'write something',
]

export function validateGoalTitle(title: string): ValidationResult {
  const trimmed = title.trim()

  if (trimmed.length === 0) {
    return { ok: false, reason: 'Goal title is required' }
  }

  if (trimmed.length < 5) {
    return {
      ok: false,
      reason: 'Goal title must be at least 5 characters long',
    }
  }

  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ')
  if (VAGUE_TITLES.includes(normalized)) {
    return {
      ok: false,
      reason: 'Goal title is too vague; please be more specific',
    }
  }

  return { ok: true }
}
