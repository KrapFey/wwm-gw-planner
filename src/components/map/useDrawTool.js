import { useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { BOX_DRAW_TOOLS, reduceCurvedArrow } from '../../lib/tacticalDefs.js'

// Pointer state machine for the drawing tools (pen / arrows / shapes) and the
// eraser. `draft` is the in-progress drawing to render live.
export function useDrawTool({ tool, color, width, stageRef, pointerMap }) {
  const addDrawing = useStore((s) => s.addDrawing)
  const removeDrawing = useStore((s) => s.removeDrawing)
  const [draft, setDraft] = useState(null)
  const draftRef = useRef(null)
  const erasingRef = useRef(false)

  function eraseAtPointer() {
    const stage = stageRef.current
    const pos = stage?.getPointerPosition()
    const hit = pos && stage.getIntersection(pos)
    if (hit && hit.name() === 'drawing') removeDrawing(hit.id())
  }

  function end() {
    erasingRef.current = false
    const d = draftRef.current
    draftRef.current = null
    setDraft(null)
    if (!d) return
    const n = d.points.length
    if (d.tool === 'carrow') {
      // drawn like the pen (an arc); reduce to start / apex / end
      const span = Math.hypot(d.points[n - 2] - d.points[0], d.points[n - 1] - d.points[1])
      if (n >= 6 && span > 6) addDrawing({ ...d, points: reduceCurvedArrow(d.points) })
      return
    }
    const enough = BOX_DRAW_TOOLS.includes(d.tool)
      ? n >= 4 && Math.hypot(d.points[2] - d.points[0], d.points[3] - d.points[1]) > 6
      : n >= 6
    if (enough) addDrawing(d)
  }

  function begin() {
    // finalise even if the pointer is released outside the stage
    window.addEventListener('pointerup', end, { once: true })
    if (tool === 'erase') {
      erasingRef.current = true
      eraseAtPointer()
      return
    }
    const p = pointerMap()
    if (!p) return
    draftRef.current = { tool, color, width, points: [p.x, p.y] }
    setDraft({ ...draftRef.current })
  }

  function move() {
    if (erasingRef.current) return eraseAtPointer()
    const d = draftRef.current
    const p = d && pointerMap()
    if (!p) return
    if (BOX_DRAW_TOOLS.includes(d.tool)) {
      // arrow + shapes: geometry is just the start + current corner
      d.points = [d.points[0], d.points[1], p.x, p.y]
    } else {
      const n = d.points.length
      if (Math.hypot(p.x - d.points[n - 2], p.y - d.points[n - 1]) > 2) d.points.push(p.x, p.y)
    }
    setDraft({ ...d, points: [...d.points] })
  }

  const cancel = () => {
    draftRef.current = null
    setDraft(null)
  }

  return { draft, begin, move, end, cancel }
}
