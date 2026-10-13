import { useSyncExternalStore } from 'react'
import { useStore } from '../store/useStore.js'

// Tiny toast queue (rendered by components/Toaster.jsx). Replaces alert() /
// confirm(): errors say what happened, destructive actions run immediately
// and offer Undo instead of asking first.

let toasts = []
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
let seq = 0

export function toast(message, { tone = 'info', action, duration = 5000, onClose } = {}) {
  const id = ++seq
  // keep at most 3 on screen; the oldest makes room
  if (toasts.length >= 3) dismiss(toasts[0].id)
  toasts = [...toasts, { id, message, tone, action, duration, onClose }]
  resume(id)
  emit()
  return id
}

export function dismiss(id) {
  const t = toasts.find((x) => x.id === id)
  if (!t) return
  clearTimeout(t.timer)
  toasts = toasts.filter((x) => x.id !== id)
  t.onClose?.()
  emit()
}

// Hovering or focusing a toast holds it on screen; leaving restarts its clock.
export function pause(id) {
  const t = toasts.find((x) => x.id === id)
  if (t) clearTimeout(t.timer)
}
export function resume(id) {
  const t = toasts.find((x) => x.id === id)
  if (!t) return
  clearTimeout(t.timer)
  t.timer = setTimeout(() => dismiss(id), t.duration)
}

export const toastError = (message) => toast(message, { tone: 'error', duration: 7000 })

export const getToasts = () => toasts

export function useToasts() {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), getToasts)
}

// Run a strategy edit now and offer Undo. Undo restores the exact pre-edit
// document — but only while nothing else has changed it; any later edit
// retires the toast (the regular Undo button still steps back through it).
export function withUndo(message, edit) {
  const before = useStore.getState().strategy
  edit()
  const after = useStore.getState().strategy
  if (after === before) return
  let unsub = () => {}
  const id = toast(message, {
    duration: 8000,
    action: {
      label: 'Undo',
      run: () => {
        if (useStore.getState().strategy !== after) return
        useStore.setState((s) => ({ strategy: before, docs: { ...s.docs, [s.activeId]: before } }))
      }
    },
    onClose: () => unsub()
  })
  unsub = useStore.subscribe((s) => {
    if (s.strategy !== after) dismiss(id)
  })
}
