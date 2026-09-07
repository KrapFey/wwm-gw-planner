import { Group, Line, Rect, Circle } from 'react-konva'

// Crisp vector glyphs for objective markers (drawn on a 24-unit design box).
const stroke = (color, sw = 2.4) => ({
  stroke: color,
  strokeWidth: sw,
  lineCap: 'round',
  lineJoin: 'round',
  listening: false
})

export default function MarkerIcon({ kind, size = 19, color = '#fff' }) {
  const s = (v) => (v * size) / 24

  switch (kind) {
    case 'attack': // crossed swords
      return (
        <Group>
          <Line points={[s(-7), s(-7), s(7), s(7)]} {...stroke(color)} />
          <Line points={[s(7), s(-7), s(-7), s(7)]} {...stroke(color)} />
          <Line points={[s(-9), s(-4), s(-4), s(-9)]} {...stroke(color, 2)} />
          <Line points={[s(9), s(4), s(4), s(9)]} {...stroke(color, 2)} />
        </Group>
      )
    case 'danger': // warning triangle + bang
      return (
        <Group>
          <Line points={[s(0), s(-8), s(8), s(7), s(-8), s(7)]} closed {...stroke(color)} />
          <Line points={[s(0), s(-2), s(0), s(3)]} {...stroke(color)} />
          <Circle x={0} y={s(5.5)} radius={s(1)} fill={color} listening={false} />
        </Group>
      )
    case 'defend': // shield
      return (
        <Line
          points={[
            s(0), s(-8), s(7), s(-5), s(7), s(2),
            s(0), s(9), s(-7), s(2), s(-7), s(-5)
          ]}
          closed
          {...stroke(color)}
        />
      )
    case 'hold': // pause bars
      return (
        <Group>
          <Rect
            x={s(-6)} y={s(-7)} width={s(4)} height={s(14)}
            cornerRadius={s(1.5)} fill={color} listening={false}
          />
          <Rect
            x={s(2)} y={s(-7)} width={s(4)} height={s(14)}
            cornerRadius={s(1.5)} fill={color} listening={false}
          />
        </Group>
      )
    case 'yes': // check
      return <Line points={[s(-7), s(0), s(-2), s(6), s(8), s(-7)]} {...stroke(color, 2.8)} />
    case 'no':
    default: // x
      return (
        <Group>
          <Line points={[s(-7), s(-7), s(7), s(7)]} {...stroke(color, 2.8)} />
          <Line points={[s(7), s(-7), s(-7), s(7)]} {...stroke(color, 2.8)} />
        </Group>
      )
  }
}
