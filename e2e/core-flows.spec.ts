import { expect, test } from '@playwright/test'

test('creates a goal and persists it across a page reload', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: "Today's goal", exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Finish the timer persistence flow')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await expect(page.getByText('Finish the timer persistence flow')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Finish the timer persistence flow')).toBeVisible()
})

test('carries a goal and its subgoals into the selected next day', async ({ page }) => {
  await page.goto('/goals')
  await page.getByRole('button', { name: "Today's goal", exact: true }).click()
  await page.getByPlaceholder('e.g. Finish the React timer component and write tests').fill('Prepare the database migration')
  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.getByPlaceholder('Add a subgoal…').fill('Review existing records')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('button', { name: 'Carry to tomorrow' }).click()
  await expect(page.getByText('Prepare the database migration (carried over)')).toBeVisible()
  await expect(page.getByText('Review existing records')).toBeVisible()
})

test('restores a paused focus session after reload', async ({ page }) => {
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start focus session' }).click()
  await expect(page.getByText('50-minute session')).toBeVisible()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await expect(page.getByText('50-minute session')).toBeVisible()
})

test('pauses for a distraction note and leaves resume under user control', async ({ page }) => {
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
