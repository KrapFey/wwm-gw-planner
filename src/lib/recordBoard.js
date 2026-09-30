// Record the Konva stage to a video Blob while `runAnimation` plays.
// Konva stacks one <canvas> per Layer with no composite, so each frame we blit
// stage.toCanvas() onto an offscreen canvas and let captureStream sample that.

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4'
]

export function videoRecordingSupported() {
  return (
    typeof MediaRecorder !== 'undefined' &&
    MIME_CANDIDATES.some((m) => MediaRecorder.isTypeSupported?.(m))
  )
}

// `runAnimation(): Promise<void>` should drive the board for the clip's length.
// Callers check videoRecordingSupported() first.
export async function recordBoardVideo(stage, runAnimation, { fps = 24, bitrate = 6_000_000 } = {}) {
  const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m))

  const snap = stage.toCanvas()
  const out = document.createElement('canvas')
  out.width = snap.width
  out.height = snap.height
  const ctx = out.getContext('2d')
  const paint = () => {
    ctx.clearRect(0, 0, out.width, out.height)
    ctx.drawImage(stage.toCanvas(), 0, 0)
  }

  const stream = out.captureStream(fps)
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate })
  const chunks = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data)
  }
  const stopped = new Promise((resolve) => {
    rec.onstop = resolve
  })

  let raf = 0
  const loop = () => {
    paint()
    raf = requestAnimationFrame(loop)
  }

  rec.start()
  loop()
  try {
    await runAnimation()
  } finally {
    cancelAnimationFrame(raf)
    paint() // final frame
    await new Promise((r) => setTimeout(r, 150)) // let the last frame land
    rec.stop()
    await stopped
    stream.getTracks().forEach((t) => t.stop())
  }
  return new Blob(chunks, { type: mimeType })
}
