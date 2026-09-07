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

export const NOTE_COLORS = ['#fde68a', '#fca5a5', '#a7f3d0', '#bfdbfe', '#e9d5ff']

export const fmtClock = (secs) => {
  const s = Math.max(0, Math.round(secs))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
