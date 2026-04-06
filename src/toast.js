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

  requestAnimationFrame(() => el.classList.add('show'))

  setTimeout(() => {
    el.classList.remove('show')
    el.addEventListener('transitionend', () => el.remove(), { once: true })
    setTimeout(() => el.remove(), 500)
  }, durationMs)
}
