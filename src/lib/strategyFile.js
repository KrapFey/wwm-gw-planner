// Read / write the whole strategy as a .json file — this is how plans are
// shared (e.g. dropped into Discord) since the app has no backend.
import { migrateStrategy } from './schema'

const slug = (name, fallback = 'strategy') =>
  (name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback

const stamp = () => new Date().toISOString().slice(0, 10)

function triggerDownload(href, filename, revoke = false) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (revoke) URL.revokeObjectURL(href)
}

export function downloadStrategy(strategy) {
  const blob = new Blob([JSON.stringify(strategy, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, `gw-${slug(strategy?.meta?.name)}-${stamp()}.json`, true)
}

// Save a recorded animation Blob (webm/mp4) with the strategy's name.
export function downloadAnimation(blob, name) {
  const url = URL.createObjectURL(blob)
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
  triggerDownload(url, `gw-${slug(name)}-${stamp()}.${ext}`, true)
}

// Snapshot the whole board (map at 1:1, not the current pan/zoom) to a PNG.
export function downloadBoardImage(stage, name, { width, height }) {
  if (!stage) return
  const prev = {
    sx: stage.scaleX(),
    sy: stage.scaleY(),
    x: stage.x(),
    y: stage.y(),
    w: stage.width(),
    h: stage.height()
  }
  stage.scale({ x: 1, y: 1 })
  stage.position({ x: 0, y: 0 })
  stage.size({ width, height })
  stage.draw()
  const uri = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
  stage.size({ width: prev.w, height: prev.h })
  stage.scale({ x: prev.sx, y: prev.sy })
  stage.position({ x: prev.x, y: prev.y })
  stage.draw()
  triggerDownload(uri, `gw-${slug(name)}-${stamp()}.png`)
}

export function readStrategyFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        resolve(migrateStrategy(parsed))
      } catch {
        reject(new Error('That file is not a valid strategy JSON'))
      }
    }
    reader.readAsText(file)
  })
}
