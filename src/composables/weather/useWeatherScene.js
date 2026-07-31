import { onBeforeUnmount, onMounted, watch } from 'vue'

import { createWeatherScene } from '@/scene/weatherScene'

export function useWeatherScene(canvasRef, { category, isDay, wind, season, reducedMotion }) {
  let scene = null
  let observer = null

  onMounted(() => {
    if (!canvasRef.value) return
    try {
      scene = createWeatherScene(canvasRef.value)
    } catch (error) {
      // Sem WebGL o cenário some e a leitura do clima continua de pé. O log
      // existe porque um erro de código cai neste mesmo catch, e sem ele o
      // sintoma seria uma cena preta sem nenhuma pista de onde procurar.
      console.error('[cena] não foi possível iniciar o cenário 3D:', error)
      return
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
