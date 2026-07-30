import { onBeforeUnmount, onMounted, watch } from 'vue'

import { createWeatherScene } from '@/scene/weatherScene'

export function useWeatherScene(canvasRef, { category, isDay, wind, season, reducedMotion }) {
  let scene = null
  let observer = null

  onMounted(() => {
    if (!canvasRef.value) return
    try {
      scene = createWeatherScene(canvasRef.value)
    } catch {
      return // Sem WebGL o cenário some, mas a leitura do clima continua de pé.
    }
    scene.setReducedMotion(reducedMotion.value)
    scene.setSeason(season.value)
    scene.setWeather(category.value, isDay.value)
    scene.setWind(wind.value)
    observer = new ResizeObserver(() => scene?.resize())
    observer.observe(canvasRef.value)
  })

  watch([category, isDay], ([nextCategory, nextIsDay]) => scene?.setWeather(nextCategory, nextIsDay))
  watch(wind, (value) => scene?.setWind(value))
  watch(season, (value) => scene?.setSeason(value))
  watch(reducedMotion, (value) => scene?.setReducedMotion(value))

  onBeforeUnmount(() => {
    observer?.disconnect()
    scene?.dispose()
    observer = null
    scene = null
  })
}
