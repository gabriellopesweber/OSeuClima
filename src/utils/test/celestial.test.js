import { moonIllumination, moonPhaseKey, moonPosition, SYNODIC_MONTH_DAYS, sunPosition } from '@/utils/celestial'

import { describe, expect, it } from 'vitest'

const DEG = 180 / Math.PI
const DAY_MS = 86400000

// Lua nova de referência tabelada por Meeus (*Astronomical Algorithms*):
// 2000-01-06 18:14 UTC. Serve de âncora externa — as demais asserções são
// fatos geométricos que não dependem de efeméride nenhuma.
const REFERENCE_NEW_MOON = Date.parse('2000-01-06T18:14:00Z')

const CURITIBA = { latitude: -25.4, longitude: -49.27 }
const LISBOA = { latitude: 38.72, longitude: -9.14 }
const EQUATOR = { latitude: 0, longitude: 0 }

/** Varre o dia minuto a minuto e devolve o pico de altitude — o meio-dia solar. */
const solarNoonAltitude = (dayStart, { latitude, longitude }) => {
  let peak = -Infinity
  for (let minute = 0; minute < 1440; minute++) {
    const altitude = sunPosition(new Date(dayStart + minute * 60000), latitude, longitude).altitude
    if (altitude > peak) peak = altitude
  }
  return peak * DEG
}

/** Azimute no instante em que a altitude cruza zero subindo. */
const sunriseAzimuth = (dayStart, { latitude, longitude }) => {
  let previous = null
  for (let minute = 0; minute < 1440; minute++) {
    const { altitude, azimuth } = sunPosition(new Date(dayStart + minute * 60000), latitude, longitude)
    if (previous !== null && previous < 0 && altitude >= 0) return azimuth * DEG
    previous = altitude
  }
  return null
}

describe('sunPosition', () => {
  // No equinócio a declinação solar é zero, então ao meio-dia solar a altitude
  // é exatamente 90° − |latitude|, em qualquer lugar do planeta.
  const equinox = Date.parse('2026-03-20T00:00:00Z')

  it.each([
    ['no equador', EQUATOR],
    ['no hemisfério sul', CURITIBA],
    ['no hemisfério norte', LISBOA],
  ])('coloca o sol do meio-dia do equinócio a 90° − |latitude| %s', (_, place) => {
    expect(solarNoonAltitude(equinox, place)).toBeCloseTo(90 - Math.abs(place.latitude), 0)
  })

  it.each([
    ['no equador', EQUATOR],
    ['no hemisfério sul', CURITIBA],
    ['no hemisfério norte', LISBOA],
  ])('faz o sol do equinócio nascer a leste %s', (_, place) => {
    // Azimute é medido do sul crescendo para oeste: leste é −90°.
    expect(sunriseAzimuth(equinox, place)).toBeCloseTo(-90, 0)
  })

  it('inclina o sol do solstício de junho para o hemisfério norte', () => {
    const solstice = Date.parse('2026-06-21T00:00:00Z')
    const north = solarNoonAltitude(solstice, { latitude: 25.4, longitude: -49.27 })
    const south = solarNoonAltitude(solstice, { latitude: -25.4, longitude: -49.27 })

    // 90° − |latitude − declinação|, com a declinação em +23,44° em junho.
    expect(north).toBeCloseTo(88.04, 0)
    expect(south).toBeCloseTo(41.16, 0)
  })

  it('põe o sol abaixo do horizonte à meia-noite local', () => {
    const midnight = new Date('2026-03-20T03:17:00Z')
    expect(sunPosition(midnight, CURITIBA.latitude, CURITIBA.longitude).altitude).toBeLessThan(0)
  })
})

describe('moonPosition', () => {
  it('inclina a mesma lua de formas diferentes em hemisférios opostos', () => {
    // A fase é a mesma vista do mundo todo; o que muda com o lugar é a
    // inclinação do limbo, e ela sai daqui. Instante escolhido com a lua acima
    // do horizonte nas duas latitudes, senão a comparação seria de dois astros
    // que ninguém está vendo.
    const instant = new Date(REFERENCE_NEW_MOON + (SYNODIC_MONTH_DAYS / 4 + 16 / 24) * DAY_MS)
    const south = moonPosition(instant, -25.4, -49.27)
    const north = moonPosition(instant, 25.4, -49.27)

    expect(south.altitude).toBeGreaterThan(0)
    expect(north.altitude).toBeGreaterThan(0)

    const { angle } = moonIllumination(instant)
    const tilt = (position) => (angle - position.parallacticAngle) * DEG
    const apart = Math.abs(tilt(south) - tilt(north))

    // ~80° de diferença: é a foice virada para o outro lado do céu.
    expect(apart).toBeGreaterThan(45)
  })
})

describe('moonIllumination', () => {
  it('não ilumina nada na lua nova de referência', () => {
    expect(moonIllumination(new Date(REFERENCE_NEW_MOON)).fraction).toBeCloseTo(0, 2)
  })

  it('ilumina o disco inteiro meia lunação depois', () => {
    const full = new Date(REFERENCE_NEW_MOON + (SYNODIC_MONTH_DAYS / 2) * DAY_MS)
    expect(moonIllumination(full).fraction).toBeCloseTo(1, 2)
  })

  it('volta à lua nova depois de um mês sinódico', () => {
    const next = new Date(REFERENCE_NEW_MOON + SYNODIC_MONTH_DAYS * DAY_MS)
    expect(moonIllumination(next).fraction).toBeCloseTo(0, 2)
  })

  it('cresce antes da cheia e mingua depois', () => {
    const quarter = SYNODIC_MONTH_DAYS / 4
    const waxing = moonIllumination(new Date(REFERENCE_NEW_MOON + quarter * DAY_MS))
    const waning = moonIllumination(new Date(REFERENCE_NEW_MOON + 3 * quarter * DAY_MS))

    // Mesma fração iluminada dos dois lados do ciclo — o que separa é a `phase`.
    expect(waxing.fraction).toBeCloseTo(waning.fraction, 1)
    expect(waxing.phase).toBeLessThan(0.5)
    expect(waning.phase).toBeGreaterThan(0.5)
  })
})

describe('moonPhaseKey', () => {
  it.each([
    [0, 'new'],
    [0.125, 'waxing_crescent'],
    [0.25, 'first_quarter'],
    [0.375, 'waxing_gibbous'],
    [0.5, 'full'],
    [0.625, 'waning_gibbous'],
    [0.75, 'last_quarter'],
    [0.875, 'waning_crescent'],
  ])('mapeia a fase %s para %s', (phase, name) => {
    expect(moonPhaseKey(phase)).toBe(`weather.moon.${name}`)
  })

  it('dá a volta no fim do ciclo em vez de estourar o índice', () => {
    // 0,99 está a caminho da nova, não fora do array.
    expect(moonPhaseKey(0.99)).toBe('weather.moon.new')
    expect(moonPhaseKey(1)).toBe('weather.moon.new')
  })
})
