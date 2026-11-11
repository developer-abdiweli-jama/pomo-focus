import { db } from '../database'
import type { UserSettings } from '../../domain/models'

export const DEFAULT_USER_SETTINGS: UserSettings = {
  id: 1,
  focusDuration: 50,
  breakDuration: 10,
  dailyFocusTarget: 50,
  soundEnabled: true,
  theme: 'system',
}

export async function getSettings(): Promise<UserSettings | null> {
  return (await db.userSettings.get(1)) ?? null
}

export async function saveSettings(
  partial: Omit<Partial<UserSettings>, 'id'>,
): Promise<void> {
  const existing = await db.userSettings.get(1)
  const data: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...existing,
    ...partial,
    id: 1,
  }
  if (existing) {
    await db.userSettings.put(data)
  } else {
    await db.userSettings.add(data)
  }
}
