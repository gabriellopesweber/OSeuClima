import { bearingFor, placeOnDome, SKY } from '@/scene/skyPlacement'

import { describe, expect, it } from 'vitest'

// Azimutes na convenção de `celestial.js`: medidos do sul, crescendo para oeste.
const EAST = -Math.PI / 2
const WEST = Math.PI / 2
const NORTH = Math.PI
const SOUTH = 0

const SOUTHERN = -23.5
const NORTHERN = 38.7

const at = (azimuth, latitude, altitude = Math.PI / 6) =>
  placeOnDome({ altitude, azimuth, latitude })

describe('bearingFor', () => {
  it('põe o nascente à direita no hemisfério sul e à esquerda no norte', () => {
    expect(bearingFor(EAST, SOUTHERN)).toBeGreaterThan(0)
    expect(bearingFor(EAST, NORTHERN)).toBeLessThan(0)
  })

  it('espelha o poente em relação ao nascente', () => {
    expect(bearingFor(WEST, SOUTHERN)).toBeCloseTo(-bearingFor(EAST, SOUTHERN))
    expect(bearingFor(WEST, NORTHERN)).toBeCloseTo(-bearingFor(EAST, NORTHERN))
  })

  it('aponta para o centro do quadro no meio-dia de cada hemisfério', () => {
    // Ao meio-dia o sol está no lado do equador: norte para quem está no sul.
    expect(bearingFor(NORTH, SOUTHERN)).toBeCloseTo(0)
    expect(bearingFor(SOUTH, NORTHERN)).toBeCloseTo(0)
  })

  it('sem latitude conhecida trata como hemisfério sul', () => {
    expect(bearingFor(EAST, null)).toBeCloseTo(bearingFor(EAST, SOUTHERN))
  })

  it('mantém o rumo dentro de meia volta', () => {
    // O astro que cruza o ponto oposto à câmera troca de +π para −π: é a mesma
    // direção, e quem cuida de não dar a volta pelo céu é o `approachAngle`.
    for (const azimuth of [-Math.PI, -1, 0, 1, Math.PI]) {
      expect(Math.abs(bearingFor(azimuth, NORTHERN))).toBeLessThanOrEqual(Math.PI + 1e-9)
      expect(Math.abs(bearingFor(azimuth, SOUTHERN))).toBeLessThanOrEqual(Math.PI + 1e-9)
    }
  })
})

describe('placeOnDome', () => {
  it('atravessa o quadro num sentido só ao longo do dia', () => {
    const morning = at(EAST, SOUTHERN).x
    const noon = at(NORTH, SOUTHERN).x
    const evening = at(WEST, SOUTHERN).x

    expect(morning).toBeGreaterThan(noon)
    expect(noon).toBeGreaterThan(evening)
  })

  it('sobe com a altitude e desce abaixo do horizonte quando ela é negativa', () => {
    const rising = placeOnDome({ altitude: 0, azimuth: EAST, latitude: SOUTHERN })
    const high = placeOnDome({ altitude: Math.PI / 2, azimuth: NORTH, latitude: SOUTHERN })
    const set = placeOnDome({ altitude: -0.3, azimuth: WEST, latitude: SOUTHERN })

    expect(rising.y).toBeCloseTo(SKY.HORIZON_Y)
    expect(high.y).toBeCloseTo(SKY.HORIZON_Y + SKY.ARC_HEIGHT)
    expect(set.y).toBeLessThan(SKY.HORIZON_Y)
  })

  it('mantém o astro à frente da câmera em qualquer azimute, uma vez comprimido', () => {
    // Sem compressão o sol das 7h fica exatamente ao lado do observador (z = 0)
    // e o da meia-noite atrás dele — é justamente o que a compressão resolve.
    for (const azimuth of [EAST, NORTH, WEST, SOUTH]) {
      const { z } = placeOnDome({ altitude: 0.4, azimuth, latitude: SOUTHERN, spread: 0.35 })
      expect(z).toBeLessThan(0)
    }
  })

  it('comprime o rumo sem mexer na altura', () => {
    const wide = placeOnDome({ altitude: 0.4, azimuth: EAST, latitude: SOUTHERN, spread: 1 })
    const narrow = placeOnDome({ altitude: 0.4, azimuth: EAST, latitude: SOUTHERN, spread: 0.16 })

    expect(narrow.x).toBeLessThan(wide.x)
    expect(narrow.x).toBeGreaterThan(0)
    expect(narrow.y).toBeCloseTo(wide.y)
  })
})
