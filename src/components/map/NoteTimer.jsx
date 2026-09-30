import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Group, Rect, Text, Circle, Line } from 'react-konva'
import { useStore } from '../../store/useStore.js'
import { NOTE_COLORS, fmtClock } from '../../lib/tacticalDefs.js'

// Sticky notes and countdown timers, drawn in Konva like everything else so
// they pan/zoom with the map and land in PNG / video exports. Each card is
// counter-scaled by 1/zoom: it keeps a constant on-screen size (its local units
// are screen px), while its x/y stay a map point.

const BAR = 20
const NOTE_W = 178
const NOTE_H = 96
const NOTE_MIN_W = 130
const NOTE_MIN_H = 72
const TIMER_W = 132
const TIMER_H = 92
const stop = (e) => (e.cancelBubble = true)
const tap = (fn) => ({
  onClick: (e) => (stop(e), fn()),
  onTap: (e) => (stop(e), fn())
})

// Shared card behaviour: drag to move (routed to the phase being edited),
// click to select.
function cardProps(item, { zoom, locked, onSelect, dragItem }) {
  return {
    id: item.id,
    scaleX: 1 / zoom,
    scaleY: 1 / zoom,
    draggable: !locked,
    onDragStart: stop,
    onDragEnd: (e) => {
      if (e.target !== e.currentTarget) return // a child (resize grip) drag
      dragItem(item.id, { x: e.target.x(), y: e.target.y() })
    },
    ...tap(() => onSelect?.(item.id))
  }
}

export const NoteItem = memo(function NoteItem(props) {
  const { note, x, y, selected, editing, onEdit } = props
  const dragItem = useStore((s) => s.dragItem)
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)
  const [live, setLive] = useState(null) // size while resizing
  const w = live?.w ?? note.width ?? NOTE_W
  const h = live?.h ?? note.height ?? NOTE_H
  const sizeFrom = (e) => ({
    w: Math.max(NOTE_MIN_W, Math.round(e.target.x())),
    h: Math.max(NOTE_MIN_H, Math.round(e.target.y()))
  })

  return (
    <Group
      x={x}
      y={y}
      {...cardProps(note, { ...props, dragItem })}
      onDblClick={() => onEdit(note.id)}
      onDblTap={() => onEdit(note.id)}
    >
      <Rect
        width={w}
        height={h}
        fill={note.color}
        cornerRadius={9}
        stroke={selected ? '#7c6cff' : 'rgba(0,0,0,0.32)'}
        strokeWidth={selected ? 2 : 1}
        shadowColor="#000"
        shadowBlur={16}
        shadowOffsetY={5}
        shadowOpacity={0.45}
      />
      <Rect width={w} height={BAR} fill="rgba(0,0,0,0.16)" cornerRadius={[9, 9, 0, 0]} />
      <Text x={6} y={4} text="⠿" fontSize={12} fill="rgba(0,0,0,0.45)" listening={false} />
      {NOTE_COLORS.map((c, i) => (
        <Circle
          key={c}
          x={24 + i * 15}
          y={BAR / 2}
          radius={5.5}
          fill={c}
          stroke={c === note.color ? '#1b1810' : 'rgba(0,0,0,0.3)'}
          strokeWidth={c === note.color ? 1.5 : 1}
          {...tap(() => updateItem(note.id, { color: c }))}
        />
      ))}
      <Text
        x={w - 17}
        y={4}
        text="✕"
        fontSize={12}
        fill="rgba(0,0,0,0.55)"
        {...tap(() => removeItem(note.id))}
      />
      {!editing && (
        <Text
          x={8}
          y={BAR + 7}
          width={w - 16}
          height={h - BAR - 14}
          text={note.text || 'Double-click to write…'}
          fill={note.text ? '#1b1810' : 'rgba(27,24,16,0.45)'}
          fontSize={12}
          lineHeight={1.4}
          wrap="word"
          ellipsis
          listening={false}
        />
      )}
      {/* corner grip: its position inside the card IS the card's size */}
      <Group
        x={w}
        y={h}
        draggable
        onDragStart={stop}
        onDragMove={(e) => (stop(e), setLive(sizeFrom(e)))}
        onDragEnd={(e) => {
          stop(e)
          const s = sizeFrom(e)
          e.target.position({ x: s.w, y: s.h })
          setLive(null)
          updateItem(note.id, { width: s.w, height: s.h })
        }}
      >
        <Rect x={-20} y={-20} width={20} height={20} fill="transparent" />
        <Line points={[-13, -3, -3, -13]} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} />
        <Line points={[-8, -3, -3, -8]} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} />
      </Group>
    </Group>
  )
})

// Text editing happens in a real <textarea> laid over the note's body while
// editing (Konva has no text input). Commits on blur / Esc.
export function NoteEditor({ stageRef, note, onDone }) {
  const updateItem = useStore((s) => s.updateItem)
  const ref = useRef(null)
  const [box, setBox] = useState(null)
  useLayoutEffect(() => {
    const node = stageRef.current?.findOne('#' + note.id)
    if (!node) return onDone()
    const r = node.getClientRect({ skipShadow: true, skipStroke: true })
    setBox({ left: r.x + 8, top: r.y + BAR + 7, width: r.width - 16, height: r.height - BAR - 14 })
  }, [stageRef, note.id, onDone])
  useEffect(() => ref.current?.focus(), [box])
  if (!box) return null
  const commit = (e) => {
    if (e.target.value !== note.text) updateItem(note.id, { text: e.target.value })
    onDone()
  }
  return (
    <textarea
      ref={ref}
      className="note-editor"
      style={{ ...box, background: note.color }}
      defaultValue={note.text}
      placeholder="Note…"
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
    />
  )
}

export const TimerItem = memo(function TimerItem(props) {
  const { timer, x, y, selected } = props
  const dragItem = useStore((s) => s.dragItem)
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)
  const [remaining, setRemaining] = useState(timer.seconds)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) setRemaining(timer.seconds)
  }, [timer.seconds, running])
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1
        setRunning(false)
        return 0
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const buttons = [
    [running ? '❚❚' : '▶', () => setRunning((v) => !v)],
    [
      '⟲',
      () => {
        setRunning(false)
        setRemaining(timer.seconds)
      }
    ],
    ['−', () => updateItem(timer.id, { seconds: Math.max(5, timer.seconds - 10) })],
    ['+', () => updateItem(timer.id, { seconds: timer.seconds + 10 })]
  ]
  const bw = (TIMER_W - 10 - 9) / 4

  return (
    <Group x={x} y={y} {...cardProps(timer, { ...props, dragItem })}>
      <Rect
        width={TIMER_W}
        height={TIMER_H}
        fill="#15181f"
        cornerRadius={9}
        stroke={selected ? '#7c6cff' : '#313747'}
        strokeWidth={selected ? 2 : 1}
        shadowColor="#000"
        shadowBlur={16}
        shadowOffsetY={5}
        shadowOpacity={0.5}
      />
      <Rect width={TIMER_W} height={BAR} fill="rgba(255,255,255,0.05)" cornerRadius={[9, 9, 0, 0]} />
      <Text x={6} y={4} text="⠿" fontSize={12} fill="#626a7c" listening={false} />
      <Text x={TIMER_W - 17} y={4} text="✕" fontSize={12} fill="#626a7c" {...tap(() => removeItem(timer.id))} />
      <Text
        y={BAR + 5}
        width={TIMER_W}
        align="center"
        text={fmtClock(remaining)}
        fontSize={27}
        fontStyle="bold"
        fill={remaining === 0 ? '#f87171' : '#eceef4'}
        listening={false}
      />
      {buttons.map(([glyph, fn], i) => (
        <Group key={i} x={5 + i * (bw + 3)} y={TIMER_H - 29} {...tap(fn)}>
          <Rect width={bw} height={24} fill="#1c202a" stroke="#313747" cornerRadius={6} />
          <Text width={bw} y={6} align="center" text={glyph} fontSize={12} fill="#eceef4" listening={false} />
        </Group>
      ))}
    </Group>
  )
})
