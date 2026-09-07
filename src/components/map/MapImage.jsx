import { Image as KonvaImage } from 'react-konva'
import { useImage } from '../../lib/useImage.js'
import { MAP_SRC, MAP_W, MAP_H } from '../../lib/mapLayout.js'

// The map image is an opaque full-colour render (its own dark backdrop), drawn straight
// onto the stage with no backing panel.
export default function MapImage() {
  const img = useImage(MAP_SRC)
  if (!img) return null
  return <KonvaImage image={img} width={MAP_W} height={MAP_H} listening={false} />
}
