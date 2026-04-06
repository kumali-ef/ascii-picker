# Shared Rooms — Design Spec

## Problem

ASCII Picker stores all state in localStorage, which is per-browser. When a team uses the picker, each person has their own name list, cycle state, and settings. There's no way to share a configured picker across the team.

## Solution

Add "rooms" — shared configurations identified by a URL slug. Visiting `xxx.com/my-team` loads shared data from Cloudflare Workers KV. Anyone with the URL can view and edit. The root path (`/`) continues to work in local-only mode with no backend dependency.

## Architecture

### Storage: Cloudflare Workers KV

One KV namespace (`ASCII_PICKER_ROOMS`). Each room is a single KV entry:

- **Key:** slug string (e.g. `swxfop`, `team-alpha-standup`)
- **Value:** JSON blob

```json
{
  "names": ["Alice", "Bob", "Carol"],
  "picked": ["Alice"],
  "title": "Daily Standup",
  "duration": 5,
  "preferredChars": "EFEKTA",
  "updatedAt": "2026-04-06T11:00:00.000Z"
}
```

Slug validation: 2-64 characters, lowercase alphanumeric + hyphens, no leading/trailing hyphens.

Reserved slugs that must not be treated as room slugs: `sample`, `api`, `assets`.

### API: Cloudflare Pages Functions

Two endpoints implemented as Pages Functions in `functions/api/rooms/[slug].js`:

**`GET /api/rooms/:slug`**
- Returns room JSON with 200, or 404 if not found.
- Response includes `Content-Type: application/json`.

**`PUT /api/rooms/:slug`**
- Request body: room JSON (same shape as above).
- Validates slug format and JSON shape.
- Sets `updatedAt` server-side.
- Returns 200 with saved room JSON.
- Creates the room if it doesn't exist.

No authentication — anyone with the slug can read/write. No DELETE endpoint (rooms persist indefinitely, KV has no storage cost concern at this scale).

### Frontend Changes

#### Routing

Add `public/_redirects` for Cloudflare Pages SPA fallback:

```
/api/*  /api/:splat  200
/sample  /sample.html  200
/*  /index.html  200
```

This ensures `/:slug` paths serve `index.html` while API calls and `/sample` still work.

#### Room Detection (new module: `src/room.js`)

On page load:
1. Parse `window.location.pathname`
2. If `/` → local-only mode (no changes to current behavior)
3. If `/:slug` (valid slug format, not reserved) → room mode

In room mode:
- Fetch `GET /api/rooms/:slug`
- If 200: load response data into names, cycle, settings modules (override localStorage)
- If 404: create room from current localStorage state via `PUT`
- On every mutation (add/edit/delete name, pick winner, change title/duration/chars): debounced `PUT` to save back to KV (300ms debounce to batch rapid edits)
- localStorage still updated as local cache

#### Sync Module (`src/sync.js`)

Thin API client:
- `fetchRoom(slug)` → GET, returns room data or null
- `saveRoom(slug, data)` → PUT, returns saved data
- `debouncedSave(slug, data)` → debounced version of saveRoom

Handles errors gracefully — if API is unreachable, app continues working from localStorage. Shows a brief toast/status indicator on sync failure.

#### Share Button (UI)

New button in the header (between theme toggle and settings gear), icon: 🔗

On click:
- If already in a room: copies the current room URL to clipboard, shows "URL copied!" toast
- If in local-only mode: opens a small dialog:
  - Auto-generated 6-char slug (random lowercase alphanumeric)
  - Text input to optionally customize the slug
  - "Create & Copy URL" button
  - Creates room via PUT, navigates to the room URL

#### Status Indicator

In room mode, show a subtle indicator near the title:
- Small dot or text showing "Shared" or the slug
- Brief sync status on save ("Saving..." → "Saved" → fades out)

### Data Flow

```
User action (add name, pick winner, etc.)
  → Module setter (names.js, cycle.js, settings.js)
    → localStorage.setItem() [local cache]
    → sync.js debouncedSave() [if in room mode]
      → PUT /api/rooms/:slug
        → Cloudflare KV.put()
```

On page load in room mode:
```
Parse URL slug
  → GET /api/rooms/:slug
    → Cloudflare KV.get()
  → Hydrate modules (names, cycle, settings) with server data
  → Render page
```

### What Stays Local-Only

- **Theme preference** (`ascii-picker-theme`) — personal visual preference
- **Grid size** (`ascii-picker-grid`) — fixed to large, not configurable

### Module Changes Summary

| Module | Change |
|---|---|
| `src/room.js` | **New.** Room detection, initialization, coordinates sync |
| `src/sync.js` | **New.** API client (fetchRoom, saveRoom, debouncedSave) |
| `src/names.js` | Add `setNames(arr)` for bulk hydration from server; add onChange callback |
| `src/cycle.js` | Add `setPicked(arr)` for bulk hydration; add onChange callback |
| `src/settings.js` | Add `hydrateFromRoom(data)` for bulk load; add onChange callback |
| `src/main.js` | Initialize room module, add Share button, show room status |
| `src/modal.js` | Add share dialog support |
| `index.html` | Add share button in header |
| `public/_redirects` | **New.** SPA fallback routing |
| `functions/api/rooms/[slug].js` | **New.** Pages Function for GET/PUT |

### Wrangler / KV Setup

The user must create a KV namespace and bind it in Cloudflare Pages dashboard:
- KV namespace name: `ASCII_PICKER_ROOMS`
- Binding name in Pages Functions: `ROOMS` (accessed as `context.env.ROOMS` in functions)

No `wrangler.toml` needed — Cloudflare Pages Functions use dashboard bindings.

### Error Handling

- API unreachable: app works from localStorage, shows "Offline — changes saved locally" toast
- Invalid slug format: redirect to `/` (local-only mode)
- PUT fails: retry once after 2 seconds, then show error toast

### Edge Cases

- Two people edit simultaneously: last-write-wins (acceptable for this use case, no conflict resolution needed)
- Room visited after long period: KV has no TTL set, data persists
- User visits `/:slug` with no internet: falls back to localStorage if any cached data exists from a previous visit
