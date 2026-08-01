import { ref } from 'vue'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const prefersReducedMotion = () => window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false

// Espelha as três preferências que o protótipo expunha como props do componente.
export function useWeatherSettings() {
  const units = ref('metric')
  const demoCategory = ref('auto')
  // 'auto' = deduzida da data e do hemisfério; as demais forçam a vegetação,
  // senão o efeito só seria visível três meses por ano.
  const seasonOverride = ref('auto')
  // Mesma razão do `seasonOverride`: sem forçar o horário, o céu só se mostra
  // como estava na hora da visita — e a lua, nunca de dia.
  const timeOverride = ref('auto')
  const reducedMotion = ref(prefersReducedMotion())

  return { units, demoCategory, seasonOverride, timeOverride, reducedMotion }
}
