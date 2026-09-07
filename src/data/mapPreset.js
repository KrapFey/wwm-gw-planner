// Default placement of map fixtures (geese, trees, bulwarks, boss).
//
// Tuned in "Edit map layout" mode against public/assets/map.png (1430x1100).
// x/y are map-image pixels and reference each fixture's CENTRE.
// Each side's three bulwarks share one x so they line up vertically.

export const MAP_PRESET_VERSION = 2

const BLUE_BULWARK_X = 557
const RED_BULWARK_X = 904

export const DEFAULT_FIXTURES = [
  { id: 'goose_blue', kind: 'goose_blue', x: 282, y: 554, scale: 0.65, rotation: 0 },
  { id: 'tree_blue', kind: 'tree_blue', x: 201, y: 549, scale: 0.9, rotation: 0 },
  { id: 'goose_red', kind: 'goose_red', x: 1168, y: 558, scale: 0.5, rotation: 0 },
  { id: 'tree_red', kind: 'tree_red', x: 1241, y: 553, scale: 0.8, rotation: 0 },

  { id: 'boss_top', kind: 'boss', x: 612, y: 140, scale: 0.45, rotation: 0 },
  { id: 'boss_bottom', kind: 'boss', x: 855, y: 978, scale: 0.45, rotation: 0 },

  { id: 'tb1', kind: 'tower_blue', x: BLUE_BULWARK_X, y: 348, scale: 1, rotation: 0 },
  { id: 'tb2', kind: 'tower_blue', x: BLUE_BULWARK_X, y: 545, scale: 1, rotation: 0 },
  { id: 'tb3', kind: 'tower_blue', x: BLUE_BULWARK_X, y: 761, scale: 1, rotation: 0 },

  { id: 'tr1', kind: 'tower_red', x: RED_BULWARK_X, y: 347, scale: 1, rotation: 0 },
  { id: 'tr2', kind: 'tower_red', x: RED_BULWARK_X, y: 546, scale: 1, rotation: 0 },
  { id: 'tr3', kind: 'tower_red', x: RED_BULWARK_X, y: 747, scale: 1, rotation: 0 }
]
