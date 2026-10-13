import { memo } from 'react'
import { Group, Circle, Line, Ellipse, Rect, Text } from 'react-konva'
import { useStore } from '../../store/useStore.js'
import { MARKER_KINDS } from '../../lib/tacticalDefs.js'
import { clampToMap } from '../../lib/mapLayout.js'
import MarkerIcon from './MarkerIcon.jsx'
import { CANVAS } from './canvasTheme.jsx'

const R = 15

// A modern map-pin: coloured teardrop that can be rotated to aim, a crisp
// vector icon that stays upright in the head, a ground shadow, and a compact
// caption chip.
function Marker({ marker, x, y, selected, onSelect, locked = false }) {
  const dragItem = useStore((s) => s.dragItem)
  const removeFromBoard = useStore((s) => s.removeFromBoard)
  const def = MARKER_KINDS[marker.kind] ?? MARKER_KINDS.attack
  const remove = () => removeFromBoard(marker.id)
  const sc = marker.scale || 1
  const rot = marker.rotation || 0
  const label = marker.label || def.label
  const capW = Math.max(44, label.length * 6.2 + 16)
  const tail = R * 1.95

  return (
    <Group
      x={x}
      y={y}
      draggable={!locked}
      onDragStart={(e) => (e.cancelBubble = true)}
      onDragEnd={(e) => dragItem(marker.id, clampToMap({ x: e.target.x(), y: e.target.y() }))}
      onClick={(e) => {
        e.cancelBubble = true
        onSelect?.(marker.id)
      }}
      onTap={(e) => {
        e.cancelBubble = true
        onSelect?.(marker.id)
      }}
      onDblClick={locked ? undefined : remove}
      onDblTap={locked ? undefined : remove}
    >
      <Ellipse
        x={0}
        y={tail * sc}
        radiusX={R * 0.7 * sc}
        radiusY={R * 0.26 * sc}
        fill="#000"
        opacity={0.28}
        listening={false}
      />

      {/* pin silhouette — rotates so the point can indicate direction */}
      <Group rotation={rot} scaleX={sc} scaleY={sc}>
        <Line
          points={[-R * 0.6, R * 0.42, 0, tail, R * 0.6, R * 0.42]}
          closed
          fill={def.color}
          listening={false}
        />
        <Circle
          radius={R}
          fill={def.color}
          stroke={CANVAS.ink}
          strokeWidth={1.5}
          shadowColor="#000"
          shadowBlur={6}
          shadowOpacity={0.4}
        />
        <Circle radius={R} stroke="rgba(255,255,255,0.3)" strokeWidth={1} listening={false} />
      </Group>

      {/* upright icon centred in the head */}
      <Group scaleX={sc} scaleY={sc}>
        <MarkerIcon kind={marker.kind} size={19} color="#fff" />
      </Group>

      {selected && (
        <Circle
          radius={R * sc + 6}
          stroke={CANVAS.accent}
          strokeWidth={2}
          dash={[5, 4]}
          listening={false}
        />
      )}

      <Rect
        x={-capW / 2}
        y={tail * sc + 5}
        width={capW}
        height={16}
        cornerRadius={5}
        fill={CANVAS.glass}
        listening={false}
      />
      <Text
        fontFamily={CANVAS.font}
        x={-capW / 2}
        y={tail * sc + 8}
        width={capW}
        align="center"
        text={label}
        fontSize={10}
        fontStyle="bold"
        fill={CANVAS.text}
        listening={false}
      />
    </Group>
  )
}

export default memo(Marker)
