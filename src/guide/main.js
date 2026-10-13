import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '../styles/global.css'
import './guide.css'

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
