import type { Action } from 'svelte/action'

export type LongPressOptions = {
  /** When false, the action does nothing (e.g. on desktop) */
  enabled?: boolean
  /** How long the touch must be held before firing, in ms */
  duration?: number
  /** How far the finger may move before the press is cancelled, in px */
  moveThreshold?: number
}

/**
 * Svelte action that dispatches a `longpress` CustomEvent when the user
 * touches and holds an element (mobile). It also suppresses the synthetic
 * `click` that browsers emit after the touch is released, so a long-press
 * doesn't also trigger the regular click handler.
 */
export const longpress: Action<
  HTMLElement,
  LongPressOptions | undefined,
  { 'on:longpress': (e: CustomEvent) => void }
> = (node, options = {}) => {
  let enabled = options.enabled ?? true
  let duration = options.duration ?? 500
  let moveThreshold = options.moveThreshold ?? 10

  let timer: number | undefined
  let startX = 0
  let startY = 0
  let fired = false

  function clear() {
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timer = undefined
    }
  }

  function onTouchStart(e: TouchEvent) {
    if (!enabled) return
    const touch = e.touches[0]
    if (!touch) return
    fired = false
    startX = touch.clientX
    startY = touch.clientY
    clear()
    timer = window.setTimeout(() => {
      fired = true
      node.dispatchEvent(new CustomEvent('longpress'))
    }, duration)
  }

  function onTouchMove(e: TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    if (
      Math.abs(touch.clientX - startX) > moveThreshold ||
      Math.abs(touch.clientY - startY) > moveThreshold
    ) {
      clear()
    }
  }

  function onTouchEnd() {
    clear()
  }

  function onClickCapture(e: MouseEvent) {
    if (fired) {
      e.stopPropagation()
      e.preventDefault()
      fired = false
    }
  }

  node.addEventListener('touchstart', onTouchStart, { passive: true })
  node.addEventListener('touchmove', onTouchMove, { passive: true })
  node.addEventListener('touchend', onTouchEnd)
  node.addEventListener('touchcancel', onTouchEnd)
  node.addEventListener('click', onClickCapture, true)

  return {
    update(newOptions: LongPressOptions = {}) {
      enabled = newOptions.enabled ?? true
      duration = newOptions.duration ?? 500
      moveThreshold = newOptions.moveThreshold ?? 10
    },
    destroy() {
      clear()
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('touchend', onTouchEnd)
      node.removeEventListener('touchcancel', onTouchEnd)
      node.removeEventListener('click', onClickCapture, true)
    },
  }
}
