import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { MAP_W, MAP_H, clampToMap } from '../../lib/mapLayout.js'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Battle-map camera: stage size, pan/zoom, and screen <-> map-pixel conversion.
// Everything reads the view fresh from the store, so callbacks captured by
// long-lived listeners (keyboard shortcuts) never act on a stale view.
export function useCamera(wrapRef, stageRef) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const sizeRef = useRef(size)
  sizeRef.current = size
  const setView = useStore((s) => s.setView)
  const view = () => useStore.getState().view

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [wrapRef])

  function fit() {
    const { w, h } = sizeRef.current
    if (w < 2 || h < 2) return
    const zoom = Math.min(w / MAP_W, h / MAP_H) * 0.96
    setView({ zoom, x: (w - MAP_W * zoom) / 2, y: (h - MAP_H * zoom) / 2 })
  }

  // fit once, as soon as the stage has a size
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || size.w < 2 || size.h < 2) return
    fitted.current = true
    fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  // zoom about a screen point (default: the stage centre)
  function zoomTo(zoom, at) {
    const v = view()
    const s = clamp(zoom, MIN_ZOOM, MAX_ZOOM)
    const cx = at?.x ?? sizeRef.current.w / 2
    const cy = at?.y ?? sizeRef.current.h / 2
    const mx = (cx - v.x) / v.zoom
    const my = (cy - v.y) / v.zoom
    setView({ zoom: s, x: cx - mx * s, y: cy - my * s })
  }
  const zoomBy = (factor, at) => zoomTo(view().zoom * factor, at)

  function onWheel(e) {
    e.evt.preventDefault()
    const p = stageRef.current?.getPointerPosition()
    if (p) zoomBy(e.evt.deltaY > 0 ? 1 / 1.09 : 1.09, p)
  }

  function onStageDragEnd(e) {
    if (e.target === e.target.getStage()) setView({ x: e.target.x(), y: e.target.y() })
  }

  const screenToMap = ({ x, y }) => {
    const v = view()
    return { x: (x - v.x) / v.zoom, y: (y - v.y) / v.zoom }
  }
  function pointerMap() {
    const p = stageRef.current?.getPointerPosition()
    return p ? screenToMap(p) : null
  }
  function clientToMap(clientX, clientY) {
    const r = stageRef.current.container().getBoundingClientRect()
    return screenToMap({ x: clientX - r.left, y: clientY - r.top })
  }
  const centerMap = () =>
    clampToMap(screenToMap({ x: sizeRef.current.w / 2, y: sizeRef.current.h / 2 }))

  return { size, fit, zoomTo, zoomBy, onWheel, onStageDragEnd, pointerMap, clientToMap, centerMap }
}
