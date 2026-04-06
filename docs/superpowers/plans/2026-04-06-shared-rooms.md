# Shared Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable teams to share a picker configuration via URL slugs backed by Cloudflare Workers KV, so everyone starts with the same name list, cycle state, and settings.

**Architecture:** URL slugs (e.g. `/my-team`) map to KV entries containing the shared room data (names, picked, title, duration, preferredChars). Cloudflare Pages Functions provide GET/PUT API. Frontend detects room slug from URL path, hydrates modules from KV on load, and debounce-saves mutations back. Root path (`/`) continues working in local-only mode with zero backend dependency.

**Tech Stack:** Cloudflare Pages Functions (serverless), Cloudflare Workers KV (storage), Vanilla JS (frontend), Vite (build)

---

## File Structure

| File | Responsibility |
|---|---|
| `functions/api/rooms/[slug].js` | **New.** Pages Function — GET/PUT for room data in KV |
| `src/sync.js` | **New.** API client — `fetchRoom(slug)`, `saveRoom(slug, data)` |
| `src/room.js` | **New.** Room coordinator — detects slug, hydrates modules, triggers sync on mutations |
| `src/toast.js` | **New.** Minimal toast notification system |
| `src/names.js` | **Modify.** Add `setNames(arr)` for bulk hydration, `onNamesChange(cb)` callback |
| `src/cycle.js` | **Modify.** Add `setPicked(arr)` for bulk hydration, `onCycleChange(cb)` callback |
| `src/settings.js` | **Modify.** Add `hydrateSettings(data)` for bulk load, `onSettingsChange(cb)` callback |
| `src/main.js` | **Modify.** Initialize room, add share button, show room status indicator |
| `index.html` | **Modify.** Add share button in header |
| `src/style.css` | **Modify.** Add toast styles, share button styles, room indicator styles |
| `public/_redirects` | **New.** SPA fallback routing for Cloudflare Pages |

---

### Task 1: Cloudflare Pages Function — Room API

**Files:**
- Create: `functions/api/rooms/[slug].js`

This is the serverless backend. Cloudflare Pages automatically deploys files in `functions/` as Workers. The `[slug]` is a dynamic route parameter.

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p functions/api/rooms
```

- [ ] **Step 2: Write the Pages Function**

Create `functions/api/rooms/[slug].js`:

```js
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
  // Validate types
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
```

- [ ] **Step 3: Commit**

```bash
git add functions/
git commit -m "feat: add Cloudflare Pages Function for room API (GET/PUT)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: SPA Fallback Routing

**Files:**
- Create: `public/_redirects`

Cloudflare Pages needs a routing rule so `/:slug` paths serve `index.html` instead of 404.

- [ ] **Step 1: Create `public/_redirects`**

```
/sample  /sample.html  200
/*       /index.html   200
```

Note: Pages Functions routes (`/api/*`) are matched before `_redirects`, so the API still works. `/sample` must come before the catch-all.

- [ ] **Step 2: Commit**

```bash
git add public/_redirects
git commit -m "feat: add SPA fallback routing for room slugs

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Toast Notification Module

**Files:**
- Create: `src/toast.js`
- Modify: `src/style.css`

A minimal toast for sync status ("Saved", "Offline", etc.) before wiring room logic.

- [ ] **Step 1: Create `src/toast.js`**

```js
let containerEl = null

function ensureContainer() {
  if (containerEl) return
  containerEl = document.createElement('div')
  containerEl.className = 'toast-container'
  document.body.appendChild(containerEl)
}

export function showToast(message, durationMs = 2500) {
  ensureContainer()
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = message
  containerEl.appendChild(el)

  // Trigger enter animation on next frame
  requestAnimationFrame(() => el.classList.add('show'))

  setTimeout(() => {
    el.classList.remove('show')
    el.addEventListener('transitionend', () => el.remove(), { once: true })
    // Fallback removal if transitionend doesn't fire
    setTimeout(() => el.remove(), 500)
  }, durationMs)
}
```

- [ ] **Step 2: Add toast CSS to `src/style.css`**

Append to end of file:

```css
/* --- Toast notifications --- */
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  padding: 10px 18px;
  font: 500 13px/1.4 var(--font-ui);
  color: var(--bg);
  background: var(--text);
  border-radius: 8px;
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 0.25s, transform 0.25s;
  pointer-events: auto;
}

.toast.show {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/toast.js src/style.css
git commit -m "feat: add toast notification module

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Add Hydration + Change Callbacks to Data Modules

**Files:**
- Modify: `src/names.js`
- Modify: `src/cycle.js`
- Modify: `src/settings.js`
- Modify: `src/names.test.js`
- Modify: `src/cycle.test.js`
- Modify: `src/settings.test.js`

Each module needs: (a) a bulk-set function to hydrate from server data, and (b) an onChange callback so the room module can trigger sync on mutations.

- [ ] **Step 1: Write failing tests for names.js**

Add to `src/names.test.js`:

```js
import {
  getNames, addNames, editName, deleteName,
  setNames, onNamesChange,
  _resetForTest
} from './names.js'

// ... existing tests ...

describe('setNames', () => {
  it('replaces the entire name list', () => {
    addNames('Alice\nBob')
    setNames(['Carol', 'Dave'])
    expect(getNames()).toEqual(['Carol', 'Dave'])
  })

  it('accepts empty array', () => {
    addNames('Alice')
    setNames([])
    expect(getNames()).toEqual([])
  })
})

describe('onNamesChange', () => {
  it('fires callback on addNames', () => {
    const calls = []
    const unsub = onNamesChange(() => calls.push('called'))
    addNames('Alice')
    expect(calls).toEqual(['called'])
    unsub()
  })

  it('fires callback on editName', () => {
    addNames('Alice')
    const calls = []
    const unsub = onNamesChange(() => calls.push('called'))
    editName(0, 'Bob')
    expect(calls).toEqual(['called'])
    unsub()
  })

  it('fires callback on deleteName', () => {
    addNames('Alice')
    const calls = []
    const unsub = onNamesChange(() => calls.push('called'))
    deleteName(0)
    expect(calls).toEqual(['called'])
    unsub()
  })

  it('does NOT fire on setNames (hydration is not a user mutation)', () => {
    const calls = []
    const unsub = onNamesChange(() => calls.push('called'))
    setNames(['Alice'])
    expect(calls).toEqual([])
    unsub()
  })

  it('unsub stops callbacks', () => {
    const calls = []
    const unsub = onNamesChange(() => calls.push('called'))
    unsub()
    addNames('Alice')
    expect(calls).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify failures**

Run: `npx vitest run src/names.test.js`
Expected: FAIL — `setNames` and `onNamesChange` are not exported.

- [ ] **Step 3: Implement setNames + onNamesChange in `src/names.js`**

Add these after the existing exports and before `_resetForTest`:

```js
let changeListeners = []

export function setNames(arr) {
  names = [...arr]
  saveToStorage()
  // No change notification — hydration is not a user mutation
}

export function onNamesChange(cb) {
  changeListeners.push(cb)
  return () => {
    changeListeners = changeListeners.filter(fn => fn !== cb)
  }
}

function notifyChange() {
  changeListeners.forEach(cb => cb())
}
```

Then add `notifyChange()` calls at the end of `addNames`, `editName` (only on success path), and `deleteName` (only on success path). Specifically:

In `addNames`, after `saveToStorage()` (line 42), add:
```js
  if (added.length > 0) notifyChange()
```

In `editName`, after `saveToStorage()` (line 53), add:
```js
  notifyChange()
```

In `deleteName`, after `saveToStorage()` (line 60), add:
```js
  notifyChange()
```

Update `_resetForTest` to also clear listeners:
```js
export function _resetForTest() {
  names = []
  changeListeners = []
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/names.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Write failing tests for cycle.js**

Add to `src/cycle.test.js`:

```js
import {
  getPickedNames, getAvailableNames, markPicked,
  shouldResetCycle, resetCycle, syncWithRoster,
  setPicked, onCycleChange,
  _resetForTest
} from './cycle.js'

// ... existing tests ...

describe('setPicked', () => {
  it('replaces the picked list', () => {
    markPicked('Alice')
    setPicked(['Bob', 'Carol'])
    expect(getPickedNames()).toEqual(['Bob', 'Carol'])
  })
})

describe('onCycleChange', () => {
  it('fires on markPicked', () => {
    const calls = []
    const unsub = onCycleChange(() => calls.push('called'))
    markPicked('Alice')
    expect(calls).toEqual(['called'])
    unsub()
  })

  it('fires on resetCycle', () => {
    markPicked('Alice')
    const calls = []
    const unsub = onCycleChange(() => calls.push('called'))
    resetCycle()
    expect(calls).toEqual(['called'])
    unsub()
  })

  it('does NOT fire on setPicked (hydration)', () => {
    const calls = []
    const unsub = onCycleChange(() => calls.push('called'))
    setPicked(['Alice'])
    expect(calls).toEqual([])
    unsub()
  })
})
```

- [ ] **Step 6: Run tests to verify failures**

Run: `npx vitest run src/cycle.test.js`
Expected: FAIL — `setPicked` and `onCycleChange` are not exported.

- [ ] **Step 7: Implement setPicked + onCycleChange in `src/cycle.js`**

Add after existing exports, before `_resetForTest`:

```js
let changeListeners = []

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

function notifyChange() {
  changeListeners.forEach(cb => cb())
}
```

Add `notifyChange()` to `markPicked` (after `saveToStorage()` on line 34), `resetCycle` (after `saveToStorage()` on line 45), and `syncWithRoster` (inside the `if` block after `saveToStorage()` on line 54).

Update `_resetForTest`:
```js
export function _resetForTest() {
  pickedNames = []
  changeListeners = []
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/cycle.test.js`
Expected: All tests PASS.

- [ ] **Step 9: Write failing tests for settings.js**

Add to `src/settings.test.js`:

```js
import {
  getDuration, setDuration,
  getGridSize, setGridSize,
  getTitle, setTitle,
  getPreferredChars, setPreferredChars,
  hydrateSettings, onSettingsChange,
  GRID_PRESETS,
  _resetForTest
} from './settings.js'

// ... existing tests ...

describe('hydrateSettings', () => {
  it('sets all shared fields at once', () => {
    hydrateSettings({
      title: 'Team Standup',
      duration: 8,
      preferredChars: 'XYZ',
    })
    expect(getTitle()).toBe('Team Standup')
    expect(getDuration()).toBe(8)
    expect(getPreferredChars()).toBe('XYZ')
  })

  it('handles partial data gracefully', () => {
    hydrateSettings({ title: 'Only Title' })
    expect(getTitle()).toBe('Only Title')
    // Others unchanged from default
    expect(getDuration()).toBe(5)
  })
})

describe('onSettingsChange', () => {
  it('fires on setTitle', () => {
    const calls = []
    const unsub = onSettingsChange(() => calls.push('called'))
    setTitle('New Title')
    expect(calls).toEqual(['called'])
    unsub()
  })

  it('fires on setDuration', () => {
    const calls = []
    const unsub = onSettingsChange(() => calls.push('called'))
    setDuration(10)
    expect(calls).toEqual(['called'])
    unsub()
  })

  it('fires on setPreferredChars', () => {
    const calls = []
    const unsub = onSettingsChange(() => calls.push('called'))
    setPreferredChars('ABC')
    expect(calls).toEqual(['called'])
    unsub()
  })

  it('does NOT fire on hydrateSettings', () => {
    const calls = []
    const unsub = onSettingsChange(() => calls.push('called'))
    hydrateSettings({ title: 'Test', duration: 3 })
    expect(calls).toEqual([])
    unsub()
  })
})
```

- [ ] **Step 10: Run tests to verify failures**

Run: `npx vitest run src/settings.test.js`
Expected: FAIL — `hydrateSettings` and `onSettingsChange` are not exported.

- [ ] **Step 11: Implement hydrateSettings + onSettingsChange in `src/settings.js`**

Add after existing exports, before `_resetForTest`:

```js
let changeListeners = []

export function hydrateSettings(data) {
  if (data.title !== undefined) {
    title = (data.title || '').trim() || DEFAULT_TITLE
    saveToStorage(TITLE_KEY, title)
  }
  if (data.duration !== undefined) {
    duration = clampDuration(data.duration)
    saveToStorage(DURATION_KEY, duration)
  }
  if (data.preferredChars !== undefined) {
    preferredChars = (data.preferredChars || '').trim()
    saveToStorage(PREFERRED_CHARS_KEY, preferredChars)
  }
}

export function onSettingsChange(cb) {
  changeListeners.push(cb)
  return () => {
    changeListeners = changeListeners.filter(fn => fn !== cb)
  }
}

function notifyChange() {
  changeListeners.forEach(cb => cb())
}
```

Add `notifyChange()` calls at end of `setDuration` (after line 64), `setTitle` (after line 83), and `setPreferredChars` (after line 92).

Update `_resetForTest`:
```js
export function _resetForTest() {
  duration = DEFAULT_DURATION
  gridLabel = 'large'
  title = DEFAULT_TITLE
  preferredChars = DEFAULT_PREFERRED_CHARS
  changeListeners = []
}
```

- [ ] **Step 12: Run all tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 13: Commit**

```bash
git add src/names.js src/cycle.js src/settings.js src/names.test.js src/cycle.test.js src/settings.test.js
git commit -m "feat: add hydration + onChange callbacks to data modules

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Sync Module (API Client)

**Files:**
- Create: `src/sync.js`

Thin API client used by the room module. Handles fetch, error recovery, and debouncing.

- [ ] **Step 1: Create `src/sync.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/sync.js
git commit -m "feat: add sync module (API client with debounced save)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Room Coordinator Module

**Files:**
- Create: `src/room.js`

This is the central coordinator. It detects the slug from the URL, loads room data on init, hydrates all modules, and wires up change callbacks to trigger sync.

- [ ] **Step 1: Create `src/room.js`**

```js
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
      // Room doesn't exist — create it from current local data
      const localData = collectRoomData()
      await saveRoom(slug, localData)
      showToast(`Room "${slug}" created`)
    }
  } catch {
    showToast('Offline — using local data')
  }

  // Wire up change listeners for auto-sync
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
```

- [ ] **Step 2: Commit**

```bash
git add src/room.js
git commit -m "feat: add room coordinator module

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Wire Room + Share Button into Main App

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/style.css`

This wires everything together: room initialization on load, share button in header, room status indicator.

- [ ] **Step 1: Add share button to `index.html`**

In `index.html`, add the share button to `.header-actions` (between theme toggle and settings button):

Replace lines 14-17:
```html
    <div class="header-actions">
      <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">◑</button>
      <button class="icon-btn" id="settings-btn" aria-label="Settings" title="Settings">⚙</button>
    </div>
```

With:
```html
    <div class="header-actions">
      <button class="icon-btn" id="share-btn" aria-label="Share" title="Share">🔗</button>
      <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">◑</button>
      <button class="icon-btn" id="settings-btn" aria-label="Settings" title="Settings">⚙</button>
    </div>
```

- [ ] **Step 2: Add room indicator to `index.html`**

After the `.header-title` div (line 13), add:
```html
    <div class="room-indicator" id="room-indicator"></div>
```

So the header becomes:
```html
  <header class="header">
    <div class="header-title">ASCII PICKER</div>
    <div class="room-indicator" id="room-indicator"></div>
    <div class="header-actions">
      ...
    </div>
  </header>
```

- [ ] **Step 3: Add CSS for room indicator and share dialog**

Append to `src/style.css`:

```css
/* --- Room indicator --- */
.room-indicator {
  font: 400 11px/1 var(--font-mono);
  color: var(--text-dim);
  display: none;
}

.room-indicator.active {
  display: block;
}

/* --- Share dialog --- */
.share-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  z-index: 10001;
  min-width: 320px;
  max-width: 90vw;
}

.share-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 10000;
}

.share-dialog h3 {
  margin: 0 0 16px;
  font: 600 16px/1.3 var(--font-ui);
  color: var(--text);
}

.share-dialog .slug-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.share-dialog .slug-input {
  flex: 1;
  padding: 8px 10px;
  font: 500 14px/1.4 var(--font-mono);
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--text-dim);
  border-radius: 6px;
  outline: none;
}

.share-dialog .slug-input:focus {
  border-color: var(--accent);
}

.share-dialog .share-create-btn {
  padding: 8px 16px;
  font: 600 13px/1 var(--font-ui);
  color: var(--bg);
  background: var(--accent);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.share-dialog .share-create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.share-dialog .slug-hint {
  font: 400 11px/1.4 var(--font-ui);
  color: var(--text-dim);
}
```

- [ ] **Step 4: Update `src/main.js` — add imports and DOM refs**

Add new imports at the top of `src/main.js` (after the existing imports):

```js
import { initRoom, isRoomMode, getRoomSlug, generateSlug, createRoom } from './room.js'
import { showToast } from './toast.js'
```

Add new DOM refs after the existing refs (after line 17):

```js
const shareBtn = document.getElementById('share-btn')
const roomIndicator = document.getElementById('room-indicator')
```

- [ ] **Step 5: Update `src/main.js` — change initialization to async**

The current initialization (lines 307-314) is synchronous. Wrap it in an async IIFE that initializes the room first, then renders. Replace lines 306-314:

```js
// --- Initial render ---
applyTitle()
updateMainView()

const initialNames = getNames()
if (initialNames.length > 0) {
  const preview = initialNames[Math.floor(Math.random() * initialNames.length)]
  renderAsciiFrame(preview)
}
```

With:

```js
// --- Initial render ---
async function init() {
  await initRoom()

  // After room loads, re-apply title and palette (may have been hydrated)
  applyTitle()
  buildPalette(getPreferredChars())
  updateMainView()

  // Update room indicator
  if (isRoomMode()) {
    roomIndicator.textContent = `📡 ${getRoomSlug()}`
    roomIndicator.classList.add('active')
  }

  const initialNames = getNames()
  if (initialNames.length > 0) {
    const preview = initialNames[Math.floor(Math.random() * initialNames.length)]
    renderAsciiFrame(preview)
  }
}

init()
```

- [ ] **Step 6: Update `src/main.js` — add share button handler**

Add this after the settings button click handler (after the `settingsBtn.addEventListener` block):

```js
// --- Share button ---
shareBtn.addEventListener('click', () => {
  if (isRoomMode()) {
    // Already in a room — copy URL to clipboard
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('URL copied to clipboard!')
    }).catch(() => {
      showToast('Could not copy URL')
    })
  } else {
    // Show share dialog to create a room
    showShareDialog()
  }
})

function showShareDialog() {
  const slug = generateSlug()
  const backdrop = document.createElement('div')
  backdrop.className = 'share-dialog-backdrop'

  const dialog = document.createElement('div')
  dialog.className = 'share-dialog'
  dialog.innerHTML = `
    <h3>Create Shared Room</h3>
    <div class="slug-row">
      <input type="text" class="slug-input" id="slug-input" value="${slug}"
        placeholder="room-slug" pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" maxlength="64">
      <button class="share-create-btn" id="share-create-btn">Create & Copy URL</button>
    </div>
    <div class="slug-hint">Lowercase letters, numbers, and hyphens. 2-64 characters.</div>
  `

  document.body.appendChild(backdrop)
  document.body.appendChild(dialog)

  const input = dialog.querySelector('#slug-input')
  const btn = dialog.querySelector('#share-create-btn')

  input.focus()
  input.select()

  function close() {
    backdrop.remove()
    dialog.remove()
  }

  backdrop.addEventListener('click', close)

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      close()
      document.removeEventListener('keydown', escHandler)
    }
  })

  btn.addEventListener('click', async () => {
    const finalSlug = input.value.trim().toLowerCase()
    if (!finalSlug || finalSlug.length < 2) {
      showToast('Slug must be at least 2 characters')
      return
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(finalSlug) && finalSlug.length > 1) {
      // Allow single 2-char slugs like "ab"
      if (!/^[a-z0-9]{2,}$/.test(finalSlug) && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(finalSlug)) {
        showToast('Invalid slug format')
        return
      }
    }

    btn.disabled = true
    btn.textContent = 'Creating...'

    try {
      await createRoom(finalSlug)
      const url = `${window.location.origin}/${finalSlug}`
      await navigator.clipboard.writeText(url).catch(() => {})
      showToast('Room created! URL copied.')
      close()
      // Navigate to the room
      window.location.href = url
    } catch (err) {
      btn.disabled = false
      btn.textContent = 'Create & Copy URL'
      showToast('Failed to create room')
    }
  })
}
```

- [ ] **Step 7: Run tests to make sure nothing is broken**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 8: Build and verify**

Run: `npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add index.html src/main.js src/style.css
git commit -m "feat: wire room system + share button into main app

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 8: Vite Config — Exclude Functions from Build

**Files:**
- Modify: `vite.config.js`

Cloudflare Pages deploys `functions/` separately. Make sure Vite doesn't try to bundle it.

- [ ] **Step 1: Check current vite.config.js and verify functions are excluded**

Vite by default only bundles files referenced from HTML entry points. Since `functions/api/rooms/[slug].js` is never imported from `index.html` or `sample.html`, it should already be excluded. However, ensure the build output directory doesn't conflict.

Run: `npx vite build`
Expected: Build succeeds. Check that `dist/` does not contain anything from `functions/`.

Run: `ls dist/`
Expected: No `functions` directory in dist.

If `functions/` is not copied (which is expected since Vite only bundles imported files), no config changes needed. Skip to step 3.

- [ ] **Step 2: (Only if needed) Add exclude to vite.config.js**

If for some reason functions files appear in dist, add to the Vite config:

```js
build: {
  rollupOptions: {
    external: ['functions/**'],
  }
}
```

- [ ] **Step 3: Commit (only if changes were made)**

```bash
git add vite.config.js
git commit -m "chore: ensure functions dir excluded from Vite build

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 9: End-to-End Verification and KV Setup Notes

**Files:**
- No code changes. Verification and documentation.

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS (existing + new from Task 4).

- [ ] **Step 2: Run production build**

Run: `npx vite build`
Expected: Build succeeds, PWA service worker generated.

- [ ] **Step 3: Verify dev server works in local-only mode**

Run: `npx vite --port 5175` (in background)
Visit `http://localhost:5175/`
Expected: App works exactly as before. No room indicator shown. Share button visible.

- [ ] **Step 4: Verify the share dialog opens**

Click the 🔗 share button.
Expected: Dialog appears with auto-generated slug and "Create & Copy URL" button.
Close the dialog (Escape or click backdrop).

- [ ] **Step 5: Note about KV binding (manual Cloudflare setup)**

After deploying to Cloudflare Pages, the user must:

1. Go to Cloudflare Dashboard → Workers & Pages → ascii-picker → Settings → Bindings
2. Add a KV Namespace binding:
   - Variable name: `ROOMS`
   - KV Namespace: Create a new one called `ASCII_PICKER_ROOMS`
3. Redeploy (or the next push will pick it up)

Without this binding, the API will return 500 errors and the app will fall back to local-only mode gracefully.

- [ ] **Step 6: Final commit — all files**

```bash
git add -A
git commit -m "feat: complete shared rooms implementation

Adds URL-based shared rooms backed by Cloudflare Workers KV.
Teams can share picker config via short URLs.

- Pages Function API (GET/PUT /api/rooms/:slug)
- Sync module with debounced saves
- Room coordinator with auto-hydration
- Share button with custom slug dialog
- Toast notifications for sync status
- SPA fallback routing
- Data modules now support hydration + change callbacks

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
