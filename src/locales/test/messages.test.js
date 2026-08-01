import { TIME_SLOTS } from '@/composables/weather/useCelestial'

import common from '@/locales/pt-BR/common.json'
import weather from '@/locales/pt-BR/weather.json'
import { MOON_PHASES, moonPhaseKey } from '@/utils/celestial'
import { SEASONS } from '@/utils/season'
import { conditionLabelKey, seasonLabelKey, taglineKey, timeLabelKey, WEATHER_CATEGORIES } from '@/utils/weather'

import { describe, expect, it } from 'vitest'

const messages = { ...common, ...weather }

const resolve = (key) => key.split('.').reduce((node, part) => node?.[part], messages)

describe('locale pt-BR', () => {
  it('has a condition label and a tagline for every category', () => {
    WEATHER_CATEGORIES.forEach((category) => {
      expect(resolve(conditionLabelKey(category)), `falta ${conditionLabelKey(category)}`).toBeTruthy()
      expect(resolve(taglineKey(category)), `falta ${taglineKey(category)}`).toBeTruthy()
    })
  })

  it('has a label for every season', () => {
    SEASONS.forEach((season) => {
      expect(resolve(seasonLabelKey(season)), `falta ${seasonLabelKey(season)}`).toBeTruthy()
    })
  })

  it('has a label for every moon phase', () => {
    // O `moonPhaseKey` cobre as 8 pela fase numérica; aqui a lista é percorrida
    // pelo nome, para uma fase nova no array falhar aqui antes de virar chave
    // faltando na tela.
    MOON_PHASES.forEach((_, index) => {
      const key = moonPhaseKey(index / MOON_PHASES.length)
      expect(resolve(key), `falta ${key}`).toBeTruthy()
    })
  })

  it('has a label for every time slot', () => {
    TIME_SLOTS.forEach((slot) => {
      expect(resolve(timeLabelKey(slot)), `falta ${timeLabelKey(slot)}`).toBeTruthy()
    })
  })

  it('keeps the interpolation placeholder the fallback notice depends on', () => {
    expect(resolve('weather.notices.denied')).toContain('{city}')
  })

  it('has no empty string left behind', () => {
    const walk = (node, path = []) => {
      Object.entries(node).forEach(([key, value]) => {
        const trail = [...path, key]
        if (typeof value === 'object' && value !== null) return walk(value, trail)
        expect(String(value).trim(), `chave vazia: ${trail.join('.')}`).not.toBe('')
      })
    }
    walk(messages)
  })
})
