# ASCII Picker — Design Spec

**Date:** 2026-04-05
**Status:** Approved

## Overview

A single-page webapp (PWA) that randomly selects a standup meeting host from a list of colleagues. The selection is revealed through a slot-machine style ASCII art animation powered by the `@chenglou/pretext` library for proportional text measurement. Names cycle rapidly as ASCII art renderings, decelerating over a configurable duration before landing on the winner.

## Tech Stack

- **Vanilla HTML/CSS/JS** with **Vite** as build tool
- **`@chenglou/pretext`** for proportional font text measurement (character width matching)
- **`vite-plugin-pwa`** for service worker generation and web manifest
- No framework, no UI library — minimal dependency footprint

## Architecture

### Rendering Pipeline: Canvas-to-ASCII Sampling

Adapted from the [pretext variable typographic ASCII demo](https://somnai-dreams.github.io/pretext-demos/variable-typographic-ascii.html):

1. **Character Palette (built once on load):**
   - Charset: ` .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`
   - Font: Georgia × 3 weights (300, 500, 800) × 2 styles (normal, italic) = 6 variants
   - For each character+variant: measure **width** via `prepareWithSegments()` from pretext, estimate **brightness** via a small hidden canvas
   - Sort palette by brightness for binary search during rendering
   - Palette build is a one-time ~100ms cost, cached for the session

2. **Name-to-ASCII conversion (per frame):**
   - Render the current name as large text on a hidden canvas (e.g., bold 80px Georgia)
   - Sample brightness at each position of a grid (COLS × ROWS)
   - For each cell, binary-search the palette for the best character matching target brightness AND target cell width (same scoring algorithm as the demo: `bErr * 2.5 + wErr`)
   - Output: a grid of `<span>` elements with per-character weight/style/opacity CSS classes

3. **Row alignment:**
   - Because characters have proportional widths, each row's total width varies
   - Center-align rows by computing `paddingLeft = (maxRowWidth - thisRowWidth) / 2`

### Animation Engine: Slot-Machine Cycling

1. User clicks **Start** → winner is pre-determined via `Math.random()` (Fisher-Yates or simple random index)
2. Animation cycles through random names from the list, rendering each as ASCII art
3. Cycling interval starts fast (~50ms per swap) and decelerates via a **cubic ease-out** function over the configured duration (default 5 seconds)
4. The sequence is rigged so the final name displayed is the pre-determined winner
5. On landing: a visual emphasis effect — the ASCII art brightness pulses (opacity cycles 0.6→1.0 twice over 0.5s) to signal the result
6. The Start button is disabled during animation and re-enabled after completion

### Timing Schedule (for 5s default):

| Elapsed | Interval | Feel |
|---------|----------|------|
| 0.0–1.5s | ~50ms | Rapid blur |
| 1.5–3.0s | ~200ms | Readable cycling |
| 3.0–4.0s | ~500ms | Slowing down |
| 4.0–4.8s | ~1000ms | Almost stopped |
| 5.0s | — | Winner revealed |

## UI Design

### Layout: Centered Minimal

Single-page, vertically stacked, centered layout:

```
┌──────────────────────────────────┐
│  ASCII PICKER          ◑  ⚙     │  ← Header bar: title + theme toggle + settings
│                                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │   .:;+*#@%& .,:;!+-=      │  │
│  │   .;+=*#@  .:;+-=*#       │  │  ← ASCII art animation area
│  │   .:;!+-=*#@% .,:;!       │  │
│  │   .:+*#@%&abc  ;!+-       │  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│         [ ▶ START ]              │  ← Start button
│       5 colleagues ready         │  ← Status text
│                                  │
└──────────────────────────────────┘
```

### Settings Modal (Two Tabs)

Triggered by the gear icon in the header. Contains two tabs:

**Tab 1: Names**

- Unified textarea input at top (1-line height, resizable)
  - Type one name + press Enter or click Add → single add
  - Paste multiple names → auto-split by `\t` (tab) or `\n` (newline) → batch add
  - Trim whitespace, skip empty entries and duplicates
  - Clear textarea after successful add
- Name list below with per-name edit (inline) and delete (with icon buttons)
- No confirmation needed for individual deletes (simple enough to re-add)

**Tab 2: Settings**

- **Animation Duration:** Range slider, 2–15 seconds, default 5. Displays current value. Saved to localStorage on change.
- **ASCII Grid Size:** Small (30×16) / Medium (50×28) / Large (70×40) presets controlling COLS × ROWS dimensions. Default: Medium. Affects rendering density and performance. Saved to localStorage.

### Theme System

- **Light theme:** White background (`#fff`), black text (`#000`) for ASCII characters and UI
- **Dark theme:** Black background (`#000`), green text (`#00ff00`) — Matrix style
- **Default:** Follow `prefers-color-scheme` system preference
- **Toggle:** Manual override via button in header bar, saved to localStorage
- CSS custom properties (`--bg`, `--text`, `--accent`, etc.) for clean theme switching via a `data-theme` attribute on `<html>`

## Data Persistence (localStorage)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ascii-picker-names` | `string[]` (JSON) | `[]` | List of colleague names |
| `ascii-picker-duration` | `number` | `5` | Animation duration in seconds |
| `ascii-picker-theme` | `"system" \| "light" \| "dark"` | `"system"` | Theme preference |

All reads/writes go through a thin storage helper that JSON-parses/stringifies and handles missing keys gracefully.

## PWA Configuration

- **Plugin:** `vite-plugin-pwa` with `generateSW` strategy (Workbox auto-caches all build assets)
- **Web Manifest:**
  - `name`: "ASCII Picker"
  - `short_name`: "Picker"
  - `display`: "standalone"
  - `theme_color`: "#000000"
  - `background_color`: "#000000"
  - Icons: 192×192 and 512×512 PNG
- **Offline:** Full offline support — all assets cached on first visit
- **Install:** Standard "Add to Home Screen" prompt on mobile and desktop

## Project Structure

```
ascii-picker/
├── index.html              # Main page, single entry point
├── vite.config.js          # Vite config + PWA plugin setup
├── package.json
├── public/
│   ├── favicon.svg         # App icon (SVG for crisp rendering)
│   ├── icon-192.png        # PWA icon 192×192
│   └── icon-512.png        # PWA icon 512×512
└── src/
    ├── main.js             # Entry: init theme, render page, attach events
    ├── style.css           # All styles + CSS custom properties for themes
    ├── ascii-renderer.js   # Canvas→ASCII pipeline + pretext character palette
    ├── animation.js        # Slot-machine cycling engine + easing logic
    ├── names.js            # Name CRUD operations + localStorage persistence
    ├── settings.js         # Duration/grid prefs + localStorage persistence
    ├── modal.js            # Modal open/close/tab switching logic
    └── theme.js            # System preference detection + manual toggle
```

### Module Responsibilities

- **`ascii-renderer.js`** — Exports `buildPalette()` (one-time) and `renderNameToAscii(name, cols, rows)` (per frame). Owns the hidden canvas, brightness sampling, and pretext-based character selection. Returns an array of row HTML strings.
- **`animation.js`** — Exports `startAnimation(names, winner, duration, onFrame, onComplete)`. Manages the timing loop, easing curve, and name sequence. Calls `onFrame(currentName)` for each swap and `onComplete(winner)` when done.
- **`names.js`** — Exports `getNames()`, `addNames(input)`, `editName(index, newName)`, `deleteName(index)`. Handles parsing (tab/newline split), deduplication, and localStorage sync.
- **`settings.js`** — Exports `getDuration()`, `setDuration(s)`, `getGridSize()`, `setGridSize(preset)`. Reads/writes localStorage.
- **`modal.js`** — Exports `openModal()`, `closeModal()`, `switchTab(tabName)`. Manages DOM visibility and tab state.
- **`theme.js`** — Exports `initTheme()`, `toggleTheme()`, `getTheme()`. Listens to `matchMedia('prefers-color-scheme: dark')` changes, applies `data-theme` attribute.
- **`main.js`** — Wires everything together: initializes theme, builds palette, renders initial UI, attaches click handlers for Start/Settings/Theme.

## Edge Cases

- **Empty name list:** Start button disabled with tooltip "Add names first"
- **Single name:** Still runs animation (brief cycle of the one name) for fun, then reveals it
- **Very long names:** ASCII renderer scales font size down on the hidden canvas to fit within the grid
- **Duplicate names in input:** Silently skipped during add
- **Animation in progress:** Start button disabled, settings gear disabled to prevent mid-animation changes
- **localStorage unavailable:** Graceful fallback — app works with in-memory state, warns user that settings won't persist

## Non-Goals

- No backend/database — purely client-side
- No history of past picks
- No user authentication
- No real-time collaboration
- No sound effects
