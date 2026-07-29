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

export const sceneColor = (token) => {
  const [r, g, b] = readRgb(token)
  return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)
}

export const sceneCssColor = (token, darken = 0) => {
  const [r, g, b] = readRgb(token).map((channel) => Math.round(channel * (1 - darken)))
  return `rgb(${r}, ${g}, ${b})`
}
