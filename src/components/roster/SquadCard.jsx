import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { ROLES, LANES, SQUAD_SIZE_PRESETS, TEAM_SWATCHES } from '../../lib/schema.js'
import { squadStats, squadLabel, squadDefaultName } from '../../lib/selectors.js'
import { IconCopy, IconX, IconChevronRight, IconGrip, IconWarn, IconPlus, IconMinus, RoleIcon } from '../Icons.jsx'
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

  const [colorOpen, setColorOpen] = useState(false)
  const colorRef = useRef(null)
  useEffect(() => {
    if (!colorOpen) return
    const onDoc = (e) => {
      if (!colorRef.current?.contains(e.target)) setColorOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [colorOpen])

  return (
    <div className={'squad' + (open ? ' open' : '')} style={{ '--team': squad.color }}>
      <header>
        <button
          className="tiny ghost caret"
          onClick={() => toggleTeam(squad.id)}
          title={open ? 'Collapse team' : 'Expand team'}
          aria-expanded={open}
        >
          <IconChevronRight />
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
          <IconGrip />
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
          <IconX />
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
                aria-label="Smaller target"
                onClick={() =>
                  updateSquad(squad.id, {
                    targetSize: Math.max(1, squad.targetSize - 1)
                  })
                }
              >
                <IconMinus />
              </button>
              <input
                type="number"
                min="1"
                aria-label="Target team size"
                value={squad.targetSize}
                onChange={(e) =>
                  updateSquad(squad.id, {
                    targetSize: Math.max(1, Number(e.target.value) || 1)
                  })
                }
              />
              <button
                className="tiny"
                aria-label="Larger target"
                onClick={() =>
                  updateSquad(squad.id, { targetSize: squad.targetSize + 1 })
                }
              >
                <IconPlus />
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

            <div className="team-color-pick" ref={colorRef}>
              <button
                className="tiny ghost"
                onClick={() => setColorOpen((v) => !v)}
                title="Team colour"
              >
                <span className="mk-dot" style={{ background: squad.color }} /> Colour
              </button>
              {colorOpen && (
                <div className="ctb-drop team-color-pop">
                  {TEAM_SWATCHES.map((c) => (
                    <button
                      key={c}
                      className={'swatch' + (squad.color === c ? ' on' : '')}
                      style={{ background: c }}
                      onClick={() => {
                        updateSquad(squad.id, { color: c })
                        setColorOpen(false)
                      }}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {open && (
        <>
          <div className="comp">
            {ROLES.map((r) => (
              <span className="chip" key={r} title={r}>
                <RoleIcon role={r} /> {byRole[r]}
              </span>
            ))}
          </div>

          {warnings.length > 0 && (
            <div className="warnings">
              {warnings.map((w) => (
                <span key={w}>
                  <IconWarn /> {w}
                </span>
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
              <IconPlus /> Player
            </button>
          </div>
        </>
      )}
    </div>
  )
}
