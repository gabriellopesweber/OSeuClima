import { onBeforeUnmount, onMounted, watch } from 'vue'

import { createWeatherScene } from '@/scene/weatherScene'

export function useWeatherScene(canvasRef, { category, wind, season, celestial, reducedMotion }) {
  let scene = null
  let observer = null

  // O céu chega como um pacote só: as quatro grandezas são do mesmo instante e
  // aplicá-las separadamente daria um frame com o sol de agora e a lua de antes.
  const pushCelestial = () => scene?.setCelestial({
    sun: celestial.sun.value,
    moon: celestial.moon.value,
    illumination: celestial.illumination.value,
    latitude: celestial.latitude.value,
  })

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
    pushCelestial()
    scene.setWeather(category.value)
    scene.setWind(wind.value)
    observer = new ResizeObserver(() => scene?.resize())
    observer.observe(canvasRef.value)
  })

  watch(category, (value) => scene?.setWeather(value))
  watch(wind, (value) => scene?.setWind(value))
  watch(season, (value) => scene?.setSeason(value))
  watch(reducedMotion, (value) => scene?.setReducedMotion(value))
  watch([celestial.sun, celestial.moon, celestial.illumination, celestial.latitude], pushCelestial)

  onBeforeUnmount(() => {
    observer?.disconnect()
    scene?.dispose()
    observer = null
    scene = null
  })
}
