const STORAGE_KEY = 'ascii-picker-theme'
const VALID_THEMES = ['system', 'light', 'dark']

let preference = 'system'

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && VALID_THEMES.includes(stored)) {
      preference = stored
    }
  } catch {
    // localStorage unavailable
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // localStorage unavailable
  }
}

export function getTheme() {
  return preference
}

export function setTheme(val) {
  if (!VALID_THEMES.includes(val)) return
  preference = val
  saveToStorage()
}

export function resolveEffectiveTheme(pref, systemPrefersDark) {
  if (pref === 'dark' || pref === 'light') return pref
  return systemPrefersDark ? 'dark' : 'light'
}

export function initTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')

  function apply() {
    const effective = resolveEffectiveTheme(preference, mq.matches)
    document.documentElement.setAttribute('data-theme', effective)
  }

  mq.addEventListener('change', apply)
  apply()
  return apply
}

export function toggleTheme() {
  const cycle = { system: 'dark', dark: 'light', light: 'system' }
  setTheme(cycle[preference])
  return preference
}

export function _resetForTest() {
  preference = 'system'
}

loadFromStorage()
