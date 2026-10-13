import { useStore } from '../../store/useStore.js'
import { ROLES } from '../../lib/schema.js'
import { RoleIcon, IconX } from '../Icons.jsx'

// A player is a single role slot within a team.
export default function PlayerRow({ player }) {
  const updatePlayer = useStore((s) => s.updatePlayer)
  const removePlayer = useStore((s) => s.removePlayer)

  return (
    <div className="player">
      <RoleIcon role={player.role} />
      <select
        className="role"
        value={player.role}
        onChange={(e) => updatePlayer(player.id, { role: e.target.value })}
        aria-label="Role"
      >
        {ROLES.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <button
        className="tiny ghost rm"
        title="Remove player"
        onClick={() => removePlayer(player.id)}
      >
        <IconX />
      </button>
    </div>
  )
}
