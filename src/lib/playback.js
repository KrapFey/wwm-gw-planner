// Pure helpers for animating the planning phases.
//
// The board's normal state is the "Start" frame; each phase is a keyframe after
// it. A phase stores item positions as `pos = { [itemId]: { x, y } }` and the
// ids it hides as `hidden`.

const lerp = (a, b, t) => a + (b - a) * t

const easeInOutCubic = (x) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

const EASING = {
  linear: (x) => x,
  in: (x) => x * x * x,
  out: (x) => 1 - Math.pow(1 - x, 3),
  inout: easeInOutCubic
}
export const EASING_KINDS = ['inout', 'linear', 'in', 'out']
export const EASING_LABEL = { inout: 'Ease', linear: 'Linear', in: 'Ease in', out: 'Ease out' }
export const easingFn = (kind) => EASING[kind] || EASING.inout

// Point at fraction `f` (0..1) of a flat [x,y,x,y,...] polyline's arc length.
export function pointAtFraction(points, f) {
  if (!points || points.length < 2) return null
  if (points.length < 4) return { x: points[0], y: points[1] }
  const pts = []
  for (let i = 0; i + 1 < points.length; i += 2) pts.push([points[i], points[i + 1]])
  const seg = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    seg.push(d)
    total += d
  }
  if (total === 0) return { x: pts[0][0], y: pts[0][1] }
  const target = Math.min(1, Math.max(0, f)) * total
  let acc = 0
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= target) {
      const u = seg[i] === 0 ? 0 : (target - acc) / seg[i]
      return { x: lerp(pts[i][0], pts[i + 1][0], u), y: lerp(pts[i][1], pts[i + 1][1], u) }
    }
    acc += seg[i]
  }
  const last = pts[pts.length - 1]
  return { x: last[0], y: last[1] }
}

// Override positions of pills that follow a drawn path for this phase.
function applyPaths(pos, phasePaths, e) {
  if (!phasePaths) return pos
  const out = { ...pos }
  for (const id of Object.keys(phasePaths)) {
    const p = pointAtFraction(phasePaths[id], e)
    if (p) out[id] = p
  }
  return out
}

// Live board -> the Start frame: every positioned item's { x, y }.
export function startFrame(items) {
  return {
    pos: Object.fromEntries(
      items.filter((it) => it.x != null).map((it) => [it.id, { x: it.x, y: it.y }])
    )
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

const NONE = new Set()
const frame = (pos, phaseIndex, phase) => ({
  pos,
  phaseIndex,
  hidden: phase ? new Set(phase.hidden || []) : NONE
})

// Interpolated board at time `t` (ms). `start` is the Start frame.
// `pathPolys` (optional) = { [phaseId]: { [pillId]: number[] } } — a resolved
// polyline a pill walks during that phase instead of a straight lerp.
// Returns { pos, phaseIndex, hidden: Set<itemId> }.
export function frameAt(start, phases, t, pathPolys) {
  if (!phases.length) return frame({ ...start.pos }, -1, null)
  if (t <= 0) return frame({ ...start.pos }, 0, null)

  let clock = 0
  let from = start.pos
  for (let i = 0; i < phases.length; i++) {
    const ph = phases[i]
    const dur = Math.max(0, ph.duration || 0)
    const hold = Math.max(0, ph.hold || 0)
    const to = ph.pos || {}
    const paths = pathPolys?.[ph.id] || null

    if (t < clock + dur || (dur === 0 && t <= clock)) {
      const raw = dur > 0 ? Math.min(1, Math.max(0, (t - clock) / dur)) : 1
      const e = easingFn(ph.easing)(raw)
      return frame(applyPaths(blend(from, to, e), paths, e), i, ph)
    }
    clock += dur
    // `<=` so the exact arrival moment (holds default to 0) rests on this phase
    // rather than starting the next transition at e=0 (which would show the next
    // phase's visibility while positions haven't moved yet).
    if (t <= clock + hold) return frame(applyPaths({ ...to }, paths, 1), i, ph)
    clock += hold
    // a path-following pill ends the phase at the path's end, so the next phase
    // starts from there
    from = applyPaths({ ...to }, paths, 1)
  }
  // past the end -> rest on the last phase
  const last = phases[phases.length - 1]
  return frame(applyPaths({ ...(last.pos || {}) }, pathPolys?.[last.id], 1), phases.length - 1, last)
}
