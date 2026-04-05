# ASCII Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA webapp that randomly picks a standup meeting host with a slot-machine ASCII art animation powered by pretext.

**Architecture:** Vanilla JS + Vite. Hidden canvas renders names as large text, samples brightness at a grid, maps each cell to the best-matching character from a pretext-measured palette. A slot-machine cycling engine decelerates over a configurable duration and lands on a pre-determined winner.

**Tech Stack:** Vanilla HTML/CSS/JS, Vite, @chenglou/pretext, vite-plugin-pwa, vitest (dev)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/style.css`

- [ ] **Step 1: Initialize npm project and install dependencies**

```bash
cd /Users/kumali/EFProjects/ascii-picker
npm init -y
npm install @chenglou/pretext
npm install -D vite vite-plugin-pwa vitest
```

- [ ] **Step 2: Configure Vite with PWA plugin**

Create `vite.config.js`:

```js
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}']
      },
      manifest: {
        name: 'ASCII Picker',
        short_name: 'Picker',
        description: 'Random standup host picker with ASCII art animation',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  test: {
    environment: 'node'
  }
})
```

- [ ] **Step 3: Create minimal index.html**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASCII Picker</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/src/style.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create stub entry files**

Create `src/style.css`:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
```

Create `src/main.js`:

```js
import './style.css'

document.getElementById('app').textContent = 'ASCII Picker loading...'
```

- [ ] **Step 5: Add npm scripts to package.json**

Edit `package.json` to add/replace the `"scripts"` block:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Create placeholder PWA icons and favicon**

Create `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#000"/>
  <text x="16" y="23" text-anchor="middle" font-family="Georgia,serif" font-size="20" font-weight="800" fill="#0f0">?</text>
</svg>
```

Create placeholder PNG icons (generate simple solid-color PNGs via canvas in a Node script):

```bash
node -e "
const { createCanvas } = (() => { try { return require('canvas'); } catch { return { createCanvas: null }; } })();
const fs = require('fs');
// Generate minimal valid PNG files as placeholders
// 1x1 green pixel PNG for both sizes (will be replaced with real icons later)
const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/icon-192.png', png1x1);
fs.writeFileSync('public/icon-512.png', png1x1);
console.log('Placeholder icons created');
"
```

- [ ] **Step 7: Verify dev server starts**

```bash
npx vite --host 2>&1 | head -20
```

Expected: Vite dev server starts, shows a URL like `http://localhost:5173`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding with Vite + PWA + pretext

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Name Management Module

**Files:**
- Create: `src/names.js`
- Create: `src/names.test.js`

- [ ] **Step 1: Write failing tests for name management**

Create `src/names.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { getNames, addNames, editName, deleteName, _resetForTest } from './names.js'

beforeEach(() => {
  _resetForTest()
})

describe('getNames', () => {
  it('returns empty array initially', () => {
    expect(getNames()).toEqual([])
  })
})

describe('addNames', () => {
  it('adds a single name', () => {
    addNames('Alice')
    expect(getNames()).toEqual(['Alice'])
  })

  it('adds multiple names separated by newline', () => {
    addNames('Alice\nBob\nCarol')
    expect(getNames()).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('adds multiple names separated by tab', () => {
    addNames('Alice\tBob\tCarol')
    expect(getNames()).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('trims whitespace from names', () => {
    addNames('  Alice  \n  Bob  ')
    expect(getNames()).toEqual(['Alice', 'Bob'])
  })

  it('skips empty entries', () => {
    addNames('Alice\n\n\nBob\n')
    expect(getNames()).toEqual(['Alice', 'Bob'])
  })

  it('skips duplicate names', () => {
    addNames('Alice\nBob')
    addNames('Bob\nCarol')
    expect(getNames()).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('handles mixed tab and newline separators', () => {
    addNames('Alice\tBob\nCarol')
    expect(getNames()).toEqual(['Alice', 'Bob', 'Carol'])
  })
})

describe('editName', () => {
  it('edits a name at index', () => {
    addNames('Alice\nBob\nCarol')
    editName(1, 'Robert')
    expect(getNames()).toEqual(['Alice', 'Robert', 'Carol'])
  })

  it('trims the edited name', () => {
    addNames('Alice')
    editName(0, '  Bob  ')
    expect(getNames()).toEqual(['Bob'])
  })

  it('ignores edit if index out of range', () => {
    addNames('Alice')
    editName(5, 'Bob')
    expect(getNames()).toEqual(['Alice'])
  })

  it('ignores edit if new name is empty', () => {
    addNames('Alice')
    editName(0, '   ')
    expect(getNames()).toEqual(['Alice'])
  })

  it('ignores edit if new name is duplicate', () => {
    addNames('Alice\nBob')
    editName(0, 'Bob')
    expect(getNames()).toEqual(['Alice', 'Bob'])
  })
})

describe('deleteName', () => {
  it('deletes a name at index', () => {
    addNames('Alice\nBob\nCarol')
    deleteName(1)
    expect(getNames()).toEqual(['Alice', 'Carol'])
  })

  it('ignores delete if index out of range', () => {
    addNames('Alice')
    deleteName(5)
    expect(getNames()).toEqual(['Alice'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/names.test.js
```

Expected: FAIL — module `./names.js` does not export the expected functions.

- [ ] **Step 3: Implement names module**

Create `src/names.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/names.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/names.js src/names.test.js
git commit -m "feat: name management module with CRUD and batch parsing

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Settings Module

**Files:**
- Create: `src/settings.js`
- Create: `src/settings.test.js`

- [ ] **Step 1: Write failing tests for settings**

Create `src/settings.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getDuration, setDuration,
  getGridSize, setGridSize,
  GRID_PRESETS,
  _resetForTest
} from './settings.js'

beforeEach(() => {
  _resetForTest()
})

describe('duration', () => {
  it('returns default of 5 seconds', () => {
    expect(getDuration()).toBe(5)
  })

  it('sets and gets duration', () => {
    setDuration(10)
    expect(getDuration()).toBe(10)
  })

  it('clamps duration to min 2', () => {
    setDuration(1)
    expect(getDuration()).toBe(2)
  })

  it('clamps duration to max 15', () => {
    setDuration(20)
    expect(getDuration()).toBe(15)
  })
})

describe('gridSize', () => {
  it('returns medium preset by default', () => {
    expect(getGridSize()).toEqual({ cols: 50, rows: 28, label: 'medium' })
  })

  it('sets to small preset', () => {
    setGridSize('small')
    expect(getGridSize()).toEqual({ cols: 30, rows: 16, label: 'small' })
  })

  it('sets to large preset', () => {
    setGridSize('large')
    expect(getGridSize()).toEqual({ cols: 70, rows: 40, label: 'large' })
  })

  it('ignores invalid preset', () => {
    setGridSize('huge')
    expect(getGridSize()).toEqual({ cols: 50, rows: 28, label: 'medium' })
  })
})

describe('GRID_PRESETS', () => {
  it('exports three presets', () => {
    expect(Object.keys(GRID_PRESETS)).toEqual(['small', 'medium', 'large'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/settings.test.js
```

Expected: FAIL — module does not export expected functions.

- [ ] **Step 3: Implement settings module**

Create `src/settings.js`:

```js
const DURATION_KEY = 'ascii-picker-duration'
const GRID_KEY = 'ascii-picker-grid'

const DEFAULT_DURATION = 5
const MIN_DURATION = 2
const MAX_DURATION = 15

export const GRID_PRESETS = {
  small:  { cols: 30, rows: 16, label: 'small' },
  medium: { cols: 50, rows: 28, label: 'medium' },
  large:  { cols: 70, rows: 40, label: 'large' },
}

let duration = DEFAULT_DURATION
let gridLabel = 'medium'

function loadFromStorage() {
  try {
    const storedDuration = localStorage.getItem(DURATION_KEY)
    if (storedDuration !== null) {
      duration = clampDuration(Number(storedDuration))
    }
    const storedGrid = localStorage.getItem(GRID_KEY)
    if (storedGrid && GRID_PRESETS[storedGrid]) {
      gridLabel = storedGrid
    }
  } catch {
    // localStorage unavailable
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, String(value))
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
}

export function getGridSize() {
  return { ...GRID_PRESETS[gridLabel] }
}

export function setGridSize(preset) {
  if (!GRID_PRESETS[preset]) return
  gridLabel = preset
  saveToStorage(GRID_KEY, gridLabel)
}

export function _resetForTest() {
  duration = DEFAULT_DURATION
  gridLabel = 'medium'
}

loadFromStorage()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/settings.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/settings.js src/settings.test.js
git commit -m "feat: settings module for duration and grid size

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Theme Module

**Files:**
- Create: `src/theme.js`
- Create: `src/theme.test.js`

- [ ] **Step 1: Write failing tests for theme logic**

Create `src/theme.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { getTheme, setTheme, resolveEffectiveTheme, _resetForTest } from './theme.js'

beforeEach(() => {
  _resetForTest()
})

describe('getTheme', () => {
  it('returns "system" by default', () => {
    expect(getTheme()).toBe('system')
  })
})

describe('setTheme', () => {
  it('sets to dark', () => {
    setTheme('dark')
    expect(getTheme()).toBe('dark')
  })

  it('sets to light', () => {
    setTheme('light')
    expect(getTheme()).toBe('light')
  })

  it('sets to system', () => {
    setTheme('dark')
    setTheme('system')
    expect(getTheme()).toBe('system')
  })

  it('ignores invalid values', () => {
    setTheme('neon')
    expect(getTheme()).toBe('system')
  })
})

describe('resolveEffectiveTheme', () => {
  it('returns the preference directly when not system', () => {
    expect(resolveEffectiveTheme('dark', false)).toBe('dark')
    expect(resolveEffectiveTheme('light', true)).toBe('light')
  })

  it('returns dark when system prefers dark', () => {
    expect(resolveEffectiveTheme('system', true)).toBe('dark')
  })

  it('returns light when system prefers light', () => {
    expect(resolveEffectiveTheme('system', false)).toBe('light')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/theme.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement theme module**

Create `src/theme.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/theme.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme.js src/theme.test.js
git commit -m "feat: theme module with system preference detection

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: CSS Theme Variables and Base Styles

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Write complete stylesheet with theme variables**

Replace the contents of `src/style.css` with:

```css
/* === Theme Variables === */
:root {
  --bg: #000;
  --text: #00ff00;
  --text-dim: rgba(0, 255, 0, 0.3);
  --text-muted: rgba(0, 255, 0, 0.15);
  --accent: #00ff00;
  --accent-bg: rgba(0, 255, 0, 0.08);
  --border: rgba(0, 255, 0, 0.15);
  --surface: #050505;
  --overlay: rgba(0, 0, 0, 0.85);

  --font-ascii: Georgia, Palatino, "Times New Roman", serif;
  --font-ui: "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: "Courier New", Courier, monospace;
}

[data-theme="light"] {
  --bg: #fff;
  --text: #000;
  --text-dim: rgba(0, 0, 0, 0.3);
  --text-muted: rgba(0, 0, 0, 0.1);
  --accent: #000;
  --accent-bg: rgba(0, 0, 0, 0.05);
  --border: rgba(0, 0, 0, 0.12);
  --surface: #fafafa;
  --overlay: rgba(255, 255, 255, 0.9);
}

/* === Reset & Base === */
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-ui);
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: background-color 0.3s, color 0.3s;
}

/* === Header === */
.header {
  width: 100%;
  max-width: 800px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.header-title {
  font: 600 18px/1 var(--font-ascii);
  letter-spacing: 3px;
  color: var(--text);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-dim);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, color 0.2s;
}

.icon-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* === Art Box (ASCII animation area) === */
.art-container {
  width: 100%;
  max-width: 800px;
  padding: 0 20px;
}

.art-box {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  background: var(--surface);
  overflow: hidden;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.art-row {
  white-space: pre;
  font-family: var(--font-ascii);
  font-size: 13px;
  line-height: 15px;
  color: var(--text);
}

/* ASCII character weight/style classes */
.w3 { font-weight: 300; }
.w5 { font-weight: 500; }
.w8 { font-weight: 800; }
.it { font-style: italic; }

/* Opacity levels for brightness mapping */
.a1 { opacity: 0.10; } .a2 { opacity: 0.20; } .a3 { opacity: 0.30; }
.a4 { opacity: 0.40; } .a5 { opacity: 0.50; } .a6 { opacity: 0.60; }
.a7 { opacity: 0.70; } .a8 { opacity: 0.80; } .a9 { opacity: 0.90; }
.a10 { opacity: 1.0; }

/* Winner pulse animation */
@keyframes winner-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.art-box.winner .art-row span {
  animation: winner-pulse 0.25s ease-in-out 4;
}

/* === Controls === */
.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
}

.start-btn {
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 10px;
  padding: 14px 56px;
  font: 700 18px/1 var(--font-ascii);
  letter-spacing: 2px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.start-btn:hover:not(:disabled) {
  transform: scale(1.03);
}

.start-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.start-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.status-text {
  font: 400 12px/1 var(--font-ui);
  color: var(--text-dim);
}

/* === Modal === */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.modal {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font: 600 16px/1 var(--font-ui);
  color: var(--text);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.modal-close:hover {
  color: var(--text);
}

/* Tabs */
.tabs {
  display: flex;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
}

.tab {
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-dim);
  font: 500 13px/1 var(--font-ui);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.tab-panel {
  display: none;
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.tab-panel.active {
  display: block;
}

/* === Names Tab === */
.name-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.name-textarea {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text);
  font: 400 13px/1.4 var(--font-ui);
  resize: vertical;
  min-height: 28px;
  height: 28px;
}

.name-textarea::placeholder {
  color: var(--text-dim);
}

.add-btn {
  background: var(--accent-bg);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 4px 14px;
  color: var(--accent);
  font: 500 13px/1 var(--font-ui);
  cursor: pointer;
  white-space: nowrap;
  align-self: flex-start;
}

.add-btn:hover {
  background: var(--accent);
  color: var(--bg);
}

.name-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--surface);
  border-radius: 6px;
  border: 1px solid transparent;
}

.name-item-text {
  font: 400 14px/1 var(--font-ui);
  color: var(--text);
  flex: 1;
}

.name-item-edit {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 8px;
  color: var(--text);
  font: 400 14px/1 var(--font-ui);
  flex: 1;
}

.name-item-actions {
  display: flex;
  gap: 6px;
  margin-left: 8px;
}

.name-item-actions button {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
}

.name-item-actions button:hover {
  color: var(--text);
}

/* === Settings Tab === */
.setting-group {
  margin-bottom: 20px;
}

.setting-label {
  font: 500 13px/1 var(--font-ui);
  color: var(--text-dim);
  margin-bottom: 8px;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.duration-slider {
  flex: 1;
  accent-color: var(--accent);
}

.duration-value {
  font: 700 14px/1 var(--font-mono);
  color: var(--accent);
  min-width: 28px;
  text-align: right;
}

.grid-options {
  display: flex;
  gap: 8px;
}

.grid-option {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-dim);
  font: 500 12px/1 var(--font-ui);
  cursor: pointer;
  text-transform: capitalize;
  transition: all 0.15s;
}

.grid-option.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}

/* === Empty State === */
.empty-state {
  color: var(--text-dim);
  font: 400 14px/1.4 var(--font-ui);
  text-align: center;
  padding: 40px 20px;
}
```

- [ ] **Step 2: Verify styles load in browser**

```bash
npx vite --host 2>&1 | head -5
```

Open the URL. Page should show black background (dark theme default). Inspect `<html data-theme="dark">` to confirm CSS variable switching works.

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: complete CSS with theme variables and all component styles

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: ASCII Renderer Module

**Files:**
- Create: `src/ascii-renderer.js`

This module is canvas-dependent and uses `@chenglou/pretext` for character width measurement. It adapts the technique from the pretext variable typographic ASCII demo.

- [ ] **Step 1: Implement the ASCII renderer**

Create `src/ascii-renderer.js`:

```js
import { prepareWithSegments } from '@chenglou/pretext'

const FONT_SIZE = 13
const LINE_HEIGHT = 15
const PROP_FAMILY = 'Georgia, Palatino, "Times New Roman", serif'
const CHARSET = ' .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const WEIGHTS = [300, 500, 800]
const STYLES = ['normal', 'italic']

let palette = []
let paletteReady = false

// Small canvas for brightness estimation
const bCvs = document.createElement('canvas')
bCvs.width = bCvs.height = 28
const bCtx = bCvs.getContext('2d', { willReadFrequently: true })

function estimateBrightness(ch, font) {
  const s = 28
  bCtx.clearRect(0, 0, s, s)
  bCtx.font = font
  bCtx.fillStyle = '#fff'
  bCtx.textBaseline = 'middle'
  bCtx.fillText(ch, 1, s / 2)
  const d = bCtx.getImageData(0, 0, s, s).data
  let sum = 0
  for (let i = 3; i < d.length; i += 4) sum += d[i]
  return sum / (255 * s * s)
}

function measureWidth(ch, font) {
  const p = prepareWithSegments(ch, font)
  return p.widths.length > 0 ? p.widths[0] : 0
}

export function buildPalette() {
  if (paletteReady) return

  palette = []
  for (const style of STYLES) {
    for (const weight of WEIGHTS) {
      const font = `${style === 'italic' ? 'italic ' : ''}${weight} ${FONT_SIZE}px ${PROP_FAMILY}`
      for (const ch of CHARSET) {
        if (ch === ' ') continue
        const width = measureWidth(ch, font)
        if (width <= 0) continue
        const brightness = estimateBrightness(ch, font)
        palette.push({ char: ch, weight, style, font, width, brightness })
      }
    }
  }

  // Normalize brightness
  const maxB = Math.max(...palette.map(p => p.brightness))
  if (maxB > 0) {
    for (const p of palette) p.brightness /= maxB
  }

  palette.sort((a, b) => a.brightness - b.brightness)
  paletteReady = true
}

function findBest(targetB, targetCellW) {
  // Binary search for closest brightness
  let lo = 0, hi = palette.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (palette[mid].brightness < targetB) lo = mid + 1
    else hi = mid
  }

  // Score nearby candidates by brightness + width match
  let bestScore = Infinity, best = palette[lo]
  const s = Math.max(0, lo - 15)
  const e = Math.min(palette.length, lo + 15)
  for (let i = s; i < e; i++) {
    const p = palette[i]
    const bErr = Math.abs(p.brightness - targetB) * 2.5
    const wErr = Math.abs(p.width - targetCellW) / targetCellW
    const score = bErr + wErr
    if (score < bestScore) {
      bestScore = score
      best = p
    }
  }
  return best
}

function weightClass(w, s) {
  const wc = w === 300 ? 'w3' : w === 500 ? 'w5' : 'w8'
  return s === 'italic' ? wc + ' it' : wc
}

function escapeHtml(c) {
  if (c === '<') return '&lt;'
  if (c === '>') return '&gt;'
  if (c === '&') return '&amp;'
  if (c === '"') return '&quot;'
  return c
}

// Large canvas for name rendering
const nameCvs = document.createElement('canvas')
const nameCtx = nameCvs.getContext('2d', { willReadFrequently: true })

export function renderNameToAscii(name, cols, rows) {
  if (!paletteReady || palette.length === 0) return []

  const targetRowW = cols * (FONT_SIZE * 0.55)
  const targetCellW = targetRowW / cols
  const spaceW = FONT_SIZE * 0.27

  // Size the name canvas to match grid sampling resolution
  const cvsW = cols * 4
  const cvsH = rows * 4
  nameCvs.width = cvsW
  nameCvs.height = cvsH

  // Render name as large text centered on canvas
  nameCtx.clearRect(0, 0, cvsW, cvsH)
  nameCtx.fillStyle = '#000'
  nameCtx.fillRect(0, 0, cvsW, cvsH)

  // Auto-scale font size to fit name within canvas
  let fontSize = Math.floor(cvsH * 0.7)
  nameCtx.font = `800 ${fontSize}px ${PROP_FAMILY}`
  let textW = nameCtx.measureText(name).width
  while (textW > cvsW * 0.9 && fontSize > 10) {
    fontSize -= 2
    nameCtx.font = `800 ${fontSize}px ${PROP_FAMILY}`
    textW = nameCtx.measureText(name).width
  }

  nameCtx.fillStyle = '#fff'
  nameCtx.textBaseline = 'middle'
  nameCtx.textAlign = 'center'
  nameCtx.fillText(name, cvsW / 2, cvsH / 2)

  const imgData = nameCtx.getImageData(0, 0, cvsW, cvsH).data

  function sample(c, r) {
    const cx = Math.min(cvsW - 1, (c / cols * cvsW) | 0)
    const cy = Math.min(cvsH - 1, (r / rows * cvsH) | 0)
    const i = (cy * cvsW + cx) * 4
    return Math.min(1, (imgData[i] + imgData[i + 1] + imgData[i + 2]) / (3 * 255))
  }

  const rowsHtml = []
  const rowWidths = []

  for (let r = 0; r < rows; r++) {
    let html = ''
    let tw = 0
    for (let c = 0; c < cols; c++) {
      const b = sample(c, r)
      if (b < 0.03) {
        html += ' '
        tw += spaceW
      } else {
        const m = findBest(b, targetCellW)
        const ai = Math.max(1, Math.min(10, Math.round(b * 10)))
        html += `<span class="${weightClass(m.weight, m.style)} a${ai}">${escapeHtml(m.char)}</span>`
        tw += m.width
      }
    }
    rowsHtml.push(html)
    rowWidths.push(tw)
  }

  // Center-align rows
  const maxW = Math.max(...rowWidths)
  const paddings = rowWidths.map(w => (maxW - w) / 2)

  return { rowsHtml, paddings }
}
```

- [ ] **Step 2: Verify module imports correctly**

Open the browser devtools console on the Vite dev server. In `main.js`, temporarily add:

```js
import { buildPalette } from './ascii-renderer.js'
buildPalette()
console.log('Palette built successfully')
```

Expected: Console shows `"Palette built successfully"` without errors.

- [ ] **Step 3: Remove the temp import and commit**

Revert `main.js` back to:

```js
import './style.css'

document.getElementById('app').textContent = 'ASCII Picker loading...'
```

```bash
git add src/ascii-renderer.js src/main.js
git commit -m "feat: ASCII renderer with canvas-to-character pipeline

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Animation Engine Module

**Files:**
- Create: `src/animation.js`
- Create: `src/animation.test.js`

- [ ] **Step 1: Write failing tests for animation logic**

Create `src/animation.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { computeEasing, buildNameSequence } from './animation.js'

describe('computeEasing', () => {
  it('returns 0 at the start', () => {
    expect(computeEasing(0)).toBeCloseTo(0, 2)
  })

  it('returns 1 at the end', () => {
    expect(computeEasing(1)).toBeCloseTo(1, 2)
  })

  it('is monotonically increasing', () => {
    let prev = 0
    for (let t = 0.1; t <= 1; t += 0.1) {
      const val = computeEasing(t)
      expect(val).toBeGreaterThan(prev)
      prev = val
    }
  })

  it('starts fast (steep slope at start)', () => {
    // First 20% of time should cover more than 20% of progress
    expect(computeEasing(0.2)).toBeGreaterThan(0.3)
  })
})

describe('buildNameSequence', () => {
  it('returns array ending with the winner', () => {
    const names = ['Alice', 'Bob', 'Carol']
    const seq = buildNameSequence(names, 'Bob', 30)
    expect(seq[seq.length - 1]).toBe('Bob')
    expect(seq.length).toBe(30)
  })

  it('contains only names from the input list', () => {
    const names = ['Alice', 'Bob', 'Carol']
    const seq = buildNameSequence(names, 'Alice', 20)
    for (const name of seq) {
      expect(names).toContain(name)
    }
  })

  it('works with single name', () => {
    const seq = buildNameSequence(['Alice'], 'Alice', 10)
    expect(seq.every(n => n === 'Alice')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/animation.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement animation module**

Create `src/animation.js`:

```js
// Cubic ease-out: fast start, slow finish (like a decelerating wheel)
export function computeEasing(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function buildNameSequence(names, winner, totalSteps) {
  const seq = []
  for (let i = 0; i < totalSteps - 1; i++) {
    // Pick random name, but avoid repeating the same name twice in a row
    let name
    do {
      name = names[Math.floor(Math.random() * names.length)]
    } while (names.length > 1 && seq.length > 0 && name === seq[seq.length - 1])
    seq.push(name)
  }
  seq.push(winner)
  return seq
}

export function startAnimation(names, duration, onFrame, onComplete) {
  // Pick random winner
  const winner = names[Math.floor(Math.random() * names.length)]

  // Estimate total name swaps across the duration
  // At ~50ms min interval with deceleration, roughly 40-60 swaps over 5s
  const estimatedSwaps = Math.max(10, Math.round(duration * 8))
  const sequence = buildNameSequence(names, winner, estimatedSwaps)

  const startTime = performance.now()
  const durationMs = duration * 1000
  let currentIndex = 0
  let lastSwapProgress = -1
  let animationId = null
  let stopped = false

  function tick(now) {
    if (stopped) return

    const elapsed = now - startTime
    const t = Math.min(1, elapsed / durationMs)

    // Eased progress determines which name in the sequence we show
    const eased = computeEasing(t)
    const targetIndex = Math.min(
      sequence.length - 1,
      Math.floor(eased * sequence.length)
    )

    if (targetIndex !== currentIndex) {
      currentIndex = targetIndex
      onFrame(sequence[currentIndex], currentIndex === sequence.length - 1)
    }

    if (t >= 1) {
      // Ensure we show the winner
      onFrame(winner, true)
      onComplete(winner)
      return
    }

    animationId = requestAnimationFrame(tick)
  }

  // Show first name immediately
  onFrame(sequence[0], false)
  animationId = requestAnimationFrame(tick)

  // Return stop function
  return function stop() {
    stopped = true
    if (animationId) cancelAnimationFrame(animationId)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/animation.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/animation.js src/animation.test.js
git commit -m "feat: animation engine with easing and name sequencing

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 8: Modal Module

**Files:**
- Create: `src/modal.js`

- [ ] **Step 1: Implement modal module**

Create `src/modal.js`:

```js
let overlayEl = null
let currentTab = 'names'
let onCloseCallback = null

export function createModal() {
  overlayEl = document.createElement('div')
  overlayEl.className = 'modal-overlay'
  overlayEl.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="tabs">
        <button class="tab active" data-tab="names">Names</button>
        <button class="tab" data-tab="settings">Settings</button>
      </div>
      <div class="tab-panel active" id="panel-names"></div>
      <div class="tab-panel" id="panel-settings"></div>
    </div>
  `

  // Close on overlay click (not modal body)
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeModal()
  })

  // Close button
  overlayEl.querySelector('.modal-close').addEventListener('click', closeModal)

  // Tab switching
  overlayEl.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab))
  })

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayEl.classList.contains('open')) {
      closeModal()
    }
  })

  document.body.appendChild(overlayEl)
  return overlayEl
}

export function openModal(onClose) {
  if (!overlayEl) return
  onCloseCallback = onClose || null
  overlayEl.classList.add('open')
}

export function closeModal() {
  if (!overlayEl) return
  overlayEl.classList.remove('open')
  if (onCloseCallback) {
    onCloseCallback()
    onCloseCallback = null
  }
}

export function switchTab(tabName) {
  if (!overlayEl) return
  currentTab = tabName

  overlayEl.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName)
  })

  overlayEl.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`)
  })
}

export function getNamesPanel() {
  return overlayEl?.querySelector('#panel-names') || null
}

export function getSettingsPanel() {
  return overlayEl?.querySelector('#panel-settings') || null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modal.js
git commit -m "feat: modal module with tab switching

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 9: Main Page HTML and Wiring

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`

- [ ] **Step 1: Write the complete index.html**

Replace `index.html` with:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASCII Picker</title>
  <meta name="description" content="Random standup host picker with ASCII art animation">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/src/style.css">
</head>
<body>
  <header class="header">
    <div class="header-title">ASCII PICKER</div>
    <div class="header-actions">
      <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">◑</button>
      <button class="icon-btn" id="settings-btn" aria-label="Settings" title="Settings">⚙</button>
    </div>
  </header>

  <div class="art-container">
    <div class="art-box" id="art-box">
      <div class="empty-state" id="empty-state">Add names to get started</div>
    </div>
  </div>

  <div class="controls">
    <button class="start-btn" id="start-btn" disabled>▶ START</button>
    <div class="status-text" id="status-text">No names added</div>
  </div>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write the complete main.js wiring**

Replace `src/main.js` with:

```js
import './style.css'
import { initTheme, toggleTheme, getTheme } from './theme.js'
import { getNames, addNames, editName, deleteName } from './names.js'
import { getDuration, setDuration, getGridSize, setGridSize, GRID_PRESETS } from './settings.js'
import { buildPalette, renderNameToAscii } from './ascii-renderer.js'
import { startAnimation } from './animation.js'
import { createModal, openModal, closeModal, getNamesPanel, getSettingsPanel } from './modal.js'

// DOM references
const artBox = document.getElementById('art-box')
const emptyState = document.getElementById('empty-state')
const startBtn = document.getElementById('start-btn')
const statusText = document.getElementById('status-text')
const themeToggle = document.getElementById('theme-toggle')
const settingsBtn = document.getElementById('settings-btn')

let isAnimating = false
let stopAnimation = null

// --- Theme ---
const applyTheme = initTheme()

themeToggle.addEventListener('click', () => {
  const newTheme = toggleTheme()
  applyTheme()
  themeToggle.title = `Theme: ${newTheme}`
})

// --- Build palette on load ---
buildPalette()

// --- Modal setup ---
createModal()

settingsBtn.addEventListener('click', () => {
  if (isAnimating) return
  renderNamesPanel()
  renderSettingsPanel()
  openModal(updateMainView)
})

// --- Names panel rendering ---
function renderNamesPanel() {
  const panel = getNamesPanel()
  if (!panel) return

  const names = getNames()

  panel.innerHTML = `
    <div class="name-input-row">
      <textarea class="name-textarea" id="name-input"
        placeholder="Type a name or paste multiple (tab/newline separated)..."
        rows="1"></textarea>
      <button class="add-btn" id="add-name-btn">+ Add</button>
    </div>
    <div class="name-list" id="name-list">
      ${names.map((name, i) => `
        <div class="name-item" data-index="${i}">
          <span class="name-item-text">${escapeHtml(name)}</span>
          <div class="name-item-actions">
            <button data-action="edit" data-index="${i}" title="Edit">✏️</button>
            <button data-action="delete" data-index="${i}" title="Delete">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>
  `

  // Add button
  panel.querySelector('#add-name-btn').addEventListener('click', handleAddNames)

  // Textarea: Enter to add (without shift)
  panel.querySelector('#name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNames()
    }
  })

  // Edit/Delete buttons
  panel.querySelector('#name-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button')
    if (!btn) return
    const index = parseInt(btn.dataset.index)
    const action = btn.dataset.action

    if (action === 'delete') {
      deleteName(index)
      renderNamesPanel()
    } else if (action === 'edit') {
      startInlineEdit(index)
    }
  })
}

function handleAddNames() {
  const input = document.getElementById('name-input')
  if (!input) return
  const val = input.value.trim()
  if (!val) return

  addNames(val)
  input.value = ''
  input.style.height = '28px'
  renderNamesPanel()
}

function startInlineEdit(index) {
  const names = getNames()
  const item = document.querySelector(`.name-item[data-index="${index}"]`)
  if (!item) return

  const textEl = item.querySelector('.name-item-text')
  const currentName = names[index]

  // Replace text with input
  const input = document.createElement('input')
  input.className = 'name-item-edit'
  input.value = currentName
  input.type = 'text'
  textEl.replaceWith(input)
  input.focus()
  input.select()

  // Update actions to save/cancel
  const actionsEl = item.querySelector('.name-item-actions')
  actionsEl.innerHTML = `
    <button data-action="save" title="Save">✅</button>
    <button data-action="cancel" title="Cancel">❌</button>
  `

  function save() {
    const newName = input.value.trim()
    if (newName && newName !== currentName) {
      editName(index, newName)
    }
    renderNamesPanel()
  }

  function cancel() {
    renderNamesPanel()
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  })

  input.addEventListener('blur', save)

  actionsEl.querySelector('[data-action="save"]').addEventListener('click', (e) => {
    e.stopPropagation()
    save()
  })
  actionsEl.querySelector('[data-action="cancel"]').addEventListener('click', (e) => {
    e.stopPropagation()
    cancel()
  })
}

// --- Settings panel rendering ---
function renderSettingsPanel() {
  const panel = getSettingsPanel()
  if (!panel) return

  const duration = getDuration()
  const gridSize = getGridSize()

  panel.innerHTML = `
    <div class="setting-group">
      <div class="setting-label">Animation Duration</div>
      <div class="duration-row">
        <input type="range" class="duration-slider" id="duration-slider"
          min="2" max="15" step="1" value="${duration}">
        <span class="duration-value" id="duration-value">${duration}s</span>
      </div>
    </div>
    <div class="setting-group">
      <div class="setting-label">ASCII Grid Size</div>
      <div class="grid-options" id="grid-options">
        ${Object.keys(GRID_PRESETS).map(key => `
          <button class="grid-option ${key === gridSize.label ? 'active' : ''}"
            data-preset="${key}">${key}</button>
        `).join('')}
      </div>
    </div>
  `

  // Duration slider
  panel.querySelector('#duration-slider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value)
    setDuration(val)
    panel.querySelector('#duration-value').textContent = val + 's'
  })

  // Grid size buttons
  panel.querySelector('#grid-options').addEventListener('click', (e) => {
    const btn = e.target.closest('.grid-option')
    if (!btn) return
    const preset = btn.dataset.preset
    setGridSize(preset)
    panel.querySelectorAll('.grid-option').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === preset)
    })
  })
}

// --- Main view updates ---
function updateMainView() {
  const names = getNames()
  const count = names.length

  if (count === 0) {
    startBtn.disabled = true
    statusText.textContent = 'No names added'
    emptyState.style.display = ''
    clearArtRows()
  } else {
    startBtn.disabled = isAnimating
    statusText.textContent = `${count} colleague${count === 1 ? '' : 's'} ready`
    emptyState.style.display = 'none'
  }
}

function clearArtRows() {
  const rows = artBox.querySelectorAll('.art-row')
  rows.forEach(r => r.remove())
}

function renderAsciiFrame(name) {
  const { cols, rows } = getGridSize()
  const result = renderNameToAscii(name, cols, rows)
  if (!result) return

  clearArtRows()
  emptyState.style.display = 'none'

  result.rowsHtml.forEach((html, i) => {
    const div = document.createElement('div')
    div.className = 'art-row'
    div.style.height = div.style.lineHeight = '15px'
    div.style.paddingLeft = result.paddings[i] + 'px'
    div.innerHTML = html
    artBox.appendChild(div)
  })
}

// --- Start animation ---
startBtn.addEventListener('click', () => {
  const names = getNames()
  if (names.length === 0 || isAnimating) return

  isAnimating = true
  startBtn.disabled = true
  settingsBtn.disabled = true
  artBox.classList.remove('winner')
  statusText.textContent = 'Picking...'

  const duration = getDuration()

  stopAnimation = startAnimation(
    names,
    duration,
    (currentName, isFinal) => {
      renderAsciiFrame(currentName)
    },
    (winner) => {
      isAnimating = false
      stopAnimation = null
      startBtn.disabled = false
      settingsBtn.disabled = false
      statusText.textContent = `🎉 ${winner} hosts!`
      artBox.classList.add('winner')
    }
  )
})

// --- Initial render ---
updateMainView()

// If there are names, show a preview of a random name
const initialNames = getNames()
if (initialNames.length > 0) {
  const preview = initialNames[Math.floor(Math.random() * initialNames.length)]
  renderAsciiFrame(preview)
}

// --- Helpers ---
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
```

- [ ] **Step 3: Verify the app loads and renders in the browser**

```bash
npx vite --host 2>&1 | head -5
```

Open the URL. Expected:
- Dark theme with black background and green text
- "ASCII PICKER" title in header
- Art box with "Add names to get started"
- Disabled START button
- Theme toggle and settings gear in header

- [ ] **Step 4: Test the full flow manually**

1. Click the gear icon → modal should open with Names and Settings tabs
2. In the Names tab, type "Alice" and press Enter → "Alice" appears in list
3. Paste "Bob\tCarol\nDave" into the textarea and click Add → all three appear
4. Switch to Settings tab → duration slider and grid size buttons should work
5. Close modal → status should show "4 colleagues ready", START button enabled
6. Click START → ASCII art animation should cycle through names and land on a winner
7. Click the theme toggle → should cycle through dark → light → system

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: main page with full wiring of all modules

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 10: PWA Icons and Final Polish

**Files:**
- Modify: `public/icon-192.png`
- Modify: `public/icon-512.png`
- Modify: `vite.config.js` (if needed)

- [ ] **Step 1: Generate proper PWA icons**

Create a script to generate simple but recognizable icons:

```bash
node -e "
const { createCanvas } = (() => {
  try { return require('canvas'); } catch { return { createCanvas: null }; }
})();
const fs = require('fs');

function generateIcon(size, filename) {
  if (!createCanvas) {
    console.log('canvas package not available, keeping placeholder icons');
    return;
  }
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  // Black background with rounded corners (drawn as rect for PNG)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  // Green question mark
  ctx.fillStyle = '#00ff00';
  ctx.font = 'bold ' + Math.floor(size * 0.6) + 'px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', size / 2, size / 2);

  fs.writeFileSync(filename, c.toBuffer('image/png'));
  console.log('Generated ' + filename);
}

generateIcon(192, 'public/icon-192.png');
generateIcon(512, 'public/icon-512.png');
"
```

If the `canvas` npm package is not installed, the placeholder icons from Task 1 will remain. The app still works — icons are cosmetic for PWA install prompts.

- [ ] **Step 2: Add .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
.superpowers/
*.local
```

- [ ] **Step 3: Run a production build to verify everything works**

```bash
npm run build
```

Expected: Build succeeds. Output in `dist/` folder. No errors.

- [ ] **Step 4: Preview the production build**

```bash
npx vite preview --host 2>&1 | head -5
```

Open the URL. Verify:
- App loads correctly from built assets
- All functionality works (add names, start animation, theme toggle)
- Check devtools Application tab → Service Worker should be registered
- Check devtools Application tab → Manifest should show correct metadata

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: PWA icons, gitignore, and production build verified

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 11: Edge Cases and Final Hardening

**Files:**
- Modify: `src/main.js`
- Modify: `src/ascii-renderer.js`

- [ ] **Step 1: Handle empty name list edge case**

In `src/main.js`, the `updateMainView()` function already disables the Start button when the name list is empty. Verify this works:

1. Open app with no names → START should be disabled
2. Add one name → START should be enabled
3. Delete all names → START should be disabled again

- [ ] **Step 2: Handle single name edge case**

The animation engine already handles single names (the sequence will just be that name repeated). Verify manually:

1. Add only "Alice"
2. Click START
3. Animation should cycle "Alice" repeatedly and reveal "Alice" as winner

- [ ] **Step 3: Verify animation-in-progress locking**

1. Add multiple names
2. Click START
3. During animation: START button should be disabled, settings gear should be disabled
4. After animation completes: both should be re-enabled

- [ ] **Step 4: Run all tests one final time**

```bash
npm test
```

Expected: All tests pass (names, settings, theme, animation).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify edge cases and final hardening

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
