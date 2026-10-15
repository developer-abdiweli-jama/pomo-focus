export function requireText(value: string, fieldName: string): string {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    throw new Error(`${fieldName} cannot be empty.`)
  }

  return normalizedValue
}

export function requireDateRange(startDate: string, targetDate: string): void {
  if (targetDate < startDate) {
    throw new Error('Target date cannot be before the start date.')
  }
}

export function requirePositiveNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`)
  }
}
