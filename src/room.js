import { getNames, setNames, onNamesChange } from './names.js'
import { getPickedNames, setPicked, onCycleChange } from './cycle.js'
import {
  getTitle, getDuration, getPreferredChars,
  hydrateSettings, onSettingsChange,
} from './settings.js'
import { fetchRoom, saveRoom, createDebouncedSave } from './sync.js'
import { showToast } from './toast.js'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/
const RESERVED = new Set(['sample', 'api', 'assets', 'src', 'public'])

let currentSlug = null
let debouncedSave = null

export function getRoomSlug() {
  return currentSlug
}

export function isRoomMode() {
  return currentSlug !== null
}

function parseSlugFromUrl() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  if (!path || !SLUG_RE.test(path) || RESERVED.has(path)) return null
  return path
}

function collectRoomData() {
  return {
    names: getNames(),
    picked: getPickedNames(),
    title: getTitle(),
    duration: getDuration(),
    preferredChars: getPreferredChars(),
  }
}

function hydrateFromRoom(data) {
  if (data.names) setNames(data.names)
  if (data.picked) setPicked(data.picked)
  hydrateSettings({
    title: data.title,
    duration: data.duration,
    preferredChars: data.preferredChars,
  })
}

function triggerSync() {
  if (!currentSlug || !debouncedSave) return
  debouncedSave(currentSlug, collectRoomData()).catch(() => {
    showToast('Sync failed — changes saved locally')
  })
}

export async function initRoom() {
  const slug = parseSlugFromUrl()
  if (!slug) return false

  currentSlug = slug
  debouncedSave = createDebouncedSave(300)

  try {
    const data = await fetchRoom(slug)
    if (data) {
      hydrateFromRoom(data)
      showToast(`Room "${slug}" loaded`)
    } else {
      const localData = collectRoomData()
      await saveRoom(slug, localData)
      showToast(`Room "${slug}" created`)
    }
  } catch {
    showToast('Offline — using local data')
  }

  onNamesChange(triggerSync)
  onCycleChange(triggerSync)
  onSettingsChange(triggerSync)

  return true
}

export function generateSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let slug = ''
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

export async function createRoom(slug) {
  const data = collectRoomData()
  await saveRoom(slug, data)
  return data
}
