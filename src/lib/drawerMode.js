// Rosters are slide-over drawers below this width; keep in step with the
// drawer breakpoint in global.css.
export const DRAWER_QUERY = '(max-width: 1180px)'
export const drawerMode = () => window.matchMedia(DRAWER_QUERY).matches
