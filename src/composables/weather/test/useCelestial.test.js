import { findSlot } from '@/composables/weather/useCelestial'

import { sunPosition } from '@/utils/celestial'

import { describe, expect, it } from 'vitest'

const DEG = 180 / Math.PI
const CURITIBA = { latitude: -25.4, longitude: -49.27 }
const REFERENCE = new Date('2026-03-20T18:00:00Z')

const altitudeAt = (instant, place = CURITIBA) =>
  sunPosition(instant, place.latitude, place.longitude).altitude * DEG

describe('findSlot', () => {
  it('acha o meio-dia solar no pico do dia', () => {
    const noon = findSlot('noon', REFERENCE, CURITIBA.latitude, CURITIBA.longitude)

    // No equinócio o pico é 90° − |latitude|. A varredura de 5 min pode errar o
    // instante em 2,5 min, o que custa frações de grau.
    expect(altitudeAt(noon)).toBeCloseTo(90 - Math.abs(CURITIBA.latitude), 0)
  })

  it('acha a noite no fundo do dia', () => {
    const night = findSlot('night', REFERENCE, CURITIBA.latitude, CURITIBA.longitude)
    expect(altitudeAt(night)).toBeLessThan(-30)
  })

  it('põe amanhecer e entardecer no horizonte, um subindo e outro descendo', () => {
    const dawn = findSlot('dawn', REFERENCE, CURITIBA.latitude, CURITIBA.longitude)
    const dusk = findSlot('dusk', REFERENCE, CURITIBA.latitude, CURITIBA.longitude)
    const MINUTE = 60000

    expect(Math.abs(altitudeAt(dawn))).toBeLessThan(2)
    expect(Math.abs(altitudeAt(dusk))).toBeLessThan(2)

    // O que distingue os dois não é a altitude — é o sentido.
    expect(altitudeAt(new Date(dawn.valueOf() + 30 * MINUTE))).toBeGreaterThan(altitudeAt(dawn))
    expect(altitudeAt(new Date(dusk.valueOf() + 30 * MINUTE))).toBeLessThan(altitudeAt(dusk))

    expect(dawn.valueOf()).toBeLessThan(dusk.valueOf())
  })

  it('inverte a ordem do sol no hemisfério norte sem mudar de regra', () => {
    const lisboa = { latitude: 38.72, longitude: -9.14 }
    const noon = findSlot('noon', REFERENCE, lisboa.latitude, lisboa.longitude)
    expect(altitudeAt(noon, lisboa)).toBeCloseTo(90 - lisboa.latitude, 0)
  })

  it('não trava na noite polar, onde o sol nunca cruza o horizonte', () => {
    // Longyearbyen em dezembro: não há nascer do sol. Sem saída, a varredura
    // rodaria as 288 iterações e devolveria nada — aqui ela cai no instante de
    // referência em vez de quebrar a cena.
    const polar = findSlot('dawn', new Date('2026-12-21T12:00:00Z'), 78.2, 15.6)
    expect(polar).toBeInstanceOf(Date)
    expect(Number.isNaN(polar.valueOf())).toBe(false)
  })
})
