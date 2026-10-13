# WWM Guild War Planner

Offline-capable Guild War (GvG) strategy planner for *Where Winds Meet*. Inspired by
[gvgstratmaker.com](https://gvgstratmaker.com/), rebuilt as an installable PWA that
works with no internet and no backend. "Online" just means hosting the static build
somewhere (e.g. Oracle Cloud). Strategies are shared with **Share** — a link
whose `#s=…` fragment carries the whole strategy (gzipped with the browser's
`CompressionStream`, so it never touches a server) — or by exporting/importing a
JSON file. Opening a link adds the strategy as a new library entry.

## Stack

- React + Vite, bronze-and-brass dark design system + Geist / Geist Mono (`@fontsource-variable/geist*`)
- Zustand (+ `zundo` for undo/redo), autosaved to `localStorage`
- `vite-plugin-pwa` for offline install
- Konva / react-konva for the battle map
- ESLint (flat config) + Vitest; GitHub Actions CI (`.github/workflows/ci.yml`)

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/  (static, deploy anywhere)
npm run preview  # serve the built dist/
npm run lint
npm run test
npm run gen:assets  # regenerate map.webp + PWA icons from source art (rare)
npm run test:e2e    # Playwright UI smoke tests (local: installed Edge)
npm run guide:shots # retake the user guide's screenshots
```

## User guide

`guide.html` is the user guide, built as a second page alongside the app
(`/guide.html`, linked from the top bar) and precached for offline use. Copy is
hand-written; screenshots live in `public/guide/img/`.

`npm run guide:shots` regenerates them: it starts the dev server, builds a demo
strategy through the store (`window.__store`), drives each scene with Playwright,
saves 2x WebP crops, then rewrites every `<img data-shot="…">` in `guide.html`
(src, width, height) and the "Screenshots updated" date. Pass scene names to
retake only some (`npm run guide:shots -- phases pills`). Add a screenshot by
adding a scene in `scripts/guide-shots.mjs` and an `<img data-shot>` in the page.

If `esbuild` fails to run its postinstall in a locked-down npm, run once:
`node node_modules/esbuild/install.js`.

## Status

| Phase | Scope | State |
|------|-------|-------|
| 1 | Scaffold, store + autosave, strategy JSON export/import | done |
| 2 | Team organization: sides, teams (size/lane/role slots), summaries | done |
| 3 | Konva battle map: real map image, fixture layout editor, team pill tokens, pan/zoom | done |
| 4 | Tactical layer: markers, freehand/arrow drawing + eraser, sticky notes, timers | done |
| — | UI/UX redesign + floating-dock layout; **named strategy library**; persisted collapse state; marker rotate/scale/label; drawing select+move; tool shortcuts (V/D/A/E); lint + tests + CI | done |
| 5 | Deploy: Oracle VM + Caddy auto-HTTPS, push-to-deploy CI, map→WebP (2.9 MB → 0.3 MB), real PWA icons, latin-only font precache | done |
| 6 | Planning-phase animation (increment 1): keyframe phases per strategy, timeline bar, eased playback of team pills + markers | done |

## Deploy

Static build — `npm run build` produces `dist/`, host it anywhere. Live setup is an
Oracle Cloud VM behind Caddy (auto-HTTPS via `sslip.io`); `deploy/deploy.sh` on the
VM pulls `main`, builds and rsyncs `dist/`. Full runbook + `deploy/Caddyfile` in
[`deploy/README.md`](deploy/README.md).

## Planning-phase animation

Everything on the map is one list, `strategy.items` (pills, markers, drawings,
notes, timers; a team's pill uses the team's id). `strategy.phases` is an ordered
list of keyframes over those items — `pos` (where each item sits), `hidden` (what
the phase doesn't show) and `paths` (a pill walks a drawing). The live board is
the "Start" frame. Open the timeline bar → `+ Phase` snapshots every positioned
item. Select a phase chip → drags edit *that* keyframe and Delete hides the item
in that phase; select **Start** → they edit the live board. Play eases every item
between phases, per-phase easing / transition / hold. Pure interpolation is in
`src/lib/playback.js`; `playback` is a transient store slice (not persisted, not
undoable).

## Strategy library

Multiple named strategies live in the store (`docs` / `order` / `activeId`, persisted).
The top-bar menu switches / creates / renames / duplicates / deletes them. Undo/redo
history is per-strategy and cleared on switch. Import adds a new entry (doesn't clobber).

## Battle map

Background is the real GvG map image (`public/assets/map.png`, 1430×1100), rendered
with Konva. Coordinates everywhere are map-image pixels.

**Fixtures** (geese, trees, bulwarks, boss) are sprites from `public/assets/`
placed over the map. Their positions live in the `layout` store slice — app-level
config, autosaved to localStorage, **not** part of a strategy and **not** in undo
history. Defaults ship in `src/data/mapPreset.js`.

- **Edit map layout** (toolbar toggle): drag fixtures to position them, select one
  to tune size/rotation or delete, add more from the picker. Then **Copy layout
  JSON** (or Download) and paste the array into `src/data/mapPreset.js` to bake the
  placement in as the default for everyone.
- **Planning mode** (default): fixtures are locked. Drag a player from the roster
  handle (⠿) or the bench onto the map to place a token; drag tokens to reposition;
  double-click a token to send it back to the bench.
- Scroll = cursor-focused zoom, drag empty space = pan, **Fit** frames the map.
  Viewport is saved locally, outside the strategy document.

`vite.config.js` bumps `workbox.maximumFileSizeToCacheInBytes` so the ~2 MB map is
precached for offline use. (Worth compressing map.png / converting to WebP later.)

## Tactical layer

Second map toolbar row (hidden while editing map layout):

- **Select / Draw / Arrow** tools. Draw/Arrow: pick colour + width (S/M/L), then
  drag on the map. Double-click a line to delete it. `Clear drawings` removes all.
- **Objective markers** — Attack / Danger / Defend / Hold / Yes / No. Click a
  button to drop one at the view centre; drag to place; double-click to remove.
- **+ Note** — a draggable, resizable sticky (colour swatches, free text;
  double-click to edit). Notes and timers are Konva items like everything else:
  they anchor to a map point and pan with it, keep a constant on-screen size,
  animate between phases and show up in PNG / video exports.
- **+ Timer** — draggable MM:SS countdown with start/pause/reset and ±10 s. The
  configured duration is saved; the running countdown is local to each viewer.

All map items live in the strategy document (exported, undoable); the map
viewport does not. With an item selected: Delete removes it, Ctrl+D duplicates
it, `[` / `]` sends it back / brings it forward.

## Team organization model

- Two **sides**: *Our Guild* / *Enemy*, 30 players max each.
- Each side has **squads**; a squad has a name, a **lane** (Top/Mid/Bottom), a
  **target size** (presets 5 / 10, or custom), and a colour.
- Each **player** has a name, a **role** (Tank / DPS / Healer) shown on the row,
  free-text **weapons**, and a team assignment.
- Each team can have a **leader** — click the ☆/★ on a member row (leaders show
  on the map pill as `★ Name`).
- The side header shows total `X/30`; each side shows role and per-lane tallies;
  each team shows fill `n/target`, role composition, and soft warnings
  (over target, no healer, no tank, no lane).
- Only **teams** go on the battle map: drag a team's `⠿` handle onto the map to
  drop a single pill token (name + member count + leader/lane/composition).
  Double-click a token to remove it. Individual players are not placed on the map.
