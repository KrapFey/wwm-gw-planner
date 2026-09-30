import { memo } from 'react'
import { Group, Rect, Text, Circle } from 'react-konva'
import { useStore } from '../../store/useStore.js'
import { squadStats, squadLabel } from '../../lib/selectors.js'
import { ROLES, pillColor } from '../../lib/schema.js'
import { clampToMap } from '../../lib/mapLayout.js'

const H = 28
const FONT = 13
const PAD_X = 14
const BADGE_W = 24
const LETTER = { Tank: 'T', DPS: 'D', Healer: 'H' }
const DISC_R = 15

// A whole team placed on the map as one draggable pill. The body/border colour
// is shared by side + category — every Attack pill on a guild looks alike, every
// Defense pill alike (4 in total: our Attack blue / Defense teal, enemy Attack
// red / Defense orange). The count badge keeps the team's own accent so
// individual teams stay tellable. Middle-click collapses it to a bare disc:
// category colour ring, team colour fill.
// It does its own store calls (dragItem / removeFromBoard route to the phase
// being edited), so it memoizes cleanly.
function SquadToken({ squad, x, y, selected = false, onSelect, locked = false }) {
  const dragItem = useStore((s) => s.dragItem)
  const removeFromBoard = useStore((s) => s.removeFromBoard)
  // only the players (for the fill/role tally) and squads (for the ordinal in
  // the default name) — not the whole doc, so marker/drawing/note edits don't
  // re-render every pill
  const players = useStore((s) => s.strategy.players)
  const squads = useStore((s) => s.strategy.squads)
  const collapsed = useStore((s) => !!s.ui.collapsedPills[squad.id])
  const togglePillCollapsed = useStore((s) => s.togglePillCollapsed)
  const strategy = { players, squads }
  const { fill, byRole } = squadStats(strategy, squad)

  const remove = () => removeFromBoard(squad.id)
  const select = (e) => {
    e.cancelBubble = true
    onSelect?.(squad.id)
  }

  const pillCol = pillColor(squad.side, squad.category)
  const name = squadLabel(strategy, squad)

  // middle-click toggles the collapsed (bare disc) view
  const onMouseDown = (e) => {
    if (e.evt?.button === 1) {
      e.evt.preventDefault()
      e.cancelBubble = true
      togglePillCollapsed(squad.id)
    }
  }

  const dragProps = {
    x,
    y,
    draggable: !locked,
    onMouseDown,
    onDragStart: (e) => (e.cancelBubble = true),
    onDragEnd: (e) => dragItem(squad.id, clampToMap({ x: e.target.x(), y: e.target.y() })),
    onClick: select,
    onTap: select,
    onDblClick: locked ? undefined : remove,
    onDblTap: locked ? undefined : remove
  }

  if (collapsed) {
    return (
      <Group {...dragProps}>
        {selected && (
          <Circle radius={DISC_R + 6} stroke="#7c6cff" strokeWidth={2} dash={[5, 4]} listening={false} />
        )}
        <Circle
          radius={DISC_R}
          fill={squad.color}
          stroke={pillCol}
          strokeWidth={3}
          shadowColor={pillCol}
          shadowBlur={9}
          shadowOpacity={0.4}
        />
        <Text
          x={-DISC_R}
          y={-6}
          width={DISC_R * 2}
          align="center"
          text={String(squad.targetSize)}
          fontSize={13}
          fontStyle="bold"
          fill="#0c0e12"
          listening={false}
        />
      </Group>
    )
  }

  const comp = ROLES.filter((r) => byRole[r] > 0)
    .map((r) => `${LETTER[r]}${byRole[r]}`)
    .join(' ')
  const subtitle = [squad.lane !== 'Unassigned' ? squad.lane : null, comp]
    .filter(Boolean)
    .join('  ·  ')

  // generous per-char estimate (name is bold, may be all-caps) + a little slack
  const approxCharW = FONT * 0.66
  const w = Math.min(
    260,
    Math.max(84, Math.ceil(name.length * approxCharW) + BADGE_W + PAD_X * 2 + 10)
  )
  const left = -w / 2

  const SUB_FONT = 11
  const subW = Math.ceil(subtitle.length * SUB_FONT * 0.6) + 16

  return (
    <Group {...dragProps}>
      {selected && (
        <Rect
          x={left - 5}
          y={-H / 2 - 5}
          width={w + 10}
          height={H + 10}
          cornerRadius={H / 2 + 5}
          stroke="#7c6cff"
          strokeWidth={2}
          dash={[5, 4]}
          listening={false}
        />
      )}
      {/* base + pill wash */}
      <Rect
        x={left}
        y={-H / 2}
        width={w}
        height={H}
        cornerRadius={H / 2}
        fill="rgba(12,14,18,0.94)"
        stroke={pillCol}
        strokeWidth={2.5}
        shadowColor={pillCol}
        shadowBlur={10}
        shadowOpacity={0.32}
      />
      <Rect
        x={left}
        y={-H / 2}
        width={w}
        height={H}
        cornerRadius={H / 2}
        fill={pillCol}
        opacity={0.14}
        listening={false}
      />

      <Text
        x={left + PAD_X}
        y={-FONT / 2}
        width={w - PAD_X * 2 - BADGE_W}
        text={name}
        fontSize={FONT}
        fontStyle="bold"
        fill="#f2f4f8"
        ellipsis
        wrap="none"
        listening={false}
      />

      <Rect
        x={w / 2 - PAD_X - BADGE_W + 6}
        y={-9}
        width={BADGE_W}
        height={18}
        cornerRadius={9}
        fill={squad.color}
        stroke="#0c0e12"
        strokeWidth={1}
        listening={false}
      />
      <Text
        x={w / 2 - PAD_X - BADGE_W + 6}
        y={-6}
        width={BADGE_W}
        align="center"
        text={String(fill)}
        fontSize={11}
        fontStyle="bold"
        fill="#0c0e12"
        listening={false}
      />

      {subtitle && (
        <>
          <Rect
            x={-subW / 2}
            y={H / 2 + 3}
            width={subW}
            height={17}
            cornerRadius={5}
            fill="rgba(12,14,18,0.92)"
            stroke={pillCol}
            strokeWidth={1}
            listening={false}
          />
          <Text
            x={-subW / 2}
            y={H / 2 + 6}
            width={subW}
            align="center"
            text={subtitle}
            fontSize={SUB_FONT}
            fontStyle="bold"
            fill="#eef1f6"
            listening={false}
          />
        </>
      )}
    </Group>
  )
}

export default memo(SquadToken)
