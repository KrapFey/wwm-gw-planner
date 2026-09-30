// Single source of truth for the strategy document shape + defaults + migration.
//
// A "strategy" is the whole planning document. It is what gets autosaved to
// localStorage and what export/import reads and writes.
//
// v2 shape:
//   squads / players  roster (who's in which team)
//   items             everything on the map, one list; array order = draw order
//                     within a type. A team's pill uses the team's id.
//   phases            keyframes over items: pos / hidden / paths (see below)

const SCHEMA_VERSION = 2

// type -> the fields besides id/type an item carries
//   pill    { x, y }                       id === its squad's id
//   marker  { kind, x, y, label?, scale?, rotation? }
//   drawing { tool, color, width, points }
//   note    { x, y, text, color, width?, height? }
//   timer   { x, y, seconds }
export const ITEM_TYPES = ['pill', 'marker', 'drawing', 'note', 'timer']

export const ROLES = ['Tank', 'DPS', 'Healer']

export const LANES = ['Top', 'Mid', 'Bottom']

// Teams are organised under a guild into Attack / Defense. The category is
// fixed when the team is created and drives its auto name (Att 1, Def 1, …).
// (The stored key stays "defence"; only the label is US-spelled.)
export const CATEGORIES = ['attack', 'defence']
export const CATEGORY_META = {
  attack: { label: 'Attack', prefix: 'Att' },
  defence: { label: 'Defense', prefix: 'Def' }
}
export const normalizeCategory = (c, hintName = '') =>
  c === 'defence' || c === 'attack'
    ? c
    : /^\s*def/i.test(hintName)
      ? 'defence'
      : 'attack'

const SIDE_IDS = ['ally', 'enemy']

export const SIDE_META = {
  ally: { label: 'Our Guild', color: '#3b82f6' },
  enemy: { label: 'Enemy', color: '#f43f5e' }
}

// Guild War: 30 players per side, squads of 5 or 10.
export const MAX_PLAYERS_PER_SIDE = 30
export const DEFAULT_SQUAD_SIZE = 5
export const SQUAD_SIZE_PRESETS = [5, 10]

// Per-team accent (roster cards) — side-specific so a team reads as "ours"
// (cool) vs "enemy" (warm); each team in a side gets its own shade.
const SQUAD_COLORS = {
  ally: ['#60a5fa', '#22d3ee', '#818cf8', '#38bdf8', '#2dd4bf', '#a78bfa', '#93c5fd'],
  enemy: ['#f87171', '#fb923c', '#f472b6', '#fbbf24', '#fca5a5', '#e879f9', '#f97316']
}

export const squadColorForIndex = (i, side = 'ally') => {
  const p = SQUAD_COLORS[side] ?? SQUAD_COLORS.ally
  return p[((i % p.length) + p.length) % p.length]
}

// Flat swatch list for the per-team colour override picker (SquadCard) — both
// sides' shades, so an override isn't limited to the auto-assigned one.
export const TEAM_SWATCHES = [...SQUAD_COLORS.ally, ...SQUAD_COLORS.enemy]

// Shared map-pill colour: every Attack pill on a guild looks the same, every
// Defense pill looks the same — 4 in total. Both of a guild's colours keep its
// temperature (ours = cool, enemy = warm) but Attack vs Defense are clearly
// different hues: our Attack = blue / Defense = teal, enemy Attack = red /
// Defense = orange.
const PILL_COLORS = {
  ally: { attack: '#3b82f6', defence: '#2dd4bf' },
  enemy: { attack: '#ef4444', defence: '#f97316' }
}
export const pillColor = (side = 'ally', category = 'attack') =>
  (PILL_COLORS[side] ?? PILL_COLORS.ally)[category === 'defence' ? 'defence' : 'attack']

export function emptyStrategy() {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      name: 'Untitled strategy',
      createdAt: now,
      updatedAt: now,
      notes: ''
    },
    config: {
      sides: SIDE_IDS.map((id) => ({ id, ...SIDE_META[id] })),
      roles: ROLES,
      lanes: LANES,
      defaultSquadSize: DEFAULT_SQUAD_SIZE
    },
    squads: [],
    players: [],
    items: [],
    phases: []
  }
}

const num = (v, fallback) => (Number.isFinite(+v) ? +v : fallback)
const pointDict = (d) => {
  const out = {}
  for (const [id, p] of Object.entries(d || {})) {
    if (p && Number.isFinite(+p.x) && Number.isFinite(+p.y)) {
      out[id] = { x: +p.x, y: +p.y }
    }
  }
  return out
}
const arr = (v) => (Array.isArray(v) ? v : [])
const EASINGS = ['inout', 'linear', 'in', 'out']

// A phase is a keyframe over the items:
//   pos    { [itemId]: { x, y } }   where the item sits at this phase
//   hidden [itemId]                 items not shown in this phase
//   paths  { [pillId]: drawingId }  a pill walks that drawing during the phase
// v1 phases kept these in `board` split per entity kind.
function normalizePhase(p, i) {
  const b = p?.board
  return {
    id: p?.id || `ph_${i}`,
    name: typeof p?.name === 'string' && p.name ? p.name : `Phase ${i + 1}`,
    duration: Math.max(0, num(p?.duration, 2000)),
    hold: Math.max(0, num(p?.hold, 0)),
    easing: EASINGS.includes(p?.easing) ? p.easing : 'inout',
    pos: pointDict(b ? { ...b.squads, ...b.markers } : p?.pos),
    hidden: b
      ? [...new Set([b.hiddenSquads, b.hiddenMarkers, b.hiddenDrawings, b.hiddenNotes].flatMap(arr))]
      : arr(p?.hidden),
    paths: p?.paths && typeof p.paths === 'object' ? { ...p.paths } : {}
  }
}

// v1 kept each kind of map entity in its own array, and a placed team as
// squad.token. Fold them into one items list (pills newest-on-top by token.at).
function itemsFromV1(input) {
  const pills = arr(input.squads)
    .filter((q) => q?.token && Number.isFinite(+q.token.x))
    .sort((a, b) => (a.token.at || 0) - (b.token.at || 0))
    .map((q) => ({ id: q.id, type: 'pill', x: +q.token.x, y: +q.token.y }))
  const typed = (list, type) => arr(list).map(({ type: _t, ...rest }) => ({ ...rest, type }))
  return [
    ...pills,
    ...typed(input.markers, 'marker'),
    ...typed(input.drawings, 'drawing'),
    ...typed(input.notes, 'note'),
    ...typed(input.timers, 'timer')
  ]
}

// Bring any older / partial document up to the current shape. Kept intentionally
// forgiving so a hand-edited or older export still loads.
export function migrateStrategy(input) {
  const base = emptyStrategy()
  if (!input || typeof input !== 'object') return base

  const merged = {
    ...base,
    ...input,
    schemaVersion: SCHEMA_VERSION,
    meta: { ...base.meta, ...(input.meta || {}), updatedAt: new Date().toISOString() },
    config: { ...base.config, ...(input.config || {}) },
    view: { ...base.view, ...(input.view || {}) }
  }

  merged.squads = Array.isArray(input.squads)
    ? input.squads.map((q) => ({
        id: q.id,
        side: q.side === 'enemy' ? 'enemy' : 'ally',
        category: normalizeCategory(q.category, q.name),
        name: typeof q.name === 'string' ? q.name : '',
        lane: q.lane ?? 'Unassigned',
        targetSize: Number(q.targetSize) || DEFAULT_SQUAD_SIZE,
        color: q.color ?? squadColorForIndex(0, q.side)
      }))
    : []
  merged.players = Array.isArray(input.players)
    ? input.players.map((p) => ({
        id: p.id,
        side: p.side === 'enemy' ? 'enemy' : 'ally',
        role: ROLES.includes(p.role) ? p.role : 'DPS', // e.g. retired "Flex"
        squadId: p.squadId ?? null
      }))
    : []
  merged.phases = arr(input.phases).map(normalizePhase)
  // view (zoom/pan) is UI-only, kept outside the document; the rest are v1
  // per-kind arrays now folded into items
  for (const k of ['view', 'markers', 'drawings', 'notes', 'timers']) delete merged[k]

  // Every player belongs to a team; drop any that don't (incl. dangling refs).
  const squadIds = new Set(merged.squads.map((s) => s.id))
  merged.players = merged.players.filter((p) => p.squadId && squadIds.has(p.squadId))

  // Items: keep known types with an id; a pill must still have its team.
  merged.items = (Array.isArray(input.items) ? input.items : itemsFromV1(input)).filter(
    (it) =>
      it?.id && ITEM_TYPES.includes(it.type) && (it.type !== 'pill' || squadIds.has(it.id))
  )

  return merged
}
