// One-shot asset generation: run `npm run gen:assets` after changing the
// source map art or the favicon. Outputs are committed.
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const OUT_ASSETS = 'public/assets'
const OUT_ICONS = 'public/icons'
await mkdir(OUT_ICONS, { recursive: true })

// --- battle map: PNG -> WebP (line art on flat colour compresses hugely) ---
const map = await sharp('assets/map.png')
  .webp({ quality: 82, effort: 6 })
  .toFile(`${OUT_ASSETS}/map.webp`)
console.log(`map.webp  ${(map.size / 1024).toFixed(0)} KB  (${map.width}x${map.height})`)

// --- PWA icons from the favicon mark ---
const FAVICON = 'public/favicon.svg'
for (const size of [192, 512]) {
  await sharp(FAVICON, { density: size * 4 })
    .resize(size, size)
    .png()
    .toFile(`${OUT_ICONS}/icon-${size}.png`)
  console.log(`icon-${size}.png`)
}

// maskable: mark shrunk into the safe zone, seal red to the edges
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="#e2503a"/>
     <g transform="translate(96.75 100) scale(13)">
       <path d="M6 2.5v19" stroke="#fbe6c6" stroke-width="2.2" stroke-linecap="round"/>
       <path d="M7 3.5h12.5l-3.6 4.75 3.6 4.75H7z" fill="#fbe6c6"/>
     </g>
   </svg>`
)
await sharp(maskable, { density: 512 })
  .resize(512, 512)
  .png()
  .toFile(`${OUT_ICONS}/icon-512-maskable.png`)
console.log('icon-512-maskable.png')
