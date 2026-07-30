import { Color, SRGBColorSpace } from 'three'

// O Vuetify publica cada cor do tema como `--v-theme-<token>: R,G,B`.
// A cena 3D não pode usar classe CSS, então lê o token na origem — mesma
// abordagem que a regra de gráficos usa para alimentar um renderer de canvas.
const cache = new Map()

const MISSING = [255, 0, 255]

const readRgb = (token) => {
  if (cache.has(token)) return cache.get(token)
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--v-theme-${token}`).trim()
  const parts = raw.split(',').map((channel) => Number(channel.trim()))
  const rgb = parts.length === 3 && parts.every(Number.isFinite) ? parts : MISSING
  cache.set(token, rgb)
  return rgb
}

/**
 * `darken` é aplicado sobre os canais em sRGB, não no espaço linear da cena:
 * é assim que o protótipo escurecia o céu à noite, e multiplicar em linear
 * deixaria a noite bem mais escura que o desenho original.
 */
export const sceneColor = (token, darken = 0) => {
  const [r, g, b] = readRgb(token).map((channel) => channel * (1 - darken))
  return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)
}

/** Cor viva → string aceita pelo gradiente do `<canvas>` 2D do céu. */
export const toCssColor = (color) => `#${color.getHexString()}`
