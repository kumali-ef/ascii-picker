// Cubic ease-out: fast start, slow finish (like a decelerating wheel)
export function computeEasing(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function buildNameSequence(names, winner, totalSteps) {
  const seq = []
  for (let i = 0; i < totalSteps - 1; i++) {
    let name
    do {
      name = names[Math.floor(Math.random() * names.length)]
    } while (names.length > 1 && seq.length > 0 && name === seq[seq.length - 1])
    seq.push(name)
  }
  seq.push(winner)
  return seq
}

export function startAnimation(names, duration, onFrame, onComplete, winner) {
  if (!winner) {
    winner = names[Math.floor(Math.random() * names.length)]
  }
  const estimatedSwaps = Math.max(10, Math.round(duration * 8))
  const sequence = buildNameSequence(names, winner, estimatedSwaps)

  const startTime = performance.now()
  const durationMs = duration * 1000
  let currentIndex = -1
  let animationId = null
  let stopped = false

  function tick(now) {
    if (stopped) return

    const elapsed = now - startTime
    const t = Math.min(1, elapsed / durationMs)
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
      onFrame(winner, true)
      onComplete(winner)
      return
    }

    animationId = requestAnimationFrame(tick)
  }

  onFrame(sequence[0], false)
  currentIndex = 0
  animationId = requestAnimationFrame(tick)

  return function stop() {
    stopped = true
    if (animationId) cancelAnimationFrame(animationId)
  }
}
