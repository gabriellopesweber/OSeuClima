import { useI18n } from 'vue-i18n'

import { useAsync } from '@/composables/core/useAsync'
import { weatherRepository } from '@/repositories/weather/weatherRepository'

export const useWeatherService = () => {
  const { t } = useI18n()

  const forecastService = useAsync(
    async (latitude, longitude) => {
      const response = await weatherRepository.getForecast(latitude, longitude)
      return response
    },
    { errorMessage: t('weather.errors.forecast') },
  )

  const locatedForecastService = useAsync(
    async (latitude, longitude) => {
      const [place, forecast] = await Promise.all([
        weatherRepository.reverseGeocode(latitude, longitude),
        weatherRepository.getForecast(latitude, longitude),
      ])
      return { place, forecast }
    },
    { errorMessage: t('weather.errors.forecast') },
  )

  // Sem `errorMessage`: "cidade não encontrada" é resposta esperada da busca e
  // aparece embaixo do campo, não como toast de erro.
  const cityForecastService = useAsync(async (name) => {
    const search = await weatherRepository.searchCity(name)
    const match = search.results?.[0]
    if (!match) return null

    const forecast = await weatherRepository.getForecast(match.latitude, match.longitude)
    return { match, forecast }
  })

  return {
    getForecast: forecastService,
    getLocatedForecast: locatedForecastService,
    getCityForecast: cityForecastService,
  }
}
