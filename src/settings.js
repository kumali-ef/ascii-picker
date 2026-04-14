const DURATION_KEY = 'ascii-picker-duration'
const GRID_KEY = 'ascii-picker-grid'
const TITLE_KEY = 'ascii-picker-title'
const PREFERRED_CHARS_KEY = 'ascii-picker-preferred-chars'

const DEFAULT_DURATION = 5
const MIN_DURATION = 2
const MAX_DURATION = 15
const DEFAULT_TITLE = 'ASCII PICKER'
const DEFAULT_PREFERRED_CHARS = 'EFEKTA'
let keyPrefix = ''

export const GRID_PRESETS = {
  small:  { cols: 30, rows: 16, label: 'small' },
  medium: { cols: 50, rows: 28, label: 'medium' },
  large:  { cols: 70, rows: 40, label: 'large' },
}

let duration = DEFAULT_DURATION
let gridLabel = 'large'
let title = DEFAULT_TITLE
let preferredChars = DEFAULT_PREFERRED_CHARS
let changeListeners = []

function notifyChange() {
  changeListeners.forEach(cb => cb())
}

function loadFromStorage() {
  try {
    const storedDuration = localStorage.getItem(keyPrefix + DURATION_KEY)
    if (storedDuration !== null) {
      duration = clampDuration(Number(storedDuration))
    }
    const storedGrid = localStorage.getItem(keyPrefix + GRID_KEY)
    if (storedGrid && GRID_PRESETS[storedGrid]) {
      gridLabel = storedGrid
    }
    const storedTitle = localStorage.getItem(keyPrefix + TITLE_KEY)
    if (storedTitle !== null) {
      title = storedTitle
    }
    const storedChars = localStorage.getItem(keyPrefix + PREFERRED_CHARS_KEY)
    if (storedChars !== null) {
      preferredChars = storedChars
    }
  } catch {
    // localStorage unavailable
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(keyPrefix + key, String(value))
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
  notifyChange()
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
  notifyChange()
}

export function getPreferredChars() {
  return preferredChars
}

export function setPreferredChars(val) {
  preferredChars = (val || '').trim()
  saveToStorage(PREFERRED_CHARS_KEY, preferredChars)
  notifyChange()
}

export function hydrateSettings(data) {
  if (data.title !== undefined) {
    title = data.title
    saveToStorage(TITLE_KEY, title)
  }
  if (data.duration !== undefined) {
    duration = clampDuration(data.duration)
    saveToStorage(DURATION_KEY, duration)
  }
  if (data.preferredChars !== undefined) {
    preferredChars = data.preferredChars
    saveToStorage(PREFERRED_CHARS_KEY, preferredChars)
  }
}

export function setKeyPrefix(prefix) {
  keyPrefix = prefix
  duration = DEFAULT_DURATION
  gridLabel = 'large'
  title = DEFAULT_TITLE
  preferredChars = DEFAULT_PREFERRED_CHARS
  loadFromStorage()
}

export function onSettingsChange(cb) {
  changeListeners.push(cb)
  return () => {
    changeListeners = changeListeners.filter(fn => fn !== cb)
  }
}

export function _resetForTest() {
  duration = DEFAULT_DURATION
  gridLabel = 'large'
  title = DEFAULT_TITLE
  preferredChars = DEFAULT_PREFERRED_CHARS
  keyPrefix = ''
  changeListeners = []
}

loadFromStorage()
