import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '../styles/global.css'
import './guide.css'

document.documentElement.classList.add('js')
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

// Contents: mark the section being read.
const links = new Map(
  [...document.querySelectorAll('.g-toc a')].map((a) => [a.hash.slice(1), a])
)
const spy = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      links.forEach((a) => a.removeAttribute('aria-current'))
      links.get(e.target.id)?.setAttribute('aria-current', 'location')
    }
  },
  { rootMargin: '-15% 0px -75% 0px' }
)
document.querySelectorAll('.g-main section[id]').forEach((s) => spy.observe(s))

// Narrow screens: contents starts folded and folds again after a jump.
const toc = document.querySelector('.g-toc details')
const narrow = window.matchMedia('(max-width: 960px)')
if (narrow.matches) toc.open = false
toc.addEventListener('click', (e) => {
  if (narrow.matches && e.target.closest('a')) toc.open = false
})

// Sections rise in, part by part, the first time they scroll into view.
const reveal = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('is-in')
      reveal.unobserve(e.target)
    }
  },
  { rootMargin: '0px 0px -12% 0px' }
)
for (const el of document.querySelectorAll('.g-main > section, .g-statement, .g-stage-copy, .g-foot')) {
  el.classList.add('g-reveal')
  ;[...el.children].forEach((c, i) => c.style.setProperty('--i', i))
  reveal.observe(el)
}

// The phase demo: the slider (or play) moves every pill to that phase.
const range = document.querySelector('.g-range input')
const stops = [...document.querySelectorAll('.g-range li')]
const clause = document.querySelector('.g-clause')
const pills = [...document.querySelectorAll('.g-pill')].map((el) => ({
  el,
  pos: el.dataset.pos.split(' ').map((p) => p.split(',').map(Number))
}))
const play = document.querySelector('.g-play')
const playIcon = play.querySelector('path')
let timer = null

function showPhase(i) {
  range.value = i
  range.style.setProperty('--pct', `${(i / 3) * 100}%`)
  range.setAttribute('aria-valuetext', stops[i].textContent)
  stops.forEach((s, j) => (j === i ? s.setAttribute('aria-current', 'step') : s.removeAttribute('aria-current')))
  for (const { el, pos } of pills) {
    el.style.setProperty('--x', pos[i][0])
    el.style.setProperty('--y', pos[i][1])
  }
  const text = stops[i].dataset.clause
  if (clause.textContent === text) return
  if (reduced.matches) {
    clause.textContent = text
    return
  }
  clause.classList.add('is-swapping')
  setTimeout(() => {
    clause.textContent = text
    clause.classList.remove('is-swapping')
  }, 200)
}

function stop() {
  clearInterval(timer)
  timer = null
  play.setAttribute('aria-pressed', 'false')
  play.setAttribute('aria-label', 'Play the phases')
  playIcon.setAttribute('d', 'M7 4.5v15l12.5-7.5z')
}

range.addEventListener('input', () => {
  stop()
  showPhase(+range.value)
})
stops.forEach((s, i) =>
  s.addEventListener('click', () => {
    stop()
    showPhase(i)
  })
)
play.addEventListener('click', () => {
  if (timer) return stop()
  play.setAttribute('aria-pressed', 'true')
  play.setAttribute('aria-label', 'Pause')
  playIcon.setAttribute('d', 'M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z')
  const next = () => showPhase((+range.value + 1) % 4)
  next()
  timer = setInterval(next, 1800)
})
showPhase(0)

// Screenshots open full size in a dialog (click, or Enter / Space).
const box = document.querySelector('.g-lightbox')
const big = box.querySelector('img')
const enlarge = (img) => {
  big.src = img.currentSrc || img.src
  big.alt = img.alt
  box.showModal()
}
for (const img of document.querySelectorAll('.g-shot img')) {
  img.tabIndex = 0
  img.setAttribute('role', 'button')
  img.setAttribute('aria-label', `Enlarge: ${img.alt}`)
  img.addEventListener('click', () => enlarge(img))
  img.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      enlarge(img)
    }
  })
}
// a click on the backdrop (the dialog itself, not the picture) closes it
box.addEventListener('click', (e) => e.target === box && box.close())
