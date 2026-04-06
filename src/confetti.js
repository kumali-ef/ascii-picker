const CHARS = 'EFEKTA01!@#$%&*+='
const PIECE_COUNT = 120
const GRAVITY = 800
const CHAR_SIZE_MIN = 12
const CHAR_SIZE_MAX = 28
const COLOR = '#00ff00'

let canvas = null
let ctx = null
let pieces = []
let animId = null

function ensureCanvas() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  document.body.appendChild(canvas)
}

function resize() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function createPiece() {
  const size = CHAR_SIZE_MIN + Math.random() * (CHAR_SIZE_MAX - CHAR_SIZE_MIN)
  return {
    char: CHARS[Math.floor(Math.random() * CHARS.length)],
    x: Math.random() * canvas.width,
    y: -size - Math.random() * canvas.height * 0.5,
    vx: (Math.random() - 0.5) * 300,
    vy: Math.random() * 200 + 100,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 8,
    size,
    opacity: 0.6 + Math.random() * 0.4,
  }
}

export function startConfetti(durationSec) {
  if (animId) {
    cancelAnimationFrame(animId)
    animId = null
  }

  ensureCanvas()
  resize()

  pieces = []
  for (let i = 0; i < PIECE_COUNT; i++) {
    pieces.push(createPiece())
  }

  const startTime = performance.now()
  const durationMs = durationSec * 1000
  // Stop spawning new pieces at 40% of duration, let remaining fall
  const spawnEnd = durationMs * 0.4

  let lastTime = startTime

  function tick(now) {
    const elapsed = now - startTime
    const dt = Math.min(0.05, (now - lastTime) / 1000)
    lastTime = now

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Global fade out in last 30% of duration
    const fadeStart = durationMs * 0.7
    const globalAlpha = elapsed > fadeStart
      ? Math.max(0, 1 - (elapsed - fadeStart) / (durationMs - fadeStart))
      : 1

    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i]
      p.vy += GRAVITY * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rotation += p.rotSpeed * dt

      // Remove off-screen pieces
      if (p.y > canvas.height + 50) {
        if (elapsed < spawnEnd) {
          pieces[i] = createPiece()
        } else {
          pieces.splice(i, 1)
        }
        continue
      }

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = p.opacity * globalAlpha
      ctx.fillStyle = COLOR
      ctx.font = `bold ${p.size}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(p.char, 0, 0)
      ctx.restore()
    }

    if (elapsed < durationMs && (pieces.length > 0 || elapsed < spawnEnd)) {
      animId = requestAnimationFrame(tick)
    } else {
      cleanup()
    }
  }

  ctx = canvas.getContext('2d')
  animId = requestAnimationFrame(tick)
}

function cleanup() {
  if (animId) {
    cancelAnimationFrame(animId)
    animId = null
  }
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas)
  }
  canvas = null
  ctx = null
  pieces = []
}
