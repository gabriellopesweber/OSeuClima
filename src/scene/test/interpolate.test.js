import { approach, dampFactor, isSettled } from '@/scene/interpolate'

import { describe, expect, it } from 'vitest'

describe('dampFactor', () => {
  it('does not move when no time passed', () => {
    expect(dampFactor(3, 0)).toBe(0)
  })

  it('approaches but never reaches 1', () => {
    expect(dampFactor(3, 1)).toBeGreaterThan(0)
    expect(dampFactor(3, 1)).toBeLessThan(1)
    expect(dampFactor(3, 1000)).toBeCloseTo(1, 10)
  })

  it('moves further with a bigger lambda', () => {
    expect(dampFactor(10, 0.016)).toBeGreaterThan(dampFactor(3, 0.016))
  })

  it('treats negative dt as no time, so a clock glitch cannot rewind a value', () => {
    expect(dampFactor(3, -0.5)).toBe(0)
  })
})

describe('approach', () => {
  it('moves toward the target without overshooting', () => {
    const next = approach(0, 10, 3, 0.016)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(10)
  })

  it('works the same going down', () => {
    const next = approach(10, 0, 3, 0.016)
    expect(next).toBeLessThan(10)
    expect(next).toBeGreaterThan(0)
  })

  it('stays put when already at the target', () => {
    expect(approach(5, 5, 3, 0.016)).toBe(5)
  })

  // A propriedade que justifica a escolha do damping exponencial: o resultado
  // não depende de como o tempo foi fatiado, então 30fps e 144fps convergem
  // igual — um lerp ingênuo (current + (target-current)*k) não tem isso.
  it('is frame-rate independent: two half steps equal one full step', () => {
    const oneStep = approach(0, 100, 4, 0.1)
    const halfStep = approach(approach(0, 100, 4, 0.05), 100, 4, 0.05)
    expect(halfStep).toBeCloseTo(oneStep, 10)
  })

  it('converges to the target over many frames', () => {
    let value = 0
    for (let i = 0; i < 300; i++) value = approach(value, 1, 4, 1 / 60)
    expect(value).toBeCloseTo(1, 4)
  })
})

describe('isSettled', () => {
  it('is true only once the gap is under the epsilon', () => {
    expect(isSettled(1, 1)).toBe(true)
    expect(isSettled(1, 1.001)).toBe(true)
    expect(isSettled(1, 1.5)).toBe(false)
  })

  it('ignores the direction of the gap', () => {
    expect(isSettled(1.5, 1)).toBe(false)
    expect(isSettled(0.5, 1)).toBe(false)
  })
})
