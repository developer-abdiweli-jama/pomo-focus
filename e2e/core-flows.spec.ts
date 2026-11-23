import { expect, test } from '@playwright/test'
import { format, subDays } from 'date-fns'

async function createGoal(page: import('@playwright/test').Page, title: string) {
  await page.goto('/goals')
  await page.getByRole('button', { name: /Goal for/ }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill(title)
  await page.getByRole('button', { name: 'Create goal' }).click()
}

test('creates a goal and persists it across a page reload', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: "Today's goal", exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Finish the timer persistence flow')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await expect(page.getByText('Finish the timer persistence flow')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Finish the timer persistence flow')).toBeVisible()
})

test('allows editing a subgoal from the Goals page', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: "Today's goal", exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Finish the weekly plan')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.getByPlaceholder('Add a subgoal…').fill('Outline the first draft')
  await page.getByRole('button', { name: 'Add' }).click()

  await page.getByRole('button', { name: 'Edit subgoal Outline the first draft' }).click()
  await page.getByRole('textbox', { name: 'Edit subgoal Outline the first draft' }).fill('Write the first draft')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Write the first draft')).toBeVisible()
  await expect(page.getByText('Outline the first draft')).toHaveCount(0)
})

test('starting a focus session moves its daily goal to in progress', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: "Today's goal", exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Prepare the project proposal')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start focus session' }).click()
  await expect(page.getByText('50-minute session')).toBeVisible()

  await page.goto('/goals')
  await expect(page.getByText('In progress', { exact: true })).toBeVisible()
})

test('floating timer can be closed while leaving the focus session running', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: "Today's goal", exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Read the product spec')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start focus session' }).click()
  const pipSupported = await page.evaluate(() => Boolean((window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture))
  test.skip(!pipSupported, 'Document Picture-in-Picture is not available in this browser')

  await page.getByRole('button', { name: 'Float timer above other windows' }).click()
  await expect(page.getByText('Timer stays above other tabs and windows while this FocusSpan tab is open.')).toBeVisible()
  await page.getByRole('button', { name: 'Close floating timer' }).click()
  await expect(page.getByRole('button', { name: 'Float timer above other windows' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('carries a goal and its subgoals into the selected next day', async ({ page }) => {
  await page.goto('/goals')
  await page.getByLabel('Plan for date').fill(format(subDays(new Date(), 1), 'yyyy-MM-dd'))
  await page.getByRole('button', { name: /Goal for/ }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Prepare the database migration')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.getByPlaceholder('Add a subgoal…').fill('Review existing records')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('button', { name: 'Carry to tomorrow' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Carry to tomorrow' }).click()
  await expect(page.getByText('Prepare the database migration (carried over)')).toBeVisible()
  await expect(page.getByText('Review existing records')).toBeVisible()
  await page.getByRole('button', { name: 'Goal for Today', exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Plan a new task for today')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await expect(page.getByText('Plan a new task for today')).toBeVisible()
  await expect(page.getByText('Prepare the database migration (carried over)')).toBeVisible()
})

test('allows a new main goal on the original day after carrying its goal forward', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: "Today's goal", exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Carry the unfinished work')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.getByRole('button', { name: 'Carry to tomorrow' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Carry to tomorrow' }).click()

  await page.goto('/goals')
  await expect(page.getByRole('button', { name: 'Goal for Today', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Goal for Today', exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Set a fresh main goal')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await expect(page.getByText('Set a fresh main goal')).toBeVisible()
})

test('warns before completing a goal and leaves it unchanged when canceled', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: "Today's goal", exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Finish the weekly plan')
  await page.getByRole('button', { name: 'Create goal' }).click()

  await page.getByRole('button', { name: 'Mark goal complete' }).click()
  const confirmation = page.getByRole('dialog')
  await expect(confirmation).toContainText('This action cannot be undone.')
  await confirmation.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('button', { name: 'Mark goal complete' })).toBeVisible()

  await page.getByRole('button', { name: 'Mark goal complete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
  await expect(page.getByText('Completed', { exact: true })).toBeVisible()
})

test('requires confirmation before an imported backup replaces current data', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: "Today's goal", exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Keep this existing goal')
  await page.getByRole('button', { name: 'Create goal' }).click()

  const backup = {
    monthlyMissions: [],
    dailyGoals: [{ id: 900, monthlyMissionId: null, title: 'Imported backup goal', date: format(new Date(), 'yyyy-MM-dd'), status: 'planned', isCarryOver: false, completedAt: null, createdAt: Date.now() }],
    subgoals: [],
    focusSessions: [],
    distractions: [],
    dailyReviews: [],
    weeklyReviews: [],
    milestones: [],
    userSettings: [],
  }
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Import data from JSON' }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'focusspan-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })

  let confirmation = page.getByRole('dialog')
  await expect(confirmation).toContainText('This action cannot be undone.')
  await confirmation.getByRole('button', { name: 'Cancel' }).click()
  await page.goto('/goals')
  await expect(page.getByText('Keep this existing goal')).toBeVisible()

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Import data from JSON' }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'focusspan-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })
  confirmation = page.getByRole('dialog')
  await confirmation.getByRole('button', { name: 'Replace data and import' }).click()
  await page.goto('/goals')
  await expect(page.getByText('Imported backup goal')).toBeVisible()
  await expect(page.getByText('Keep this existing goal')).toHaveCount(0)
})

test('restores a paused focus session after reload', async ({ page }) => {
  await createGoal(page, 'Restore a paused focus session')
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start focus session' }).click()
  await expect(page.getByText('50-minute session')).toBeVisible()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await expect(page.getByText('50-minute session')).toBeVisible()
})

test('direct focus entry requires a real daily goal', async ({ page }) => {
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start focus session' }).click()
  await expect(page.getByText('Create a daily goal before starting a focus session.')).toBeVisible()
  const goals = await page.evaluate(() => new Promise<unknown>((resolve) => {
    const request = indexedDB.open('pomo-focus-db')
    request.onsuccess = () => {
      const database = request.result
      const read = database.transaction('dailyGoals', 'readonly').objectStore('dailyGoals').getAll()
      read.onsuccess = () => { resolve(read.result); database.close() }
      read.onerror = () => { resolve(String(read.error)); database.close() }
    }
    request.onerror = () => resolve(String(request.error))
  }))
  expect(goals).toEqual([])
})

test('pauses for a distraction note and leaves resume under user control', async ({ page }) => {
  await createGoal(page, 'Record a distraction and resume')
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start focus session' }).click()
  await page.getByRole('button', { name: 'I got distracted' }).click()
  await expect(page.getByText('The timer is paused.')).toBeVisible()
  await page.getByPlaceholder('e.g. Checked phone, got stuck on a bug').fill('Checked a message')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
})

test('custom focus duration is saved and used by the timer', async ({ page }) => {
  await page.goto('/settings')
  await page.getByLabel('Focus duration (minutes)').selectOption('custom')
  await page.getByLabel('Custom focus duration (minutes)').fill('60')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await page.reload()
  await expect(page.getByLabel('Custom focus duration (minutes)')).toHaveValue('60')
  await createGoal(page, 'Use the saved focus duration')
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start focus session' }).click()
  await expect(page.getByText('60-minute session')).toBeVisible()
})

test('the app shell and assets remain available offline after first load', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Build a focused day.' })).toBeVisible()
})

test('continuing after a completed interval adds another interval', async ({ page }) => {
  await createGoal(page, 'Continue after a focus interval')
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start focus session' }).click()
  await page.getByRole('button', { name: 'End session' }).click()
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible()
  await page.evaluate(() => {
    const now = Date.now()
    Date.now = () => now + 51 * 60_000
  })
  await page.getByRole('button', { name: 'Continue focusing' }).click()
  await expect(page.getByText('100-minute session')).toBeVisible()
})

test('light theme setting is applied to the app', async ({ page }) => {
  await page.goto('/settings')
  await page.getByLabel('Theme').selectOption('light')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe('light')
})

test('weekly reflection is stored under the selected week and restored', async ({ page }) => {
  await page.goto('/review')
  await page.getByRole('button', { name: "Write this week's review" }).click()
  const reflection = page.getByPlaceholder('What helped me focus? What distracted me? What should I change next week? What am I proud of?')
  await reflection.fill('The daily plan helped me stay on track.')
  await page.getByRole('button', { name: 'Save reflection' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: "Write this week's review" })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: "Write this week's review" })).toBeVisible()
  const records = await page.evaluate(() => new Promise<unknown>((resolve) => {
    const request = indexedDB.open('pomo-focus-db')
    request.onsuccess = () => {
      const database = request.result
      const read = database.transaction('weeklyReviews', 'readonly').objectStore('weeklyReviews').getAll()
      read.onsuccess = () => { resolve(read.result); database.close() }
      read.onerror = () => { resolve(String(read.error)); database.close() }
    }
    request.onerror = () => resolve(String(request.error))
  }))
  expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ reflection: 'The daily plan helped me stay on track.' })]))
  await page.getByRole('button', { name: "Write this week's review" }).click()
  await expect(page.getByPlaceholder('What helped me focus? What distracted me? What should I change next week? What am I proud of?')).toHaveValue('The daily plan helped me stay on track.')
})

test('daily review completes the same-day streak requirement', async ({ page }) => {
  await createGoal(page, 'Complete a focus session and review')
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start focus session' }).click()
  await expect(page.getByText('50-minute session')).toBeVisible()
  await page.evaluate(() => {
    const now = Date.now()
    Date.now = () => now + 5 * 60_000
  })
  await page.getByRole('button', { name: 'End session' }).click()
  await page.getByRole('button', { name: 'Finish for now' }).click()
  await expect(page.getByRole('button', { name: 'Start focus session' })).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: 'Write today’s review' }).click()
  await page.getByPlaceholder('Write an honest note about today…').fill('I finished a focused work block.')
  await page.getByRole('button', { name: 'Save today’s review' }).click()
  await expect(page.getByText('Your reflection for today is saved.')).toBeVisible()
  await expect(page.getByText('1 days')).toBeVisible()
})
