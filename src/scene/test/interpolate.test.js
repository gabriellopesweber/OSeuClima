import { approach, approachAngle, dampFactor, isSettled, wrapAngle } from '@/scene/interpolate'

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

describe('approachAngle', () => {
  it('behaves like approach when the gap is small', () => {
    expect(approachAngle(0.1, 0.4, 3, 0.1)).toBeCloseTo(approach(0.1, 0.4, 3, 0.1), 10)
  })

  // O caso que motiva a função: −179° e +179° são vizinhos, mas a subtração
  // crua diz 358°. Sem isso o astro daria a volta inteira pelo céu.
  it('takes the short way around instead of the long one', () => {
    const near = Math.PI - 0.05
    const next = approachAngle(near, -near, 4, 0.1)
    expect(next).toBeGreaterThan(near)
  })

  it('never moves more than half a turn in one step', () => {
    for (const target of [-3, -1, 0, 1, 3]) {
      expect(Math.abs(approachAngle(0, target, 100, 10))).toBeLessThanOrEqual(Math.PI + 1e-9)
    }
  })

  it('stays put when already at the target', () => {
    expect(approachAngle(2, 2, 3, 0.016)).toBeCloseTo(2, 10)
  })

  it('keeps the value in the canonical range, never a turn away from the target', () => {
    // O rumo do domo é multiplicado por `spread` antes de virar posição, e essa
    // multiplicação não sobrevive a um múltiplo de 2π: −5,15 e 1,13 são o mesmo
    // ângulo, mas comprimidos a 0,35 apontam para lados opostos do céu.
    //
    // Dois alvos em sequência é o que produzia isso: a app carrega com um lugar,
    // a geolocalização resolve para outro, e o caminho mais curto entre os dois
    // rumos levava o valor uma volta abaixo — convergido, e ainda assim errado.
    let value = 0
    for (let i = 0; i < 400; i++) value = approachAngle(value, -3, 4, 1 / 60)
    for (let i = 0; i < 400; i++) value = approachAngle(value, 1.133, 4, 1 / 60)

    expect(value).toBeCloseTo(1.133, 4)
    expect(Math.abs(value)).toBeLessThanOrEqual(Math.PI)
  })

  it('converges from any starting turn to the canonical target', () => {
    for (const start of [-4 * Math.PI, -2 * Math.PI, 0, 2 * Math.PI, 4 * Math.PI]) {
      let value = start + 0.4
      for (let i = 0; i < 400; i++) value = approachAngle(value, -1.2, 4, 1 / 60)
      expect(value).toBeCloseTo(-1.2, 4)
    }
  })
})

describe('wrapAngle', () => {
  it('leaves an angle already in range alone', () => {
    expect(wrapAngle(1.2)).toBeCloseTo(1.2, 10)
    expect(wrapAngle(-1.2)).toBeCloseTo(-1.2, 10)
  })

  it('folds full turns away', () => {
    expect(wrapAngle(1.2 + 2 * Math.PI)).toBeCloseTo(1.2, 10)
    expect(wrapAngle(1.2 - 4 * Math.PI)).toBeCloseTo(1.2, 10)
  })

  it('always lands within half a turn of zero', () => {
    for (const angle of [-10, -3.5, 0, 3.5, 10, 100]) {
      expect(Math.abs(wrapAngle(angle))).toBeLessThanOrEqual(Math.PI + 1e-9)
    }
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
