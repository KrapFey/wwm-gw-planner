// Pure helpers for animating the planning phases.
//
// The board's normal state is the "Start" frame; each phase is a keyframe after
// it. A phase's `board` snapshots positions:
//   board.squads  = { [squadId]:  { x, y } }
//   board.markers = { [markerId]: { x, y } }

export const lerp = (a, b, t) => a + (b - a) * t

export const easeInOutCubic = (x) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

// Live board -> the Start frame in the same shape as a phase board.
export function startFrame(placedSquads, markers) {
  return {
    squads: Object.fromEntries(
      placedSquads.map((q) => [q.id, { x: q.token.x, y: q.token.y }])
    ),
    markers: Object.fromEntries(markers.map((m) => [m.id, { x: m.x, y: m.y }]))
  }
}

// Total animation length in ms (transitions + holds).
export function totalDuration(phases) {
  return phases.reduce(
    (sum, p) => sum + Math.max(0, p.duration || 0) + Math.max(0, p.hold || 0),
    0
  )
}

// Which phase the clock is currently within / resting on (0-based), or -1 with
// no phases. `<=` so that landing exactly on a keyframe stays on that phase
// (matters because holds default to 0).
export function activePhaseIndex(phases, t) {
  let clock = 0
  for (let i = 0; i < phases.length; i++) {
    clock += Math.max(0, phases[i].duration || 0) + Math.max(0, phases[i].hold || 0)
    if (t <= clock) return i
  }
  return phases.length - 1
}

// ms elapsed at the moment phase `index` finishes its transition (before its hold).
export function phaseArrivalTime(phases, index) {
  let t = 0
  for (let i = 0; i <= index && i < phases.length; i++) {
    t += Math.max(0, phases[i].duration || 0)
    if (i < index) t += Math.max(0, phases[i].hold || 0)
  }
  return t
}

function blend(from, to, e) {
  const out = {}
  const ids = new Set([...Object.keys(from || {}), ...Object.keys(to || {})])
  for (const id of ids) {
    const a = from?.[id]
    const b = to?.[id]
    if (a && b) out[id] = { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) }
    else out[id] = b || a // popped in -> target; only in `from` -> hold
  }
  return out
}

const hiddenOf = (board) => ({
  hiddenDrawings: new Set(board?.hiddenDrawings || []),
  hiddenNotes: new Set(board?.hiddenNotes || []),
  hiddenMarkers: new Set(board?.hiddenMarkers || []),
  hiddenSquads: new Set(board?.hiddenSquads || [])
})
const EMPTY_HIDDEN = {
  hiddenDrawings: new Set(),
  hiddenNotes: new Set(),
  hiddenMarkers: new Set(),
  hiddenSquads: new Set()
}

// Interpolated board at time `t` (ms). `start` is the Start frame.
// Returns { squads, markers, phaseIndex, hiddenDrawings, hiddenNotes,
//           hiddenMarkers, hiddenSquads }.
// Visibility follows the phase being animated toward / rested on; at t<=0
// (Start) everything is visible.
export function frameAt(start, phases, t) {
  if (!phases.length) return { ...start, phaseIndex: -1, ...EMPTY_HIDDEN }
  if (t <= 0) {
    return {
      squads: { ...start.squads },
      markers: { ...start.markers },
      phaseIndex: 0,
      ...EMPTY_HIDDEN
    }
  }

  let clock = 0
  let from = start
  for (let i = 0; i < phases.length; i++) {
    const dur = Math.max(0, phases[i].duration || 0)
    const hold = Math.max(0, phases[i].hold || 0)
    const to = phases[i].board || { squads: {}, markers: {} }

    if (t < clock + dur || (dur === 0 && t <= clock)) {
      const e = dur > 0 ? easeInOutCubic(Math.min(1, Math.max(0, (t - clock) / dur))) : 1
      return {
        squads: blend(from.squads, to.squads, e),
        markers: blend(from.markers, to.markers, e),
        phaseIndex: i,
        ...hiddenOf(to)
      }
    }
    clock += dur
    // `<=` so the exact arrival moment (holds default to 0) rests on this phase
    // rather than starting the next transition at e=0 (which would show the next
    // phase's visibility while positions haven't moved yet).
    if (t <= clock + hold) {
      return {
        squads: { ...to.squads },
        markers: { ...to.markers },
        phaseIndex: i,
        ...hiddenOf(to)
      }
    }
    clock += hold
    from = to
  }
  // past the end -> rest on the last phase
  const last = phases[phases.length - 1].board || { squads: {}, markers: {} }
  return {
    squads: { ...last.squads },
    markers: { ...last.markers },
    phaseIndex: phases.length - 1,
    ...hiddenOf(last)
  }
}
