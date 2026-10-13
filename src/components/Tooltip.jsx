import { useEffect, useState } from 'react'

// One delegated tooltip for the whole app: any element with a `title` gets a
// fast, styled tip instead of the slow native one. The title moves to
// data-tip (and aria-label when the element has no text) on first hover, so
// screen readers keep the name. A trailing "(Key)" renders as a kbd.
const KEY = /\s*\(([^\s()]{1,14})\)$/

function adopt(el) {
  el.dataset.tip = el.getAttribute('title')
  el.removeAttribute('title')
  if (!el.textContent.trim()) el.setAttribute('aria-label', el.dataset.tip)
}

export default function Tooltip() {
  const [tip, setTip] = useState(null)

  useEffect(() => {
    let timer
    let warmUntil = 0
    let current = null

    const hide = () => {
      clearTimeout(timer)
      if (current) warmUntil = performance.now() + 300
      current = null
      setTip(null)
    }

    const show = (e) => {
      const el = e.target.closest?.('[title], [data-tip]')
      if (!el || el === current) return
      if (el.hasAttribute('title')) adopt(el)
      current = el
      clearTimeout(timer)
      const open = () => {
        if (current !== el || !el.isConnected) return
        const r = el.getBoundingClientRect()
        const below = r.top < window.innerHeight / 2
        const text = el.dataset.tip
        const m = text.match(KEY)
        setTip({
          text: m ? text.slice(0, m.index) : text,
          key: m?.[1],
          below,
          x: Math.min(Math.max(r.left + r.width / 2, 80), window.innerWidth - 80),
          y: below ? r.bottom + 8 : r.top - 8
        })
      }
      if (performance.now() < warmUntil || e.type === 'focusin') open()
      else timer = setTimeout(open, 380)
    }

    const leave = (e) => {
      if (current && !current.contains(e.relatedTarget)) hide()
    }

    // React re-sets `title` when its text changes (Play -> Pause); re-adopt
    // right away so the aria-label never goes stale
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target
        if (el.hasAttribute('title') && el.dataset.tip !== undefined) adopt(el)
      }
    })
    mo.observe(document.body, { subtree: true, attributeFilter: ['title'] })

    document.addEventListener('pointerover', show)
    document.addEventListener('focusin', show)
    document.addEventListener('pointerout', leave)
    document.addEventListener('focusout', leave)
    document.addEventListener('pointerdown', hide, true)
    window.addEventListener('scroll', hide, true)
    return () => {
      mo.disconnect()
      clearTimeout(timer)
      document.removeEventListener('pointerover', show)
      document.removeEventListener('focusin', show)
      document.removeEventListener('pointerout', leave)
      document.removeEventListener('focusout', leave)
      document.removeEventListener('pointerdown', hide, true)
      window.removeEventListener('scroll', hide, true)
    }
  }, [])

  if (!tip) return null
  return (
    <div
      className={'tip' + (tip.below ? ' below' : ' above')}
      style={{ left: tip.x, top: tip.y }}
      role="tooltip"
    >
      {tip.text}
      {tip.key && <kbd>{tip.key}</kbd>}
    </div>
  )
}
