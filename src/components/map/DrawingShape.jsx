import { Group, Line, Arrow, Rect, Ellipse, Circle } from 'react-konva'
import { useStore } from '../../store/useStore.js'
import { SHAPE_TOOLS, withAlpha, curvedArrowAnchors } from '../../lib/tacticalDefs.js'

// One committed drawing: freehand line, straight/curved arrow, or a basic shape
// (rounded rectangle / ellipse / triangle / straight line). Shapes + straight
// arrow store a 2-point bounding box in `points`; a curved arrow stores
// [start, apex, end] (6 numbers) and, when selected, shows a handle to drag the
// apex — moving it across the chord flips the curve. `live` renders the
// in-progress stroke (non-interactive). In select mode a drawing can be selected
// and dragged; double-click removes it.
export default function DrawingShape({ drawing, live = false, selected = false, onSelect }) {
  const removeDrawing = useStore((s) => s.removeDrawing)
  const updateDrawing = useStore((s) => s.updateDrawing)

  const isShape = SHAPE_TOOLS.includes(drawing.tool)
  // a shape needs both corners before there's anything to draw
  if (isShape && drawing.points.length < 4) return null

  const shiftPoints = (dx, dy) =>
    updateDrawing(drawing.id, {
      points: drawing.points.map((v, i) => v + (i % 2 === 0 ? dx : dy))
    })

  // Drag ends: Konva has translated the node; fold that offset back into the
  // stored points and reset the node so React stays the source of truth.
  const onDragEndFold = (e) => {
    const node = e.target
    const dx = node.x()
    const dy = node.y()
    node.position({ x: 0, y: 0 })
    if (dx || dy) shiftPoints(dx, dy)
  }

  const interaction = {
    listening: !live,
    draggable: !live && selected,
    onClick: live
      ? undefined
      : (e) => {
          e.cancelBubble = true
          onSelect?.(drawing.id)
        },
    onTap: live
      ? undefined
      : (e) => {
          e.cancelBubble = true
          onSelect?.(drawing.id)
        },
    onDblClick: live ? undefined : () => removeDrawing(drawing.id),
    onDblTap: live ? undefined : () => removeDrawing(drawing.id),
    onDragStart: (e) => (e.cancelBubble = true),
    onDragEnd: onDragEndFold
  }

  const stroke = {
    stroke: drawing.color,
    strokeWidth: drawing.width,
    lineCap: 'round',
    lineJoin: 'round',
    hitStrokeWidth: Math.max(16, drawing.width * 3),
    shadowColor: selected ? '#7c6cff' : undefined,
    shadowBlur: selected ? 12 : 0,
    shadowOpacity: selected ? 0.9 : 0
  }

  // ---- freehand + arrows: single node, points are absolute (x/y = 0) ----
  if (!isShape) {
    const common = { id: drawing.id, name: 'drawing', points: drawing.points, ...stroke, ...interaction }
    const head = Math.max(10, drawing.width * 2.2)
    if (drawing.tool === 'arrow') {
      return <Arrow {...common} fill={drawing.color} pointerLength={head} pointerWidth={head} />
    }
    if (drawing.tool === 'carrow') {
      // live: show the raw arc being dragged. committed: spline start→apex→end.
      if (live) {
        return (
          <Arrow {...common} tension={0.4} fill={drawing.color} pointerLength={head} pointerWidth={head} />
        )
      }
      const [x1, y1, ax, ay, x2, y2] = curvedArrowAnchors(drawing.points)
      const arrow = (
        <Arrow
          {...common}
          points={[x1, y1, ax, ay, x2, y2]}
          tension={0.5}
          fill={drawing.color}
          pointerLength={head}
          pointerWidth={head}
        />
      )
      if (!selected) return arrow
      // drag this handle to reshape / flip the curve
      return (
        <Group>
          {arrow}
          <Circle
            x={ax}
            y={ay}
            radius={7}
            fill="#fff"
            stroke="#7c6cff"
            strokeWidth={2}
            draggable
            onDragStart={(e) => (e.cancelBubble = true)}
            onDragEnd={(e) =>
              updateDrawing(drawing.id, {
                points: [x1, y1, e.target.x(), e.target.y(), x2, y2]
              })
            }
          />
        </Group>
      )
    }
    return <Line {...common} tension={0.35} />
  }

  // ---- basic shapes: geometry from the [x1,y1,x2,y2] bounding box ----
  // Wrapped in a Group so the drag offset is a clean delta regardless of the
  // child's own x/y.
  const [x1, y1, x2, y2] = drawing.points
  const minX = Math.min(x1, x2)
  const minY = Math.min(y1, y2)
  const w = Math.abs(x2 - x1)
  const h = Math.abs(y2 - y1)
  const fill = withAlpha(drawing.color, 0.16)
  const leaf = { id: drawing.id, name: 'drawing', ...stroke }

  let node
  if (drawing.tool === 'line') {
    node = <Line {...leaf} points={[x1, y1, x2, y2]} />
  } else if (drawing.tool === 'rect') {
    node = (
      <Rect
        {...leaf}
        x={minX}
        y={minY}
        width={w}
        height={h}
        cornerRadius={Math.min(w, h) * 0.14}
        fill={fill}
      />
    )
  } else if (drawing.tool === 'ellipse') {
    node = (
      <Ellipse
        {...leaf}
        x={minX + w / 2}
        y={minY + h / 2}
        radiusX={w / 2}
        radiusY={h / 2}
        fill={fill}
      />
    )
  } else {
    // triangle — apex at top-centre of the box
    node = (
      <Line
        {...leaf}
        points={[minX + w / 2, minY, minX + w, minY + h, minX, minY + h]}
        closed
        fill={fill}
      />
    )
  }

  return <Group {...interaction}>{node}</Group>
}
