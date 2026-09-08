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

  it('landing exactly on a keyframe rests on THAT phase, not the next transition', () => {
    // t = phaseArrivalTime(phases, 0) — where selectPhase parks you.
    const p = [
      { id: 'p1', duration: 1000, hold: 0, board: { squads: {}, markers: {}, hiddenDrawings: ['a'] } },
      { id: 'p2', duration: 1000, hold: 0, board: { squads: {}, markers: {}, hiddenDrawings: ['b'] } }
    ]
    const f = frameAt(start, p, 1000)
    expect(f.phaseIndex).toBe(0)
    expect(f.hiddenDrawings.has('a')).toBe(true)
    expect(f.hiddenDrawings.has('b')).toBe(false)
  })

  it('exposes hiddenMarkers / hiddenSquads sets', () => {
    const p = [
      {
        id: 'p1',
        duration: 1000,
        hold: 0,
        board: { squads: {}, markers: {}, hiddenMarkers: ['m1'], hiddenSquads: ['s1'] }
      }
    ]
    const f = frameAt(start, p, 500)
    expect(f.hiddenMarkers.has('m1')).toBe(true)
    expect(f.hiddenSquads.has('s1')).toBe(true)
    // empty at Start
    expect(frameAt(start, p, 0).hiddenMarkers.size).toBe(0)
    expect(frameAt(start, p, 0).hiddenSquads.size).toBe(0)
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

  it('exposes per-phase hidden sets (empty at Start)', () => {
    const p = [
      {
        id: 'x',
        duration: 1000,
        hold: 0,
        board: { squads: {}, markers: {}, hiddenDrawings: ['d1'], hiddenNotes: ['n1'] }
      }
    ]
    expect(frameAt(start, p, 0).hiddenDrawings.size).toBe(0)
    const mid = frameAt(start, p, 500)
    expect(mid.hiddenDrawings.has('d1')).toBe(true)
    expect(mid.hiddenNotes.has('n1')).toBe(true)
    expect(frameAt(start, p, 9999).hiddenDrawings.has('d1')).toBe(true)
  })

  it('a squad only in the target pops to its target position', () => {
    const p = [{ id: 'x', duration: 1000, hold: 0, board: { squads: { c: { x: 50, y: 50 } }, markers: {} } }]
    const f = frameAt(start, p, 400)
    expect(f.squads.c).toEqual({ x: 50, y: 50 })
  })

  it('honours a per-phase easing', () => {
    const p = [{ id: 'x', duration: 1000, hold: 0, easing: 'linear', board: { squads: { a: { x: 100, y: 0 } }, markers: {} } }]
    // linear: quarter time -> quarter distance
    expect(frameAt(start, p, 250).squads.a.x).toBeCloseTo(25)
  })

  it('a squad follows an assigned drawn path along its arc length', () => {
    const p = [{ id: 'x', duration: 1000, hold: 0, board: { squads: {}, markers: {} } }]
    // L-shaped path: (0,0) -> (0,100) -> (100,100), total length 200
    const polys = { x: { a: [0, 0, 0, 100, 100, 100] } }
    const half = frameAt(start, p, 500, polys) // eased(0.5)=0.5 -> 100 along -> corner
    expect(half.squads.a).toEqual({ x: 0, y: 100 })
    const end = frameAt(start, p, 1200, polys) // past end -> path end
    expect(end.squads.a).toEqual({ x: 100, y: 100 })
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
  it('builds squad/marker dicts from live state', () => {
    const sf = startFrame(
      [{ id: 'a', token: { x: 1, y: 2 } }],
      [{ id: 'm', x: 3, y: 4 }]
    )
    expect(sf).toEqual({ squads: { a: { x: 1, y: 2 } }, markers: { m: { x: 3, y: 4 } } })
  })
})
