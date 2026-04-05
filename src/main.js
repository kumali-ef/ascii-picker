import './style.css'
import { initTheme, toggleTheme } from './theme.js'
import { getNames, addNames, editName, deleteName } from './names.js'
import { getDuration, setDuration, getGridSize, setGridSize, GRID_PRESETS } from './settings.js'
import { buildPalette, renderNameToAscii } from './ascii-renderer.js'
import { startAnimation } from './animation.js'
import { createModal, openModal, closeModal, getNamesPanel, getSettingsPanel } from './modal.js'

const artBox = document.getElementById('art-box')
const emptyState = document.getElementById('empty-state')
const startBtn = document.getElementById('start-btn')
const statusText = document.getElementById('status-text')
const themeToggle = document.getElementById('theme-toggle')
const settingsBtn = document.getElementById('settings-btn')

let isAnimating = false

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

  panel.querySelector('#duration-slider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value)
    setDuration(val)
    panel.querySelector('#duration-value').textContent = val + 's'
  })

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

  startAnimation(
    names,
    duration,
    (currentName, isFinal) => {
      renderAsciiFrame(currentName)
    },
    (winner) => {
      isAnimating = false
      startBtn.disabled = false
      settingsBtn.disabled = false
      statusText.textContent = `🎉 ${winner} hosts!`
      artBox.classList.add('winner')
    }
  )
})

// --- Initial render ---
updateMainView()

const initialNames = getNames()
if (initialNames.length > 0) {
  const preview = initialNames[Math.floor(Math.random() * initialNames.length)]
  renderAsciiFrame(preview)
}

// --- Helpers ---
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
