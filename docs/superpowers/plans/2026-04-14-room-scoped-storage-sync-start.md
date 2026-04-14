# Room-Scoped Storage & Sync-and-Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate localStorage per room slug and add a "Sync & Start" button that fetches latest KV data before picking.

**Architecture:** Each storage module (`names.js`, `cycle.js`, `settings.js`) gets a `setKeyPrefix(prefix)` function. `room.js` calls these during init. A new `syncBeforeStart()` function in `room.js` fetches + hydrates before the pick animation. `main.js` orchestrates button state and the sync-then-pick flow.

**Tech Stack:** Vanilla JS, Vitest, Cloudflare Pages Functions (KV)

**Test runner:** `npx vitest run` (80 tests passing at baseline)

---

### Task 1: Add `setKeyPrefix` to `names.js`

**Files:**
- Modify: `src/names.js`
- Modify: `src/names.test.js`

- [ ] **Step 1: Write failing tests for `setKeyPrefix`**

Add to `src/names.test.js`:

```js
import { getNames, addNames, editName, deleteName, setNames, onNamesChange, setKeyPrefix, _resetForTest } from './names.js'

// ... (existing import line is replaced with the one above, adding setKeyPrefix)

describe('setKeyPrefix', () => {
  it('isolates storage by prefix', () => {
    addNames('Alice')
    expect(getNames()).toEqual(['Alice'])

    setKeyPrefix('room1-')
    expect(getNames()).toEqual([])

    addNames('Bob')
    expect(getNames()).toEqual(['Bob'])

    setKeyPrefix('')
    expect(getNames()).toEqual(['Alice'])
  })

  it('resets for test clears prefix too', () => {
    setKeyPrefix('room1-')
    addNames('Alice')
    _resetForTest()
    expect(getNames()).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/names.test.js`
Expected: FAIL — `setKeyPrefix` is not exported

- [ ] **Step 3: Implement `setKeyPrefix` in `names.js`**

In `src/names.js`, make these changes:

1. Add `let keyPrefix = ''` after the `STORAGE_KEY` constant.

2. Replace `loadFromStorage`:
```js
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(keyPrefix + STORAGE_KEY)
    if (stored) names = JSON.parse(stored)
  } catch {
    // localStorage unavailable or corrupt — use in-memory
  }
}
```

3. Replace `saveToStorage`:
```js
function saveToStorage() {
  try {
    localStorage.setItem(keyPrefix + STORAGE_KEY, JSON.stringify(names))
  } catch {
    // localStorage unavailable — silent fallback
  }
}
```

4. Add the exported function:
```js
export function setKeyPrefix(prefix) {
  keyPrefix = prefix
  names = []
  loadFromStorage()
}
```

5. Update `_resetForTest`:
```js
export function _resetForTest() {
  names = []
  keyPrefix = ''
  changeListeners = []
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/names.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/names.js src/names.test.js
git commit -m "feat(names): add setKeyPrefix for room-scoped localStorage"
```

---

### Task 2: Add `setKeyPrefix` to `cycle.js`

**Files:**
- Modify: `src/cycle.js`
- Modify: `src/cycle.test.js`

- [ ] **Step 1: Write failing tests for `setKeyPrefix`**

Add to `src/cycle.test.js`:

```js
import {
  getPickedNames, getAvailableNames, markPicked,
  shouldResetCycle, resetCycle, syncWithRoster, setPicked, onCycleChange, setKeyPrefix, _resetForTest
} from './cycle.js'

// ... (existing import line is replaced with the one above, adding setKeyPrefix)

describe('setKeyPrefix', () => {
  it('isolates picked storage by prefix', () => {
    markPicked('Alice')
    expect(getPickedNames()).toEqual(['Alice'])

    setKeyPrefix('room1-')
    expect(getPickedNames()).toEqual([])

    markPicked('Bob')
    expect(getPickedNames()).toEqual(['Bob'])

    setKeyPrefix('')
    expect(getPickedNames()).toEqual(['Alice'])
  })

  it('resets for test clears prefix too', () => {
    setKeyPrefix('room1-')
    markPicked('Alice')
    _resetForTest()
    expect(getPickedNames()).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/cycle.test.js`
Expected: FAIL — `setKeyPrefix` is not exported

- [ ] **Step 3: Implement `setKeyPrefix` in `cycle.js`**

In `src/cycle.js`, make these changes:

1. Add `let keyPrefix = ''` after the `STORAGE_KEY` constant.

2. Replace `loadFromStorage`:
```js
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(keyPrefix + STORAGE_KEY)
    if (stored) pickedNames = JSON.parse(stored)
  } catch {
    // localStorage unavailable
  }
}
```

3. Replace `saveToStorage`:
```js
function saveToStorage() {
  try {
    localStorage.setItem(keyPrefix + STORAGE_KEY, JSON.stringify(pickedNames))
  } catch {
    // localStorage unavailable
  }
}
```

4. Add the exported function:
```js
export function setKeyPrefix(prefix) {
  keyPrefix = prefix
  pickedNames = []
  loadFromStorage()
}
```

5. Update `_resetForTest`:
```js
export function _resetForTest() {
  pickedNames = []
  keyPrefix = ''
  changeListeners = []
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/cycle.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/cycle.js src/cycle.test.js
git commit -m "feat(cycle): add setKeyPrefix for room-scoped localStorage"
```

---

### Task 3: Add `setKeyPrefix` to `settings.js`

**Files:**
- Modify: `src/settings.js`
- Modify: `src/settings.test.js`

- [ ] **Step 1: Write failing tests for `setKeyPrefix`**

Add to `src/settings.test.js`:

```js
import {
  getDuration, setDuration,
  getGridSize, setGridSize,
  getTitle, setTitle,
  getPreferredChars, setPreferredChars,
  GRID_PRESETS,
  hydrateSettings, onSettingsChange,
  setKeyPrefix, _resetForTest
} from './settings.js'

// ... (existing import line is replaced with the one above, adding setKeyPrefix)

describe('setKeyPrefix', () => {
  it('isolates settings storage by prefix', () => {
    setTitle('Root Title')
    setDuration(10)
    expect(getTitle()).toBe('Root Title')
    expect(getDuration()).toBe(10)

    setKeyPrefix('room1-')
    expect(getTitle()).toBe('ASCII PICKER')
    expect(getDuration()).toBe(5)

    setTitle('Room Title')
    setDuration(8)
    expect(getTitle()).toBe('Room Title')
    expect(getDuration()).toBe(8)

    setKeyPrefix('')
    expect(getTitle()).toBe('Root Title')
    expect(getDuration()).toBe(10)
  })

  it('resets for test clears prefix too', () => {
    setKeyPrefix('room1-')
    setTitle('Room Title')
    _resetForTest()
    expect(getTitle()).toBe('ASCII PICKER')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/settings.test.js`
Expected: FAIL — `setKeyPrefix` is not exported

- [ ] **Step 3: Implement `setKeyPrefix` in `settings.js`**

In `src/settings.js`, make these changes:

1. Add `let keyPrefix = ''` after the constant declarations (after `DEFAULT_PREFERRED_CHARS`).

2. Replace `loadFromStorage`:
```js
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
```

3. Replace `saveToStorage`:
```js
function saveToStorage(key, value) {
  try {
    localStorage.setItem(keyPrefix + key, String(value))
  } catch {
    // localStorage unavailable
  }
}
```

4. Add the exported function:
```js
export function setKeyPrefix(prefix) {
  keyPrefix = prefix
  duration = DEFAULT_DURATION
  gridLabel = 'large'
  title = DEFAULT_TITLE
  preferredChars = DEFAULT_PREFERRED_CHARS
  loadFromStorage()
}
```

5. Update `_resetForTest`:
```js
export function _resetForTest() {
  duration = DEFAULT_DURATION
  gridLabel = 'large'
  title = DEFAULT_TITLE
  preferredChars = DEFAULT_PREFERRED_CHARS
  keyPrefix = ''
  changeListeners = []
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/settings.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/settings.js src/settings.test.js
git commit -m "feat(settings): add setKeyPrefix for room-scoped localStorage"
```

---

### Task 4: Wire `setKeyPrefix` into `room.js`

**Files:**
- Modify: `src/room.js`

- [ ] **Step 1: Add imports for `setKeyPrefix` from all three modules**

In `src/room.js`, update the import lines:

Replace:
```js
import { getNames, setNames, onNamesChange } from './names.js'
import { getPickedNames, setPicked, onCycleChange } from './cycle.js'
import {
  getTitle, getDuration, getPreferredChars,
  hydrateSettings, onSettingsChange,
} from './settings.js'
```

With:
```js
import { getNames, setNames, onNamesChange, setKeyPrefix as setNamesKeyPrefix } from './names.js'
import { getPickedNames, setPicked, onCycleChange, setKeyPrefix as setCycleKeyPrefix } from './cycle.js'
import {
  getTitle, getDuration, getPreferredChars,
  hydrateSettings, onSettingsChange, setKeyPrefix as setSettingsKeyPrefix,
} from './settings.js'
```

- [ ] **Step 2: Add helper to set prefix on all modules**

Add after the `let debouncedSave = null` line:

```js
function applyKeyPrefix(slug) {
  const prefix = slug ? slug + '-' : ''
  setNamesKeyPrefix(prefix)
  setCycleKeyPrefix(prefix)
  setSettingsKeyPrefix(prefix)
}
```

- [ ] **Step 3: Call `applyKeyPrefix` in `initRoom` before fetching**

In the `initRoom` function, add the call right after setting `currentSlug`:

Replace:
```js
  currentSlug = slug
  debouncedSave = createDebouncedSave(300)
```

With:
```js
  currentSlug = slug
  debouncedSave = createDebouncedSave(300)
  applyKeyPrefix(slug)
```

- [ ] **Step 4: Run all tests to verify nothing broke**

Run: `npx vitest run`
Expected: All 80+ tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/room.js
git commit -m "feat(room): apply room-scoped key prefix on init"
```

---

### Task 5: Add `syncBeforeStart` to `room.js`

**Files:**
- Modify: `src/room.js`

- [ ] **Step 1: Implement `syncBeforeStart`**

Add this exported function to `src/room.js`, after the `initRoom` function:

```js
export async function syncBeforeStart() {
  if (!currentSlug) return false

  try {
    const data = await fetchRoom(currentSlug)
    if (data) {
      hydrateFromRoom(data)
      return true
    }
    return false
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Run all tests to verify nothing broke**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/room.js
git commit -m "feat(room): add syncBeforeStart for pre-pick KV fetch"
```

---

### Task 6: Add CSS spin animation

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Add spin keyframes and sync-icon class**

Append to the end of `src/style.css`:

```css
/* --- Sync spinner --- */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.start-btn .sync-icon {
  display: inline-block;
  animation: spin 1s linear infinite;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/style.css
git commit -m "style: add spin animation for sync button"
```

---

### Task 7: Update `main.js` — button label and sync-before-start flow

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add `syncBeforeStart` import**

In `src/main.js`, update the room import:

Replace:
```js
import { initRoom, isRoomMode, getRoomSlug, generateSlug, createRoom } from './room.js'
```

With:
```js
import { initRoom, isRoomMode, getRoomSlug, generateSlug, createRoom, syncBeforeStart } from './room.js'
```

- [ ] **Step 2: Add helper to set button label**

Add after the `let isAnimating = false` line:

```js
const START_LABEL = '▶ START'
const SYNC_START_LABEL = '▶ SYNC & START'
const SYNCING_LABEL = '<span class="sync-icon">⟳</span> SYNCING...'

function setStartBtnLabel(html) {
  startBtn.innerHTML = html
}
```

- [ ] **Step 3: Refactor the `startBtn` click handler to support sync flow**

Replace the entire `startBtn.addEventListener('click', ...)` block (lines 347–392) with:

```js
startBtn.addEventListener('click', async () => {
  const names = getNames()
  if (names.length === 0 || isAnimating) return

  if (isRoomMode()) {
    startBtn.disabled = true
    setStartBtnLabel(SYNCING_LABEL)

    const synced = await syncBeforeStart()
    if (synced) {
      showToast('Synced!')
    } else {
      showToast('Offline — using local data')
    }

    updateMainView()

    if (synced) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Re-read names after potential sync
  const currentNames = getNames()
  if (currentNames.length === 0) return

  if (shouldResetCycle(currentNames)) {
    resetCycle()
  }

  const available = getAvailableNames(currentNames)
  const winner = available[Math.floor(Math.random() * available.length)]

  isAnimating = true
  startBtn.disabled = true
  settingsBtn.disabled = true
  artBox.classList.remove('winner')
  statusText.textContent = 'Picking...'

  const duration = getDuration()

  startAnimation(
    currentNames,
    duration,
    (currentName, isFinal) => {
      renderAsciiFrame(currentName)
    },
    (pickedWinner) => {
      markPicked(pickedWinner)
      isAnimating = false
      startBtn.disabled = false
      settingsBtn.disabled = false
      setStartBtnLabel(isRoomMode() ? SYNC_START_LABEL : START_LABEL)

      startConfetti(duration)

      const remaining = getAvailableNames(currentNames)
      if (remaining.length === 0) {
        statusText.textContent = `🎉 ${pickedWinner} hosts! — Round complete!`
      } else {
        statusText.textContent = `🎉 ${pickedWinner} hosts! — ${remaining.length} of ${currentNames.length} remaining`
      }
      artBox.classList.add('winner')
    },
    winner
  )
})
```

- [ ] **Step 4: Set initial button label in `init` function**

In the `init` function, add a line at the end (before the closing `}`) to set the button label when in room mode:

After the block:
```js
  if (isRoomMode()) {
    roomIndicator.textContent = `📡 ${getRoomSlug()}`
    roomIndicator.classList.add('active')
  }
```

Add:
```js
  if (isRoomMode()) {
    setStartBtnLabel(SYNC_START_LABEL)
  }
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Run the build to make sure it compiles**

Run: `npx vite build`
Expected: Build succeeds without errors

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "feat: sync-and-start button with KV fetch before pick"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS (80+ tests)

- [ ] **Step 2: Run production build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Verify no regressions with git diff**

Run: `git --no-pager diff HEAD~7 --stat`
Expected: Changes only to `src/names.js`, `src/names.test.js`, `src/cycle.js`, `src/cycle.test.js`, `src/settings.js`, `src/settings.test.js`, `src/room.js`, `src/main.js`, `src/style.css`
