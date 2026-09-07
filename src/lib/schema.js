// Single source of truth for the strategy document shape + defaults + migration.
//
// A "strategy" is the whole planning document. It is what gets autosaved to
// localStorage and what export/import reads and writes.

export const SCHEMA_VERSION = 1

export const ROLES = ['Tank', 'DPS', 'Healer']

export const LANES = ['Top', 'Mid', 'Bottom']

// Teams are organised under a guild into Attack / Defence. The category is
// fixed when the team is created and drives its auto name (Att 1, Def 1, …).
export const CATEGORIES = ['attack', 'defence']
export const CATEGORY_META = {
  attack: { label: 'Attack', prefix: 'Att' },
  defence: { label: 'Defence', prefix: 'Def' }
}
export const normalizeCategory = (c, hintName = '') =>
  c === 'defence' || c === 'attack'
    ? c
    : /^\s*def/i.test(hintName)
      ? 'defence'
      : 'attack'

export const SIDE_IDS = ['ally', 'enemy']

export const SIDE_META = {
  ally: { label: 'Our Guild', color: '#3b82f6' },
  enemy: { label: 'Enemy', color: '#f43f5e' }
}

// Guild War: 30 players per side, squads of 5 or 10.
export const MAX_PLAYERS_PER_SIDE = 30
export const DEFAULT_SQUAD_SIZE = 5
export const SQUAD_SIZE_PRESETS = [5, 10]

// Team accent palettes are side-specific so a team reads as "ours" (cool) vs
// "enemy" (warm) even before you notice its border.
const SQUAD_COLORS = {
  ally: ['#60a5fa', '#22d3ee', '#818cf8', '#38bdf8', '#2dd4bf', '#a78bfa', '#93c5fd'],
  enemy: ['#f87171', '#fb923c', '#f472b6', '#fbbf24', '#fca5a5', '#e879f9', '#f97316']
}

export const squadColorForIndex = (i, side = 'ally') => {
  const p = SQUAD_COLORS[side] ?? SQUAD_COLORS.ally
  return p[((i % p.length) + p.length) % p.length]
}

export function makeSquad({
  side,
  category = 'attack',
  lane = 'Unassigned',
  targetSize = DEFAULT_SQUAD_SIZE,
  color
}) {
  return {
    id: undefined, // filled by store
    side,
    category: normalizeCategory(category),
    lane,
    targetSize,
    color: color ?? squadColorForIndex(0, side),
    token: null
  }
}

// A player is just a role slot within a team.
export function makePlayer({ side, role = 'DPS', squadId = null }) {
  return {
    id: undefined, // filled by store
    side,
    role,
    squadId
  }
}

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
    markers: [],
    drawings: [],
    notes: [],
    timers: [],
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
export function normalizePhase(p, i) {
  return {
    id: p?.id || `ph_${i}`,
    name: typeof p?.name === 'string' && p.name ? p.name : `Phase ${i + 1}`,
    duration: Math.max(0, num(p?.duration, 2000)),
    hold: Math.max(0, num(p?.hold, 0)),
    board: {
      squads: pointDict(p?.board?.squads),
      markers: pointDict(p?.board?.markers),
      hiddenDrawings: Array.isArray(p?.board?.hiddenDrawings) ? p.board.hiddenDrawings : [],
      hiddenNotes: Array.isArray(p?.board?.hiddenNotes) ? p.board.hiddenNotes : [],
      hiddenMarkers: Array.isArray(p?.board?.hiddenMarkers) ? p.board.hiddenMarkers : [],
      hiddenSquads: Array.isArray(p?.board?.hiddenSquads) ? p.board.hiddenSquads : []
    },
    paths: p?.paths && typeof p.paths === 'object' ? { ...p.paths } : {}
  }
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
        lane: q.lane ?? 'Unassigned',
        targetSize: Number(q.targetSize) || DEFAULT_SQUAD_SIZE,
        color: q.color ?? squadColorForIndex(0, q.side),
        token: q.token && typeof q.token === 'object' ? q.token : null
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
  merged.markers = Array.isArray(input.markers) ? input.markers : []
  merged.drawings = Array.isArray(input.drawings) ? input.drawings : []
  merged.notes = Array.isArray(input.notes) ? input.notes : []
  merged.timers = Array.isArray(input.timers) ? input.timers : []
  merged.phases = Array.isArray(input.phases) ? input.phases.map(normalizePhase) : []
  delete merged.view // view (zoom/pan) is UI-only, kept outside the document

  // Every player belongs to a team; drop any that don't (incl. dangling refs).
  const squadIds = new Set(merged.squads.map((s) => s.id))
  merged.players = merged.players.filter((p) => p.squadId && squadIds.has(p.squadId))

  return merged
}
