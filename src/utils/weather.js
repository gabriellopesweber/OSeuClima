export const WEATHER_CATEGORIES = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog']

export const DEFAULT_CATEGORY = 'clear'

// Códigos WMO devolvidos pela Open-Meteo em `weather_code`.
const CODES_BY_CATEGORY = {
  clear: [0, 1],
  cloudy: [2, 3],
  fog: [45, 48],
  rain: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82],
  snow: [71, 73, 75, 77, 85, 86],
  storm: [95, 96, 99],
}

export const categorizeWeatherCode = (code) => {
  const match = WEATHER_CATEGORIES.find((category) => CODES_BY_CATEGORY[category].includes(code))
  return match ?? DEFAULT_CATEGORY
}

export const WEATHER_ICONS = {
  clear: 'mdi-weather-sunny',
  cloudy: 'mdi-weather-cloudy',
  rain: 'mdi-weather-pouring',
  storm: 'mdi-weather-lightning-rainy',
  snow: 'mdi-weather-snowy-heavy',
  fog: 'mdi-weather-fog',
}

export const DEMO_MEASURES = {
  clear: { temperature: 27, apparentTemperature: 29, humidity: 45, windSpeed: 12 },
  cloudy: { temperature: 21, apparentTemperature: 20, humidity: 60, windSpeed: 14 },
  rain: { temperature: 18, apparentTemperature: 17, humidity: 85, windSpeed: 22 },
  storm: { temperature: 20, apparentTemperature: 19, humidity: 88, windSpeed: 35 },
  snow: { temperature: -2, apparentTemperature: -6, humidity: 70, windSpeed: 18 },
  fog: { temperature: 14, apparentTemperature: 13, humidity: 92, windSpeed: 6 },
}

// Texto visível nunca sai daqui pronto — só a chave, para o componente traduzir.
export const conditionLabelKey = (category) => `weather.conditions.${category}`
export const seasonLabelKey = (season) => `weather.seasons.${season}`
export const timeLabelKey = (slot) => `weather.times.${slot}`
export const taglineKey = (category) => `weather.taglines.${category}`
export const temperatureUnitKey = (units) => (units === 'imperial' ? 'weather.units.fahrenheit' : 'weather.units.celsius')
export const windUnitKey = (units) => (units === 'imperial' ? 'weather.units.mph' : 'weather.units.kmh')

const isBlank = (value) => value === null || value === undefined || Number.isNaN(value)

export const convertTemperature = (celsius, units) => {
  if (isBlank(celsius)) return null
  return Math.round(units === 'imperial' ? celsius * 9 / 5 + 32 : celsius)
}

export const convertWind = (kmh, units) => {
  if (isBlank(kmh)) return null
  return Math.round(units === 'imperial' ? kmh * 0.621371 : kmh)
}
