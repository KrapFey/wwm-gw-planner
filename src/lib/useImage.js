import { useEffect, useState } from 'react'

// Minimal image loader for Konva <Image> (avoids the extra `use-image` dep).
const cache = new Map()

export function useImage(src) {
  const [img, setImg] = useState(() => cache.get(src) || null)

  useEffect(() => {
    if (!src) return
    const hit = cache.get(src)
    if (hit) {
      setImg(hit)
      return
    }
    const image = new window.Image()
    image.decoding = 'async'
    const onLoad = () => {
      cache.set(src, image)
      setImg(image)
    }
    image.addEventListener('load', onLoad)
    image.src = src
    return () => image.removeEventListener('load', onLoad)
  }, [src])

  return img
}
