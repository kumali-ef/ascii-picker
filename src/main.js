import './style.css'
import { initTheme, toggleTheme } from './theme.js'
import { getNames, addNames, editName, deleteName } from './names.js'
import { getDuration, setDuration, getGridSize, getTitle, setTitle, getPreferredChars, setPreferredChars } from './settings.js'
import { buildPalette, renderNameToAscii, CELL_W } from './ascii-renderer.js'
import { startAnimation } from './animation.js'
import { createModal, openModal, closeModal, getNamesPanel, getSettingsPanel } from './modal.js'
import { getAvailableNames, markPicked, shouldResetCycle, resetCycle, syncWithRoster } from './cycle.js'
import { startConfetti } from './confetti.js'
import { initRoom, isRoomMode, getRoomSlug, generateSlug, createRoom } from './room.js'
import { showToast } from './toast.js'

const artBox = document.getElementById('art-box')
const emptyState = document.getElementById('empty-state')
const startBtn = document.getElementById('start-btn')
const statusText = document.getElementById('status-text')
const themeToggle = document.getElementById('theme-toggle')
const settingsBtn = document.getElementById('settings-btn')
const headerTitle = document.querySelector('.header-title')
const shareBtn = document.getElementById('share-btn')
const roomIndicator = document.getElementById('room-indicator')

let isAnimating = false

// --- Theme ---
const applyTheme = initTheme()

themeToggle.addEventListener('click', () => {
  const newTheme = toggleTheme()
  applyTheme()
  themeToggle.title = `Theme: ${newTheme}`
})

// --- Title ---
function applyTitle() {
  const t = getTitle()
  headerTitle.textContent = t
  document.title = t
}

// --- Build palette on load ---
buildPalette(getPreferredChars())

// --- Modal setup ---
createModal()

settingsBtn.addEventListener('click', () => {
  if (isAnimating) return
  renderNamesPanel()
  renderSettingsPanel()
  openModal(updateMainView)
})

// --- Share button ---
shareBtn.addEventListener('click', () => {
  if (isRoomMode()) {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('URL copied to clipboard!')
    }).catch(() => {
      showToast('Could not copy URL')
    })
  } else {
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
        placeholder="room-slug" maxlength="64">
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

  const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/

  btn.addEventListener('click', async () => {
    const finalSlug = input.value.trim().toLowerCase()
    if (finalSlug.length < 2) {
      showToast('Slug must be at least 2 characters')
      return
    }
    if (!SLUG_RE.test(finalSlug)) {
      showToast('Invalid slug format')
      return
    }

    btn.disabled = true
    btn.textContent = 'Creating...'

    try {
      await createRoom(finalSlug)
      const url = `${window.location.origin}/${finalSlug}`
      await navigator.clipboard.writeText(url).catch(() => {})
      showToast('Room created! URL copied.')
      close()
      window.location.href = url
    } catch (err) {
      btn.disabled = false
      btn.textContent = 'Create & Copy URL'
      showToast('Failed to create room')
    }
  })
}

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

  panel.querySelector('#add-name-btn').addEventListener('click', handleAddNames)

  panel.querySelector('#name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNames()
    }
  })

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

  const input = document.createElement('input')
  input.className = 'name-item-edit'
  input.value = currentName
  input.type = 'text'
  textEl.replaceWith(input)
  input.focus()
  input.select()

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
  const currentTitle = getTitle()
  const currentChars = getPreferredChars()

  panel.innerHTML = `
    <div class="setting-group">
      <div class="setting-label">Title</div>
      <input type="text" class="title-input" id="title-input"
        value="${currentTitle.replace(/"/g, '&quot;')}" placeholder="ASCII PICKER">
    </div>
    <div class="setting-group">
      <div class="setting-label">ASCII Characters</div>
      <input type="text" class="title-input" id="preferred-chars-input"
        value="${currentChars.replace(/"/g, '&quot;')}" placeholder="Leave empty for full charset">
      <div class="setting-hint">Characters used to compose the ASCII art. Clear to use all characters.</div>
    </div>
    <div class="setting-group">
      <div class="setting-label">Animation Duration</div>
      <div class="duration-row">
        <input type="range" class="duration-slider" id="duration-slider"
          min="2" max="15" step="1" value="${duration}">
        <span class="duration-value" id="duration-value">${duration}s</span>
      </div>
    </div>
  `

  panel.querySelector('#title-input').addEventListener('input', (e) => {
    setTitle(e.target.value)
    applyTitle()
  })

  panel.querySelector('#preferred-chars-input').addEventListener('input', (e) => {
    setPreferredChars(e.target.value)
    buildPalette(getPreferredChars())
  })

  panel.querySelector('#duration-slider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value)
    setDuration(val)
    panel.querySelector('#duration-value').textContent = val + 's'
  })
}

// --- Main view updates ---
function updateMainView() {
  const names = getNames()
  const count = names.length

  // Sync cycle with current roster (handles deleted names)
  syncWithRoster(names)

  if (count === 0) {
    startBtn.disabled = true
    statusText.textContent = 'No names added'
    emptyState.style.display = ''
    clearArtRows()
  } else {
    const available = getAvailableNames(names)
    startBtn.disabled = isAnimating
    if (available.length === count) {
      statusText.textContent = `${count} colleague${count === 1 ? '' : 's'} ready`
    } else {
      statusText.textContent = `${available.length} of ${count} remaining this round`
    }
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

  result.rowsHtml.forEach((html) => {
    const div = document.createElement('div')
    div.className = 'art-row'
    div.innerHTML = html
    artBox.appendChild(div)
  })
}

// --- Start animation ---
startBtn.addEventListener('click', () => {
  const names = getNames()
  if (names.length === 0 || isAnimating) return

  // Check if cycle needs reset
  if (shouldResetCycle(names)) {
    resetCycle()
  }

  // Pick winner from available names only
  const available = getAvailableNames(names)
  const winner = available[Math.floor(Math.random() * available.length)]

  isAnimating = true
  startBtn.disabled = true
  settingsBtn.disabled = true
  artBox.classList.remove('winner')
  statusText.textContent = 'Picking...'

  const duration = getDuration()

  startAnimation(
    names,
    duration,
    (currentName, isFinal) => {
      renderAsciiFrame(currentName)
    },
    (pickedWinner) => {
      markPicked(pickedWinner)
      isAnimating = false
      startBtn.disabled = false
      settingsBtn.disabled = false

      startConfetti(duration)

      const remaining = getAvailableNames(names)
      if (remaining.length === 0) {
        statusText.textContent = `🎉 ${pickedWinner} hosts! — Round complete!`
      } else {
        statusText.textContent = `🎉 ${pickedWinner} hosts! — ${remaining.length} of ${names.length} remaining`
      }
      artBox.classList.add('winner')
    },
    winner
  )
})

// --- Initial render ---
async function init() {
  await initRoom()

  applyTitle()
  buildPalette(getPreferredChars())
  updateMainView()

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

// --- Helpers ---
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
