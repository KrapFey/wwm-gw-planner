import { Group, Rect, Text, Circle } from 'react-konva'
import { useStore } from '../../store/useStore.js'
import { squadStats } from '../../lib/selectors.js'
import { ROLES, SIDE_META } from '../../lib/schema.js'
import { clampToMap } from '../../lib/mapLayout.js'

const H = 28
const FONT = 13
const PAD_X = 14
const BADGE_W = 24
const LETTER = { Tank: 'T', DPS: 'D', Healer: 'H' }

// A whole team placed on the map as one draggable pill. The pill is
// side-coded (blue border/glow = ours, red = enemy); the small dot + count
// badge use the team's own accent so same-side teams stay distinguishable.
export default function SquadToken({ squad }) {
  const setSquadToken = useStore((s) => s.setSquadToken)
  const strategy = useStore((s) => s.strategy)
  const { fill, byRole } = squadStats(strategy, squad)

  const sideColor = SIDE_META[squad.side]?.color ?? '#888'
  const name = squad.name || 'Team'
  const comp = ROLES.filter((r) => byRole[r] > 0)
    .map((r) => `${LETTER[r]}${byRole[r]}`)
    .join(' ')
  const subtitle = [squad.lane !== 'Unassigned' ? squad.lane : null, comp]
    .filter(Boolean)
    .join('  ·  ')

  const approxCharW = FONT * 0.58
  const w = Math.min(
    250,
    Math.max(84, Math.ceil(name.length * approxCharW) + BADGE_W + PAD_X * 2 + 16)
  )
  const left = -w / 2

  const SUB_FONT = 11
  const subW = Math.ceil(subtitle.length * SUB_FONT * 0.6) + 16

  return (
    <Group
      x={squad.token.x}
      y={squad.token.y}
      draggable
      onDragStart={(e) => (e.cancelBubble = true)}
      onDragEnd={(e) =>
        setSquadToken(squad.id, clampToMap({ x: e.target.x(), y: e.target.y() }))
      }
      onDblClick={() => setSquadToken(squad.id, null)}
      onDblTap={() => setSquadToken(squad.id, null)}
    >
      {/* base + side wash */}
      <Rect
        x={left}
        y={-H / 2}
        width={w}
        height={H}
        cornerRadius={H / 2}
        fill="rgba(12,14,18,0.94)"
        stroke={sideColor}
        strokeWidth={2.5}
        shadowColor={sideColor}
        shadowBlur={10}
        shadowOpacity={0.32}
      />
      <Rect
        x={left}
        y={-H / 2}
        width={w}
        height={H}
        cornerRadius={H / 2}
        fill={sideColor}
        opacity={0.12}
        listening={false}
      />
      {/* side cap */}
      <Rect
        x={left}
        y={-H / 2}
        width={13}
        height={H}
        cornerRadius={[H / 2, 0, 0, H / 2]}
        fill={sideColor}
        listening={false}
      />

      {/* team accent dot */}
      <Circle
        x={left + PAD_X + 4}
        y={0}
        radius={5}
        fill={squad.color}
        stroke="#0c0e12"
        strokeWidth={1}
        listening={false}
      />

      <Text
        x={left + PAD_X + 16}
        y={-FONT / 2}
        width={w - PAD_X * 2 - 16 - BADGE_W}
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
            stroke={sideColor}
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
