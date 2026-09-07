import { Group, Circle, Line, Ellipse, Rect, Text } from 'react-konva'
import { useStore } from '../../store/useStore.js'
import { MARKER_KINDS } from '../../lib/tacticalDefs.js'
import { clampToMap } from '../../lib/mapLayout.js'
import MarkerIcon from './MarkerIcon.jsx'

const R = 15

// A modern map-pin: coloured teardrop that can be rotated to aim, a crisp
// vector icon that stays upright in the head, a ground shadow, and a compact
// caption chip.
export default function Marker({ marker, selected, onSelect, override, onMove, onRemove, locked = false }) {
  const updateMarker = useStore((s) => s.updateMarker)
  const removeMarker = useStore((s) => s.removeMarker)
  const def = MARKER_KINDS[marker.kind] ?? MARKER_KINDS.attack

  const move = onMove ?? ((pos) => updateMarker(marker.id, pos))
  const remove = onRemove ?? (() => removeMarker(marker.id))
  const sc = marker.scale || 1
  const rot = marker.rotation || 0
  const label = (marker.label ?? def.label).toUpperCase()
  const capW = Math.max(44, label.length * 6 + 14)
  const tail = R * 1.95

  return (
    <Group
      x={override?.x ?? marker.x}
      y={override?.y ?? marker.y}
      draggable={!locked}
      onDragStart={(e) => (e.cancelBubble = true)}
      onDragEnd={(e) => move(clampToMap({ x: e.target.x(), y: e.target.y() }))}
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
          stroke="#0c0e12"
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
          stroke="#7c6cff"
          strokeWidth={2}
          dash={[5, 4]}
          listening={false}
        />
      )}

      <Rect
        x={-capW / 2}
        y={tail * sc + 5}
        width={capW}
        height={15}
        cornerRadius={7}
        fill="rgba(12,14,18,0.92)"
        listening={false}
      />
      <Text
        x={-capW / 2}
        y={tail * sc + 7.5}
        width={capW}
        align="center"
        text={label}
        fontSize={9}
        fontStyle="bold"
        fill="#eef1f6"
        listening={false}
      />
    </Group>
  )
}
