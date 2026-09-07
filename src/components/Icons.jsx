// Small stroke-icon set (24×24, currentColor).
const S = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...props} />
)

export const IconCursor = () => (
  <S><path d="M5 3l6 17 2.5-7L20 10.5z" /></S>
)
export const IconPencil = () => (
  <S><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></S>
)
export const IconArrow = () => (
  <S><path d="M7 17 17 7" /><path d="M8 7h9v9" /></S>
)
export const IconEraser = () => (
  <S>
    <path d="M9 20H4.5l-1-1a2 2 0 0 1 0-3L13.5 6.5a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3L15 19" />
    <path d="M8.5 11.5 15 18" />
  </S>
)
export const IconNote = () => (
  <S><path d="M4 4h16v10l-6 6H4z" /><path d="M20 14h-6v6" /></S>
)
export const IconClock = () => (
  <S><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>
)
export const IconFlag = () => (
  <S><path d="M5 21V4" /><path d="M5 4h13l-2.5 4L18 12H5" /></S>
)
export const IconPlus = () => (<S><path d="M12 5v14M5 12h14" /></S>)
export const IconMinus = () => (<S><path d="M5 12h14" /></S>)
export const IconFit = () => (
  <S><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></S>
)
export const IconPanel = () => (
  <S><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></S>
)
export const IconLayers = () => (
  <S><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 14l9 5 9-5" /></S>
)
export const IconTrash = () => (
  <S><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></S>
)
export const IconX = () => (<S><path d="M6 6l12 12M18 6 6 18" /></S>)
export const IconCheck = () => (<S><path d="M5 12l5 5 9-11" /></S>)
export const IconTimeline = () => (
  <S>
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx="9" cy="7" r="1.6" fill="currentColor" />
    <circle cx="15" cy="12" r="1.6" fill="currentColor" />
    <circle cx="8" cy="17" r="1.6" fill="currentColor" />
  </S>
)
export const IconShapes = () => (
  <S><rect x="3" y="12" width="9" height="9" rx="1.5" /><circle cx="16.5" cy="7.5" r="4.5" /></S>
)
export const IconSquare = () => (<S><rect x="4" y="4" width="16" height="16" rx="3" /></S>)
export const IconCircle = () => (<S><circle cx="12" cy="12" r="8" /></S>)
export const IconTriangle = () => (<S><path d="M12 4l9 16H3z" /></S>)
export const IconLine = () => (<S><path d="M5 19 19 5" /></S>)

export const IconPlay = () => (<S><path d="M7 4l13 8-13 8z" fill="currentColor" /></S>)
export const IconPause = () => (<S><path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor" /></S>)
export const IconSkipBack = () => (<S><path d="M18 5v14L8 12zM6 5v14" /></S>)
export const IconSkipFwd = () => (<S><path d="M6 5v14l10-7zM18 5v14" /></S>)
