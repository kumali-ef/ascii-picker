const API_BASE = '/api/rooms'

export async function fetchRoom(slug) {
  const res = await fetch(`${API_BASE}/${slug}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET failed: ${res.status}`)
  return res.json()
}

export async function saveRoom(slug, data) {
  const res = await fetch(`${API_BASE}/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PUT failed: ${res.status}`)
  return res.json()
}

export function createDebouncedSave(delayMs = 300) {
  let timer = null
  let pending = null

  function flush(slug, data) {
    return saveRoom(slug, data)
  }

  return function debouncedSave(slug, data) {
    if (timer) clearTimeout(timer)
    pending = { slug, data }
    return new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        timer = null
        flush(pending.slug, pending.data).then(resolve, reject)
      }, delayMs)
    })
  }
}
