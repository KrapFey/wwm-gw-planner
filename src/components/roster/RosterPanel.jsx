import { SIDE_META } from '../../lib/schema.js'
import SideColumn from './SideColumn.jsx'

export default function RosterPanel({ sideId }) {
  const meta = SIDE_META[sideId]
  return (
    <div
      className={`roster side-${sideId}`}
      style={{ '--side-accent': meta.color }}
    >
      <SideColumn sideId={sideId} meta={meta} />
    </div>
  )
}
