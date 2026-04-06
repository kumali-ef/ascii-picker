const DURATION_KEY = 'ascii-picker-duration'
const GRID_KEY = 'ascii-picker-grid'
const TITLE_KEY = 'ascii-picker-title'

const DEFAULT_DURATION = 5
const MIN_DURATION = 2
const MAX_DURATION = 15
const DEFAULT_TITLE = 'ASCII PICKER'

export const GRID_PRESETS = {
  small:  { cols: 30, rows: 16, label: 'small' },
  medium: { cols: 50, rows: 28, label: 'medium' },
  large:  { cols: 70, rows: 40, label: 'large' },
}

let duration = DEFAULT_DURATION
let gridLabel = 'large'
let title = DEFAULT_TITLE

function loadFromStorage() {
  try {
    const storedDuration = localStorage.getItem(DURATION_KEY)
    if (storedDuration !== null) {
      duration = clampDuration(Number(storedDuration))
    }
    const storedGrid = localStorage.getItem(GRID_KEY)
    if (storedGrid && GRID_PRESETS[storedGrid]) {
      gridLabel = storedGrid
    }
    const storedTitle = localStorage.getItem(TITLE_KEY)
    if (storedTitle !== null) {
      title = storedTitle
    }
  } catch {
    // localStorage unavailable
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // localStorage unavailable
  }
}

function clampDuration(val) {
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(val)))
}

export function getDuration() {
  return duration
}

export function setDuration(val) {
  duration = clampDuration(val)
  saveToStorage(DURATION_KEY, duration)
}

export function getGridSize() {
  return { ...GRID_PRESETS[gridLabel] }
}

export function setGridSize(preset) {
  if (!GRID_PRESETS[preset]) return
  gridLabel = preset
  saveToStorage(GRID_KEY, gridLabel)
}

export function getTitle() {
  return title
}

export function setTitle(val) {
  title = (val || '').trim() || DEFAULT_TITLE
  saveToStorage(TITLE_KEY, title)
}

export function _resetForTest() {
  duration = DEFAULT_DURATION
  gridLabel = 'large'
  title = DEFAULT_TITLE
}

loadFromStorage()
