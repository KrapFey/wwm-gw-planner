import { describe, it, expect, beforeEach, vi } from 'vitest'

// Fresh store + toast queue per test (both are module singletons).
let useStore, withUndo, getToasts
beforeEach(async () => {
  vi.resetModules()
  ;({ useStore } = await import('../store/useStore.js'))
  ;({ withUndo, getToasts } = await import('./toast.js'))
})
const S = () => useStore.getState()
const undo = () => getToasts().at(-1)?.action

describe('withUndo', () => {
  it('runs the edit now; Undo restores the exact previous doc', () => {
    S().addSquad('ally')
    const before = S().strategy
    withUndo('Deleted team', () => S().removeSquad(before.squads[0].id))
    expect(S().strategy.squads).toHaveLength(0)
    expect(undo().label).toBe('Undo')
    undo().run()
    expect(S().strategy).toBe(before)
    expect(S().docs[S().activeId]).toBe(before)
  })

  it('a later edit retires the offer, and a stale Undo is a no-op', () => {
    S().addSquad('ally')
    withUndo('Deleted team', () => S().removeSquad(S().strategy.squads[0].id))
    const stale = undo()
    S().addSquad('enemy')
    expect(getToasts()).toHaveLength(0)
    const after = S().strategy
    stale.run()
    expect(S().strategy).toBe(after)
  })

  it('raises nothing when the edit changes nothing', () => {
    withUndo('Nothing', () => {})
    expect(getToasts()).toHaveLength(0)
  })
})
