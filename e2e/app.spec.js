import { test, expect } from '@playwright/test'

test.describe('App shell', () => {
  test('home page renders brand, nav and hero', async ({ page }) => {
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) errors.push(msg.text())
    })

    await page.goto('/')
    await expect(page).toHaveTitle(/CaawiyeAI/)
    await expect(page.getByRole('link', { name: /CaawiyeAI/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Leaderboard/ })).toBeVisible()
    await expect(page.getByText(/Samee cod/i).first()).toBeVisible()

    expect(errors).toEqual([])
  })

  test('demo admin can reach the admin dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type=email]').fill('admin@caawiyeai.so')
    await page.locator('input[type=password]').fill('admin123')
    await page.click('form button[type=submit]')
    await page.waitForTimeout(900)
    await page.goto('/admin')
    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 8000 })
  })
})