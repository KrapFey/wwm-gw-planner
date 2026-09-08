import { useStore } from '../../store/useStore.js'
import { ROLES, LANES, SQUAD_SIZE_PRESETS } from '../../lib/schema.js'
import { squadStats, squadLabel, squadDefaultName, ROLE_ICON } from '../../lib/selectors.js'
import { IconCopy } from '../Icons.jsx'
import PlayerRow from './PlayerRow.jsx'

export default function SquadCard({ squad }) {
  const strategy = useStore((s) => s.strategy)
  const updateSquad = useStore((s) => s.updateSquad)
  const removeSquad = useStore((s) => s.removeSquad)
  const duplicateSquad = useStore((s) => s.duplicateSquad)
  const addPlayer = useStore((s) => s.addPlayer)
  const open = useStore((s) => !s.ui.collapsedTeams[squad.id])
  const toggleTeam = useStore((s) => s.toggleTeam)

  const { players, byRole, fill, over, warnings } = squadStats(strategy, squad)
  const pct = Math.min(100, squad.targetSize ? (fill / squad.targetSize) * 100 : 0)
  const label = squadLabel(strategy, squad)
  const defaultName = squadDefaultName(strategy, squad)

  return (
    <div className="squad" style={{ borderLeftColor: squad.color }}>
      <header>
        <button
          className="tiny ghost caret"
          onClick={() => toggleTeam(squad.id)}
          title={open ? 'Collapse team' : 'Expand team'}
          aria-expanded={open}
        >
          {open ? '▾' : '▸'}
        </button>

        <span
          className="drag-handle"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-gw-squad', squad.id)
            e.dataTransfer.effectAllowed = 'move'
          }}
          title="Drag the whole team onto the battle map"
        >
          ⠿
        </span>
        <input
          className="name"
          value={squad.name ?? ''}
          placeholder={defaultName}
          onChange={(e) => updateSquad(squad.id, { name: e.target.value })}
          onBlur={(e) => updateSquad(squad.id, { name: e.target.value.trim() })}
          aria-label="Team name"
          title="Rename this team (leave blank for the default)"
        />

        <span className={'fill' + (over ? ' over' : '')} title={`${fill} of ${squad.targetSize}`}>
          <span className="fill-bar">
            <span style={{ width: `${pct}%` }} />
          </span>
          <span className="fill-num">
            {fill}/{squad.targetSize}
          </span>
        </span>

        <button
          className="tiny ghost dup"
          title="Duplicate this team"
          onClick={() => duplicateSquad(squad.id)}
        >
          <IconCopy />
        </button>

        <button
          className="tiny ghost rm"
          title="Remove team and all its players"
          onClick={() => {
            const n = players.length
            if (!n || confirm(`Delete "${label}" and its ${n} player${n === 1 ? '' : 's'}?`))
              removeSquad(squad.id)
          }}
        >
          ✕
        </button>

        {open && (
          <div className="controls">
            <select
              value={squad.lane}
              onChange={(e) => updateSquad(squad.id, { lane: e.target.value })}
              aria-label="Lane"
            >
              <option>Unassigned</option>
              {LANES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>

            <span className="stepper" title="Target team size">
              <button
                className="tiny"
                onClick={() =>
                  updateSquad(squad.id, {
                    targetSize: Math.max(1, squad.targetSize - 1)
                  })
                }
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={squad.targetSize}
                onChange={(e) =>
                  updateSquad(squad.id, {
                    targetSize: Math.max(1, Number(e.target.value) || 1)
                  })
                }
              />
              <button
                className="tiny"
                onClick={() =>
                  updateSquad(squad.id, { targetSize: squad.targetSize + 1 })
                }
              >
                +
              </button>
            </span>

            {SQUAD_SIZE_PRESETS.map((n) => (
              <button
                key={n}
                className="tiny ghost"
                onClick={() => updateSquad(squad.id, { targetSize: n })}
                title={`Set target to ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </header>

      {open && (
        <>
          <div className="comp">
            {ROLES.map((r) => (
              <span className="chip" key={r} title={r}>
                {ROLE_ICON[r]} {byRole[r]}
              </span>
            ))}
          </div>

          {warnings.length > 0 && (
            <div className="warnings">
              {warnings.map((w) => (
                <span key={w}>⚠ {w}</span>
              ))}
            </div>
          )}

          <div className="players">
            {players.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </div>

          <div className="row-actions">
            <button className="tiny" onClick={() => addPlayer(squad.side, squad.id)}>
              + Player
            </button>
          </div>
        </>
      )}
    </div>
  )
}
