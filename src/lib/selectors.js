// Pure derived-data helpers for the roster / team-organization views.
import { ROLES, LANES, MAX_PLAYERS_PER_SIDE, CATEGORY_META } from './schema'

const zeroRoleTally = () => Object.fromEntries(ROLES.map((r) => [r, 0]))

// Teams are numbered 1..n within their (side, category); the default name
// follows that ordinal, so deleting an unnamed team renumbers the rest.
export function squadOrdinal(strategy, squad) {
  const peers = strategy.squads.filter(
    (q) => q.side === squad.side && q.category === squad.category
  )
  return peers.findIndex((q) => q.id === squad.id) + 1
}

export function squadDefaultName(strategy, squad) {
  const meta = CATEGORY_META[squad.category] ?? CATEGORY_META.attack
  return `${meta.prefix} ${squadOrdinal(strategy, squad)}`
}

// Custom name if the team has one, otherwise the default ordinal name.
export function squadLabel(strategy, squad) {
  const custom = typeof squad.name === 'string' ? squad.name.trim() : ''
  return custom || squadDefaultName(strategy, squad)
}

function squadPlayers(strategy, squadId) {
  return strategy.players.filter((p) => p.squadId === squadId)
}

export function squadStats(strategy, squad) {
  const players = squadPlayers(strategy, squad.id)
  const byRole = zeroRoleTally()
  for (const p of players) byRole[p.role] = (byRole[p.role] ?? 0) + 1

  const fill = players.length
  const over = fill > squad.targetSize

  const warnings = []
  if (over) warnings.push(`${fill}/${squad.targetSize} — over target size`)
  if (fill > 0 && byRole.Healer === 0) warnings.push('No healer assigned')
  if (fill > 0 && byRole.Tank === 0) warnings.push('No tank assigned')
  if (squad.lane === 'Unassigned') warnings.push('No lane assigned')

  return { players, byRole, fill, over, warnings }
}

export function sideSummary(strategy, sideId) {
  const players = strategy.players.filter((p) => p.side === sideId)
  const squads = strategy.squads.filter((q) => q.side === sideId)

  const byRole = zeroRoleTally()
  for (const p of players) byRole[p.role] = (byRole[p.role] ?? 0) + 1

  const byLane = Object.fromEntries([...LANES, 'Unassigned'].map((l) => [l, 0]))
  for (const q of squads) {
    const n = squadPlayers(strategy, q.id).length
    byLane[q.lane] = (byLane[q.lane] ?? 0) + n
  }

  const unassigned = players.filter((p) => !p.squadId).length

  return {
    total: players.length,
    max: MAX_PLAYERS_PER_SIDE,
    over: players.length > MAX_PLAYERS_PER_SIDE,
    squadCount: squads.length,
    byRole,
    byLane,
    unassigned
  }
}

export const ROLE_ICON = {
  Tank: '🛡',
  DPS: '⚔',
  Healer: '✚'
}
