/**
 * Traduz altitude e azimute reais em coordenadas do palco 3D.
 *
 * O palco é estreito: o meio-FOV horizontal vai de 39° em paisagem a ~11° em
 * retrato. O sol das 7h está a 90° do eixo da câmera — fora da tela. Colocar o
 * astro no lugar literal seria fiel e invisível, então a **altura é literal** e
 * o **azimute é comprimido**, o que preserva o que se lê num relance: a que
 * altura o astro está e para que lado ele está indo.
 *
 * A câmera olha para o lado do equador — norte no hemisfério sul, sul no norte.
 * É daí que sai a inversão do nascente, o mesmo cuidado que `season.js` toma
 * com as estações:
 *
 *   hemisfério sul   → nasce à direita, cruza o céu para a esquerda
 *   hemisfério norte → nasce à esquerda, cruza o céu para a direita
 */

// Distância do astro à câmera. Além das nuvens (que vão até z ≈ −13) para o sol
// nunca passar na frente delas.
const DOME_RADIUS = 15

// Altura da linha do horizonte no palco, e o quanto o zênite sobe a partir
// dela. `ARC_HEIGHT` é escolhido para o sol a pino parar logo abaixo da borda
// de cima do quadro em paisagem, em vez de sair por ela.
const HORIZON_Y = -0.6
const ARC_HEIGHT = 6.2

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/** Sem latitude conhecida assume sul, como `season.js` — o app é pt-BR. */
export const facesNorth = (latitude) => !(latitude > 0)

/**
 * Rumo do astro em relação ao "para frente" da câmera, em radianos. Positivo =
 * direita da tela.
 *
 * `azimuth` chega na convenção de `celestial.js`: medido do sul, crescendo para
 * oeste — e crescer para oeste é girar no sentido horário visto de cima, ou
 * seja, da esquerda para a direita de quem olha. Por isso a inversão do
 * hemisfério não precisa de sinal nenhum: basta mudar para onde é "em frente".
 *
 *   sul   → em frente é o norte (azimute π) → leste cai em +π/2, à direita
 *   norte → em frente é o sul  (azimute 0)  → leste cai em −π/2, à esquerda
 */
export const bearingFor = (azimuth, latitude) => {
  const forward = facesNorth(latitude) ? azimuth - Math.PI : azimuth
  // Normaliza para (−π, π]: sem isso o rumo salta de +π para −π no meio do céu
  // e o astro atravessa o quadro de um frame para o outro.
  return Math.atan2(Math.sin(forward), Math.cos(forward))
}

/**
 * Posição no palco a partir do rumo já resolvido. A cena usa esta: ela
 * interpola o **rumo** (e não a posição), senão o astro cortaria o céu em linha
 * reta ao pular de meio-dia para noite, em vez de percorrer o arco.
 *
 * `spread` comprime o rumo — vem do `FRAMING` e é interpolado com o aspecto,
 * junto do `squeeze`.
 */
export const positionFor = (bearing, altitude, spread = 1) => {
  const swung = bearing * spread
  const lift = Math.sin(clamp(altitude, -Math.PI / 2, Math.PI / 2))

  return {
    x: DOME_RADIUS * Math.sin(swung),
    y: HORIZON_Y + lift * ARC_HEIGHT,
    z: -DOME_RADIUS * Math.cos(swung),
  }
}

/** Composição das duas etapas, para quem parte do azimute cru. */
export const placeOnDome = ({ altitude, azimuth, latitude, spread = 1 }) =>
  positionFor(bearingFor(azimuth, latitude), altitude, spread)

export const SKY = { DOME_RADIUS, HORIZON_Y, ARC_HEIGHT }
