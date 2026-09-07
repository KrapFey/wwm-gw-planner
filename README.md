# WWM Guild War Planner

Offline-capable Guild War (GvG) strategy planner for *Where Winds Meet*. Inspired by
[gvgstratmaker.com](https://gvgstratmaker.com/), rebuilt as an installable PWA that
works with no internet and no backend. "Online" just means hosting the static build
somewhere (e.g. Oracle Cloud). Strategies are shared by exporting/importing a JSON file.

## Stack

- React + Vite, modern dark design system + Inter (`@fontsource-variable/inter`)
- Zustand (+ `zundo` for undo/redo), autosaved to `localStorage`
- `vite-plugin-pwa` for offline install
- Konva / react-konva for the battle map
- ESLint (flat config) + Vitest; GitHub Actions CI + push-to-deploy (`.github/workflows/`)

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/  (static, deploy anywhere)
npm run preview  # serve the built dist/
npm run lint
npm run test
npm run gen:assets  # regenerate map.webp + PWA icons from source art (rare)
```

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

## Deploy

Static build — `npm run build` produces `dist/`, host it anywhere. Live setup is an
Oracle Cloud VM behind Caddy (auto-HTTPS via `sslip.io`); pushing to `main` builds
and rsyncs `dist/` to the VM (`.github/workflows/deploy.yml`). Full runbook +
`deploy/Caddyfile` + manual fallback in [`deploy/README.md`](deploy/README.md).

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
- **+ Note** — a draggable sticky (colour options, free text). Notes and timers
  are HTML overlaid on the canvas: they anchor to a map point and pan/zoom with
  it but keep a constant on-screen size. Edit commits on blur.
- **+ Timer** — draggable MM:SS countdown with start/pause/reset and ±10 s. The
  configured duration is saved; the running countdown is local to each viewer.

Markers and drawings live in the strategy document (exported, undoable). Notes and
timers too. Map viewport does not.

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
