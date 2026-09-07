import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'

export default function StrategyMenu() {
  const order = useStore((s) => s.order)
  const activeId = useStore((s) => s.activeId)
  const docs = useStore((s) => s.docs)
  const strategy = useStore((s) => s.strategy)
  const newStrategy = useStore((s) => s.newStrategy)
  const switchStrategy = useStore((s) => s.switchStrategy)
  const duplicateStrategy = useStore((s) => s.duplicateStrategy)
  const deleteStrategy = useStore((s) => s.deleteStrategy)
  const renameStrategy = useStore((s) => s.renameStrategy)

  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  const nameOf = (id) =>
    (id === activeId ? strategy : docs[id])?.meta?.name || 'Untitled'

  return (
    <div className="strat-menu" ref={ref}>
      <button className="ghost strat-trigger" onClick={() => setOpen((v) => !v)}>
        {order.length} {order.length === 1 ? 'strategy' : 'strategies'} ▾
      </button>

      {open && (
        <div className="strat-pop">
          <ul>
            {order.map((id) => (
              <li key={id} className={id === activeId ? 'on' : ''}>
                <button
                  className="strat-name"
                  onClick={() => {
                    switchStrategy(id)
                    setOpen(false)
                  }}
                >
                  {nameOf(id)}
                </button>
                <button
                  className="tiny ghost"
                  title="Rename"
                  onClick={() => {
                    const n = prompt('Rename strategy', nameOf(id))
                    if (n && n.trim()) renameStrategy(id, n.trim())
                  }}
                >
                  ✎
                </button>
                <button
                  className="tiny ghost"
                  title="Duplicate"
                  onClick={() => {
                    duplicateStrategy(id)
                    setOpen(false)
                  }}
                >
                  ⧉
                </button>
                <button
                  className="tiny ghost"
                  title="Delete"
                  disabled={order.length <= 1}
                  onClick={() => {
                    if (confirm(`Delete "${nameOf(id)}"?`)) deleteStrategy(id)
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            className="tiny primary"
            onClick={() => {
              newStrategy()
              setOpen(false)
            }}
          >
            + New strategy
          </button>
        </div>
      )}
    </div>
  )
}
