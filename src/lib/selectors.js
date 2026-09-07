// Pure derived-data helpers for the roster / team-organization views.
import { ROLES, LANES, MAX_PLAYERS_PER_SIDE } from './schema'

const zeroRoleTally = () => Object.fromEntries(ROLES.map((r) => [r, 0]))

export function squadPlayers(strategy, squadId) {
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
