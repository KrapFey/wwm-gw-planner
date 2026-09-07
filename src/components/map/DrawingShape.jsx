import { Line, Arrow } from 'react-konva'
import { useStore } from '../../store/useStore.js'

// One committed freehand line or arrow. `live` renders the in-progress stroke
// (non-interactive). In select mode it can be selected and dragged; double-click
// removes it.
export default function DrawingShape({ drawing, live = false, selected = false, onSelect }) {
  const removeDrawing = useStore((s) => s.removeDrawing)
  const updateDrawing = useStore((s) => s.updateDrawing)

  const common = {
    id: drawing.id,
    name: 'drawing',
    points: drawing.points,
    stroke: drawing.color,
    strokeWidth: drawing.width,
    lineCap: 'round',
    lineJoin: 'round',
    listening: !live,
    draggable: !live && selected,
    hitStrokeWidth: Math.max(16, drawing.width * 3),
    shadowColor: selected ? '#7c6cff' : undefined,
    shadowBlur: selected ? 12 : 0,
    shadowOpacity: selected ? 0.9 : 0,
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
    onDragEnd: (e) => {
      const node = e.target
      const dx = node.x()
      const dy = node.y()
      node.position({ x: 0, y: 0 })
      if (!dx && !dy) return
      updateDrawing(drawing.id, {
        points: drawing.points.map((v, i) => v + (i % 2 === 0 ? dx : dy))
      })
    }
  }

  if (drawing.tool === 'arrow') {
    return (
      <Arrow
        {...common}
        fill={drawing.color}
        pointerLength={Math.max(10, drawing.width * 2.2)}
        pointerWidth={Math.max(10, drawing.width * 2.2)}
      />
    )
  }
  return <Line {...common} tension={0.35} />
}
