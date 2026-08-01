import { CanvasTexture, SRGBColorSpace } from 'three'

import { sceneColor, toCssColor } from './themeColor'

/**
 * Desenha a fase da lua numa textura.
 *
 * O terminador — a linha entre a parte iluminada e a escura — é a projeção de
 * um círculo visto de lado, ou seja **exatamente uma semi-elipse**. Não é
 * aproximação: um disco é a soma de um semicírculo (o limbo brilhante) com uma
 * semi-elipse de mesmo eixo maior.
 *
 * O limbo brilhante é sempre desenhado para a direita. Girar o disco para o
 * lado certo é trabalho da cena, que aplica o ângulo do limbo relativo ao
 * zênite — é isso que faz a foice tombar diferente em cada hemisfério.
 */

const TEXTURE_SIZE = 256

// Abaixo disso a diferença não muda um pixel do disco: redesenhar seria upload
// de textura à toa, como no céu que só é repintado quando a cor se move.
export const PHASE_EPSILON = 0.005

/**
 * Onde o terminador cruza o diâmetro horizontal, em raios.
 *
 *   cheia (1)   → −1  (terminador na borda escura: o disco todo aceso)
 *   quarto (½)  →  0  (linha reta pelo meio)
 *   nova (0)    → +1  (terminador na borda clara: nada aceso)
 */
export const terminatorAxis = (fraction) => 1 - 2 * fraction

/**
 * Sentido da varredura do terminador (o `counterclockwise` do canvas).
 *
 * O limbo brilhante é o semicírculo da direita, traçado de −π/2 (topo) a π/2
 * (base) no sentido de ângulo crescente. O terminador fecha o caminho voltando
 * à base para o topo, e o lado por onde ele volta decide a família do desenho:
 *
 *   `false` → ângulo crescente, π/2 → π → −π/2, passa pela **esquerda**:
 *             o semicírculo ganha uma meia-elipse → **gibosa**
 *   `true`  → ângulo decrescente, π/2 → 0 → −π/2, passa pela **direita**:
 *             o semicírculo perde uma meia-elipse → **foice**
 *
 * Daí `fraction < 0.5` e não o contrário: acima de meia lua o desenho abaula
 * para fora. Trocar este booleano desenha exatamente a fase complementar — e a
 * área continua plausível, então só uma medição de pixel pega o erro. O
 * `jsdom` não implementa canvas, então quem cobre isto é a verificação por
 * captura, não uma suíte de unidade.
 */
export const terminatorSweep = (fraction) => fraction < 0.5

const clamp01 = (value) => Math.min(Math.max(value, 0), 1)

export const drawMoonPhase = (context, size, fraction) => {
  const lit = clamp01(fraction)
  const center = size / 2
  const radius = size * 0.46
  const axis = terminatorAxis(lit)

  context.clearRect(0, 0, size, size)

  // Parte não iluminada, bem tênue: luz cinérea estilizada. Sem ela a lua nova
  // vira um buraco no céu, e a foice perde a referência do disco.
  context.fillStyle = toCssColor(sceneColor('scene-moon-dark'))
  context.globalAlpha = 0.35
  context.beginPath()
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.fill()
  context.globalAlpha = 1

  if (lit <= 0) return

  context.fillStyle = toCssColor(sceneColor('scene-moon'))
  context.beginPath()
  // Meia circunferência da direita: o limbo brilhante, que é sempre um arco de
  // círculo — é o contorno da própria lua.
  context.arc(center, center, radius, -Math.PI / 2, Math.PI / 2, false)
  // De volta ao topo pelo terminador — o sentido é o que separa foice de
  // gibosa. Ver `terminatorSweep`.
  context.ellipse(center, center, Math.abs(axis) * radius, radius, 0, Math.PI / 2, -Math.PI / 2, terminatorSweep(lit))
  context.fill()
}

/** Textura quadrada com a fase desenhada, pronta para o plano da lua. */
export const createMoonTexture = (fraction) => {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  drawMoonPhase(canvas.getContext('2d'), TEXTURE_SIZE, fraction)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Halo radial atrás da lua — desenhado uma vez, a presença é que varia. */
export const createMoonGlowTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const context = canvas.getContext('2d')
  const center = TEXTURE_SIZE / 2

  const glow = context.createRadialGradient(center, center, 0, center, center, center)
  const color = sceneColor('scene-moon-glow')
  glow.addColorStop(0, `rgba(${color.r * 255 | 0}, ${color.g * 255 | 0}, ${color.b * 255 | 0}, 0.55)`)
  glow.addColorStop(0.35, `rgba(${color.r * 255 | 0}, ${color.g * 255 | 0}, ${color.b * 255 | 0}, 0.18)`)
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
