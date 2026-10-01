import { describe, it, expect } from 'vitest'
import { encodeShare, decodeShare } from './shareLink.js'
import { emptyStrategy } from './schema.js'

describe('share links', () => {
  it('round-trips a strategy through a URL-safe code', async () => {
    const doc = emptyStrategy()
    doc.meta.name = 'Push mid — ✓ ünïcode'
    doc.items.push({ id: 'n1', type: 'note', x: 1, y: 2, text: 'hi', color: '#fde68a' })
    const code = await encodeShare(doc)
    expect(code).toMatch(/^[\w-]+$/) // base64url, no padding
    expect(await decodeShare(code)).toEqual(doc)
  })

  it('refuses a code that inflates past the size cap (gzip bomb)', async () => {
    const code = await encodeShare({ junk: 'a'.repeat(6 * 1024 * 1024) })
    expect(code.length).toBeLessThan(20000) // tiny link...
    await expect(decodeShare(code)).rejects.toThrow(/too large/) // ...huge payload
  })

  it('rejects garbage', async () => {
    await expect(decodeShare('not-a-real-code')).rejects.toThrow()
  })
})
