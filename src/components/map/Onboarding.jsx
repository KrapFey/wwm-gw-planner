import { useState } from 'react'
import { IconCheck, IconX } from '../Icons.jsx'

const KEY = 'gw-onboarding-dismissed'
const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

// First-run checklist, laid over the map's bottom-right corner. Each step
// ticks itself off from the board's real state and has a button that does it.
// Disappears once all three are done, or when dismissed (remembered per
// browser — a convenience, so a blocked storage just shows it again).
export default function Onboarding({ steps }) {
  const [dismissed, setDismissed] = useState(read)
  const next = steps.findIndex((s) => !s.done)
  if (dismissed || next === -1) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* storage blocked: it just shows again next visit */
    }
  }

  return (
    <aside className="onboarding" aria-label="Getting started">
      <header>
        <strong>Plan your first push</strong>
        <button className="tiny ghost" onClick={dismiss} title="Hide this guide">
          <IconX />
        </button>
      </header>
      <ol>
        {steps.map((s, i) => (
          <li key={s.label} className={s.done ? 'done' : i === next ? 'next' : ''}>
            <span className="ob-mark" aria-hidden="true">
              {s.done ? <IconCheck /> : i + 1}
            </span>
            <span className="ob-text">
              {s.label}
              <small>{s.hint}</small>
            </span>
            {i === next && (
              <button className="tiny primary" onClick={s.run}>
                {s.cta}
              </button>
            )}
          </li>
        ))}
      </ol>
      <a className="ob-guide" href="./guide.html" target="_blank" rel="noopener">
        Read the user guide
      </a>
    </aside>
  )
}
