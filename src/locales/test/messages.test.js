import common from '@/locales/pt-BR/common.json'
import weather from '@/locales/pt-BR/weather.json'
import { SEASONS } from '@/utils/season'
import { conditionLabelKey, seasonLabelKey, taglineKey, WEATHER_CATEGORIES } from '@/utils/weather'

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
