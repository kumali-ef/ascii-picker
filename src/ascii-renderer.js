import { prepareWithSegments } from '@chenglou/pretext'

const FONT_SIZE = 13
const LINE_HEIGHT = 15
const PROP_FAMILY = 'Georgia, Palatino, "Times New Roman", serif'
const CHARSET = ' .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const WEIGHTS = [300, 500, 800]
const STYLES = ['normal', 'italic']

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

function measureWidth(ch, font) {
  const p = prepareWithSegments(ch, font)
  return p.widths.length > 0 ? p.widths[0] : 0
}

export function buildPalette() {
  if (paletteReady) return

  palette = []
  for (const style of STYLES) {
    for (const weight of WEIGHTS) {
      const font = `${style === 'italic' ? 'italic ' : ''}${weight} ${FONT_SIZE}px ${PROP_FAMILY}`
      for (const ch of CHARSET) {
        if (ch === ' ') continue
        const width = measureWidth(ch, font)
        if (width <= 0) continue
        const brightness = estimateBrightness(ch, font)
        palette.push({ char: ch, weight, style, font, width, brightness })
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

function findBest(targetB, targetCellW) {
  let lo = 0, hi = palette.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (palette[mid].brightness < targetB) lo = mid + 1
    else hi = mid
  }

  let bestScore = Infinity, best = palette[lo]
  const s = Math.max(0, lo - 15)
  const e = Math.min(palette.length, lo + 15)
  for (let i = s; i < e; i++) {
    const p = palette[i]
    const bErr = Math.abs(p.brightness - targetB) * 2.5
    const wErr = Math.abs(p.width - targetCellW) / targetCellW
    const score = bErr + wErr
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

  const targetRowW = cols * (FONT_SIZE * 0.55)
  const targetCellW = targetRowW / cols
  const spaceW = FONT_SIZE * 0.27

  const cvsW = cols * 4
  const cvsH = rows * 4
  nameCvs.width = cvsW
  nameCvs.height = cvsH

  nameCtx.clearRect(0, 0, cvsW, cvsH)
  nameCtx.fillStyle = '#000'
  nameCtx.fillRect(0, 0, cvsW, cvsH)

  // Auto-scale font size to fit name within canvas
  let fontSize = Math.floor(cvsH * 0.7)
  nameCtx.font = `800 ${fontSize}px ${PROP_FAMILY}`
  let textW = nameCtx.measureText(name).width
  while (textW > cvsW * 0.9 && fontSize > 10) {
    fontSize -= 2
    nameCtx.font = `800 ${fontSize}px ${PROP_FAMILY}`
    textW = nameCtx.measureText(name).width
  }

  nameCtx.fillStyle = '#fff'
  nameCtx.textBaseline = 'middle'
  nameCtx.textAlign = 'center'
  nameCtx.fillText(name, cvsW / 2, cvsH / 2)

  const imgData = nameCtx.getImageData(0, 0, cvsW, cvsH).data

  function sample(c, r) {
    const cx = Math.min(cvsW - 1, (c / cols * cvsW) | 0)
    const cy = Math.min(cvsH - 1, (r / rows * cvsH) | 0)
    const i = (cy * cvsW + cx) * 4
    return Math.min(1, (imgData[i] + imgData[i + 1] + imgData[i + 2]) / (3 * 255))
  }

  const rowsHtml = []
  const rowWidths = []

  for (let r = 0; r < rows; r++) {
    let html = ''
    let tw = 0
    for (let c = 0; c < cols; c++) {
      const b = sample(c, r)
      if (b < 0.03) {
        html += ' '
        tw += spaceW
      } else {
        const m = findBest(b, targetCellW)
        const ai = Math.max(1, Math.min(10, Math.round(b * 10)))
        html += `<span class="${weightClass(m.weight, m.style)} a${ai}">${escapeHtml(m.char)}</span>`
        tw += m.width
      }
    }
    rowsHtml.push(html)
    rowWidths.push(tw)
  }

  const maxW = Math.max(...rowWidths)
  const paddings = rowWidths.map(w => (maxW - w) / 2)

  return { rowsHtml, paddings }
}
