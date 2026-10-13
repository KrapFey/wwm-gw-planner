import { Path } from 'react-konva'

// Konva draws to a canvas and can't read CSS variables: these mirror the
// tokens in styles/global.css so map pieces match the chrome around them.
export const CANVAS = {
  font: "'Geist Variable', 'Segoe UI', sans-serif",
  mono: "'Geist Mono Variable', ui-monospace, monospace",
  ink: '#0b1112', // --bg
  glass: 'rgba(11,17,18,0.92)',
  surface: '#152022', // --surface-2
  surface3: '#1b2729', // --surface-3
  border: '#2d3d3f', // --border-2
  text: '#e9e6dc', // --text
  dim: '#9aa6a2', // --text-dim
  faint: '#5f6d6a', // --text-faint
  accent: '#c9a35f', // --accent
  danger: '#f87171'
}

// 24-unit icon paths (same drawings as components/Icons.jsx)
export const ICON = {
  play: 'M8 5l11 7-11 7z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01'
}
const FILLED = new Set(['play', 'pause'])

// An ICON drawn at `size` px with its top-left at (x, y).
export function CanvasIcon({ name, x = 0, y = 0, size = 14, color, ...rest }) {
  const s = size / 24
  const filled = FILLED.has(name)
  return (
    <Path
      data={ICON[name]}
      x={x}
      y={y}
      scaleX={s}
      scaleY={s}
      fill={filled ? color : undefined}
      stroke={filled ? undefined : color}
      strokeWidth={name === 'grip' ? 4.5 : 2.4}
      lineCap="round"
      lineJoin="round"
      listening={false}
      {...rest}
    />
  )
}
