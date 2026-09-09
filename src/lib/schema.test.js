import { describe, it, expect } from 'vitest'
import { emptyStrategy, migrateStrategy } from './schema.js'

describe('emptyStrategy', () => {
  it('has the tactical arrays and no view', () => {
    const s = emptyStrategy()
    expect(s.squads).toEqual([])
    expect(s.markers).toEqual([])
    expect(s.drawings).toEqual([])
    expect(s.notes).toEqual([])
    expect(s.timers).toEqual([])
    expect(s.view).toBeUndefined()
  })
})

describe('migrateStrategy', () => {
  it('returns a fresh doc for junk input', () => {
    expect(migrateStrategy(null).squads).toEqual([])
    expect(migrateStrategy(42).players).toEqual([])
  })

  it('coerces retired roles (e.g. Flex) to DPS', () => {
    const out = migrateStrategy({
      squads: [{ id: 'q1', side: 'ally', name: 'T', lane: 'Top', targetSize: 5 }],
      players: [{ id: 'p1', side: 'ally', role: 'Flex', squadId: 'q1' }]
    })
    expect(out.players[0].role).toBe('DPS')
  })

  it('drops players that are not in a valid team', () => {
    const out = migrateStrategy({
      squads: [{ id: 'q1', side: 'ally', name: 'T', lane: 'Top', targetSize: 5 }],
      players: [
        { id: 'p1', side: 'ally', role: 'Tank', squadId: 'q1' },
        { id: 'p2', side: 'ally', role: 'Tank', squadId: null },
        { id: 'p3', side: 'ally', role: 'Tank', squadId: 'ghost' }
      ]
    })
    expect(out.players.map((p) => p.id)).toEqual(['p1'])
  })

  it('normalises old squads: token + name kept, dead fields dropped, category added', () => {
    const out = migrateStrategy({
      squads: [
        { id: 'q1', side: 'ally', name: 'Vanguard', lane: 'Top', targetSize: 5, leaderId: 'x', token: { x: 1, y: 2 } }
      ],
      players: [{ id: 'p1', side: 'ally', role: 'Tank', squadId: 'q1' }]
    })
    expect(out.squads[0]).not.toHaveProperty('leaderId')
    expect(out.squads[0].name).toBe('Vanguard')
    expect(out.squads[0].category).toBe('attack')
    expect(out.squads[0].token).toEqual({ x: 1, y: 2 })
  })

  it('a squad with no name migrates to a blank name', () => {
    const out = migrateStrategy({ squads: [{ id: 'q1', side: 'ally', category: 'attack', targetSize: 5 }] })
    expect(out.squads[0].name).toBe('')
  })

  it('infers defence category from a legacy "Def ..." team name', () => {
    const out = migrateStrategy({
      squads: [
        { id: 'q1', side: 'ally', name: 'Def 2', targetSize: 5 },
        { id: 'q2', side: 'ally', name: 'Push top', targetSize: 5 },
        { id: 'q3', side: 'ally', category: 'defence', name: 'whatever', targetSize: 5 }
      ]
    })
    expect(out.squads.map((q) => q.category)).toEqual(['defence', 'attack', 'defence'])
  })

  it('drops dead player fields (name / weapons / token)', () => {
    const out = migrateStrategy({
      squads: [{ id: 'q1', side: 'ally', name: 'T', lane: 'Top', targetSize: 5 }],
      players: [
        { id: 'p1', side: 'ally', role: 'Tank', squadId: 'q1', name: 'Bob', weapons: ['Bow'], token: { x: 0, y: 0 } }
      ]
    })
    expect(out.players[0]).toEqual({ id: 'p1', side: 'ally', role: 'Tank', squadId: 'q1' })
  })

  it('strips a stale view key', () => {
    expect(migrateStrategy({ view: { zoom: 3 } }).view).toBeUndefined()
  })
})
