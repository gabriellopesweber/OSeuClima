const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE_GEOCODING_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'weather_code',
  'wind_speed_10m',
  'is_day',
].join(',')

const HOURLY_FIELDS = ['temperature_2m', 'weather_code'].join(',')

const getJson = async (url, params) => {
  const response = await fetch(`${url}?${new URLSearchParams(params)}`)
  if (!response.ok) throw new Error(`${url} respondeu ${response.status}`)
  return response.json()
}

export const weatherRepository = {
  getForecast: (latitude, longitude) => getJson(FORECAST_URL, {
    latitude,
    longitude,
    current: CURRENT_FIELDS,
    hourly: HOURLY_FIELDS,
    timezone: 'auto',
    forecast_days: 1,
  }),

  searchCity: (name) => getJson(GEOCODING_URL, {
    name,
    count: 1,
    language: 'pt',
    format: 'json',
  }),

  reverseGeocode: (latitude, longitude) => getJson(REVERSE_GEOCODING_URL, {
    latitude,
    longitude,
    localityLanguage: 'pt',
  }),
}
