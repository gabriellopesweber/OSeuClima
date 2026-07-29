import {
  categorizeWeatherCode,
  conditionLabelKey,
  convertTemperature,
  convertWind,
  DEFAULT_CATEGORY,
  temperatureUnitKey,
  WEATHER_CATEGORIES,
  WEATHER_ICONS,
  windUnitKey,
} from '@/utils/weather'

import { describe, expect, it } from 'vitest'

describe('categorizeWeatherCode', () => {
  it('maps each documented WMO code to its condition', () => {
    expect(categorizeWeatherCode(0)).toBe('clear')
    expect(categorizeWeatherCode(3)).toBe('cloudy')
    expect(categorizeWeatherCode(48)).toBe('fog')
    expect(categorizeWeatherCode(65)).toBe('rain')
    expect(categorizeWeatherCode(75)).toBe('snow')
    expect(categorizeWeatherCode(99)).toBe('storm')
  })

  it('falls back to the default condition for an unknown code', () => {
    expect(categorizeWeatherCode(12345)).toBe(DEFAULT_CATEGORY)
    expect(categorizeWeatherCode(undefined)).toBe(DEFAULT_CATEGORY)
  })

  it('never returns a category the scene cannot render', () => {
    const codes = [0, 1, 2, 3, 45, 48, 51, 61, 71, 80, 85, 95, 99, -1, 4]
    codes.forEach((code) => {
      expect(WEATHER_CATEGORIES).toContain(categorizeWeatherCode(code))
    })
  })
})

describe('convertTemperature', () => {
  it('rounds celsius when the unit is metric', () => {
    expect(convertTemperature(20.4, 'metric')).toBe(20)
    expect(convertTemperature(20.6, 'metric')).toBe(21)
  })

  it('converts to fahrenheit when the unit is imperial', () => {
    expect(convertTemperature(0, 'imperial')).toBe(32)
    expect(convertTemperature(100, 'imperial')).toBe(212)
    expect(convertTemperature(-2, 'imperial')).toBe(28)
  })

  it('returns null for a missing measure so the caller can show a placeholder', () => {
    expect(convertTemperature(null, 'metric')).toBeNull()
    expect(convertTemperature(undefined, 'metric')).toBeNull()
    expect(convertTemperature(NaN, 'metric')).toBeNull()
  })

  it('keeps zero, which is a real temperature and not a missing value', () => {
    expect(convertTemperature(0, 'metric')).toBe(0)
  })
})

describe('convertWind', () => {
  it('rounds km/h when the unit is metric', () => {
    expect(convertWind(12.4, 'metric')).toBe(12)
  })

  it('converts to mph when the unit is imperial', () => {
    expect(convertWind(100, 'imperial')).toBe(62)
  })

  it('returns null for a missing measure', () => {
    expect(convertWind(null, 'imperial')).toBeNull()
  })

  it('keeps zero wind', () => {
    expect(convertWind(0, 'metric')).toBe(0)
  })
})

describe('translation keys', () => {
  it('builds a condition key for every supported category', () => {
    WEATHER_CATEGORIES.forEach((category) => {
      expect(conditionLabelKey(category)).toBe(`weather.conditions.${category}`)
    })
  })

  it('picks the unit key from the preference', () => {
    expect(temperatureUnitKey('metric')).toBe('weather.units.celsius')
    expect(temperatureUnitKey('imperial')).toBe('weather.units.fahrenheit')
    expect(windUnitKey('metric')).toBe('weather.units.kmh')
    expect(windUnitKey('imperial')).toBe('weather.units.mph')
  })

  it('treats any non-imperial value as metric', () => {
    expect(temperatureUnitKey(undefined)).toBe('weather.units.celsius')
    expect(windUnitKey('')).toBe('weather.units.kmh')
  })
})

describe('WEATHER_ICONS', () => {
  it('has an icon for every category, so the chip never renders blank', () => {
    WEATHER_CATEGORIES.forEach((category) => {
      expect(WEATHER_ICONS[category]).toMatch(/^mdi-/)
    })
  })
})
