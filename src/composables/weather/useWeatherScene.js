import { onBeforeUnmount, onMounted, watch } from 'vue'

import { createWeatherScene } from '@/scene/weatherScene'

export function useWeatherScene(canvasRef, { category, isDay, reducedMotion }) {
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
    scene.setWeather(category.value, isDay.value)
    observer = new ResizeObserver(() => scene?.resize())
    observer.observe(canvasRef.value)
  })

  watch([category, isDay], ([nextCategory, nextIsDay]) => scene?.setWeather(nextCategory, nextIsDay))
  watch(reducedMotion, (value) => scene?.setReducedMotion(value))

  onBeforeUnmount(() => {
    observer?.disconnect()
    scene?.dispose()
    observer = null
    scene = null
  })
}
