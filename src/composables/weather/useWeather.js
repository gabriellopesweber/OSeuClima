import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useWeatherService } from '@/services/weather/useWeatherService'
import { seasonFor } from '@/utils/season'
import { categorizeWeatherCode, DEFAULT_CATEGORY, DEMO_MEASURES } from '@/utils/weather'

const FALLBACK_CITY = 'São Paulo'
// Coordenadas de referência do modo demonstração, para a estação e o céu
// saírem determinísticos.
const DEMO_LATITUDE = -23.55
const DEMO_LONGITUDE = -46.63
const GEOLOCATION_TIMEOUT = 8000
const HOURLY_SLOTS = 6

const emptyPlace = () => ({ city: '', region: '', country: '' })

const emptyMeasures = () => ({
  temperature: null,
  apparentTemperature: null,
  humidity: null,
  windSpeed: null,
  isDay: true,
  category: DEFAULT_CATEGORY,
})

const buildHourly = (hourly, currentTime) => {
  if (!hourly?.time?.length) return []
  const start = Math.max(hourly.time.findIndex((time) => time >= currentTime), 0)
  return hourly.time.slice(start, start + HOURLY_SLOTS).map((time, offset) => ({
    label: `${parseInt(time.slice(11, 13), 10)}h`,
    temperature: Math.round(hourly.temperature_2m[start + offset]),
  }))
}

const toMeasures = (forecast) => ({
  temperature: Math.round(forecast.current.temperature_2m),
  apparentTemperature: Math.round(forecast.current.apparent_temperature),
  humidity: Math.round(forecast.current.relative_humidity_2m),
  windSpeed: Math.round(forecast.current.wind_speed_10m),
  isDay: forecast.current.is_day === 1,
  category: categorizeWeatherCode(forecast.current.weather_code),
})

export function useWeather(demoCategory) {
  const { t } = useI18n()
  const { getLocatedForecast, getCityForecast } = useWeatherService()

  const phase = ref('loading')
  const notice = ref('')
  const place = ref(emptyPlace())
  const measures = ref(emptyMeasures())
  const hourly = ref([])
  const searchTerm = ref('')
  const searchError = ref('')
  // A latitude decide o hemisfério (estação, lado do nascente); as duas juntas
  // decidem onde o sol e a lua estão no céu — ver `useCelestial`.
  const latitude = ref(null)
  const longitude = ref(null)

  const isLoading = computed(() => phase.value === 'loading')
  const searchBusy = computed(() => getCityForecast.loading.value)
  const category = computed(() => measures.value.category)
  const isDay = computed(() => measures.value.isDay)
  const windSpeed = computed(() => measures.value.windSpeed)
  const season = computed(() => seasonFor(new Date(), latitude.value))

  const applyForecast = (forecast) => {
    measures.value = toMeasures(forecast)
    hourly.value = buildHourly(forecast.hourly, forecast.current.time)
  }

  const applyDemo = (demo) => {
    const preset = DEMO_MEASURES[demo] ?? DEMO_MEASURES[DEFAULT_CATEGORY]
    phase.value = 'ready'
    notice.value = t('weather.notices.demo')
    place.value = { city: t('weather.demo.city'), region: '', country: '' }
    latitude.value = DEMO_LATITUDE
    longitude.value = DEMO_LONGITUDE
    measures.value = { ...preset, isDay: true, category: demo }
    hourly.value = Array.from({ length: HOURLY_SLOTS }, (_, index) => ({
      label: `${(10 + index) % 24}h`,
      temperature: preset.temperature + Math.round(Math.sin(index) * 2),
    }))
  }

  const loadCity = async (name, { asFallback }) => {
    try {
      const result = await getCityForecast.execute(name)
      if (!result) {
        if (asFallback) throw new Error('cidade de fallback não encontrada')
        searchError.value = t('weather.search.not_found')
        return
      }

      applyForecast(result.forecast)
      place.value = {
        city: result.match.name,
        region: result.match.admin1 ?? '',
        country: result.match.country ?? '',
      }
      latitude.value = result.match.latitude ?? null
      longitude.value = result.match.longitude ?? null
      phase.value = 'ready'
      searchError.value = ''
      if (!asFallback) notice.value = ''
    } catch {
      if (asFallback) {
        phase.value = 'error'
        notice.value = t('weather.errors.forecast')
      } else {
        searchError.value = t('weather.errors.search')
      }
    }
  }

  const fallbackToCity = (reason) => {
    notice.value = reason
    return loadCity(FALLBACK_CITY, { asFallback: true })
  }

  const loadByCoords = async (lat, lon) => {
    try {
      const { place: located, forecast } = await getLocatedForecast.execute(lat, lon)
      applyForecast(forecast)
      place.value = {
        city: located.city || located.locality || t('weather.notices.unknown_place'),
        region: located.principalSubdivision ?? '',
        country: located.countryName ?? '',
      }
      latitude.value = lat
      longitude.value = lon
      phase.value = 'ready'
      notice.value = ''
    } catch {
      phase.value = 'error'
      notice.value = t('weather.errors.forecast')
    }
  }

  const locate = () => {
    phase.value = 'loading'
    notice.value = ''
    if (!navigator.geolocation) {
      fallbackToCity(t('weather.notices.unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => loadByCoords(position.coords.latitude, position.coords.longitude),
      () => fallbackToCity(t('weather.notices.denied', { city: FALLBACK_CITY })),
      { timeout: GEOLOCATION_TIMEOUT },
    )
  }

  const load = () => {
    const demo = demoCategory.value
    if (demo && demo !== 'auto') {
      applyDemo(demo)
      return
    }
    locate()
  }

  const search = () => {
    const name = searchTerm.value.trim()
    if (!name) return
    searchError.value = ''
    loadCity(name, { asFallback: false })
  }

  watch(demoCategory, load)

  return {
    phase,
    isLoading,
    notice,
    place,
    measures,
    category,
    isDay,
    windSpeed,
    season,
    latitude,
    longitude,
    hourly,
    searchTerm,
    searchBusy,
    searchError,
    load,
    locate,
    search,
  }
}
