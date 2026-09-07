// Read / write the whole strategy as a .json file — this is how plans are
// shared (e.g. dropped into Discord) since the app has no backend.
import { migrateStrategy } from './schema'

export function downloadStrategy(strategy) {
  const safeName =
    (strategy?.meta?.name || 'strategy')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'strategy'
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(strategy, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gw-${safeName}-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
