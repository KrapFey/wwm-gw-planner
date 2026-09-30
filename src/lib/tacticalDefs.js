// Objective / callout markers and drawing presets for the tactical layer.

export const MARKER_KINDS = {
  attack: { label: 'Attack', color: '#ef4444' },
  danger: { label: 'Danger', color: '#f59e0b' },
  defend: { label: 'Defend', color: '#3b82f6' },
  hold: { label: 'Hold', color: '#a78bfa' },
  yes: { label: 'Yes', color: '#22c55e' },
  no: { label: 'No', color: '#64748b' }
}

export const MARKER_KIND_LIST = Object.keys(MARKER_KINDS)

export const DRAW_COLORS = ['#facc15', '#ef4444', '#3b82f6', '#22c55e', '#ffffff', '#0e0b07']

export const DRAW_WIDTHS = [
  { label: 'S', value: 3 },
  { label: 'M', value: 6 },
  { label: 'L', value: 10 }
]

// Drawing tools whose geometry is a 2-point bounding box (start + end corner),
// as opposed to the freehand pen. Arrow is box-like too but rendered as a line.
// (Curved arrow is drawn like the pen — you drag an arc — then reduced to
// [start, apex, end], so it isn't box-drawn.)
export const SHAPE_TOOLS = ['rect', 'ellipse', 'triangle', 'line']
export const BOX_DRAW_TOOLS = ['arrow', ...SHAPE_TOOLS]

export const SHAPE_META = {
  rect: { label: 'Rectangle' },
  ellipse: { label: 'Ellipse' },
  triangle: { label: 'Triangle' },
  line: { label: 'Line' }
}

export const DRAW_TOOL_LABEL = {
  pen: 'Line',
  arrow: 'Arrow',
  carrow: 'Curve',
  rect: 'Box',
  ellipse: 'Oval',
  triangle: 'Triangle',
  line: 'Line'
}

// stroke hex + alpha (0..1) -> rgba() string, for translucent shape fills.
export const withAlpha = (hex, a) => {
  const m = /^#?([\da-f]{6})$/i.exec(hex || '')
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Default bow for a *legacy* 4-number curved arrow (no stored apex). `points` =
// [x1, y1, x2, y2].
function curvedArrowControl([x1, y1, x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const bow = len * 0.22
  return [(x1 + x2) / 2 - (dy / len) * bow, (y1 + y2) / 2 + (dx / len) * bow]
}

// The three anchor points [x1,y1, ax,ay, x2,y2] of a curved arrow. New curved
// arrows store 6 numbers (start, apex, end — apex set by how you arced the
// drag); legacy ones store 4 and get a default apex.
export function curvedArrowAnchors(points) {
  if (points.length >= 6) return points.slice(0, 6)
  const [x1, y1, x2, y2] = points
  const [ax, ay] = curvedArrowControl(points)
  return [x1, y1, ax, ay, x2, y2]
}

// Reduce a freehand drag polyline to [start, apex, end], where the apex is the
// sample farthest (perpendicular, signed) from the start→end chord — so the
// curve bows the way you dragged, and flips if you drag the other side.
export function reduceCurvedArrow(points) {
  const n = points.length
  const sx = points[0]
  const sy = points[1]
  const ex = points[n - 2]
  const ey = points[n - 1]
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.hypot(dx, dy) || 1
  let best = 0
  let ax = (sx + ex) / 2
  let ay = (sy + ey) / 2
  for (let i = 2; i < n - 2; i += 2) {
    const perp = ((points[i] - sx) * dy - (points[i + 1] - sy) * dx) / len
    if (Math.abs(perp) > Math.abs(best)) {
      best = perp
      ax = points[i]
      ay = points[i + 1]
    }
  }
  return [sx, sy, ax, ay, ex, ey]
}

// Flat [x,y,x,y,...] polyline approximating a drawing, for motion-along-path.
export function drawingPolyline(d) {
  if (!d || !Array.isArray(d.points)) return null
  if (d.tool === 'pen') return d.points
  if (d.tool === 'carrow') {
    // quadratic bezier that passes through the apex at t = 0.5
    const [x1, y1, ax, ay, x2, y2] = curvedArrowAnchors(d.points)
    const cx = 2 * ax - (x1 + x2) / 2
    const cy = 2 * ay - (y1 + y2) / 2
    const out = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      const mt = 1 - t
      out.push(
        mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
        mt * mt * y1 + 2 * mt * t * cy + t * t * y2
      )
    }
    return out
  }
  const [x1, y1, x2, y2] = d.points
  return [x1, y1, x2, y2] // arrow / straight line
}

// Which drawings can be used as a movement path.
export const PATH_TOOLS = ['pen', 'arrow', 'carrow', 'line']

export const NOTE_COLORS = ['#fde68a', '#fca5a5', '#a7f3d0', '#bfdbfe', '#e9d5ff']

export const fmtClock = (secs) => {
  const s = Math.max(0, Math.round(secs))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
