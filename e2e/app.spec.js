import { test, expect } from '@playwright/test'

// UI smoke tests for the main flows. The board is a canvas, so outcomes are
// checked through the persisted document (localStorage, written ~400 ms after
// an edit) rather than pixels.
const STORAGE_KEY = 'wwm-gw-planner'
const activeDoc = (page) =>
  page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key) || 'null')?.state
    return s ? s.docs[s.activeId] : null
  }, STORAGE_KEY)
const countOf = (page, type) => async () =>
  ((await activeDoc(page))?.items ?? []).filter((i) => i.type === type).length

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.stage-wrap canvas').first()).toBeVisible()
})

test('add a team and place it on the map from its card', async ({ page }) => {
  const ally = page.locator('.roster.side-ally')
  await ally.getByRole('button', { name: 'Attack team' }).click()
  await ally.getByRole('button', { name: 'Player', exact: true }).click()
  await ally.getByRole('button', { name: 'Player', exact: true }).click()
  await expect(ally.locator('.fill-num')).toHaveText('2/5')

  await ally.getByRole('button', { name: 'Place on the map' }).click()
  await expect.poll(countOf(page, 'pill')).toBe(1)
  await expect(ally.locator('.place')).toHaveClass(/\bon\b/)
  // the first-run guide ticks off the first two steps
  await expect(page.locator('.onboarding li.done')).toHaveCount(2)
})

test('draw a freehand line with the pen tool', async ({ page }) => {
  await page.keyboard.press('d')
  await expect(page.getByRole('button', { name: /Freehand draw/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Line style' })).toBeVisible()

  const box = await page.locator('.stage-wrap').boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx - 80, cy)
  await page.mouse.down()
  await page.mouse.move(cx, cy + 40, { steps: 8 })
  await page.mouse.move(cx + 80, cy, { steps: 8 })
  await page.mouse.up()
  await expect.poll(countOf(page, 'drawing')).toBe(1)

  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /Select \/ pan/ })).toHaveAttribute('aria-pressed', 'true')
})

test('a curved arrow takes the chosen colour and width', async ({ page }) => {
  await page.keyboard.press('g')
  const style = page.getByRole('group', { name: 'Line style' })
  await expect(style).toBeVisible()
  await style.locator('.swatch').nth(1).click() // red
  await style.getByTitle('Line width L').click()

  const box = await page.locator('.stage-wrap').boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx - 80, cy)
  await page.mouse.down()
  await page.mouse.move(cx, cy - 50, { steps: 8 })
  await page.mouse.move(cx + 80, cy, { steps: 8 })
  await page.mouse.up()
  await expect.poll(countOf(page, 'drawing')).toBe(1)
  const curve = (await activeDoc(page)).items.find((i) => i.type === 'drawing')
  expect(curve).toMatchObject({ tool: 'carrow', color: '#ef4444', width: 10 })
})

test('delete a team, then undo it from the toast', async ({ page }) => {
  const ally = page.locator('.roster.side-ally')
  await ally.getByRole('button', { name: 'Attack team' }).click()
  await expect(ally.locator('.squad')).toHaveCount(1)

  await ally.getByRole('button', { name: 'Remove team and all its players' }).click()
  await expect(ally.locator('.squad')).toHaveCount(0)
  const toast = page.locator('.toast', { hasText: 'Deleted Att 1' })
  await expect(toast).toBeVisible()

  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(ally.locator('.squad')).toHaveCount(1)
  await expect(toast).toHaveCount(0)
})

test('add a phase, rename it in place, and play', async ({ page }) => {
  await page.getByRole('button', { name: 'Plan phases (animation)' }).click()
  await page.getByRole('button', { name: 'Phase', exact: true }).click()

  await page.locator('.pb-chip', { hasText: 'Phase 1' }).dblclick()
  const rename = page.getByRole('textbox', { name: 'Phase name' })
  await rename.fill('Push mid')
  await rename.press('Enter')
  await expect(page.locator('.pb-chip', { hasText: 'Push mid' })).toBeVisible()
  await expect.poll(async () => (await activeDoc(page))?.phases.map((p) => p.name)).toEqual(['Push mid'])

  await page.getByRole('button', { name: /^Play/ }).click()
  await expect(page.getByRole('button', { name: /^Pause/ })).toBeVisible()
})

test('export a strategy, import it back, and export a PNG', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Strategy name' }).fill('Siege A')
  await page.locator('.roster.side-ally').getByRole('button', { name: 'Attack team' }).click()

  const [json] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click()
  ])
  expect(json.suggestedFilename()).toMatch(/\.json$/)

  await page.locator('input[type="file"]').setInputFiles(await json.path())
  await expect(page.locator('.toast', { hasText: 'Imported' })).toBeVisible()
  await expect(page.locator('.strat-trigger .count-badge')).toHaveText('2')
  await expect(page.locator('.roster.side-ally .squad')).toHaveCount(1)

  const [png] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export the board as a PNG' }).click()
  ])
  expect(png.suggestedFilename()).toMatch(/\.png$/)
})
