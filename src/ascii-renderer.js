const FONT_SIZE = 14
const PROP_FAMILY = 'Georgia, Palatino, "Times New Roman", serif'
const CHARSET = ' .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const WEIGHTS = [300, 500, 800]
const STYLES = ['normal', 'italic']
const CANVAS_MULT = 16
export const CELL_W = 9

let palette = []
let paletteReady = false

// Small canvas for brightness estimation
const bCvs = document.createElement('canvas')
bCvs.width = bCvs.height = 28
const bCtx = bCvs.getContext('2d', { willReadFrequently: true })

function estimateBrightness(ch, font) {
  const s = 28
  bCtx.clearRect(0, 0, s, s)
  bCtx.font = font
  bCtx.fillStyle = '#fff'
  bCtx.textBaseline = 'middle'
  bCtx.fillText(ch, 1, s / 2)
  const d = bCtx.getImageData(0, 0, s, s).data
  let sum = 0
  for (let i = 3; i < d.length; i += 4) sum += d[i]
  return sum / (255 * s * s)
}

export function buildPalette() {
  if (paletteReady) return

  palette = []
  for (const style of STYLES) {
    for (const weight of WEIGHTS) {
      const font = `${style === 'italic' ? 'italic ' : ''}${weight} ${FONT_SIZE}px ${PROP_FAMILY}`
      for (const ch of CHARSET) {
        if (ch === ' ') continue
        const brightness = estimateBrightness(ch, font)
        palette.push({ char: ch, weight, style, brightness })
      }
    }
  }

  // Normalize brightness
  const maxB = Math.max(...palette.map(p => p.brightness))
  if (maxB > 0) {
    for (const p of palette) p.brightness /= maxB
  }

  palette.sort((a, b) => a.brightness - b.brightness)
  paletteReady = true
}

function findBest(targetB) {
  let lo = 0, hi = palette.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (palette[mid].brightness < targetB) lo = mid + 1
    else hi = mid
  }

  let bestScore = Infinity, best = palette[lo]
  const s = Math.max(0, lo - 10)
  const e = Math.min(palette.length, lo + 10)
  for (let i = s; i < e; i++) {
    const p = palette[i]
    const score = Math.abs(p.brightness - targetB)
    if (score < bestScore) {
      bestScore = score
      best = p
    }
  }
  return best
}

function weightClass(w, s) {
  const wc = w === 300 ? 'w3' : w === 500 ? 'w5' : 'w8'
  return s === 'italic' ? wc + ' it' : wc
}

function escapeHtml(c) {
  if (c === '<') return '&lt;'
  if (c === '>') return '&gt;'
  if (c === '&') return '&amp;'
  if (c === '"') return '&quot;'
  return c
}

// Large canvas for name rendering
const nameCvs = document.createElement('canvas')
const nameCtx = nameCvs.getContext('2d', { willReadFrequently: true })

export function renderNameToAscii(name, cols, rows) {
  if (!paletteReady || palette.length === 0) return null

  const cvsW = cols * CANVAS_MULT
  const cvsH = rows * CANVAS_MULT
  nameCvs.width = cvsW
  nameCvs.height = cvsH

  nameCtx.fillStyle = '#000'
  nameCtx.fillRect(0, 0, cvsW, cvsH)

  // Auto-scale font size to fit name within canvas
  let fontSize = Math.floor(cvsH * 0.75)
  nameCtx.font = `800 ${fontSize}px ${PROP_FAMILY}`
  let textW = nameCtx.measureText(name).width
  while (textW > cvsW * 0.85 && fontSize > 10) {
    fontSize -= 2
    nameCtx.font = `800 ${fontSize}px ${PROP_FAMILY}`
    textW = nameCtx.measureText(name).width
  }

  nameCtx.fillStyle = '#fff'
  nameCtx.textBaseline = 'middle'
  nameCtx.textAlign = 'center'
  nameCtx.fillText(name, cvsW / 2, cvsH / 2)

  const imgData = nameCtx.getImageData(0, 0, cvsW, cvsH).data

  // Area-averaged sampling for clean brightness values
  function sampleArea(c, r) {
    const x0 = Math.floor(c / cols * cvsW)
    const y0 = Math.floor(r / rows * cvsH)
    const x1 = Math.floor((c + 1) / cols * cvsW)
    const y1 = Math.floor((r + 1) / rows * cvsH)
    let sum = 0, count = 0
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * cvsW + x) * 4
        sum += (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3
        count++
      }
    }
    return count > 0 ? Math.min(1, sum / (count * 255)) : 0
  }

  const rowsHtml = []

  for (let r = 0; r < rows; r++) {
    let html = ''
    for (let c = 0; c < cols; c++) {
      const b = sampleArea(c, r)
      if (b < 0.02) {
        html += `<span style="width:${CELL_W}px"> </span>`
      } else {
        const m = findBest(b)
        const ai = Math.max(1, Math.min(10, Math.round(b * 10)))
        html += `<span class="${weightClass(m.weight, m.style)} a${ai}" style="width:${CELL_W}px">${escapeHtml(m.char)}</span>`
      }
    }
    rowsHtml.push(html)
  }

  return { rowsHtml }
}
