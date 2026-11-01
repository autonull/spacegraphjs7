/**
 * Animation utilities for SpaceGraphJS components.
 * Provides spring and transition configurations.
 */

import { createSignal, onCleanup } from "solid-js"

/** Spring configuration. */
export interface SpringConfig {
  stiffness: number
  damping: number
  mass: number
  velocity?: number
}

/** Default spring configurations. */
export const springPresets = {
  gentle: { stiffness: 120, damping: 14, mass: 1 },
  smooth: { stiffness: 180, damping: 17, mass: 1 },
  snappy: { stiffness: 280, damping: 22, mass: 1 },
  bouncy: { stiffness: 400, damping: 20, mass: 1 },
} as const satisfies Record<string, SpringConfig>

/** Transition configuration. */
export interface TransitionConfig {
  duration: number
  easing: (t: number) => number
}

/** Default transition configurations. */
export const transitionPresets = {
  fast: { duration: 100, easing: (t) => t * (2 - t) },
  normal: { duration: 200, easing: (t) => t * (2 - t) },
  slow: { duration: 300, easing: (t) => t * (2 - t) },
} as const satisfies Record<string, TransitionConfig>

/**
 * Hook for spring animations.
 * Returns current value and a setter that animates to the target.
 */
export function useSpring(
  initialValue: number,
  config: SpringConfig = springPresets.smooth,
): [() => number, (target: number) => void] {
  const [value, setValue] = createSignal(initialValue)
  let animationId: number | null = null
  let currentValue = initialValue
  let targetValue = initialValue
  let currentVelocity = config.velocity ?? 0

  const step = () => {
    const dt = 1 / 60
    const { stiffness, damping, mass } = config

    const displacement = currentValue - targetValue
    const springForce = -stiffness * displacement
    const dampingForce = -damping * currentVelocity
    const acceleration = (springForce + dampingForce) / mass

    currentVelocity += acceleration * dt
    currentValue += currentVelocity * dt

    setValue(currentValue)

    // Stop when close enough to target
    if (Math.abs(currentValue - targetValue) < 0.01 && Math.abs(currentVelocity) < 0.01) {
      currentValue = targetValue
      currentVelocity = 0
      setValue(targetValue)
      animationId = null
      return
    }

    animationId = requestAnimationFrame(step)
  }

  const setTarget = (target: number) => {
    targetValue = target
    if (animationId === null) {
      animationId = requestAnimationFrame(step)
    }
  }

  onCleanup(() => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
    }
  })

  return [value, setTarget]
}

/**
 * Hook for simple transitions.
 * Returns current value and a setter that transitions to the target.
 */
export function useTransition(
  initialValue: number,
  config: TransitionConfig = transitionPresets.normal,
): [() => number, (target: number) => void] {
  const [value, setValue] = createSignal(initialValue)
  let animationId: number | null = null
  let startValue = initialValue
  let targetValue = initialValue
  let startTime = 0

  const step = (timestamp: number) => {
    if (startTime === 0) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / config.duration, 1)
    const eased = config.easing(progress)
    const current = startValue + (targetValue - startValue) * eased

    setValue(current)

    if (progress < 1) {
      animationId = requestAnimationFrame(step)
    } else {
      animationId = null
      startTime = 0
    }
  }

  const setTarget = (target: number) => {
    startValue = value()
    targetValue = target
    startTime = 0
    if (animationId === null) {
      animationId = requestAnimationFrame(step)
    }
  }

  onCleanup(() => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
    }
  })

  return [value, setTarget]
}