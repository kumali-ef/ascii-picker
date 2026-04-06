const STORAGE_KEY = 'ascii-picker-picked'

let pickedNames = []

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
  }
}

export function shouldResetCycle(allNames) {
  const available = getAvailableNames(allNames)
  return available.length === 0 && allNames.length > 0
}

export function resetCycle() {
  pickedNames = []
  saveToStorage()
}

// Remove names from picked list that no longer exist in the roster
export function syncWithRoster(allNames) {
  const roster = new Set(allNames)
  const before = pickedNames.length
  pickedNames = pickedNames.filter(n => roster.has(n))
  if (pickedNames.length !== before) {
    saveToStorage()
  }
}

export function _resetForTest() {
  pickedNames = []
}

loadFromStorage()
