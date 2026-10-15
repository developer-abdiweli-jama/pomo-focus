import { db } from '../database'
import type { UserSettings } from '../../domain/models'
import { requirePositiveNumber } from '../../domain/validation'

export const defaultSettings: UserSettings = {
  id: 'default',
  focusDurationSeconds: 50 * 60,
  breakDurationSeconds: 10 * 60,
  dailyFocusTargetMinutes: 50,
  soundEnabled: true,
  theme: 'dark',
}

export async function getSettings(): Promise<UserSettings> {
  const settings = await db.settings.get('default')

  if (settings) {
    return settings
  }

  return defaultSettings
}

type SettingsUpdate = Pick<
  UserSettings,
  'focusDurationSeconds' | 'breakDurationSeconds' | 'dailyFocusTargetMinutes'
>

export async function updateSettings(input: SettingsUpdate): Promise<UserSettings> {
  requireWholeMinutes(input.focusDurationSeconds, 'Focus duration')
  requireWholeMinutes(input.breakDurationSeconds, 'Break duration')
  requireWholeMinutes(input.dailyFocusTargetMinutes, 'Daily focus target', false)

  const currentSettings = await getSettings()
  const nextSettings: UserSettings = {
    ...currentSettings,
    ...input,
  }

  await db.settings.put(nextSettings)
  return nextSettings
}

function requireWholeMinutes(value: number, fieldName: string, isSeconds = true): void {
  requirePositiveNumber(value, fieldName)

  if (!Number.isInteger(value) || (isSeconds && value % 60 !== 0)) {
    throw new Error(`${fieldName} must use whole minutes.`)
  }
}
