import { Group, Image as KonvaImage, Rect } from 'react-konva'
import { useImage } from '../../lib/useImage.js'
import { FIXTURE_KINDS, clampToMap } from '../../lib/mapLayout.js'
import { useStore } from '../../store/useStore.js'

// Trees are a moving objective in Guild War, so they can be dragged during normal
// planning too (not just in "Edit map layout"). Everything else is fixed scenery.
const PLAY_MOVABLE = new Set(['tree_blue', 'tree_red'])

export default function FixtureSprite({ fixture, editable, playDraggable, selected, onSelect }) {
  const updateFixture = useStore((s) => s.updateFixture)
  const def = FIXTURE_KINDS[fixture.kind]
  const img = useImage(def?.src)

  if (!def || !img) return null

  const w = def.width * (fixture.scale || 1)
  const h = w * (img.height / img.width)

  const movable = editable || (playDraggable && PLAY_MOVABLE.has(fixture.kind))

  return (
    <Group
      x={fixture.x}
      y={fixture.y}
      rotation={fixture.rotation || 0}
      draggable={movable}
      listening={movable}
      opacity={editable ? 1 : 0.95}
      onMouseDown={
        editable
          ? (e) => {
              e.cancelBubble = true
              onSelect?.(fixture.id)
            }
          : undefined
      }
      onTap={editable ? () => onSelect?.(fixture.id) : undefined}
      onDragStart={(e) => {
        e.cancelBubble = true
      }}
      onDragEnd={(e) => {
        const p = clampToMap({ x: e.target.x(), y: e.target.y() })
        updateFixture(fixture.id, { x: Math.round(p.x), y: Math.round(p.y) })
      }}
    >
      <KonvaImage
        image={img}
        width={w}
        height={h}
        offsetX={w / 2}
        offsetY={h / 2}
        shadowColor="#000"
        shadowBlur={selected ? 14 : 5}
        shadowOpacity={selected ? 0.6 : 0.35}
      />
      {editable && (
        <Rect
          x={-w / 2 - 3}
          y={-h / 2 - 3}
          width={w + 6}
          height={h + 6}
          cornerRadius={4}
          stroke={selected ? '#e8b04a' : 'rgba(232,176,74,0.4)'}
          strokeWidth={selected ? 2 : 1}
          dash={[6, 4]}
          listening={false}
        />
      )}
    </Group>
  )
}
