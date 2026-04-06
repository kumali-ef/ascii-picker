const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/
const RESERVED = new Set(['sample', 'api', 'assets', 'src', 'public'])
const ALLOWED_KEYS = new Set(['names', 'picked', 'title', 'duration', 'preferredChars'])

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug) && !RESERVED.has(slug)
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null
  const clean = {}
  for (const key of ALLOWED_KEYS) {
    if (key in body) clean[key] = body[key]
  }
  if (!Array.isArray(clean.names)) return null
  if (!clean.names.every(n => typeof n === 'string')) return null
  if ('picked' in clean && !Array.isArray(clean.picked)) return null
  if ('duration' in clean && typeof clean.duration !== 'number') return null
  if ('title' in clean && typeof clean.title !== 'string') return null
  if ('preferredChars' in clean && typeof clean.preferredChars !== 'string') return null
  return clean
}

export async function onRequestGet(context) {
  const slug = context.params.slug
  if (!isValidSlug(slug)) {
    return jsonResponse({ error: 'Invalid slug' }, 400)
  }

  const data = await context.env.ROOMS.get(slug, 'json')
  if (!data) {
    return jsonResponse({ error: 'Room not found' }, 404)
  }

  return jsonResponse(data)
}

export async function onRequestPut(context) {
  const slug = context.params.slug
  if (!isValidSlug(slug)) {
    return jsonResponse({ error: 'Invalid slug' }, 400)
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const clean = sanitizeBody(body)
  if (!clean) {
    return jsonResponse({ error: 'Invalid room data' }, 400)
  }

  clean.updatedAt = new Date().toISOString()

  await context.env.ROOMS.put(slug, JSON.stringify(clean))

  return jsonResponse(clean)
}
