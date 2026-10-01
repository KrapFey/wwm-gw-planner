// Share a strategy as a link: the document, gzipped (native CompressionStream)
// and base64url-encoded into the URL fragment (#s=...). The fragment never
// reaches a server, so sharing needs no backend.

const PREFIX = '#s='
// a link is untrusted input: cap what it may decompress to (gzip bombs)
const MAX_JSON_BYTES = 5 * 1024 * 1024

async function gzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(bytes) {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_JSON_BYTES) {
      reader.cancel()
      throw new Error('Share link is too large')
    }
    chunks.push(value)
  }
  return new Blob(chunks).text()
}

const toB64url = (bytes) => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
const fromB64url = (s) =>
  Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))

export async function encodeShare(strategy) {
  return toB64url(await gzip(new TextEncoder().encode(JSON.stringify(strategy))))
}

export async function decodeShare(code) {
  return JSON.parse(await gunzip(fromB64url(code)))
}

export async function shareUrl(strategy) {
  return location.origin + location.pathname + PREFIX + (await encodeShare(strategy))
}

// The share code in the current URL, if any.
export const shareCodeInUrl = () =>
  location.hash.startsWith(PREFIX) ? location.hash.slice(PREFIX.length) : null
