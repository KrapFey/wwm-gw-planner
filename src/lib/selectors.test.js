import { describe, it, expect } from 'vitest'
import { squadStats, sideSummary } from './selectors.js'

const strat = () => ({
  squads: [
    { id: 'q1', side: 'ally', name: 'Top', lane: 'Top', targetSize: 3 },
    { id: 'q2', side: 'ally', name: 'Bot', lane: 'Unassigned', targetSize: 5 }
  ],
  players: [
    { id: 'p1', side: 'ally', role: 'Tank', squadId: 'q1' },
    { id: 'p2', side: 'ally', role: 'DPS', squadId: 'q1' },
    { id: 'p3', side: 'ally', role: 'DPS', squadId: 'q1' },
    { id: 'p4', side: 'ally', role: 'DPS', squadId: 'q1' },
    { id: 'p5', side: 'ally', role: 'Healer', squadId: 'q2' }
  ]
})

describe('squadStats', () => {
  it('counts fill and role breakdown', () => {
    const st = squadStats(strat(), strat().squads[0])
    expect(st.fill).toBe(4)
    expect(st.byRole).toEqual({ Tank: 1, DPS: 3, Healer: 0 })
  })

  it('flags over-target and a missing healer', () => {
    const st = squadStats(strat(), strat().squads[0])
    expect(st.over).toBe(true)
    expect(st.warnings.some((w) => /over target/.test(w))).toBe(true)
    expect(st.warnings).toContain('No healer assigned')
  })

  it('flags an unassigned lane', () => {
    const st = squadStats(strat(), strat().squads[1])
    expect(st.warnings).toContain('No lane assigned')
    expect(st.over).toBe(false)
  })
})

describe('sideSummary', () => {
  it('totals players and per-lane distribution', () => {
    const sum = sideSummary(strat(), 'ally')
    expect(sum.total).toBe(5)
    expect(sum.byRole).toEqual({ Tank: 1, DPS: 3, Healer: 1 })
    expect(sum.byLane.Top).toBe(4)
    expect(sum.byLane.Unassigned).toBe(1)
  })

  it('reports the empty enemy side', () => {
    const sum = sideSummary(strat(), 'enemy')
    expect(sum.total).toBe(0)
    expect(sum.over).toBe(false)
  })
})
