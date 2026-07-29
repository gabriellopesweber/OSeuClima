import { useWeather } from '@/composables/weather/useWeather'

import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key) }),
}))

const service = vi.hoisted(() => ({
  getLocatedForecast: { loading: { value: false }, execute: vi.fn() },
  getCityForecast: { loading: { value: false }, execute: vi.fn() },
}))

vi.mock('@/services/weather/useWeatherService', () => ({
  useWeatherService: () => service,
}))

const makeForecast = (over = {}) => ({
  current: {
    time: '2026-07-29T14:30',
    temperature_2m: 20.4,
    apparent_temperature: 19.6,
    relative_humidity_2m: 68.2,
    wind_speed_10m: 13.7,
    weather_code: 61,
    is_day: 1,
    ...over,
  },
  hourly: {
    time: ['2026-07-29T13:00', '2026-07-29T15:00', '2026-07-29T16:00'],
    temperature_2m: [22.1, 19.4, 18.8],
  },
})

describe('useWeather', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.getCityForecast.loading.value = false
  })

  describe('modo demonstração', () => {
    it('shows the preset for the chosen scene without touching the network', () => {
      const weather = useWeather(ref('storm'))

      weather.load()

      expect(service.getLocatedForecast.execute).not.toHaveBeenCalled()
      expect(weather.phase.value).toBe('ready')
      expect(weather.category.value).toBe('storm')
      expect(weather.measures.value.temperature).toBe(20)
      expect(weather.notice.value).toBe('weather.notices.demo')
      expect(weather.hourly.value).toHaveLength(6)
    })

    it('reloads when the chosen scene changes', async () => {
      const demo = ref('auto')
      const weather = useWeather(demo)

      demo.value = 'snow'
      await nextTick()

      expect(weather.category.value).toBe('snow')
      expect(weather.measures.value.temperature).toBe(-2)
    })
  })

  describe('busca por cidade', () => {
    it('applies the forecast and the matched place', async () => {
      service.getCityForecast.execute.mockResolvedValue({
        match: { name: 'Curitiba', admin1: 'Paraná', country: 'Brasil' },
        forecast: makeForecast(),
      })
      const weather = useWeather(ref('auto'))
      weather.searchTerm.value = '  Curitiba  '

      await weather.search()

      expect(service.getCityForecast.execute).toHaveBeenCalledWith('Curitiba')
      expect(weather.place.value).toEqual({ city: 'Curitiba', region: 'Paraná', country: 'Brasil' })
      expect(weather.phase.value).toBe('ready')
      expect(weather.searchError.value).toBe('')
    })

    it('derives rounded measures and the condition from the WMO code', async () => {
      service.getCityForecast.execute.mockResolvedValue({
        match: { name: 'Curitiba' },
        forecast: makeForecast(),
      })
      const weather = useWeather(ref('auto'))
      weather.searchTerm.value = 'Curitiba'

      await weather.search()

      expect(weather.measures.value).toEqual({
        temperature: 20,
        apparentTemperature: 20,
        humidity: 68,
        windSpeed: 14,
        isDay: true,
        category: 'rain',
      })
    })

    it('starts the hourly strip at the first slot not already past', async () => {
      service.getCityForecast.execute.mockResolvedValue({
        match: { name: 'Curitiba' },
        forecast: makeForecast(),
      })
      const weather = useWeather(ref('auto'))
      weather.searchTerm.value = 'Curitiba'

      await weather.search()

      expect(weather.hourly.value).toEqual([
        { label: '15h', temperature: 19 },
        { label: '16h', temperature: 19 },
      ])
    })

    it('reports "not found" inline instead of breaking the screen', async () => {
      service.getCityForecast.execute.mockResolvedValue(null)
      const weather = useWeather(ref('auto'))
      weather.searchTerm.value = 'Atlântida'

      await weather.search()

      expect(weather.searchError.value).toBe('weather.search.not_found')
      expect(weather.phase.value).not.toBe('error')
    })

    it('reports a request failure inline, keeping the previous reading', async () => {
      service.getCityForecast.execute.mockRejectedValue(new Error('offline'))
      const weather = useWeather(ref('auto'))
      weather.searchTerm.value = 'Curitiba'

      await weather.search()

      expect(weather.searchError.value).toBe('weather.errors.search')
      expect(weather.phase.value).not.toBe('error')
    })

    it('ignores a blank term', async () => {
      const weather = useWeather(ref('auto'))
      weather.searchTerm.value = '   '

      await weather.search()

      expect(service.getCityForecast.execute).not.toHaveBeenCalled()
    })
  })

  describe('geolocalização', () => {
    it('falls back to a default city when the browser has no geolocation', async () => {
      vi.stubGlobal('navigator', {})
      service.getCityForecast.execute.mockResolvedValue({
        match: { name: 'São Paulo', admin1: 'São Paulo', country: 'Brasil' },
        forecast: makeForecast(),
      })
      const weather = useWeather(ref('auto'))

      weather.locate()
      await vi.waitFor(() => expect(weather.phase.value).toBe('ready'))

      expect(weather.notice.value).toBe('weather.notices.unsupported')
      expect(weather.place.value.city).toBe('São Paulo')
      vi.unstubAllGlobals()
    })

    it('goes to the error phase when even the fallback city fails', async () => {
      vi.stubGlobal('navigator', {})
      service.getCityForecast.execute.mockResolvedValue(null)
      const weather = useWeather(ref('auto'))

      weather.locate()
      await vi.waitFor(() => expect(weather.phase.value).toBe('error'))

      expect(weather.notice.value).toBe('weather.errors.forecast')
      vi.unstubAllGlobals()
    })
  })
})
