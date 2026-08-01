/**
 * Posição do sol e da lua no céu, e a fase lunar.
 *
 * Algoritmo de baixa precisão do Astronomy Answer Book (Van Gent) — o mesmo que
 * o SunCalc implementa, portado à mão para não trazer dependência. Erra por
 * frações de grau, três ordens de grandeza abaixo do que a cena consegue
 * mostrar num palco de 26 unidades de largura.
 *
 * Convenções mantidas iguais às do SunCalc, para o código continuar conferível
 * contra a fonte:
 *   - `azimuth` é medido **do sul, crescendo para oeste** (0 = sul, π/2 = oeste)
 *   - `phase` vai de 0 (nova) a 1 (nova de novo), com 0,5 na cheia
 *   - `angle` é a direção do meio do limbo iluminado, para leste a partir do
 *     norte do disco
 *
 * Refração atmosférica não é aplicada: ela desloca o astro em ~0,5° perto do
 * horizonte, e aqui isso não sobrevive à compressão do domo (`skyPlacement.js`).
 */

const RAD = Math.PI / 180
const DAY_MS = 1000 * 60 * 60 * 24
const J1970 = 2440588
const J2000 = 2451545

// Obliquidade da eclíptica — a inclinação do eixo da Terra, de onde saem as
// estações e o fato de o sol do meio-dia mudar de altura ao longo do ano.
const OBLIQUITY = RAD * 23.4397

// Distância média Terra–Sol, em km. Entra no cálculo da fase porque o ângulo
// de fase visto da Terra não é o mesmo que o visto do centro do sistema.
const SUN_DISTANCE_KM = 149598000

const SYNODIC_MONTH_DAYS = 29.530588853

export const MOON_PHASES = [
  'new',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
]

export { SYNODIC_MONTH_DAYS }

const toDays = (date) => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000

const rightAscension = (longitude, latitude) => Math.atan2(
  Math.sin(longitude) * Math.cos(OBLIQUITY) - Math.tan(latitude) * Math.sin(OBLIQUITY),
  Math.cos(longitude),
)

const declination = (longitude, latitude) => Math.asin(
  Math.sin(latitude) * Math.cos(OBLIQUITY) + Math.cos(latitude) * Math.sin(OBLIQUITY) * Math.sin(longitude),
)

const azimuthOf = (hourAngle, phi, dec) => Math.atan2(
  Math.sin(hourAngle),
  Math.cos(hourAngle) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi),
)

const altitudeOf = (hourAngle, phi, dec) => Math.asin(
  Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle),
)

const siderealTime = (days, lw) => RAD * (280.16 + 360.9856235 * days) - lw

const solarMeanAnomaly = (days) => RAD * (357.5291 + 0.98560028 * days)

// Órbita da Terra é elíptica: a equação do centro corrige a anomalia média para
// a verdadeira. Sem ela o sol erraria até ~2° de longitude — quase dois dias.
const eclipticLongitude = (anomaly) => {
  const center = RAD * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly))
  const perihelion = RAD * 102.9372
  return anomaly + center + perihelion + Math.PI
}

const sunCoords = (days) => {
  const anomaly = solarMeanAnomaly(days)
  const longitude = eclipticLongitude(anomaly)
  return { dec: declination(longitude, 0), ra: rightAscension(longitude, 0) }
}

const moonCoords = (days) => {
  const meanLongitude = RAD * (218.316 + 13.176396 * days)
  const meanAnomaly = RAD * (134.963 + 13.064993 * days)
  const meanDistance = RAD * (93.272 + 13.229350 * days)

  const longitude = meanLongitude + RAD * 6.289 * Math.sin(meanAnomaly)
  const latitude = RAD * 5.128 * Math.sin(meanDistance)
  const distance = 385001 - 20905 * Math.cos(meanAnomaly)

  return { ra: rightAscension(longitude, latitude), dec: declination(longitude, latitude), distance }
}

/** Altitude e azimute do sol para o instante e as coordenadas dados. */
export const sunPosition = (date, latitude, longitude) => {
  const lw = RAD * -longitude
  const phi = RAD * latitude
  const days = toDays(date)
  const coords = sunCoords(days)
  const hourAngle = siderealTime(days, lw) - coords.ra

  return {
    altitude: altitudeOf(hourAngle, phi, coords.dec),
    azimuth: azimuthOf(hourAngle, phi, coords.dec),
  }
}

/**
 * Altitude e azimute da lua, mais o **ângulo paraláctico** — o quanto o "para
 * cima" do observador está girado em relação ao norte celeste naquele ponto do
 * céu. É ele que, descontado do `angle` da iluminação, faz a foice tombar para
 * o lado certo em cada hemisfério.
 */
export const moonPosition = (date, latitude, longitude) => {
  const lw = RAD * -longitude
  const phi = RAD * latitude
  const days = toDays(date)
  const coords = moonCoords(days)
  const hourAngle = siderealTime(days, lw) - coords.ra

  return {
    altitude: altitudeOf(hourAngle, phi, coords.dec),
    azimuth: azimuthOf(hourAngle, phi, coords.dec),
    parallacticAngle: Math.atan2(
      Math.sin(hourAngle),
      Math.tan(phi) * Math.cos(coords.dec) - Math.sin(coords.dec) * Math.cos(hourAngle),
    ),
  }
}

/**
 * Fração iluminada do disco, posição no ciclo e direção do limbo brilhante.
 * Não depende de onde o observador está: a fase é a mesma vista do mundo todo
 * (o que muda com o lugar é só a **inclinação**, que vem do ângulo paraláctico).
 */
export const moonIllumination = (date) => {
  const days = toDays(date)
  const sun = sunCoords(days)
  const moon = moonCoords(days)

  const elongation = Math.acos(
    Math.sin(sun.dec) * Math.sin(moon.dec)
    + Math.cos(sun.dec) * Math.cos(moon.dec) * Math.cos(sun.ra - moon.ra),
  )
  const phaseAngle = Math.atan2(
    SUN_DISTANCE_KM * Math.sin(elongation),
    moon.distance - SUN_DISTANCE_KM * Math.cos(elongation),
  )
  const angle = Math.atan2(
    Math.cos(sun.dec) * Math.sin(sun.ra - moon.ra),
    Math.sin(sun.dec) * Math.cos(moon.dec) - Math.cos(sun.dec) * Math.sin(moon.dec) * Math.cos(sun.ra - moon.ra),
  )

  return {
    fraction: (1 + Math.cos(phaseAngle)) / 2,
    // O sinal de `angle` é o que separa crescente de minguante: com a mesma
    // fração iluminada, os dois lados do ciclo desenham discos espelhados.
    phase: 0.5 + 0.5 * phaseAngle * (angle < 0 ? -1 : 1) / Math.PI,
    angle,
  }
}

/**
 * Chave i18n da fase — texto nunca sai daqui pronto, quem traduz é o
 * componente. As 8 fases são baldes de 45° centrados no nome, então "cheia"
 * cobre alguns dias em volta do instante exato, como no uso corrente.
 */
export const moonPhaseKey = (phase) => {
  const index = Math.round(phase * MOON_PHASES.length) % MOON_PHASES.length
  return `weather.moon.${MOON_PHASES[index]}`
}
