import { describe, it, expect } from 'vitest'
import {
  withAlpha,
  SHAPE_TOOLS,
  BOX_DRAW_TOOLS,
  DRAW_TOOL_LABEL,
  fmtClock
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
  it('arrows + shapes are box-drawn; pen is not', () => {
    expect(BOX_DRAW_TOOLS).toEqual(['arrow', 'carrow', ...SHAPE_TOOLS])
    expect(BOX_DRAW_TOOLS).not.toContain('pen')
  })
  it('every shape tool has a label', () => {
    for (const t of SHAPE_TOOLS) expect(typeof DRAW_TOOL_LABEL[t]).toBe('string')
  })
})

describe('fmtClock', () => {
  it('formats seconds as m:ss', () => {
    expect(fmtClock(0)).toBe('0:00')
    expect(fmtClock(75)).toBe('1:15')
    expect(fmtClock(-5)).toBe('0:00')
  })
})
