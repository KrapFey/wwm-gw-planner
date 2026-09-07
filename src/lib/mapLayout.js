// The battle map is the real GvG map image; the Konva Stage is scaled/panned
// over its native pixel space.
const BASE = import.meta.env.BASE_URL

export const MAP_SRC = BASE + 'assets/map.png'

// Native pixel size of assets/map.png.
export const MAP_W = 1430
export const MAP_H = 1100

// Draggable map fixtures (objectives / structures). `kind` -> sprite + how big
// it should render on the map (width in map pixels; height follows the sprite's
// aspect ratio). `scale` on each placed fixture multiplies this.
export const FIXTURE_KINDS = {
  goose_blue: { label: 'Goose (blue)', src: BASE + 'assets/goose_blue.png', width: 90 },
  goose_red: { label: 'Goose (red)', src: BASE + 'assets/goose_red.png', width: 90 },
  tree_blue: { label: 'Tree (blue)', src: BASE + 'assets/tree_blue.png', width: 96 },
  tree_red: { label: 'Tree (red)', src: BASE + 'assets/tree_red.png', width: 96 },
  tower_blue: { label: 'Bulwark (blue)', src: BASE + 'assets/tower_blue.png', width: 64 },
  tower_red: { label: 'Bulwark (red)', src: BASE + 'assets/tower_red.png', width: 64 },
  boss: { label: 'Boss', src: BASE + 'assets/boss.png', width: 120 }
}

export const FIXTURE_KIND_LIST = Object.keys(FIXTURE_KINDS)

export const clampToMap = (p) => ({
  x: Math.max(0, Math.min(MAP_W, p.x)),
  y: Math.max(0, Math.min(MAP_H, p.y))
})
