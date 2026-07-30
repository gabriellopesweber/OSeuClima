/**
 * Vento medido (km/h) → intensidade normalizada 0..1 para a cena.
 *
 * O teto existe porque acima dele a cena não fica mais legível, só mais rápida:
 * 45 km/h já é vendaval visual, e rajada de 90 não deve dobrar a velocidade
 * das nuvens.
 */
export const WIND_CEILING_KMH = 45

export const windStrength = (kmh) => {
  if (kmh === null || kmh === undefined || Number.isNaN(kmh)) return 0
  return Math.min(Math.max(kmh, 0), WIND_CEILING_KMH) / WIND_CEILING_KMH
}
