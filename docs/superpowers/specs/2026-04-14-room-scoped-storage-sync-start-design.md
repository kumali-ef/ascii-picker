# Room-Scoped Storage & Sync-and-Start

## Problem

Two issues with shared room support:

1. **localStorage keys are global.** All rooms (and the root path) share the same keys (`ascii-picker-names`, `ascii-picker-picked`, etc.). Visiting `/dailypicker` then `/retro` overwrites the same local data, causing cross-room pollution.

2. **No pre-pick sync.** The "Start" button picks a name using stale local data. If another user added or picked names via a different browser, the local user won't see those changes until after a page reload. This can cause duplicate picks.

## Approach

Two changes, both scoped to existing modules with minimal refactoring:

- **Module-level key prefix** — each storage module gets a `setKeyPrefix(slug)` function. Room mode prefixes all localStorage keys with the slug. Root path keeps un-prefixed keys for backward compatibility.
- **Sync-before-start** — in room mode, the "Start" button becomes "Sync & Start". Clicking it fetches the latest KV data, hydrates local state, shows a brief toast, then proceeds with the pick animation.

---

## Design

### 1. Room-Scoped localStorage Keys

#### Key format

| Context | Example key |
|---------|-------------|
| Root path (`/`) | `ascii-picker-names` |
| Room `/dailypicker` | `dailypicker-ascii-picker-names` |
| Room `/retro` | `retro-ascii-picker-names` |

All modules follow the same pattern: `{slug}-{original-key}`.

#### Module changes

**`names.js`:**
- Add `let keyPrefix = ''`
- Add `export function setKeyPrefix(prefix)` that sets `keyPrefix` and re-runs `loadFromStorage()`
- `loadFromStorage()` and `saveToStorage()` use `keyPrefix + STORAGE_KEY`

**`cycle.js`:**
- Same pattern as `names.js` — prefix `ascii-picker-picked` key

**`settings.js`:**
- Same pattern — prefix all four keys (`ascii-picker-duration`, `ascii-picker-grid`, `ascii-picker-title`, `ascii-picker-preferred-chars`)

**`room.js`:**
- In `initRoom()`, after parsing the slug, call `setKeyPrefix(slug + '-')` on all three modules **before** fetching from KV
- This ensures localStorage reads/writes are already scoped before any hydration happens

#### Backward compatibility

- Root path (`/`) never calls `setKeyPrefix`, so keys remain un-prefixed
- Existing users' local data for the root path is preserved

### 2. "Sync and Start" Button

#### Button label and states

| State | Label | Disabled |
|-------|-------|----------|
| Non-room, idle | `▶ START` | No |
| Room, idle | `▶ SYNC & START` | No |
| Room, syncing | `⟳ SYNCING...` | Yes |
| Animating | (current label) | Yes |

The `⟳` character gets a CSS `spin` animation while syncing.

#### Click flow (room mode)

1. Disable button, set label to `⟳ SYNCING...`
2. Call `fetchRoom(slug)` to get latest KV data
3. **Success:** hydrate all modules (`names`, `cycle`, `settings`), show toast "Synced!", wait 1 second
4. **Failure:** show toast "Offline — using local data", continue immediately
5. Update main view (re-count available names, etc.)
6. Run the normal pick animation (same as today)
7. After pick completes, debounced save fires (existing behavior syncs result back to KV)

#### New export from `room.js`

```js
export async function syncBeforeStart()
```

Returns `true` on success, `false` on failure. Handles fetch + hydrate internally. `main.js` calls this, then handles the toast and delay.

#### Click flow (non-room mode)

Unchanged — button says `▶ START` and picks immediately.

### 3. `main.js` Integration

The `startBtn` click handler is refactored:

```
if room mode:
  disable button → show "⟳ SYNCING..."
  success = await syncBeforeStart()
  if success: toast "Synced!" + 1s delay
  else: toast "Offline — using local data"
  updateMainView()
  // fall through to pick logic

pick logic (unchanged):
  check cycle reset
  get available names
  start animation
  mark picked on finish
```

### 4. CSS Addition

```css
@keyframes spin {
  from { display: inline-block; transform: rotate(0deg); }
  to { display: inline-block; transform: rotate(360deg); }
}

.start-btn .sync-icon {
  display: inline-block;
  animation: spin 1s linear infinite;
}
```

### 5. Server-Side (`functions/api/rooms/[slug].js`)

No changes needed. The existing `updatedAt` field (set server-side on every PUT) already serves as the timestamp. The `updateTime` field discussed earlier is unnecessary.

---

## Files Changed

| File | Change |
|------|--------|
| `src/names.js` | Add `setKeyPrefix()`, use prefix in storage key |
| `src/cycle.js` | Add `setKeyPrefix()`, use prefix in storage key |
| `src/settings.js` | Add `setKeyPrefix()`, use prefix in all storage keys |
| `src/room.js` | Call `setKeyPrefix()` on all modules in `initRoom()`, add `syncBeforeStart()` |
| `src/main.js` | Change button label in room mode, add sync-before-start flow |
| `src/style.css` | Add spin animation for sync icon |
| `index.html` | No changes |
| `functions/api/rooms/[slug].js` | No changes |

## Testing

- Existing unit tests for `names`, `cycle`, `settings` should still pass (they don't use rooms)
- Manual testing: open two browser tabs on the same room, pick in one, "Sync & Start" in the other — the second tab should see the updated picked list before picking
