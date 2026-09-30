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

  it('duplicateSquad copies the team + players right after it, unplaced', () => {
    S().addSquad('ally', 'attack')
    const qid = S().strategy.squads[0].id
    S().addPlayer('ally', qid, { role: 'Tank' })
    S().addPlayer('ally', qid, { role: 'Healer' })
    S().placePill(qid, { x: 5, y: 5 })
    S().addSquad('ally', 'attack') // a second team after the source
    S().duplicateSquad(qid)
    const sq = S().strategy.squads
    expect(sq).toHaveLength(3)
    expect(sq[1].id).not.toBe(qid) // dup inserted at index 1
    expect(sq[1].category).toBe('attack')
    expect(S().strategy.items.map((i) => i.id)).toEqual([qid]) // the copy isn't placed
    expect(sq[1].color).not.toBe(sq[0].color) // gets its own accent, not the source's
    expect(S().strategy.players.filter((p) => p.squadId === sq[1].id).map((p) => p.role))
      .toEqual(['Tank', 'Healer'])
  })

  it('placePill adds one pill per team; placing again moves it to the front', () => {
    S().addSquad('ally')
    S().addSquad('ally')
    const [q1, q2] = S().strategy.squads
    S().placePill(q1.id, { x: 10.4, y: 10 })
    S().placePill(q2.id, { x: 20, y: 20 })
    S().placePill(q1.id, { x: 30, y: 30 })
    const pills = S().strategy.items
    expect(pills.map((i) => i.id)).toEqual([q2.id, q1.id])
    expect(pills[1]).toEqual({ id: q1.id, type: 'pill', x: 30, y: 30 })
  })

  it('removing a team removes its pill', () => {
    S().addSquad('ally')
    const qid = S().strategy.squads[0].id
    S().placePill(qid, { x: 1, y: 1 })
    S().removeSquad(qid)
    expect(S().strategy.items).toEqual([])
  })

  it('updateItem moves a dragged item to the front', () => {
    const a = S().addItem({ type: 'marker', kind: 'attack', x: 0, y: 0 })
    S().addItem({ type: 'marker', kind: 'defend', x: 5, y: 5 })
    S().updateItem(a, { x: 99, y: 99 })
    const items = S().strategy.items
    expect(items[items.length - 1].id).toBe(a)
    S().updateItem(a, { label: 'x' }) // no move -> stays put
    expect(S().strategy.items[1].id).toBe(a)
  })

  it('clearItems removes only that type', () => {
    S().addItem({ type: 'marker', kind: 'attack', x: 0, y: 0 })
    S().addItem({ type: 'note', x: 0, y: 0, text: '', color: '#fff' })
    S().clearItems('marker')
    expect(S().strategy.items.map((i) => i.type)).toEqual(['note'])
  })

  it('duplicateItem offsets x/y (points for drawings) and skips pills', () => {
    const n = S().addItem({ type: 'note', x: 10, y: 20, text: 'hi', color: '#fff' })
    const copy = S().duplicateItem(n)
    expect(S().strategy.items.find((i) => i.id === copy)).toMatchObject({ x: 24, y: 34, text: 'hi' })
    S().addSquad('ally')
    const q = S().strategy.squads[0].id
    S().placePill(q, { x: 0, y: 0 })
    expect(S().duplicateItem(q)).toBeNull()
  })

  it('togglePanel flips the persisted panel flag', () => {
    expect(S().ui.panels.enemy).toBe(true)
    S().togglePanel('enemy')
    expect(S().ui.panels.enemy).toBe(false)
  })

  it('addSquad defaults to the attack category and honours defence', () => {
    S().addSquad('ally')
    S().addSquad('ally', 'defence')
    expect(S().strategy.squads.map((q) => q.category)).toEqual(['attack', 'defence'])
    expect(S().strategy.squads[0].name).toBe('') // blank -> derived default
  })

  it('togglePillCollapsed flips a per-pill UI flag', () => {
    S().addSquad('ally')
    const id = S().strategy.squads[0].id
    expect(S().ui.collapsedPills[id]).toBeFalsy()
    S().togglePillCollapsed(id)
    expect(S().ui.collapsedPills[id]).toBe(true)
    S().togglePillCollapsed(id)
    expect(S().ui.collapsedPills[id]).toBe(false)
  })

  it('toggleShowTrail flips the persisted onion-skin-trail flag', () => {
    expect(S().ui.showTrail).toBe(true)
    S().toggleShowTrail()
    expect(S().ui.showTrail).toBe(false)
    S().toggleShowTrail()
    expect(S().ui.showTrail).toBe(true)
  })

  it('updateSquad can override the auto-assigned team colour', () => {
    S().addSquad('ally')
    const id = S().strategy.squads[0].id
    S().updateSquad(id, { color: '#123456' })
    expect(S().strategy.squads[0].color).toBe('#123456')
  })
})

describe('planning phases', () => {
  const seedTwoPills = () => {
    S().addSquad('ally')
    S().addSquad('enemy')
    const [q1, q2] = S().strategy.squads
    S().placePill(q1.id, { x: 100, y: 100 })
    S().placePill(q2.id, { x: 200, y: 200 })
    return [q1.id, q2.id]
  }
  const phase = (i) => S().strategy.phases[i]
  const drawing = (points = [0, 0, 100, 0]) =>
    S().addItem({ type: 'drawing', tool: 'arrow', color: '#fff', width: 4, points })

  it('addPhase snapshots every positioned item and selects the phase', () => {
    const [q1] = seedTwoPills()
    const m = S().addItem({ type: 'marker', kind: 'attack', x: 7, y: 8 })
    drawing() // no x/y -> not keyframed
    S().addPhase()
    expect(S().strategy.phases).toHaveLength(1)
    expect(phase(0).pos[q1]).toEqual({ x: 100, y: 100 })
    expect(phase(0).pos[m]).toEqual({ x: 7, y: 8 })
    expect(Object.keys(phase(0).pos)).toHaveLength(3)
    expect(S().playback.phaseId).toBe(phase(0).id)
  })

  it('dragItem writes the phase keyframe while a phase is edited, else the live item', () => {
    const [q1] = seedTwoPills()
    S().addPhase()
    S().setPlayback({ open: true })
    S().dragItem(q1, { x: 999, y: 0 })
    expect(phase(0).pos[q1]).toEqual({ x: 999, y: 0 })
    expect(S().strategy.items.find((i) => i.id === q1)).toMatchObject({ x: 100, y: 100 })
    S().selectPhase(null) // Start -> live board
    S().dragItem(q1, { x: 1, y: 2 })
    expect(S().strategy.items.find((i) => i.id === q1)).toMatchObject({ x: 1, y: 2 })
  })

  it('removeFromBoard hides in the edited phase, deletes otherwise', () => {
    seedTwoPills()
    const m = S().addItem({ type: 'marker', kind: 'attack', x: 0, y: 0 })
    S().addPhase()
    S().setPlayback({ open: true })
    S().removeFromBoard(m)
    expect(phase(0).hidden).toContain(m)
    expect(S().strategy.items.some((i) => i.id === m)).toBe(true)
    S().selectPhase(null)
    S().removeFromBoard(m)
    expect(S().strategy.items.some((i) => i.id === m)).toBe(false)
    expect(phase(0).hidden).not.toContain(m) // purged
  })

  it('addPhase(sourceId) copies the source keyframe and inserts after it', () => {
    const [q1] = seedTwoPills()
    S().addPhase()
    const first = phase(0).id
    S().setPhasePos(first, q1, { x: 5, y: 5 })
    S().addPhase(first)
    expect(S().strategy.phases).toHaveLength(2)
    expect(phase(1).pos[q1]).toEqual({ x: 5, y: 5 })
  })

  it('selectPhase sets phaseId + scrubs t to its arrival time', () => {
    seedTwoPills()
    S().addPhase() // duration 2000
    S().addPhase() // duration 2000
    const p2 = phase(1)
    S().selectPhase(p2.id)
    expect(S().playback.phaseId).toBe(p2.id)
    expect(S().playback.t).toBe(4000)
    S().selectPhase(null)
    expect(S().playback.phaseId).toBeNull()
    expect(S().playback.t).toBe(0)
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

  it('movePhaseTo drops a phase at an arbitrary clamped index', () => {
    seedTwoPills()
    S().addPhase()
    S().addPhase()
    S().addPhase()
    const [a, b, c] = S().strategy.phases.map((p) => p.id)
    S().movePhaseTo(c, 0)
    expect(S().strategy.phases.map((p) => p.id)).toEqual([c, a, b])
    S().movePhaseTo(c, 99) // clamp to end
    expect(S().strategy.phases.map((p) => p.id)).toEqual([a, b, c])
  })

  it('setPhasePath assigns/clears a drawn path for a pill', () => {
    const [q] = seedTwoPills()
    const did = drawing()
    S().addPhase()
    S().setPhasePath(phase(0).id, q, did)
    expect(phase(0).paths[q]).toBe(did)
    S().setPhasePath(phase(0).id, q, null)
    expect(phase(0).paths[q]).toBeUndefined()
  })

  it('removing a drawing clears any phase paths that follow it', () => {
    const [q] = seedTwoPills()
    const did = drawing()
    S().addPhase()
    S().setPhasePath(phase(0).id, q, did)
    S().removeItem(did)
    expect(phase(0).paths[q]).toBeUndefined()
  })

  it('duplicateItem copies a drawing, offset, right after the source', () => {
    const src = drawing()
    const nid = S().duplicateItem(src)
    const ds = S().strategy.items
    expect(ds.map((d) => d.id)).toEqual([src, nid])
    expect(ds[1].points).toEqual([14, 14, 114, 14])
    expect(ds[0].points).toEqual([0, 0, 100, 0]) // source untouched
    expect(S().duplicateItem('nope')).toBeNull()
  })

  it('moveItem swaps with the next item of the same type, clamped at the ends', () => {
    const a = drawing([0, 0, 1, 1])
    const m = S().addItem({ type: 'marker', kind: 'attack', x: 0, y: 0 })
    const b = drawing([0, 0, 2, 2])
    const ids = () => S().strategy.items.map((i) => i.id)
    S().moveItem(a, 1) // skips the marker, swaps with b
    expect(ids()).toEqual([b, m, a])
    S().moveItem(a, 1) // already last drawing -> no change
    expect(ids()).toEqual([b, m, a])
    S().moveItem(b, -1) // already first -> no change
    expect(ids()).toEqual([b, m, a])
  })

  it('removing a team purges its pill from every phase', () => {
    const [q1] = seedTwoPills()
    S().addPhase()
    S().removeSquad(q1)
    expect(phase(0).pos[q1]).toBeUndefined()
  })

  it('an item added while a phase is selected is hidden in the other phases', () => {
    seedTwoPills()
    S().addPhase()
    S().addPhase()
    S().selectPhase(phase(0).id)
    const m = S().addItem({ type: 'marker', kind: 'attack', x: 10, y: 10 })
    expect(phase(0).hidden).not.toContain(m)
    expect(phase(1).hidden).toContain(m)
  })

  it('a pill dropped while a phase is selected is scoped to that phase', () => {
    S().addSquad('ally')
    const qId = S().strategy.squads[0].id
    S().addPhase()
    S().addPhase()
    S().selectPhase(phase(0).id)
    S().placePill(qId, { x: 5, y: 5 })
    expect(phase(0).hidden).not.toContain(qId)
    expect(phase(1).hidden).toContain(qId)
  })

  it('adding an item with no phase selected touches no phase', () => {
    seedTwoPills()
    S().addPhase()
    S().selectPhase(null)
    S().addItem({ type: 'marker', kind: 'attack', x: 1, y: 1 })
    expect(phase(0).hidden).toHaveLength(0)
  })

  it('togglePhaseHidden flips visibility for one phase', () => {
    seedTwoPills()
    const m = S().addItem({ type: 'marker', kind: 'attack', x: 0, y: 0 })
    S().addPhase()
    S().togglePhaseHidden(phase(0).id, m)
    expect(phase(0).hidden).toContain(m)
    S().togglePhaseHidden(phase(0).id, m)
    expect(phase(0).hidden).not.toContain(m)
  })
})

describe('edits + undo history', () => {
  const past = () => useStore.temporal.getState().pastStates.length

  it('an edit that changes nothing writes nothing and adds no undo step', () => {
    const before = S().strategy
    S().updateItem('missing', { x: 1 })
    S().moveItem('missing', 1)
    expect(S().strategy).toBe(before)
    expect(past()).toBe(0)
  })

  it('unchanged items keep their identity (structural sharing)', () => {
    const a = S().addItem({ type: 'marker', kind: 'attack', x: 0, y: 0 })
    const b = S().addItem({ type: 'marker', kind: 'hold', x: 5, y: 5 })
    const itemB = S().strategy.items.find((i) => i.id === b)
    S().updateItem(a, { label: 'go' })
    expect(S().strategy.items.find((i) => i.id === b)).toBe(itemB)
  })

  it('a burst of edits (typing) is one undo step; a pause starts a new one', () => {
    vi.useFakeTimers()
    try {
      const original = S().strategy.meta.name
      for (const n of ['V', 'Va', 'Van', 'Vang']) S().setStrategyName(n)
      expect(past()).toBe(1)
      vi.advanceTimersByTime(700)
      S().setStrategyName('Vanguard')
      expect(past()).toBe(2)
      useStore.temporal.getState().undo()
      expect(S().strategy.meta.name).toBe('Vang')
      useStore.temporal.getState().undo()
      expect(S().strategy.meta.name).toBe(original)
    } finally {
      vi.useRealTimers()
    }
  })
})
