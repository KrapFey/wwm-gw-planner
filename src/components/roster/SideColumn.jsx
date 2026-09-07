import { useStore } from '../../store/useStore.js'
import { ROLES, LANES } from '../../lib/schema.js'
import { sideSummary, ROLE_ICON } from '../../lib/selectors.js'
import SquadCard from './SquadCard.jsx'

export default function SideColumn({ sideId, meta }) {
  const strategy = useStore((s) => s.strategy)
  const addSquad = useStore((s) => s.addSquad)

  const squads = strategy.squads.filter((q) => q.side === sideId)
  const summary = sideSummary(strategy, sideId)

  return (
    <section className="side">
      <header>
        <span className="dot" style={{ background: meta.color }} />
        <span className="title">{meta.label}</span>
        <span className={'count' + (summary.over ? ' over' : '')}>
          {summary.total}/{summary.max}
        </span>
      </header>

      <div className="side-body">
        <div className="summary">
          {ROLES.map((r) => (
            <span className="chip" key={r} title={r}>
              {ROLE_ICON[r]} {summary.byRole[r]}
            </span>
          ))}
          <span className="summary-div" />
          {LANES.map((l) => (
            <span className="chip" key={l} title={`${l} lane players`}>
              {l[0]} {summary.byLane[l]}
            </span>
          ))}
        </div>

        {squads.map((q) => (
          <SquadCard key={q.id} squad={q} />
        ))}

        {squads.length === 0 && (
          <p className="muted" style={{ margin: '4px 2px', fontSize: 12 }}>
            No teams yet — add one below.
          </p>
        )}

        <div className="row-actions">
          <button onClick={() => addSquad(sideId)}>+ Team</button>
        </div>
      </div>
    </section>
  )
}
