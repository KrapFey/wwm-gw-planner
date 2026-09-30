import { describe, it, expect } from 'vitest'
import { emptyStrategy, migrateStrategy } from './schema.js'

describe('emptyStrategy', () => {
  it('has squads / players / items / phases and no view', () => {
    const s = emptyStrategy()
    expect(s.squads).toEqual([])
    expect(s.items).toEqual([])
    expect(s.phases).toEqual([])
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

  it('normalises old squads: name kept, dead fields dropped, category added', () => {
    const out = migrateStrategy({
      squads: [
        { id: 'q1', side: 'ally', name: 'Vanguard', lane: 'Top', targetSize: 5, leaderId: 'x', token: { x: 1, y: 2 } }
      ],
      players: [{ id: 'p1', side: 'ally', role: 'Tank', squadId: 'q1' }]
    })
    expect(out.squads[0]).not.toHaveProperty('leaderId')
    expect(out.squads[0].name).toBe('Vanguard')
    expect(out.squads[0].category).toBe('attack')
    expect(out.squads[0]).not.toHaveProperty('token')
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

  it('v1 -> v2: per-kind arrays + squad tokens fold into items, newest pill last', () => {
    const out = migrateStrategy({
      squads: [
        { id: 'q1', side: 'ally', targetSize: 5, token: { x: 1, y: 2, at: 20 } },
        { id: 'q2', side: 'ally', targetSize: 5, token: { x: 3, y: 4, at: 10 } },
        { id: 'q3', side: 'ally', targetSize: 5, token: null }
      ],
      markers: [{ id: 'm1', kind: 'attack', x: 5, y: 6 }],
      drawings: [{ id: 'd1', tool: 'pen', color: '#fff', width: 3, points: [0, 0, 1, 1] }],
      notes: [{ id: 'n1', x: 7, y: 8, text: 'hi', color: '#fde68a' }],
      timers: [{ id: 't1', x: 9, y: 9, seconds: 60 }]
    })
    expect(out.items.map((i) => [i.id, i.type])).toEqual([
      ['q2', 'pill'],
      ['q1', 'pill'],
      ['m1', 'marker'],
      ['d1', 'drawing'],
      ['n1', 'note'],
      ['t1', 'timer']
    ])
    expect(out.items[1]).toEqual({ id: 'q1', type: 'pill', x: 1, y: 2 })
    for (const k of ['markers', 'drawings', 'notes', 'timers']) expect(out).not.toHaveProperty(k)
  })

  it('v1 -> v2: a phase board becomes pos / hidden, paths kept', () => {
    const out = migrateStrategy({
      squads: [{ id: 'q1', side: 'ally', targetSize: 5, token: { x: 0, y: 0 } }],
      phases: [
        {
          id: 'p1',
          board: {
            squads: { q1: { x: 1, y: 1 } },
            markers: { m1: { x: 2, y: 2 } },
            hiddenSquads: ['q1'],
            hiddenDrawings: ['d1'],
            hiddenNotes: ['n1'],
            hiddenMarkers: []
          },
          paths: { q1: 'd1' }
        }
      ]
    })
    const p = out.phases[0]
    expect(p.pos).toEqual({ q1: { x: 1, y: 1 }, m1: { x: 2, y: 2 } })
    expect(p.hidden.sort()).toEqual(['d1', 'n1', 'q1'])
    expect(p.paths).toEqual({ q1: 'd1' })
    expect(p).not.toHaveProperty('board')
  })

  it('v2 docs pass through; unknown types and orphan pills are dropped', () => {
    const out = migrateStrategy({
      squads: [{ id: 'q1', side: 'ally', targetSize: 5 }],
      items: [
        { id: 'q1', type: 'pill', x: 1, y: 1 },
        { id: 'gone', type: 'pill', x: 1, y: 1 },
        { id: 'z', type: 'wat' },
        { id: 'm', type: 'marker', kind: 'hold', x: 0, y: 0 }
      ],
      phases: [{ id: 'p', pos: { q1: { x: 5, y: 5 } }, hidden: ['m'], paths: {} }]
    })
    expect(out.items.map((i) => i.id)).toEqual(['q1', 'm'])
    expect(out.phases[0]).toMatchObject({ pos: { q1: { x: 5, y: 5 } }, hidden: ['m'] })
  })
})
