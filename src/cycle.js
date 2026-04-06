const STORAGE_KEY = 'ascii-picker-picked'

let pickedNames = []
let changeListeners = []

function notifyChange() {
  changeListeners.forEach(cb => cb())
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) pickedNames = JSON.parse(stored)
  } catch {
    // localStorage unavailable
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pickedNames))
  } catch {
    // localStorage unavailable
  }
}

export function getPickedNames() {
  return [...pickedNames]
}

export function getAvailableNames(allNames) {
  const picked = new Set(pickedNames)
  return allNames.filter(n => !picked.has(n))
}

export function markPicked(name) {
  if (!pickedNames.includes(name)) {
    pickedNames.push(name)
    saveToStorage()
    notifyChange()
  }
}

export function shouldResetCycle(allNames) {
  const available = getAvailableNames(allNames)
  return available.length === 0 && allNames.length > 0
}

export function resetCycle() {
  pickedNames = []
  saveToStorage()
  notifyChange()
}

// Remove names from picked list that no longer exist in the roster
export function syncWithRoster(allNames) {
  const roster = new Set(allNames)
  const before = pickedNames.length
  pickedNames = pickedNames.filter(n => roster.has(n))
  if (pickedNames.length !== before) {
    saveToStorage()
    notifyChange()
  }
}

export function setPicked(arr) {
  pickedNames = [...arr]
  saveToStorage()
}

export function onCycleChange(cb) {
  changeListeners.push(cb)
  return () => {
    changeListeners = changeListeners.filter(fn => fn !== cb)
  }
}

export function _resetForTest() {
  pickedNames = []
  changeListeners = []
}

loadFromStorage()
