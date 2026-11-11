import type { Status } from './models'

export const STATUS_PLANNED: Status = 'planned'
export const STATUS_IN_PROGRESS: Status = 'in_progress'
export const STATUS_COMPLETED: Status = 'completed'
export const STATUS_CARRIED_OVER: Status = 'carried_over'
export const STATUS_CANCELLED: Status = 'cancelled'

export const ALL_STATUSES: readonly Status[] = [
  STATUS_PLANNED,
  STATUS_IN_PROGRESS,
  STATUS_COMPLETED,
  STATUS_CARRIED_OVER,
  STATUS_CANCELLED,
]

export const ACTIVE_STATUSES: readonly Status[] = [STATUS_IN_PROGRESS]

export const TERMINAL_STATUSES: readonly Status[] = [
  STATUS_COMPLETED,
  STATUS_CARRIED_OVER,
  STATUS_CANCELLED,
]

export function isActiveStatus(status: Status): boolean {
  return status === STATUS_IN_PROGRESS
}

export function isTerminalStatus(status: Status): boolean {
  return (
    status === STATUS_COMPLETED ||
    status === STATUS_CARRIED_OVER ||
    status === STATUS_CANCELLED
  )
}

export function statusLabel(status: Status): string {
  const labels: Record<Status, string> = {
    planned: 'Planned',
    in_progress: 'In progress',
    completed: 'Completed',
    carried_over: 'Carried over',
    cancelled: 'Cancelled',
  }
  return labels[status]
}
