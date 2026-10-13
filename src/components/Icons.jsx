// Small stroke-icon set (24×24, currentColor, 1.8 stroke). Decorative by
// default: the button around an icon carries the accessible name.
const S = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
)

// brand mark: a swallowtail war banner
export const IconBanner = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 2.5v19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M7 3.5h12.5l-3.6 4.75 3.6 4.75H7z" fill="currentColor" />
  </svg>
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
export const IconArrowCurve = () => (
  <S><path d="M4 18C4 10 9 5 19 5" /><path d="M14 3l5 2-2 5" /></S>
)
export const IconEraser = () => (
  <S>
    <path d="M7 21 3.7 17.7a2.4 2.4 0 0 1 0-3.4l8.6-8.6a2.4 2.4 0 0 1 3.4 0l4.6 4.6a2.4 2.4 0 0 1 0 3.4L14 21z" />
    <path d="M21 21H7" />
    <path d="m5 13 6 6" />
  </S>
)
export const IconNote = () => (
  <S><path d="M4 4h16v10l-6 6H4z" /><path d="M20 14h-6v6" /></S>
)
export const IconClock = () => (
  <S><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>
)
export const IconTarget = () => (
  <S><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" /></S>
)
export const IconPin = () => (
  <S><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></S>
)
export const IconSendBack = () => (
  <S><path d="M12 4v11" /><path d="m8 11 4 4 4-4" /><path d="M5 20h14" /></S>
)
export const IconBringForward = () => (
  <S><path d="M12 20V9" /><path d="m8 13 4-4 4 4" /><path d="M5 4h14" /></S>
)
export const IconPlus = () => (<S><path d="M12 5v14M5 12h14" /></S>)
export const IconMinus = () => (<S><path d="M5 12h14" /></S>)
export const IconFit = () => (
  <S><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></S>
)
export const IconLayers = () => (
  <S><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 14l9 5 9-5" /></S>
)
export const IconTrash = () => (
  <S><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></S>
)
export const IconCopy = () => (
  <S><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M6 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2" /></S>
)
export const IconImage = () => (
  <S><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m4 19 5-5 4 4 3-3 4 4" /></S>
)
export const IconFilm = () => (
  <S><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5" /></S>
)
export const IconTrail = () => (
  <S><circle cx="5" cy="18" r="2" fill="currentColor" stroke="none" /><path d="M8 15l3-3M14 9l3-3" strokeDasharray="3 3" /><circle cx="19" cy="5" r="1.5" fill="currentColor" stroke="none" /></S>
)
export const IconX = () => (<S><path d="M6 6l12 12M18 6 6 18" /></S>)
export const IconTimeline = () => (
  <S>
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx="9" cy="7" r="1.6" fill="currentColor" />
    <circle cx="15" cy="12" r="1.6" fill="currentColor" />
    <circle cx="8" cy="17" r="1.6" fill="currentColor" />
  </S>
)
export const IconHelp = () => (
  <S>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.2 9a2.8 2.8 0 0 1 5.4 1c0 2-2.6 2.5-2.6 4" />
    <path d="M12 17.5v.01" />
  </S>
)
export const IconShapes = () => (
  <S><rect x="3" y="12" width="9" height="9" rx="1.5" /><circle cx="16.5" cy="7.5" r="4.5" /></S>
)
export const IconSquare = () => (<S><rect x="4" y="4" width="16" height="16" rx="3" /></S>)
export const IconCircle = () => (<S><circle cx="12" cy="12" r="8" /></S>)
export const IconTriangle = () => (<S><path d="M12 4l9 16H3z" /></S>)
export const IconLine = () => (<S><path d="M5 19 19 5" /></S>)

export const IconPlay = () => (<S><path d="M8 5l11 7-11 7z" fill="currentColor" /></S>)
export const IconPause = () => (<S><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></S>)
export const IconSkipBack = () => (<S><path d="M18 6v12l-9-6zM6 6v12" /></S>)
export const IconSkipFwd = () => (<S><path d="M6 6v12l9-6zM18 6v12" /></S>)
export const IconLoop = () => (
  <S><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></S>
)

export const IconUndo = () => (<S><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></S>)
export const IconRedo = () => (<S><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" /></S>)
export const IconDownload = () => (<S><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></S>)
export const IconUpload = () => (<S><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" /></S>)
export const IconLink = () => (
  <S><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></S>
)
export const IconCheck = () => (<S><path d="M5 12.5l4.5 4.5L19 7" /></S>)
export const IconEdit = () => (<S><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></S>)
export const IconChevronDown = () => (<S><path d="m6 9 6 6 6-6" /></S>)
export const IconChevronRight = () => (<S><path d="m9 6 6 6-6 6" /></S>)
export const IconGrip = () => (
  <S fill="currentColor" stroke="none">
    <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
  </S>
)
export const IconWarn = () => (
  <S><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.01" /></S>
)
export const IconPanelLeft = () => (
  <S><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9 4v16" /></S>
)
export const IconPanelRight = () => (
  <S><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M15 4v16" /></S>
)
export const IconLibrary = () => (
  <S><path d="M4 5h6v15H4zM10 5h4v15h-4z" /><path d="m15 6 3.5-1 3 14-3.5 1z" /></S>
)

// role glyphs for roster tallies
const ROLE_PATHS = {
  Tank: <path d="M12 3 4.5 6v6c0 4.4 3.2 7.8 7.5 9 4.3-1.2 7.5-4.6 7.5-9V6z" />,
  DPS: (
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
      <path d="M9.5 6.5 12 4h3v3l-2.5 2.5" />
    </>
  ),
  Healer: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
}
export const RoleIcon = ({ role }) => <S className="role-ico">{ROLE_PATHS[role]}</S>
