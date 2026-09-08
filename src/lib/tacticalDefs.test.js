import { describe, it, expect } from 'vitest'
import {
  withAlpha,
  SHAPE_TOOLS,
  BOX_DRAW_TOOLS,
  DRAW_TOOL_LABEL,
  fmtClock,
  reduceCurvedArrow,
  curvedArrowAnchors,
  drawingPolyline
} from './tacticalDefs.js'

describe('withAlpha', () => {
  it('converts a hex string to rgba()', () => {
    expect(withAlpha('#3b82f6', 0.16)).toBe('rgba(59, 130, 246, 0.16)')
    expect(withAlpha('ffffff', 1)).toBe('rgba(255, 255, 255, 1)')
  })
  it('passes through anything that is not a 6-digit hex', () => {
    expect(withAlpha('rgba(0,0,0,0.5)', 0.2)).toBe('rgba(0,0,0,0.5)')
    expect(withAlpha(undefined, 0.2)).toBe(undefined)
  })
})

describe('draw tool tables', () => {
  it('the straight arrow + shapes are box-drawn; pen + curved arrow are not', () => {
    expect(BOX_DRAW_TOOLS).toEqual(['arrow', ...SHAPE_TOOLS])
    expect(BOX_DRAW_TOOLS).not.toContain('pen')
    expect(BOX_DRAW_TOOLS).not.toContain('carrow')
  })
  it('every shape tool has a label', () => {
    for (const t of SHAPE_TOOLS) expect(typeof DRAW_TOOL_LABEL[t]).toBe('string')
  })
})

describe('curved arrow geometry', () => {
  it('reduceCurvedArrow keeps the ends and takes the farthest-off-chord apex', () => {
    // drag from (0,0) to (100,0), bulging up to y = -40 in the middle
    const drag = [0, 0, 25, -20, 50, -40, 75, -20, 100, 0]
    expect(reduceCurvedArrow(drag)).toEqual([0, 0, 50, -40, 100, 0])
  })
  it('apex flips sign with the drag direction', () => {
    const down = [0, 0, 50, 30, 100, 0]
    expect(reduceCurvedArrow(down)[3]).toBeGreaterThan(0)
  })
  it('curvedArrowAnchors passes 6-number points through, pads 4-number ones', () => {
    expect(curvedArrowAnchors([1, 2, 9, 9, 5, 6])).toEqual([1, 2, 9, 9, 5, 6])
    expect(curvedArrowAnchors([0, 0, 10, 0])).toHaveLength(6)
  })
  it('drawingPolyline(carrow) runs from start to end through the apex', () => {
    const poly = drawingPolyline({ tool: 'carrow', points: [0, 0, 50, -40, 100, 0] })
    expect(poly.slice(0, 2)).toEqual([0, 0])
    expect(poly.slice(-2)).toEqual([100, 0])
    // 25 samples -> point 12 (numbers 24,25) is the t = 0.5 midpoint, at the apex
    expect(poly[24]).toBeCloseTo(50)
    expect(poly[25]).toBeCloseTo(-40)
  })
})

describe('fmtClock', () => {
  it('formats seconds as m:ss', () => {
    expect(fmtClock(0)).toBe('0:00')
    expect(fmtClock(75)).toBe('1:15')
    expect(fmtClock(-5)).toBe('0:00')
  })
})
