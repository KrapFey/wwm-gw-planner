import { describe, it, expect } from 'vitest'
import { frameAt, totalDuration, phaseArrivalTime, startFrame } from './playback.js'

const start = {
  squads: { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } },
  markers: {}
}
const phases = [
  { id: 'p1', duration: 1000, hold: 0, board: { squads: { a: { x: 10, y: 0 }, b: { x: 100, y: 0 } }, markers: {} } },
  { id: 'p2', duration: 1000, hold: 500, board: { squads: { a: { x: 10, y: 0 }, b: { x: 0, y: 0 } }, markers: {} } }
]

describe('timeline math', () => {
  it('totalDuration sums transitions + holds', () => {
    expect(totalDuration(phases)).toBe(2500)
  })
  it('phaseArrivalTime is cumulative, excluding the target phase hold', () => {
    expect(phaseArrivalTime(phases, 0)).toBe(1000)
    expect(phaseArrivalTime(phases, 1)).toBe(2000)
  })
})

describe('frameAt', () => {
  it('t=0 returns the Start board', () => {
    const f = frameAt(start, phases, 0)
    expect(f.squads.a).toEqual({ x: 0, y: 0 })
    expect(f.phaseIndex).toBe(0)
  })

  it('mid first transition interpolates (eased)', () => {
    const f = frameAt(start, phases, 500) // eased(0.5) = 0.5
    expect(f.squads.a.x).toBeCloseTo(5)
    expect(f.squads.b.x).toBe(100) // unchanged in p1
  })

  it('at the arrival of phase 1 the board equals p1', () => {
    const f = frameAt(start, phases, 1000)
    expect(f.squads.a).toEqual({ x: 10, y: 0 })
  })

  it('during a hold the board rests on that phase', () => {
    const f = frameAt(start, phases, 2200) // 2000 arrival + into the 500ms hold
    expect(f.squads.b).toEqual({ x: 0, y: 0 })
    expect(f.phaseIndex).toBe(1)
  })

  it('past the end rests on the last phase', () => {
    const f = frameAt(start, phases, 99999)
    expect(f.squads.b).toEqual({ x: 0, y: 0 })
  })

  it('with no phases returns Start', () => {
    const f = frameAt(start, [], 500)
    expect(f.squads.a).toEqual({ x: 0, y: 0 })
    expect(f.phaseIndex).toBe(-1)
  })

  it('a squad only in the target pops to its target position', () => {
    const p = [{ id: 'x', duration: 1000, hold: 0, board: { squads: { c: { x: 50, y: 50 } }, markers: {} } }]
    const f = frameAt(start, p, 400)
    expect(f.squads.c).toEqual({ x: 50, y: 50 })
  })
})

describe('startFrame', () => {
  it('builds squad/marker dicts from live state', () => {
    const sf = startFrame(
      [{ id: 'a', token: { x: 1, y: 2 } }],
      [{ id: 'm', x: 3, y: 4 }]
    )
    expect(sf).toEqual({ squads: { a: { x: 1, y: 2 } }, markers: { m: { x: 3, y: 4 } } })
  })
})
