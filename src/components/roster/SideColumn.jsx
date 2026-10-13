import { useStore } from '../../store/useStore.js'
import { ROLES, LANES, CATEGORIES, CATEGORY_META, pillColor } from '../../lib/schema.js'
import { sideSummary } from '../../lib/selectors.js'
import { RoleIcon, IconPlus } from '../Icons.jsx'
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
          <strong>{summary.total}</strong>/{summary.max}
        </span>
        <span
          className={'side-meter' + (summary.over ? ' over' : '')}
          style={{ '--fill': Math.min(1, summary.max ? summary.total / summary.max : 0) }}
          aria-hidden="true"
        />
      </header>

      <div className="side-body">
        <div className="summary">
          <div className="stat-group">
            {ROLES.map((r) => (
              <span key={r} title={`${r} players`}>
                <RoleIcon role={r} /> {summary.byRole[r]}
              </span>
            ))}
          </div>
          <div className="stat-group">
            {LANES.map((l) => (
              <span key={l} title={`${l} lane players`}>
                {l[0]} {summary.byLane[l]}
              </span>
            ))}
          </div>
        </div>

        {CATEGORIES.map((cat) => {
          const teams = squads.filter((q) => q.category === cat)
          return (
            <div
              className="team-cat"
              key={cat}
              style={{ '--cat-tint': pillColor(sideId, cat) }}
            >
              <div className="team-cat-head">
                <span>{CATEGORY_META[cat].label}</span>
                <span className="muted">{teams.length}</span>
              </div>

              {teams.map((q) => (
                <SquadCard key={q.id} squad={q} />
              ))}

              <button
                className="tiny add-team"
                onClick={() => addSquad(sideId, cat)}
              >
                <IconPlus /> {CATEGORY_META[cat].label} team
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
