import { create } from 'zustand'
import { temporal } from 'zundo'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useStore as useZustandStore } from 'zustand'

import {
  emptyStrategy,
  migrateStrategy,
  squadColorForIndex,
  normalizeCategory,
  DEFAULT_SQUAD_SIZE
} from '../lib/schema'
import { MAP_W, MAP_H } from '../lib/mapLayout'
import { phaseArrivalTime, startFrame } from '../lib/playback'
import { DEFAULT_FIXTURES } from '../data/mapPreset'
import { newId } from '../lib/ids'

const seedFixtures = () => DEFAULT_FIXTURES.map((f) => ({ ...f }))

const STORAGE_KEY = 'wwm-gw-planner'

// Tiny pub/sub so the UI can show a "saved" pulse when a debounced write
// actually lands, without coupling storage to the store's own state (writing
// a "just saved" flag into persisted state would just schedule another write).
const saveListeners = new Set()
export const subscribeSaved = (fn) => {
  saveListeners.add(fn)
  return () => saveListeners.delete(fn)
}
const notifySaved = () => {
  for (const fn of saveListeners) fn()
}

// Coalesce rapid writes (dragging tokens, typing a name, scrubbing) into one
// localStorage.setItem — the whole doc library is re-serialised on every write.
// Flushed on hide/unload so nothing is lost.
function debouncedStorage(base, ms = 400) {
  let timer = null
  let pending = null
  const flush = () => {
    if (timer) clearTimeout(timer)
    timer = null
    if (pending) {
      base.setItem(pending[0], pending[1])
      pending = null
      notifySaved()
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }
  return {
    getItem: (k) => (pending && pending[0] === k ? pending[1] : base.getItem(k)),
    setItem: (k, v) => {
      pending = [k, v]
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, ms)
    },
    removeItem: (k) => {
      if (pending && pending[0] === k) pending = null
      if (timer) clearTimeout(timer)
      timer = null
      base.removeItem(k)
    }
  }
}

// Real localStorage in the browser (debounced); an in-memory shim elsewhere
// (tests / SSR) so persist never touches an undefined global.
const memBacking = new Map()
const appStorage =
  typeof localStorage !== 'undefined'
    ? debouncedStorage(localStorage)
    : {
        getItem: (k) => (memBacking.has(k) ? memBacking.get(k) : null),
        setItem: (k, v) => memBacking.set(k, v),
        removeItem: (k) => memBacking.delete(k)
      }

const nameFor = (s, id) => (id === s.activeId ? s.strategy : s.docs[id])?.meta?.name
const uniqueName = (s, base) => {
  const taken = new Set(s.order.map((id) => nameFor(s, id)))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base} ${n}`)) n++
  return `${base} ${n}`
}
const clearHistory = () => {
  try {
    useStore.temporal.getState().clear()
  } catch {
    /* store not constructed yet */
  }
}

const PLAYBACK_INIT = {
  open: false,
  phaseId: null,
  playing: false,
  t: 0,
  speed: 1,
  loop: false
}
const resetPlayback = () => {
  try {
    useStore.setState({ playback: { ...PLAYBACK_INIT } })
  } catch {
    /* not constructed yet */
  }
}

// Apply an immutable update to the active strategy; stamp updatedAt and mirror
// it into the library (`docs`).
function commit(set, get, producer) {
  const st = get()
  const draft = structuredClone(st.strategy)
  const next = producer(draft) ?? draft
  next.meta = { ...next.meta, updatedAt: new Date().toISOString() }
  set({ strategy: next, docs: { ...st.docs, [st.activeId]: next } })
}

const BOOT_ID = newId('str')
const BOOT_DOC = emptyStrategy()

const creator = (set, get) => ({
  // ---- strategy library --------------------------------------------------
  docs: { [BOOT_ID]: BOOT_DOC },
  order: [BOOT_ID],
  activeId: BOOT_ID,
  // `strategy` is the live working copy of docs[activeId]; kept identical to it
  // by commit() and by switch/new/delete. Every existing selector reads it.
  strategy: BOOT_DOC,

  newStrategy: () => {
    const s = get()
    const id = newId('str')
    const doc = emptyStrategy()
    doc.meta.name = uniqueName(s, 'Untitled strategy')
    set({
      docs: { ...s.docs, [s.activeId]: s.strategy, [id]: doc },
      order: [...s.order, id],
      activeId: id,
      strategy: doc
    })
    clearHistory()
    resetPlayback()
  },

  switchStrategy: (id) => {
    const s = get()
    if (id === s.activeId || !s.docs[id]) return
    const docs = { ...s.docs, [s.activeId]: s.strategy }
    set({ docs, activeId: id, strategy: docs[id] })
    clearHistory()
    resetPlayback()
  },

  renameStrategy: (id, name) => {
    const s = get()
    if (id === s.activeId) return s.setStrategyName(name)
    const doc = s.docs[id]
    if (!doc) return
    set({
      docs: {
        ...s.docs,
        [id]: { ...doc, meta: { ...doc.meta, name, updatedAt: new Date().toISOString() } }
      }
    })
  },

  duplicateStrategy: (id) => {
    const s = get()
    const src = id === s.activeId ? s.strategy : s.docs[id]
    if (!src) return
    const nid = newId('str')
    const now = new Date().toISOString()
    const doc = structuredClone(src)
    doc.meta = {
      ...doc.meta,
      name: uniqueName(s, `${src.meta.name || 'Strategy'} copy`),
      createdAt: now,
      updatedAt: now
    }
    const order = [...s.order]
    order.splice(order.indexOf(id) + 1, 0, nid)
    set({
      docs: { ...s.docs, [s.activeId]: s.strategy, [nid]: doc },
      order,
      activeId: nid,
      strategy: doc
    })
    clearHistory()
    resetPlayback()
  },

  deleteStrategy: (id) => {
    const s = get()
    if (s.order.length <= 1 || !s.docs[id]) return
    const order = s.order.filter((x) => x !== id)
    const docs = { ...s.docs, [s.activeId]: s.strategy }
    delete docs[id]
    const activeId = id === s.activeId ? order[0] : s.activeId
    set({ docs, order, activeId, strategy: docs[activeId] })
    clearHistory()
    resetPlayback()
  },

  // ---- UI state (persisted, not undoable) -------------------------------
  ui: {
    panels: { ally: true, enemy: true },
    collapsedTeams: {},
    collapsedPills: {},
    showTrail: true
  },
  togglePanel: (side) =>
    set((s) => ({
      ui: { ...s.ui, panels: { ...s.ui.panels, [side]: !s.ui.panels[side] } }
    })),
  toggleShowTrail: () =>
    set((s) => ({ ui: { ...s.ui, showTrail: !s.ui.showTrail } })),
  toggleTeam: (id) =>
    set((s) => ({
      ui: {
        ...s.ui,
        collapsedTeams: { ...s.ui.collapsedTeams, [id]: !s.ui.collapsedTeams[id] }
      }
    })),
  // Collapse a placed pill on the battle map down to its bare colour disc.
  togglePillCollapsed: (id) =>
    set((s) => ({
      ui: {
        ...s.ui,
        collapsedPills: { ...s.ui.collapsedPills, [id]: !s.ui.collapsedPills[id] }
      }
    })),

  // Battle-map viewport. UI-only: outside the strategy document and outside
  // undo/redo history, but persisted so the view survives a reload.
  view: { zoom: 1, x: 0, y: 0 },
  setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),

  // Phase-animation playback. Transient — not persisted, not undoable.
  // `t` is elapsed ms; `phaseId` is the phase being edited (null = Start).
  playback: { ...PLAYBACK_INIT },
  setPlayback: (patch) => set((s) => ({ playback: { ...s.playback, ...patch } })),
  selectPhase: (id) =>
    set((s) => {
      const idx = s.strategy.phases.findIndex((p) => p.id === id)
      return {
        playback: {
          ...s.playback,
          phaseId: idx === -1 ? null : id,
          playing: false,
          t: idx === -1 ? 0 : phaseArrivalTime(s.strategy.phases, idx)
        }
      }
    }),

  // Map fixtures (geese / trees / bulwarks / boss). App-level config, not part
  // of a strategy and not in undo history. Persisted so placement work is kept.
  layout: { fixtures: seedFixtures() },
  addFixture: (kind) =>
    set((s) => ({
      layout: {
        fixtures: [
          ...s.layout.fixtures,
          { id: newId('fx'), kind, x: Math.round(MAP_W / 2), y: Math.round(MAP_H / 2), scale: 1, rotation: 0 }
        ]
      }
    })),
  updateFixture: (id, patch) =>
    set((s) => ({
      layout: {
        fixtures: s.layout.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f))
      }
    })),
  removeFixture: (id) =>
    set((s) => ({
      layout: { fixtures: s.layout.fixtures.filter((f) => f.id !== id) }
    })),
  setLayoutFixtures: (fixtures) => set({ layout: { fixtures } }),
  resetLayout: () => set({ layout: { fixtures: seedFixtures() } }),

  // ---- document-level ------------------------------------------------------
  setStrategyName: (name) =>
    commit(set, get, (s) => {
      s.meta.name = name
    }),

  setStrategyNotes: (notes) =>
    commit(set, get, (s) => {
      s.meta.notes = notes
    }),

  // Import: add as a new library entry and switch to it (don't clobber).
  loadStrategy: (raw) => {
    const s = get()
    const id = newId('str')
    const doc = migrateStrategy(raw)
    doc.meta.name = uniqueName(s, doc.meta.name || 'Imported strategy')
    set({
      docs: { ...s.docs, [s.activeId]: s.strategy, [id]: doc },
      order: [...s.order, id],
      activeId: id,
      strategy: doc
    })
    clearHistory()
    resetPlayback()
  },

  // ---- squads ------------------------------------------------------------
  addSquad: (side, category = 'attack', patch = {}) =>
    commit(set, get, (s) => {
      const count = s.squads.filter((q) => q.side === side).length
      s.squads.push({
        id: newId('sq'),
        side,
        category: normalizeCategory(category),
        name: patch.name ?? '',
        lane: patch.lane ?? 'Unassigned',
        targetSize: patch.targetSize ?? s.config.defaultSquadSize ?? DEFAULT_SQUAD_SIZE,
        color: patch.color ?? squadColorForIndex(count, side)
      })
    }),

  updateSquad: (id, patch) =>
    commit(set, get, (s) => {
      const q = s.squads.find((x) => x.id === id)
      if (q) Object.assign(q, patch)
    }),

  // Copy a team (same side + category) with its player slots, inserted right
  // after the source. Not placed on the map.
  duplicateSquad: (id) =>
    commit(set, get, (s) => {
      const i = s.squads.findIndex((q) => q.id === id)
      if (i === -1) return
      const src = s.squads[i]
      const nid = newId('sq')
      const count = s.squads.filter((q) => q.side === src.side).length
      s.squads.splice(i + 1, 0, {
        ...src,
        id: nid,
        name: src.name ? `${src.name} copy` : '',
        color: squadColorForIndex(count, src.side)
      })
      for (const p of s.players.filter((p) => p.squadId === id)) {
        s.players.push({ id: newId('pl'), side: p.side, role: p.role, squadId: nid })
      }
    }),

  removeSquad: (id) =>
    commit(set, get, (s) => {
      s.squads = s.squads.filter((q) => q.id !== id)
      s.players = s.players.filter((p) => p.squadId !== id)
      purge(s, [id]) // its pill
    }),

  // ---- players (role slots) ------------------------------------------------
  addPlayer: (side, squadId = null, patch = {}) =>
    commit(set, get, (s) => {
      s.players.push({
        id: newId('pl'),
        side,
        role: patch.role ?? 'DPS',
        squadId
      })
    }),

  updatePlayer: (id, patch) =>
    commit(set, get, (s) => {
      const p = s.players.find((x) => x.id === id)
      if (p) Object.assign(p, patch)
    }),

  removePlayer: (id) =>
    commit(set, get, (s) => {
      s.players = s.players.filter((p) => p.id !== id)
    }),

  movePlayer: (id, squadId) =>
    commit(set, get, (s) => {
      const p = s.players.find((x) => x.id === id)
      if (!p) return
      p.squadId = squadId
      if (squadId) {
        const q = s.squads.find((x) => x.id === squadId)
        if (q) p.side = q.side
      }
    }),

  // ---- map items: pills, markers, drawings, notes, timers ---------------
  // One list for everything on the map (see schema.js). Array order is the
  // draw order within a type.

  // Add an item; returns its id. Added while a phase is being edited, it
  // belongs to that phase (hidden in the others).
  addItem: (item) => {
    const id = item.id ?? newId(ID_PREFIX[item.type] ?? 'it')
    commit(set, get, (s) => {
      s.items.push(roundXY({ ...item, id }))
      scopeToPhase(s, get().playback, id)
    })
    return id
  },
  updateItem: (id, patch) =>
    commit(set, get, (s) => {
      const i = s.items.findIndex((x) => x.id === id)
      if (i === -1) return
      Object.assign(s.items[i], roundXY(patch))
      // a moved item comes to the front of its type
      if ('x' in patch || 'y' in patch) s.items.push(s.items.splice(i, 1)[0])
    }),
  removeItem: (id) => commit(set, get, (s) => purge(s, [id])),
  clearItems: (type) =>
    commit(set, get, (s) => purge(s, s.items.filter((i) => i.type === type).map((i) => i.id))),

  // Copy an item right after its source, nudged so it's visible; returns the
  // new id. Pills are one-per-team, so they don't duplicate.
  duplicateItem: (id) => {
    const src = get().strategy.items.find((i) => i.id === id)
    if (!src || src.type === 'pill') return null
    const nid = newId(ID_PREFIX[src.type] ?? 'it')
    const copy = src.points
      ? { ...src, id: nid, points: src.points.map((v) => v + 14) }
      : { ...src, id: nid, x: src.x + 14, y: src.y + 14 }
    commit(set, get, (s) => {
      s.items.splice(s.items.findIndex((i) => i.id === id) + 1, 0, copy)
    })
    return nid
  },

  // Z-order: dir -1 sends an item behind the previous item of its type, +1 in
  // front of the next one (each type draws on its own layer).
  moveItem: (id, dir) =>
    commit(set, get, (s) => {
      const i = s.items.findIndex((x) => x.id === id)
      if (i === -1) return
      let j = i + dir
      while (j >= 0 && j < s.items.length && s.items[j].type !== s.items[i].type) j += dir
      if (j < 0 || j >= s.items.length) return
      ;[s.items[i], s.items[j]] = [s.items[j], s.items[i]]
    }),

  // Board gestures. While a phase is being edited a drag writes that phase's
  // keyframe and a delete hides the item in that phase (non-destructive);
  // otherwise they change the live board.
  dragItem: (id, pos) => {
    const { playback: pb } = get()
    if (pb.open && pb.phaseId) get().setPhasePos(pb.phaseId, id, pos)
    else get().updateItem(id, pos)
  },
  removeFromBoard: (id) => {
    const { playback: pb } = get()
    if (pb.open && pb.phaseId) get().togglePhaseHidden(pb.phaseId, id)
    else get().removeItem(id)
  },

  // A team drops onto the map as one pill (id = the team's id); dropping it
  // again moves it.
  placePill: (squadId, pos) => {
    const s = get()
    if (!s.strategy.squads.some((q) => q.id === squadId)) return
    if (s.strategy.items.some((i) => i.id === squadId)) s.updateItem(squadId, pos)
    else s.addItem({ id: squadId, type: 'pill', x: pos.x, y: pos.y })
  },

  // ---- planning phases (keyframe animation) ---------------------------
  // Add a phase after `sourceId` (or at the end). It starts as a copy of the
  // source phase, or a snapshot of the live board when there's no source.
  addPhase: (sourceId = null) => {
    const id = newId('ph')
    commit(set, get, (s) => {
      const srcIdx = sourceId ? s.phases.findIndex((p) => p.id === sourceId) : -1
      const src = s.phases[srcIdx]
      s.phases.splice(srcIdx === -1 ? s.phases.length : srcIdx + 1, 0, {
        id,
        name: `Phase ${s.phases.length + 1}`,
        duration: 2000,
        hold: 0,
        easing: 'inout',
        pos: src ? { ...src.pos } : startFrame(s.items).pos,
        hidden: src ? [...src.hidden] : [],
        paths: {}
      })
    })
    get().selectPhase(id)
  },

  removePhase: (id) => {
    commit(set, get, (s) => {
      s.phases = s.phases.filter((p) => p.id !== id)
    })
    if (get().playback.phaseId === id) {
      set((s) => ({ playback: { ...s.playback, phaseId: null, t: 0, playing: false } }))
    }
  },

  renamePhase: (id, name) => editPhase(set, get, id, (p) => (p.name = name)),

  setPhaseTiming: (id, patch) =>
    editPhase(set, get, id, (p) => {
      if ('duration' in patch) p.duration = Math.max(0, Number(patch.duration) || 0)
      if ('hold' in patch) p.hold = Math.max(0, Number(patch.hold) || 0)
      if ('easing' in patch) p.easing = patch.easing
    }),

  // Assign a drawing for a pill to travel along during this phase (null clears).
  setPhasePath: (phaseId, pillId, drawingId) =>
    editPhase(set, get, phaseId, (p) => {
      if (drawingId) p.paths[pillId] = drawingId
      else delete p.paths[pillId]
    }),

  movePhase: (id, dir) =>
    get().movePhaseTo(id, get().strategy.phases.findIndex((p) => p.id === id) + dir),

  // Drop a phase at an arbitrary index (chip drag-reorder).
  movePhaseTo: (id, index) =>
    commit(set, get, (s) => {
      const from = s.phases.findIndex((p) => p.id === id)
      if (from === -1) return
      const to = Math.max(0, Math.min(s.phases.length - 1, index))
      if (from === to) return
      const [p] = s.phases.splice(from, 1)
      s.phases.splice(to, 0, p)
    }),

  // Where an item sits in one phase (a drag while that phase is being edited).
  setPhasePos: (phaseId, itemId, pos) =>
    editPhase(set, get, phaseId, (p) => {
      p.pos[itemId] = { x: Math.round(pos.x), y: Math.round(pos.y) }
    }),

  togglePhaseHidden: (phaseId, itemId) =>
    editPhase(set, get, phaseId, (p) => {
      const i = p.hidden.indexOf(itemId)
      if (i === -1) p.hidden.push(itemId)
      else p.hidden.splice(i, 1)
    })
})

const ID_PREFIX = { marker: 'mk', drawing: 'dr', note: 'nt', timer: 'tm' }

const roundXY = (o) => ({
  ...o,
  ...('x' in o && { x: Math.round(o.x) }),
  ...('y' in o && { y: Math.round(o.y) })
})

const editPhase = (set, get, id, fn) =>
  commit(set, get, (s) => {
    const p = s.phases.find((x) => x.id === id)
    if (p) fn(p)
  })

// Delete items and every phase reference to them (keyframes, hides, paths that
// either move that pill or follow that drawing).
function purge(s, ids) {
  if (!ids.length) return
  const gone = new Set(ids)
  s.items = s.items.filter((i) => !gone.has(i.id))
  for (const p of s.phases) {
    for (const id of gone) delete p.pos[id]
    p.hidden = p.hidden.filter((id) => !gone.has(id))
    for (const [pill, drawing] of Object.entries(p.paths)) {
      if (gone.has(pill) || gone.has(drawing)) delete p.paths[pill]
    }
  }
}

// An item created while a phase is being edited is hidden in every OTHER phase
// so it reads as belonging to just that phase. No-op at Start / with the
// timeline closed (both leave playback.phaseId null).
function scopeToPhase(strategy, playback, id) {
  if (!playback?.phaseId) return
  for (const p of strategy.phases) {
    if (p.id !== playback.phaseId && !p.hidden.includes(id)) p.hidden.push(id)
  }
}

export const useStore = create(
  persist(
    temporal(creator, {
      // Only the strategy document participates in undo/redo. `equality`
      // returning true means "no change" — so view (pan/zoom) and layout
      // edits never create history entries.
      partialize: (state) => ({ strategy: state.strategy }),
      equality: (a, b) => a.strategy === b.strategy,
      limit: 100
    }),
    {
      name: STORAGE_KEY,
      // v3: strategy library. v4: two roster panels. v5: dropped dead
      // player.name/weapons + squad.leaderId. v7: teams grouped into
      // Attack/Defence + squad.category. v8: squad.name back as an optional
      // rename (blank = the derived "Att N" default). v9: map entities folded
      // into strategy.items; phases keyframe items (pos / hidden).
      version: 9,
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        docs: state.docs,
        order: state.order,
        activeId: state.activeId,
        view: state.view,
        layout: state.layout,
        ui: state.ui
      }),
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') return persisted
        if (!persisted.docs) {
          // pre-v3: a single top-level `strategy`
          const id = newId('str')
          persisted.docs = { [id]: migrateStrategy(persisted.strategy || {}) }
          persisted.order = [id]
          persisted.activeId = id
        } else {
          for (const id of Object.keys(persisted.docs)) {
            persisted.docs[id] = migrateStrategy(persisted.docs[id])
          }
          if (!Array.isArray(persisted.order) || !persisted.order.length) {
            persisted.order = Object.keys(persisted.docs)
          }
          if (!persisted.docs[persisted.activeId]) {
            persisted.activeId = persisted.order[0]
          }
        }
        delete persisted.strategy
        const ui = persisted.ui || {}
        persisted.ui = {
          panels: ui.panels || { ally: true, enemy: true },
          collapsedTeams: ui.collapsedTeams || {},
          collapsedPills: ui.collapsedPills || {},
          showTrail: ui.showTrail ?? true
        }
        return persisted
      },
      // `strategy` isn't persisted — rebuild it from the active doc. Also
      // normalise `ui` here (runs on every rehydrate, unlike `migrate`) so a
      // partially-shaped persisted blob can't crash the app.
      merge: (persisted, current) => {
        const merged = { ...current, ...persisted }
        const ui = (persisted && persisted.ui) || {}
        merged.ui = {
          panels: ui.panels || { ally: true, enemy: true },
          collapsedTeams: ui.collapsedTeams || {},
          collapsedPills: ui.collapsedPills || {},
          showTrail: ui.showTrail ?? true
        }
        if (merged.docs?.[merged.activeId]) merged.strategy = merged.docs[merged.activeId]
        return merged
      },
      // Clear the history entry that the hydration set itself creates, so the
      // first Undo doesn't wipe the just-loaded document.
      onRehydrateStorage: () => () => {
        useStore.temporal.getState().clear()
      }
    }
  )
)

// Hook into zundo's temporal store for undo/redo controls.
export const useTemporal = (selector) =>
  useZustandStore(useStore.temporal, selector)

// Dev-only: expose the live store for console poking / e2e checks.
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__store = useStore
}

// Undo/redo wrappers that also mirror the restored doc back into the library.
function syncActiveDoc() {
  const s = useStore.getState()
  if (s.docs[s.activeId] !== s.strategy) {
    useStore.setState({ docs: { ...s.docs, [s.activeId]: s.strategy } })
  }
}
export const doUndo = () => {
  useStore.temporal.getState().undo()
  syncActiveDoc()
}
export const doRedo = () => {
  useStore.temporal.getState().redo()
  syncActiveDoc()
}
