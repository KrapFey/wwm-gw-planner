// Regenerates the user guide's screenshots from the live app, then refreshes
// guide.html: every <img data-shot="name"> gets its src / width / height, and
// <time data-shots-updated> gets today's date.
//
//   npm run guide:shots              all scenes
//   npm run guide:shots -- phases    only the named scenes
//
// Runs the Vite dev server (it exposes the store as window.__store, so scenes
// are built through the app's own actions) and drives it with Playwright:
// the installed Microsoft Edge locally, Playwright's Chromium in CI.
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const OUT_DIR = 'public/guide/img'
const PAGE = 'guide.html'
const PORT = 5181
const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }
const SCALE = 2 // capture at 2x for crisp text, then downsize
const MAX_W = 1800 // widest saved image (px)
const only = new Set(process.argv.slice(2))

// ---------------------------------------------------------------- demo board
// A believable plan on the real map (1430 x 1100 map pixels): three of our
// teams by the blue towers, two enemy teams, calls drawn between them, and
// three phases. Built with store actions so it always matches the schema.
function seedDemo() {
  const S = window.__store.getState
  S().setStrategyName('River fort, Saturday')
  const team = (side, category, name, lane, targetSize, roles, color) => {
    S().addSquad(side, category, { name, lane, targetSize, ...(color && { color }) })
    const id = S().strategy.squads.at(-1).id
    for (const [role, n] of Object.entries(roles)) {
      for (let i = 0; i < n; i++) S().addPlayer(side, id, { role })
    }
    return id
  }
  const t = {
    vanguard: team('ally', 'attack', 'Vanguard', 'Top', 10, { Tank: 2, DPS: 6, Healer: 2 }),
    flank: team('ally', 'attack', 'Flankers', 'Mid', 5, { Tank: 1, DPS: 3, Healer: 1 }),
    gate: team('ally', 'defence', 'Gate watch', 'Bottom', 5, { Tank: 2, DPS: 2 }),
    raiders: team('enemy', 'attack', 'Raiders', 'Mid', 10, { Tank: 2, DPS: 7, Healer: 1 }),
    keep: team('enemy', 'defence', 'Keep guard', 'Top', 5, { Tank: 1, DPS: 3, Healer: 1 })
  }
  S().placePill(t.vanguard, { x: 470, y: 350 })
  S().placePill(t.flank, { x: 470, y: 548 })
  S().placePill(t.gate, { x: 470, y: 760 })
  S().placePill(t.raiders, { x: 990, y: 548 })
  S().placePill(t.keep, { x: 990, y: 350 })

  const add = (item) => S().addItem(item)
  const m = {
    tower: add({ type: 'marker', kind: 'attack', x: 903, y: 292, label: 'Tower 1' }),
    boss: add({ type: 'marker', kind: 'danger', x: 728, y: 488, label: 'Boss' }),
    hold: add({ type: 'marker', kind: 'defend', x: 558, y: 700, label: 'Hold gate' }),
    arrow: add({ type: 'drawing', tool: 'arrow', color: '#facc15', width: 6, points: [540, 350, 850, 330] }),
    curve: add({ type: 'drawing', tool: 'carrow', color: '#ef4444', width: 6, points: [540, 560, 700, 690, 900, 590] }),
    zone: add({ type: 'drawing', tool: 'ellipse', color: '#3b82f6', width: 3, points: [650, 470, 810, 650] }),
    note: add({
      type: 'note',
      x: 1060,
      y: 690,
      color: '#fde68a',
      text: 'Vanguard goes on the horn. Flankers wait for the boss call, then sweep mid.'
    }),
    timer: add({ type: 'timer', x: 1150, y: 120, seconds: 90 })
  }

  // three phases: push top, take the boss (flankers ride the curve), regroup
  S().setPlayback({ open: true })
  S().addPhase(null)
  const p1 = S().playback.phaseId
  S().renamePhase(p1, 'Push top')
  S().dragItem(t.vanguard, { x: 830, y: 340 })
  S().dragItem(t.flank, { x: 600, y: 560 })
  S().dragItem(t.keep, { x: 930, y: 380 })
  S().addPhase(p1)
  const p2 = S().playback.phaseId
  S().renamePhase(p2, 'Take the boss')
  S().dragItem(t.flank, { x: 900, y: 590 })
  S().setPhasePath(p2, t.flank, m.curve)
  S().dragItem(t.raiders, { x: 760, y: 600 })
  S().togglePhaseHidden(p2, m.arrow)
  S().addPhase(p2)
  const p3 = S().playback.phaseId
  S().renamePhase(p3, 'Regroup')
  S().dragItem(t.vanguard, { x: 700, y: 430 })
  S().dragItem(t.flank, { x: 760, y: 470 })
  S().setPlayback({ open: false, playing: false, phaseId: null, t: 0 })
  return { t, m, phases: [p1, p2, p3] }
}

// ------------------------------------------------------------------ helpers
const shots = {}

async function save(name, buf) {
  const img = sharp(buf)
  const { width } = await img.metadata()
  const { data, info } = await img
    .resize({ width: Math.min(width, MAX_W), withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
  await writeFile(`${OUT_DIR}/${name}.webp`, data)
  shots[name] = { width: info.width, height: info.height }
  console.log(`  ${name}.webp  ${info.width}x${info.height}  ${(data.length / 1024).toFixed(0)} KB`)
}

// Screenshot a region around the union of `selectors` (plus padding), or the
// whole viewport when none are given.
// minW widens rightward, or leftward with `growLeft`; minH grows upward.
async function shoot(
  page,
  name,
  selectors = [],
  { pad = 16, minW = 0, minH = 0, maxH = Infinity, growLeft = false } = {}
) {
  if (only.size && !only.has(name)) return
  await page.mouse.move(2, 2) // no hover state or tooltip in the shot
  await page.waitForTimeout(250)
  if (!selectors.length) return save(name, await page.screenshot())
  const vp = page.viewportSize()
  const boxes = []
  for (const s of selectors) {
    const b = await page.locator(s).first().boundingBox({ timeout: 5000 })
    if (!b) throw new Error(`scene "${name}": nothing matches ${s}`)
    boxes.push(b)
  }
  let x1 = Math.min(...boxes.map((b) => b.x)) - pad
  let y1 = Math.min(...boxes.map((b) => b.y)) - pad
  let x2 = Math.max(...boxes.map((b) => b.x + b.width)) + pad
  let y2 = Math.max(...boxes.map((b) => b.y + b.height)) + pad
  if (x2 - x1 < minW) {
    if (growLeft) x1 = x2 - minW
    else x2 = x1 + minW
  }
  if (y2 - y1 < minH) y1 = y2 - minH
  if (y2 - y1 > maxH) y2 = y1 + maxH
  x1 = Math.max(0, x1)
  y1 = Math.max(0, y1)
  x2 = Math.min(vp.width, x2)
  y2 = Math.min(vp.height, y2)
  return save(name, await page.screenshot({ clip: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } }))
}

// Fresh app (empty storage), ready to drive.
async function open(page, { demo = true } = {}) {
  await page.goto(`http://localhost:${PORT}/`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForFunction(() => window.__store && document.querySelector('.stage-wrap canvas'))
  await page.waitForLoadState('networkidle')
  const ids = demo ? await page.evaluate(seedDemo) : null
  await page.evaluate(() => document.fonts.ready)
  // the hover tooltip would otherwise linger in whichever shot follows
  await page.addStyleTag({ content: '.tip { display: none !important }' })
  await fit(page)
  await page.waitForTimeout(300)
  return ids
}

// Screen position of a map point (for clicking pieces on the canvas).
const onScreen = (page, x, y) =>
  page.evaluate(
    ([mx, my]) => {
      const v = window.__store.getState().view
      const r = document.querySelector('.stage-wrap').getBoundingClientRect()
      return { x: r.left + v.x + mx * v.zoom, y: r.top + v.y + my * v.zoom }
    },
    [x, y]
  )
const fit = async (page) => {
  await page.getByRole('button', { name: 'Fit to screen' }).click()
  await page.waitForTimeout(200)
}
const btn = (page, name) => page.getByRole('button', { name, exact: true }).first()
const S = (page, fn, arg) => page.evaluate(fn, arg)

// ------------------------------------------------------------------- scenes
async function desktopScenes(page) {
  const ids = await open(page)

  await shoot(page, 'overview')

  await S(page, ({ t }) => {
    const s = window.__store.getState()
    s.toggleTeam(t.vanguard)
    s.toggleTeam(t.gate)
  }, ids)
  await shoot(
    page,
    'roster',
    ['.roster.side-ally .side > header', '.roster.side-ally .team-cat >> nth=1'],
    { pad: 0 }
  )

  // close-up of pills: zoom the camera onto our teams
  await S(page, () => {
    const r = document.querySelector('.stage-wrap').getBoundingClientRect()
    const zoom = 1.25
    window.__store.getState().setView({ zoom, x: r.width / 2 - 650 * zoom, y: r.height / 2 - 450 * zoom })
  })
  await page.waitForTimeout(200)
  {
    const r = await page.locator('.stage-wrap').boundingBox()
    const w = 680
    const h = 440
    if (!only.size || only.has('pills')) {
      await page.mouse.move(2, 2)
      // nudged right of centre so the tool rail stays out of frame
      const clip = { x: r.x + r.width / 2 - w / 2 + 24, y: r.y + r.height / 2 - h / 2 - 40, width: w, height: h }
      await save('pills', await page.screenshot({ clip }))
    }
  }
  await fit(page)

  // drawing tools: pen active, shapes menu open
  await page.keyboard.press('d')
  await page.locator('.tool-rail .ctb-menu > .dock-btn').first().click()
  await shoot(page, 'drawing-tools', ['.tool-rail .ctb-tools', '.draw-opts', '.tool-rail .ctb-drop'], {
    pad: 14
  })
  await page.keyboard.press('Escape')

  // objective markers menu
  await page.getByRole('button', { name: 'Objective markers' }).click()
  await shoot(page, 'markers', ['.tool-rail .ctb-group:nth-child(2)', '.tool-rail .ctb-drop'], { pad: 14, minW: 360 })
  await page.mouse.click(2, 2) // outside click closes it

  // marker panel: select the "Tower 1" marker on the canvas
  {
    const p = await onScreen(page, 903, 292)
    await page.mouse.click(p.x, p.y)
    await page.locator('.inspector').waitFor()
    await shoot(page, 'marker-inspector', ['.inspector'], { pad: 18 })
    await page.keyboard.press('Escape')
  }

  // selection bar: click the yellow arrow's midpoint
  {
    const p = await onScreen(page, 695, 340)
    await page.mouse.click(p.x, p.y)
    await page.locator('.selection-bar').waitFor()
    await shoot(page, 'selection-bar', ['.selection-bar'], { pad: 22, minH: 200 })
    await page.keyboard.press('Escape')
  }

  // phases: mid-way through "Take the boss", trails on
  await S(page, ([p2]) => {
    const s = window.__store.getState()
    s.setPlayback({ open: true })
    s.selectPhase(p2)
    s.setPlayback({ phaseId: null, t: 3000 })
  }, ids.phases)
  await page.waitForTimeout(300)
  await shoot(page, 'phases')

  // the Paths menu for "Take the boss"
  await S(page, ([p2]) => window.__store.getState().selectPhase(p2), ids.phases)
  await page.getByRole('button', { name: 'Paths' }).click()
  await shoot(page, 'phase-paths', ['.pb-timing', '.pb-vis-pop'], { pad: 14 })
  await S(page, () => window.__store.getState().setPlayback({ open: false, phaseId: null, playing: false, t: 0 }))
  await page.waitForTimeout(200)

  // strategy list with a few entries
  await S(page, () => {
    const s = window.__store.getState
    const first = s().activeId
    s().duplicateStrategy(first)
    s().renameStrategy(s().activeId, 'River fort, backup plan')
    s().newStrategy()
    s().renameStrategy(s().activeId, 'Open field scrim')
    s().switchStrategy(first)
  })
  await page.locator('.strat-trigger').click()
  await shoot(page, 'strategies', ['.brand', '.doc', '.strat-pop'], { pad: 14 })
  await page.mouse.click(700, 500)

  // delete a team -> undo message
  // Gate watch: our only Defense team
  await page
    .locator('.roster.side-ally .team-cat >> nth=1')
    .getByRole('button', { name: 'Remove team and all its players' })
    .click()
  await page.locator('.toast').waitFor()
  await shoot(page, 'undo-toast', ['.toast'], { pad: 22, minW: 520 })
  await page.locator('.toast').getByRole('button', { name: 'Undo' }).click()

  // share: link copied
  await btn(page, 'Share').click()
  await page.getByText('Link copied').waitFor()
  await shoot(page, 'share', ['.tb-guide', '.group.actions', '.panel-toggle.side-enemy'], { pad: 12 })
  await page.waitForTimeout(1800) // let "Link copied" revert

  // help menu with shortcuts
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
  await shoot(page, 'shortcuts', ['.view-dock', '.shortcuts-pop'], { pad: 14 })
  await page.mouse.click(700, 500)

  // map layout editor, first fixture selected
  await page.getByRole('button', { name: 'Edit map layout' }).click()
  await page.locator('.fixture-list li').first().click()
  await shoot(page, 'layout-editor', ['.view-dock', '.layout-panel'], {
    pad: 14,
    minW: 640,
    maxH: 560,
    growLeft: true
  })
  await page.getByRole('button', { name: 'Done' }).click()
}

async function onboardingScene(page) {
  await open(page, { demo: false }) // fresh context: nothing saved yet
  await shoot(page, 'onboarding', ['.onboarding'], { pad: 20 })
}

async function phoneScene(page) {
  await open(page)
  await page.locator('.panel-toggle.side-ally').click()
  await page.waitForTimeout(500)
  await shoot(page, 'mobile')
}

// ------------------------------------------------------- update guide.html
async function updatePage() {
  let html = await readFile(PAGE, 'utf8')
  const seen = new Set()
  html = html.replace(/<img\b[^>]*\bdata-shot="([^"]+)"[^>]*>/g, (tag, name) => {
    seen.add(name)
    const s = shots[name]
    if (!s) return tag // not captured this run: leave as is
    const alt = tag.match(/\balt="([^"]*)"/)?.[1] ?? ''
    const loading = tag.match(/\bloading="([^"]*)"/)?.[1] ?? 'lazy'
    return `<img data-shot="${name}" src="guide/img/${name}.webp" width="${s.width}" height="${s.height}" alt="${alt}" loading="${loading}" />`
  })
  const now = new Date()
  const label = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  html = html.replace(
    /<time data-shots-updated datetime="[^"]*">[^<]*<\/time>/,
    `<time data-shots-updated datetime="${now.toLocaleDateString('sv')}">${label}</time>`
  )
  await writeFile(PAGE, html)
  const unused = Object.keys(shots).filter((n) => !seen.has(n))
  if (unused.length) console.warn(`  not referenced in ${PAGE}: ${unused.join(', ')}`)
}

// --------------------------------------------------------------------- main
await mkdir(OUT_DIR, { recursive: true })
const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' })
await server.listen()
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge' })
try {
  const desktop = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: SCALE,
    reducedMotion: 'reduce', // no entrance animations mid-shot
    permissions: ['clipboard-read', 'clipboard-write']
  })
  const page = await desktop.newPage()
  console.log('Capturing guide screenshots…')
  await desktopScenes(page)
  // a fresh context each: the app saves on pagehide, so reusing a page would
  // write the previous scene back over a storage clear
  const blank = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: SCALE, reducedMotion: 'reduce' })
  await onboardingScene(await blank.newPage())
  const phone = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: SCALE,
    hasTouch: true,
    reducedMotion: 'reduce'
  })
  await phoneScene(await phone.newPage())
  await updatePage()
  console.log(`Updated ${PAGE} (${Object.keys(shots).length} screenshots).`)
} finally {
  await browser.close()
  await server.close()
}
