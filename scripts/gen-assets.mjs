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

// maskable: mark shrunk into the safe zone, dark bg to the edges
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="#101218"/>
     <circle cx="256" cy="256" r="120" fill="none" stroke="#7c6cff" stroke-width="22"/>
     <path d="M256 118 L256 394 M118 256 L394 256" stroke="#7c6cff" stroke-width="18" stroke-linecap="round"/>
   </svg>`
)
await sharp(maskable, { density: 512 })
  .resize(512, 512)
  .png()
  .toFile(`${OUT_ICONS}/icon-512-maskable.png`)
console.log('icon-512-maskable.png')
