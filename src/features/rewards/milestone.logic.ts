import type { Milestone } from '../../domain/models'

export type MilestoneKind = Milestone['type']

export type NewMilestone = Omit<Milestone, 'id'>

export interface CheckMilestonesInput {
  readonly sessionCount: number
  readonly currentStreak: number
  readonly focusHours: number
  readonly goalsCompleted: number
  readonly existingTypes: readonly string[]
}

const MILESTONE_DEFINITIONS: readonly {
  readonly kind: MilestoneKind
  readonly threshold: number
  readonly title: string
}[] = [
  { kind: 'session', threshold: 1, title: 'First session' },
  { kind: 'streak', threshold: 3, title: '3-day streak' },
  { kind: 'streak', threshold: 7, title: '7-day streak' },
  { kind: 'focus', threshold: 5, title: '5 focus hours' },
  { kind: 'goal', threshold: 5, title: '5 completed goals' },
]

export function checkMilestones(
  input: CheckMilestonesInput,
): readonly NewMilestone[] {
  const now = Date.now()
  const achieved: NewMilestone[] = []

  for (const definition of MILESTONE_DEFINITIONS) {
    if (
      input.existingTypes.includes(`${definition.kind}:${definition.threshold}`) ||
      input.existingTypes.includes(definition.kind)
    ) {
      continue
    }
    let reached = false
    switch (definition.kind) {
      case 'session':
        reached = input.sessionCount >= definition.threshold
        break
      case 'streak':
        reached = input.currentStreak >= definition.threshold
        break
      case 'focus':
        reached = input.focusHours >= definition.threshold
        break
      case 'goal':
        reached = input.goalsCompleted >= definition.threshold
        break
    }
    if (reached) {
      achieved.push({
        type: definition.kind,
        value: definition.threshold,
        title: definition.title,
        achievedAt: now,
      })
    }
  }

  return achieved
}
