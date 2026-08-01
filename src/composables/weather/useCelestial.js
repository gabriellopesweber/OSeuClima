import { computed, onUnmounted, ref } from 'vue'

import { moonIllumination, moonPhaseKey, moonPosition, sunPosition } from '@/utils/celestial'

// O sol anda 15°/h; de minuto em minuto o passo é menor que um pixel na tela, e
// o damping da cena leva o resto. Recalcular por frame seria puro desperdício.
const TICK_MS = 60000

// Passo da varredura que resolve os horários fixos. 5 min erram o instante em
// no máximo 2,5 min — ~0,6° de sol, invisível depois da compressão do domo.
const SCAN_STEP_MS = 5 * 60 * 1000
const SCAN_STEPS = (24 * 60 * 60 * 1000) / SCAN_STEP_MS

export const TIME_SLOTS = ['dawn', 'noon', 'dusk', 'night']

/**
 * Instante do dia em que o sol faz o que o slot pede, achado por varredura.
 *
 * Varrer é mais simples e mais exato do que aproximar a equação do tempo: são
 * 288 avaliações de uma função barata, e só quando o seletor muda.
 */
export const findSlot = (slot, reference, latitude, longitude) => {
  const dayStart = new Date(reference)
  dayStart.setHours(0, 0, 0, 0)
  const start = dayStart.valueOf()

  let best = null
  let bestAltitude = slot === 'night' ? Infinity : -Infinity
  let previous = null

  for (let step = 0; step <= SCAN_STEPS; step++) {
    const at = start + step * SCAN_STEP_MS
    const { altitude } = sunPosition(new Date(at), latitude, longitude)

    if (slot === 'noon' && altitude > bestAltitude) {
      bestAltitude = altitude
      best = at
    }
    if (slot === 'night' && altitude < bestAltitude) {
      bestAltitude = altitude
      best = at
    }
    // Amanhecer e entardecer são os cruzamentos do horizonte, subindo e
    // descendo. Ficam um pouco acima dele para o sol aparecer inteiro.
    if (previous !== null) {
      const rising = previous < 0 && altitude >= 0
      const setting = previous > 0 && altitude <= 0
      if ((slot === 'dawn' && rising) || (slot === 'dusk' && setting)) return new Date(at)
    }
    previous = altitude
  }

  // Em latitude alta pode não haver cruzamento (sol da meia-noite, noite
  // polar). Cair no instante de referência é melhor que devolver nada.
  return new Date(best ?? reference)
}

/**
 * Onde o sol e a lua estão, e qual a fase — para o instante corrente ou para um
 * horário forçado pelas preferências.
 *
 * O seletor de horário existe pelo mesmo motivo que o de estação: sem ele o
 * efeito só apareceria na hora em que a pessoa visitou, e a lua nunca de dia.
 */
export function useCelestial({ latitude, longitude, timeOverride }) {
  const now = ref(new Date())
  const ticker = setInterval(() => { now.value = new Date() }, TICK_MS)
  onUnmounted(() => clearInterval(ticker))

  const coords = computed(() => ({
    // Sem coordenadas conhecidas, o mesmo padrão de `season.js`: hemisfério sul.
    latitude: latitude.value ?? -23.55,
    longitude: longitude.value ?? -46.63,
  }))

  const instant = computed(() => {
    const slot = timeOverride.value
    if (!TIME_SLOTS.includes(slot)) return now.value
    return findSlot(slot, now.value, coords.value.latitude, coords.value.longitude)
  })

  const sun = computed(() => sunPosition(instant.value, coords.value.latitude, coords.value.longitude))
  const moon = computed(() => moonPosition(instant.value, coords.value.latitude, coords.value.longitude))
  const illumination = computed(() => moonIllumination(instant.value))

  // Só nomeia a fase quando a lua está de fato no céu e é noite — anunciar
  // "lua cheia" ao meio-dia é informação verdadeira no lugar errado.
  const visibleMoonPhaseKey = computed(() => {
    if (moon.value.altitude <= 0 || sun.value.altitude > 0) return ''
    return moonPhaseKey(illumination.value.phase)
  })

  return {
    sun,
    moon,
    illumination,
    latitude: computed(() => coords.value.latitude),
    moonPhaseKey: visibleMoonPhaseKey,
  }
}
