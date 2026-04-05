const STORAGE_KEY = 'ascii-picker-names'

let names = []

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) names = JSON.parse(stored)
  } catch {
    // localStorage unavailable or corrupt — use in-memory
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names))
  } catch {
    // localStorage unavailable — silent fallback
  }
}

export function getNames() {
  return [...names]
}

export function addNames(input) {
  const parsed = input
    .split(/[\t\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const existing = new Set(names)
  const added = []
  for (const name of parsed) {
    if (!existing.has(name)) {
      existing.add(name)
      added.push(name)
    }
  }

  names.push(...added)
  saveToStorage()
  return added
}

export function editName(index, newName) {
  const trimmed = newName.trim()
  if (index < 0 || index >= names.length) return false
  if (trimmed.length === 0) return false
  if (names.some((n, i) => i !== index && n === trimmed)) return false

  names[index] = trimmed
  saveToStorage()
  return true
}

export function deleteName(index) {
  if (index < 0 || index >= names.length) return false
  names.splice(index, 1)
  saveToStorage()
  return true
}

export function _resetForTest() {
  names = []
}

// Load on module init (no-op in test environment without localStorage)
loadFromStorage()
