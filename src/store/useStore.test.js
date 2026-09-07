import { describe, it, expect, beforeEach, vi } from 'vitest'

// Fresh store module per test (the store is a singleton).
let useStore
beforeEach(async () => {
  vi.resetModules()
  ;({ useStore } = await import('./useStore.js'))
})
const S = () => useStore.getState()

describe('strategy library', () => {
  it('boots with one strategy mirrored into docs', () => {
    expect(S().order).toHaveLength(1)
    expect(S().strategy).toBe(S().docs[S().activeId])
  })

  it('newStrategy adds and activates a fresh doc', () => {
    const first = S().activeId
    S().newStrategy()
    expect(S().order).toHaveLength(2)
    expect(S().activeId).not.toBe(first)
    expect(S().strategy.squads).toEqual([])
    expect(S().strategy).toBe(S().docs[S().activeId])
  })

  it('commit mirrors edits into docs[activeId]', () => {
    S().addSquad('ally')
    expect(S().strategy.squads).toHaveLength(1)
    expect(S().docs[S().activeId].squads).toHaveLength(1)
  })

  it('switchStrategy swaps the live doc and preserves each doc', () => {
    S().addSquad('ally')
    const a = S().activeId
    S().newStrategy()
    const b = S().activeId
    S().switchStrategy(a)
    expect(S().activeId).toBe(a)
    expect(S().strategy.squads).toHaveLength(1)
    S().switchStrategy(b)
    expect(S().strategy.squads).toEqual([])
  })

  it('duplicateStrategy copies after the source and activates it', () => {
    S().addSquad('enemy')
    const src = S().activeId
    S().duplicateStrategy(src)
    expect(S().order).toHaveLength(2)
    expect(S().order[1]).toBe(S().activeId)
    expect(S().activeId).not.toBe(src)
    expect(S().strategy.squads).toHaveLength(1)
    expect(S().strategy.meta.name).toMatch(/copy/i)
  })

  it('renameStrategy renames a non-active doc', () => {
    const a = S().activeId
    S().newStrategy()
    S().renameStrategy(a, 'War Room')
    expect(S().docs[a].meta.name).toBe('War Room')
  })

  it('deleteStrategy removes it, reassigns active, and is blocked at one left', () => {
    S().newStrategy()
    const b = S().activeId
    S().deleteStrategy(b)
    expect(S().order).toHaveLength(1)
    expect(S().docs[b]).toBeUndefined()
    expect(S().strategy).toBe(S().docs[S().activeId])
    S().deleteStrategy(S().activeId)
    expect(S().order).toHaveLength(1)
  })
})

describe('team + marker store logic', () => {
  it('removeSquad deletes the team and its players', () => {
    S().addSquad('ally')
    const qid = S().strategy.squads[0].id
    S().addPlayer('ally', qid)
    S().addPlayer('ally', qid)
    expect(S().strategy.players).toHaveLength(2)
    S().removeSquad(qid)
    expect(S().strategy.squads).toHaveLength(0)
    expect(S().strategy.players).toHaveLength(0)
  })

  it('setSquadToken stamps token.at so the newest sorts last', () => {
    S().addSquad('ally')
    S().addSquad('ally')
    const [q1, q2] = S().strategy.squads
    S().setSquadToken(q1.id, { x: 10, y: 10 })
    S().setSquadToken(q2.id, { x: 20, y: 20 })
    const t1 = S().strategy.squads.find((q) => q.id === q1.id).token
    const t2 = S().strategy.squads.find((q) => q.id === q2.id).token
    expect(t2.at).toBeGreaterThanOrEqual(t1.at)
  })

  it('updateMarker moves a dragged marker to the top of the stack', () => {
    S().addMarker('attack', { x: 0, y: 0 })
    S().addMarker('defend', { x: 5, y: 5 })
    const firstId = S().strategy.markers[0].id
    S().updateMarker(firstId, { x: 99, y: 99 })
    const markers = S().strategy.markers
    expect(markers[markers.length - 1].id).toBe(firstId)
  })

  it('togglePanel flips the persisted panel flag', () => {
    expect(S().ui.panels.enemy).toBe(true)
    S().togglePanel('enemy')
    expect(S().ui.panels.enemy).toBe(false)
  })
})
