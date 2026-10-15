export function todayDateKey(): string {
  return toDateKey(new Date())
}

export function dateKeyWithOffset(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function getRollingWeekRange(): { start: string; end: string } {
  return {
    start: dateKeyWithOffset(-6),
    end: todayDateKey(),
  }
}

export function countInclusiveDays(start: string, end: string): number {
  const startTime = Date.parse(`${start}T00:00:00Z`)
  const endTime = Date.parse(`${end}T00:00:00Z`)

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return 0
  }

  return Math.floor((endTime - startTime) / (24 * 60 * 60 * 1000)) + 1
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatLongDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
