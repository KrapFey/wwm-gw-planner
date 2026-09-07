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

describe('planning phases', () => {
  const seedTwoPills = () => {
    S().addSquad('ally')
    S().addSquad('enemy')
    const [q1, q2] = S().strategy.squads
    S().setSquadToken(q1.id, { x: 100, y: 100 })
    S().setSquadToken(q2.id, { x: 200, y: 200 })
    return [q1.id, q2.id]
  }

  it('addPhase snapshots the placed pills and selects the phase', () => {
    const [q1] = seedTwoPills()
    S().addPhase()
    expect(S().strategy.phases).toHaveLength(1)
    const ph = S().strategy.phases[0]
    expect(ph.board.squads[q1]).toEqual({ x: 100, y: 100 })
    expect(S().playback.phaseId).toBe(ph.id)
  })

  it('updatePhaseSquad writes only to that phase, not the live token', () => {
    const [q1] = seedTwoPills()
    S().addPhase()
    const phId = S().strategy.phases[0].id
    S().updatePhaseSquad(phId, q1, { x: 999, y: 0 })
    expect(S().strategy.phases[0].board.squads[q1]).toEqual({ x: 999, y: 0 })
    expect(S().strategy.squads.find((q) => q.id === q1).token).toMatchObject({ x: 100, y: 100 })
  })

  it('addPhase(sourceId) copies the source board and inserts after it', () => {
    seedTwoPills()
    S().addPhase()
    const first = S().strategy.phases[0].id
    S().updatePhaseSquad(first, S().strategy.squads[0].id, { x: 5, y: 5 })
    S().addPhase(first)
    expect(S().strategy.phases).toHaveLength(2)
    expect(S().strategy.phases[1].board.squads[S().strategy.squads[0].id]).toEqual({ x: 5, y: 5 })
  })

  it('selectPhase sets phaseId + scrubs t to its arrival time', () => {
    seedTwoPills()
    S().addPhase() // duration 2000
    S().addPhase() // duration 2000
    const [p1, p2] = S().strategy.phases
    S().selectPhase(p2.id)
    expect(S().playback.phaseId).toBe(p2.id)
    expect(S().playback.t).toBe(4000)
    S().selectPhase(null)
    expect(S().playback.phaseId).toBeNull()
    expect(S().playback.t).toBe(0)
    void p1
  })

  it('movePhase reorders; removePhase drops it and clears selection', () => {
    seedTwoPills()
    S().addPhase()
    S().addPhase()
    const [a, b] = S().strategy.phases.map((p) => p.id)
    S().movePhase(b, -1)
    expect(S().strategy.phases.map((p) => p.id)).toEqual([b, a])
    S().selectPhase(a)
    S().removePhase(a)
    expect(S().strategy.phases.map((p) => p.id)).toEqual([b])
    expect(S().playback.phaseId).toBeNull()
  })

  it('removing a team also purges it from every phase board', () => {
    const [q1] = seedTwoPills()
    S().addPhase()
    S().removeSquad(q1)
    expect(S().strategy.phases[0].board.squads[q1]).toBeUndefined()
  })

  it('a marker added while a phase is selected is hidden in the other phases', () => {
    seedTwoPills()
    S().addPhase()
    S().addPhase()
    const [p1, p2] = S().strategy.phases
    S().selectPhase(p1.id)
    S().addMarker('attack', { x: 10, y: 10 })
    const mId = S().strategy.markers[0].id
    expect(S().strategy.phases[0].board.hiddenMarkers || []).not.toContain(mId)
    expect(S().strategy.phases[1].board.hiddenMarkers).toContain(mId)
    void p2
  })

  it('a pill dropped while a phase is selected is scoped to that phase', () => {
    S().addSquad('ally')
    const qId = S().strategy.squads[0].id
    S().addPhase() // Start snapshot, no pills yet
    S().addPhase()
    const [p1] = S().strategy.phases
    S().selectPhase(p1.id)
    S().setSquadToken(qId, { x: 5, y: 5 })
    expect(S().strategy.phases[0].board.hiddenSquads || []).not.toContain(qId)
    expect(S().strategy.phases[1].board.hiddenSquads).toContain(qId)
  })

  it('adding a marker with no phase selected touches no phase', () => {
    seedTwoPills()
    S().addPhase()
    S().selectPhase(null)
    S().addMarker('attack', { x: 1, y: 1 })
    expect(S().strategy.phases[0].board.hiddenMarkers || []).toHaveLength(0)
  })

  it('togglePhaseHidden flips marker visibility for one phase', () => {
    seedTwoPills()
    S().addMarker('attack', { x: 0, y: 0 })
    const mId = S().strategy.markers[0].id
    S().addPhase()
    const phId = S().strategy.phases[0].id
    S().togglePhaseHidden(phId, 'markers', mId)
    expect(S().strategy.phases[0].board.hiddenMarkers).toContain(mId)
    S().togglePhaseHidden(phId, 'markers', mId)
    expect(S().strategy.phases[0].board.hiddenMarkers).not.toContain(mId)
  })

  it('removeMarker purges phase hiddenMarkers entries', () => {
    seedTwoPills()
    S().addPhase()
    S().addPhase()
    const [p1] = S().strategy.phases
    S().selectPhase(p1.id)
    S().addMarker('attack', { x: 0, y: 0 })
    const mId = S().strategy.markers[0].id
    expect(S().strategy.phases[1].board.hiddenMarkers).toContain(mId)
    S().removeMarker(mId)
    expect(S().strategy.phases[1].board.hiddenMarkers).not.toContain(mId)
  })
})
