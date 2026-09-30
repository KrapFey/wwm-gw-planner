import { describe, it, expect } from 'vitest'
import {
  frameAt,
  totalDuration,
  phaseArrivalTime,
  activePhaseIndex,
  startFrame,
  pointAtFraction,
  easingFn
} from './playback.js'

const start = { pos: { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } } }
const phases = [
  { id: 'p1', duration: 1000, hold: 0, pos: { a: { x: 10, y: 0 }, b: { x: 100, y: 0 } }, hidden: [] },
  { id: 'p2', duration: 1000, hold: 500, pos: { a: { x: 10, y: 0 }, b: { x: 0, y: 0 } }, hidden: [] }
]

describe('timeline math', () => {
  it('totalDuration sums transitions + holds', () => {
    expect(totalDuration(phases)).toBe(2500)
  })
  it('phaseArrivalTime is cumulative, excluding the target phase hold', () => {
    expect(phaseArrivalTime(phases, 0)).toBe(1000)
    expect(phaseArrivalTime(phases, 1)).toBe(2000)
  })

  it('activePhaseIndex: landing exactly on a keyframe stays on it (holds are 0)', () => {
    expect(activePhaseIndex(phases, 0)).toBe(0)
    expect(activePhaseIndex(phases, 500)).toBe(0)
    expect(activePhaseIndex(phases, 1000)).toBe(0) // arrival of phase 0, not 1
    expect(activePhaseIndex(phases, 1500)).toBe(1)
    expect(activePhaseIndex(phases, 2000)).toBe(1) // arrival of phase 1
    expect(activePhaseIndex(phases, 9999)).toBe(1)
    expect(activePhaseIndex([], 5)).toBe(-1)
  })
})

describe('frameAt', () => {
  const ph = (id, pos = {}, hidden = [], extra = {}) => ({ id, duration: 1000, hold: 0, pos, hidden, ...extra })

  it('t=0 returns the Start board', () => {
    const f = frameAt(start, phases, 0)
    expect(f.pos.a).toEqual({ x: 0, y: 0 })
    expect(f.phaseIndex).toBe(0)
  })

  it('mid first transition interpolates (eased)', () => {
    const f = frameAt(start, phases, 500) // eased(0.5) = 0.5
    expect(f.pos.a.x).toBeCloseTo(5)
    expect(f.pos.b.x).toBe(100) // unchanged in p1
  })

  it('at the arrival of phase 1 the board equals p1', () => {
    expect(frameAt(start, phases, 1000).pos.a).toEqual({ x: 10, y: 0 })
  })

  it('landing exactly on a keyframe rests on THAT phase, not the next transition', () => {
    // t = phaseArrivalTime(phases, 0) — where selectPhase parks you.
    const f = frameAt(start, [ph('p1', {}, ['a']), ph('p2', {}, ['b'])], 1000)
    expect(f.phaseIndex).toBe(0)
    expect(f.hidden.has('a')).toBe(true)
    expect(f.hidden.has('b')).toBe(false)
  })

  it('exposes the hidden set (empty at Start and with no phases)', () => {
    const p = [ph('p1', {}, ['m1', 's1'])]
    expect(frameAt(start, p, 500).hidden.has('m1')).toBe(true)
    expect(frameAt(start, p, 9999).hidden.has('s1')).toBe(true)
    expect(frameAt(start, p, 0).hidden.size).toBe(0)
    expect(frameAt(start, [], 500).hidden.size).toBe(0)
  })

  it('during a hold the board rests on that phase', () => {
    const f = frameAt(start, phases, 2200) // 2000 arrival + into the 500ms hold
    expect(f.pos.b).toEqual({ x: 0, y: 0 })
    expect(f.phaseIndex).toBe(1)
  })

  it('past the end rests on the last phase', () => {
    expect(frameAt(start, phases, 99999).pos.b).toEqual({ x: 0, y: 0 })
  })

  it('with no phases returns Start', () => {
    const f = frameAt(start, [], 500)
    expect(f.pos.a).toEqual({ x: 0, y: 0 })
    expect(f.phaseIndex).toBe(-1)
  })

  it('an item only in the target pops to its target position', () => {
    expect(frameAt(start, [ph('x', { c: { x: 50, y: 50 } })], 400).pos.c).toEqual({ x: 50, y: 50 })
  })

  it('honours a per-phase easing', () => {
    const p = [ph('x', { a: { x: 100, y: 0 } }, [], { easing: 'linear' })]
    // linear: quarter time -> quarter distance
    expect(frameAt(start, p, 250).pos.a.x).toBeCloseTo(25)
  })

  it('a pill follows an assigned drawn path along its arc length', () => {
    // L-shaped path: (0,0) -> (0,100) -> (100,100), total length 200
    const polys = { x: { a: [0, 0, 0, 100, 100, 100] } }
    const p = [ph('x')]
    expect(frameAt(start, p, 500, polys).pos.a).toEqual({ x: 0, y: 100 }) // eased 0.5 -> corner
    expect(frameAt(start, p, 1200, polys).pos.a).toEqual({ x: 100, y: 100 }) // past end
  })
})

describe('pointAtFraction', () => {
  it('interpolates along a polyline by arc length', () => {
    const line = [0, 0, 10, 0, 10, 10] // len 20
    expect(pointAtFraction(line, 0)).toEqual({ x: 0, y: 0 })
    expect(pointAtFraction(line, 0.25)).toEqual({ x: 5, y: 0 })
    expect(pointAtFraction(line, 0.5)).toEqual({ x: 10, y: 0 })
    expect(pointAtFraction(line, 1)).toEqual({ x: 10, y: 10 })
    expect(pointAtFraction(line, 2)).toEqual({ x: 10, y: 10 }) // clamped
  })
  it('degenerate inputs', () => {
    expect(pointAtFraction([5, 7], 0.5)).toEqual({ x: 5, y: 7 })
    expect(pointAtFraction(null, 0.5)).toBeNull()
  })
})

describe('easingFn', () => {
  it('linear is identity, unknown falls back to ease-in-out', () => {
    expect(easingFn('linear')(0.3)).toBe(0.3)
    expect(easingFn('nope')(0.5)).toBeCloseTo(0.5)
    expect(easingFn('in')(0.5)).toBeCloseTo(0.125)
  })
})

describe('startFrame', () => {
  it('keys every positioned item by id (drawings have no x/y)', () => {
    const sf = startFrame([
      { id: 'a', type: 'pill', x: 1, y: 2 },
      { id: 'm', type: 'marker', x: 3, y: 4 },
      { id: 'd', type: 'drawing', points: [0, 0, 1, 1] }
    ])
    expect(sf).toEqual({ pos: { a: { x: 1, y: 2 }, m: { x: 3, y: 4 } } })
  })
})
