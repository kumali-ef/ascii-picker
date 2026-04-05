let overlayEl = null
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

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeModal()
  })

  overlayEl.querySelector('.modal-close').addEventListener('click', closeModal)

  overlayEl.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab))
  })

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
