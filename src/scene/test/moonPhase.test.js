import { drawMoonPhase, terminatorAxis, terminatorSweep } from '@/scene/moonPhase'

import { describe, expect, it, vi } from 'vitest'

// Borda mockada: `themeColor` lê o token direto do `document`, que não existe no
// ambiente `node`. A cor não importa aqui — o que se testa é a geometria.
vi.mock('@/scene/themeColor', () => ({
  sceneColor: () => ({ r: 1, g: 1, b: 1 }),
  toCssColor: () => '#ffffff',
}))

const SIZE = 200
const RADIUS = SIZE * 0.46

/**
 * Contexto 2D falso que só anota o que foi pedido. O desenho não tem outro
 * resultado observável, então a chamada **é** o comportamento.
 */
const fakeContext = () => {
  const calls = { arc: [], ellipse: [], fill: 0 }
  return {
    calls,
    clearRect: () => {},
    beginPath: () => {},
    fill: () => { calls.fill++ },
    arc: (...args) => calls.arc.push(args),
    ellipse: (...args) => calls.ellipse.push(args),
    globalAlpha: 1,
    fillStyle: '',
  }
}

const drawn = (fraction) => {
  const context = fakeContext()
  drawMoonPhase(context, SIZE, fraction)
  return context.calls
}

describe('terminatorAxis', () => {
  it.each([
    ['cheia', 1, -1],
    ['quarto', 0.5, 0],
    ['nova', 0, 1],
  ])('põe o terminador na posição da lua %s', (_, fraction, expected) => {
    expect(terminatorAxis(fraction)).toBeCloseTo(expected)
  })

  it('encolhe conforme o disco enche', () => {
    const widths = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.abs(terminatorAxis(f)))
    expect(widths).toEqual([1, 0.5, 0, 0.5, 1])
  })
})

describe('drawMoonPhase', () => {
  it('não acende nada na lua nova', () => {
    // Só o disco tênue da parte escura — nenhum terminador a desenhar.
    expect(drawn(0).ellipse).toHaveLength(0)
  })

  it('desenha o limbo brilhante como arco de círculo em qualquer fase', () => {
    for (const fraction of [0.15, 0.5, 0.85, 1]) {
      const [, lit] = drawn(fraction).arc
      expect(lit).toBeDefined()
      expect(lit[3]).toBeCloseTo(-Math.PI / 2)
      expect(lit[4]).toBeCloseTo(Math.PI / 2)
    }
  })

  it('fecha o terminador pela direita na foice e pela esquerda na gibosa', () => {
    // O último argumento do `ellipse` é o `counterclockwise` do canvas, e é ele
    // que separa as duas famílias. O limbo é o semicírculo da direita, traçado
    // de −π/2 a π/2; a elipse volta de π/2 a −π/2, e o caminho de volta decide:
    //
    //   true  → ângulo decrescente, passa por 0 (direita): o semicírculo perde
    //           uma meia-elipse → foice
    //   false → ângulo crescente, passa por π (esquerda): o semicírculo ganha
    //           uma meia-elipse → gibosa
    //
    // Trocar os dois desenha a fase complementar com área plausível — foi assim
    // que uma gibosa de 0,74 saiu como foice de 0,26 na captura da cena.
    const [crescent] = drawn(0.25).ellipse
    const [gibbous] = drawn(0.75).ellipse

    expect(crescent.at(-1)).toBe(true)
    expect(gibbous.at(-1)).toBe(false)
  })

  it('mantém o sentido da varredura amarrado à metade do ciclo', () => {
    expect([0, 0.1, 0.49].map(terminatorSweep)).toEqual([true, true, true])
    expect([0.5, 0.51, 1].map(terminatorSweep)).toEqual([false, false, false])
  })

  it('dá ao terminador a largura que a fração iluminada pede', () => {
    const width = (fraction) => drawn(fraction).ellipse[0][2]

    expect(width(0.25)).toBeCloseTo(RADIUS * 0.5)
    expect(width(0.75)).toBeCloseTo(RADIUS * 0.5)
    // Quarto: o terminador é uma linha reta, elipse de eixo zero.
    expect(width(0.5)).toBeCloseTo(0)
    // Cheia: o terminador coincide com a borda oposta, e o disco fica inteiro.
    expect(width(1)).toBeCloseTo(RADIUS)
  })

  it('trata fração fora do intervalo como o extremo mais próximo', () => {
    expect(drawn(-0.3).ellipse).toHaveLength(0)
    expect(drawn(1.4).ellipse[0][2]).toBeCloseTo(RADIUS)
  })
})
