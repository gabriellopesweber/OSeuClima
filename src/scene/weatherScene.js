import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Timer,
  WebGLRenderer,
} from 'three'

import { DEFAULT_SEASON, SEASONS } from '@/utils/season'

import { approach, approachAngle, dampFactor, isSettled } from './interpolate'
import { createMoonGlowTexture, createMoonTexture, PHASE_EPSILON } from './moonPhase'
import { bearingFor, positionFor, SKY } from './skyPlacement'
import { sceneColor, toCssColor } from './themeColor'
import { windStrength } from './wind'

// A partir do three r155 a intensidade das luzes é física: os valores herdados
// do protótipo (feito no r128) só reproduzem o mesmo brilho multiplicados por π.
const LEGACY_LIGHT_SCALE = Math.PI

const MAX_PARTICLES = 900
const SNOW_PARTICLES = 550
const REDUCED_RAIN_PARTICLES = 250
const REDUCED_SNOW_PARTICLES = 180

const NIGHT_SKY_TOP_DARKEN = 0.55
const NIGHT_SKY_BOTTOM_DARKEN = 0.6

const STAR_COUNT = 260
const STAR_OPACITY = 0.9

const DEG = Math.PI / 180

/**
 * A luz do dia como curva, não como degrau.
 *
 * O `is_day` da API é booleano, então o cenário trocava de dia para noite num
 * frame. Com a altitude solar em mãos ela vira uma rampa entre o crepúsculo
 * civil (−6°) e o sol já solto do horizonte (+6°) — e o anoitecer acontece.
 */
const DAYLIGHT_RANGE = { from: -6 * DEG, to: 6 * DEG }

/** Faixa em que o astro nasce/se põe: some ao cruzar o horizonte, sem piscar. */
const RISE_RANGE = { from: -3 * DEG, to: 2 * DEG }

/** Perto do horizonte o céu e o sol esquentam. Zero acima disto. */
const GOLDEN_ALTITUDE = 10 * DEG

// Velocidade de convergência (1/s). `REDUCED` é alto o bastante para a troca
// parecer imediata sem virar um corte de um frame só.
const LAMBDA = { scene: 2.4, sun: 5, particle: 4, gust: 1.1, wind: 1.6, sky: 1.2 }
const LAMBDA_REDUCED = 30

const smoothstep = (from, to, value) => {
  const t = Math.min(Math.max((value - from) / (to - from), 0), 1)
  return t * t * (3 - 2 * t)
}

// Como o vento (0..1) se traduz em movimento. A nuvem nunca para de todo:
// céu parado com nuvem imóvel parece bug, não calmaria.
const WIND = { cloudBase: 0.35, cloudRange: 2.2, slant: 7, sway: 0.09 }
const PARTICLE_WRAP_X = 14

/**
 * O FOV vertical é fixo, então o horizontal encolhe junto com o aspecto: num
 * celular em pé (0,46) ele cai de 78° para 22°, e árvores e colinas ficam
 * inteiramente fora do quadro.
 *
 * Abrir só o FOV exigiria ~120° verticais (distorção grotesca) e afastar só a
 * câmera exigiria z≈38 (o cenário vira miniatura). Por isso são duas alavancas:
 * um enquadramento por aspecto **e** um `squeeze` que aproxima os elementos do
 * centro. `targetY` mais baixo inclina a câmera para baixo e sobe o horizonte,
 * deixando o topo do quadro — a parte que a UI não cobre — com cena.
 *
 * `spread` é o mesmo remédio aplicado ao céu: comprime o azimute do sol e da
 * lua, senão o astro da manhã fica a 90° do eixo da câmera — fora da tela. Ver
 * `skyPlacement.js`.
 */
const FRAMING = {
  landscape: { aspect: 1.4, fov: 45, z: 11, targetY: 1.5, squeeze: 1, spread: 0.35 },
  portrait: { aspect: 0.62, fov: 56, z: 13.5, targetY: 0.5, squeeze: 0.38, spread: 0.16 },
}

const CLOUD_SPREAD_X = 26
const CLOUD_WRAP_X = 16

const mix = (from, to, t) => from + (to - from) * t

// A neblina fica sempre montada: alternar `scene.fog` entre null e Fog força
// recompilação de shader e trava um frame bem no meio da transição.
const FOG_NEAR = { off: 60, on: 5 }
const FOG_FAR = { off: 400, on: 24 }

const PARTICLE_OPACITY = { none: 0, rain: 0.7, snow: 0.9 }
const PARTICLE_SIZE = { rain: 0.05, snow: 0.14 }

// `seasonBlend` é quanto o chão da estação puxa o chão da condição. A neve
// zera: neve acumulada cobre a vegetação, então a estação não deve aparecer
// por baixo dela.
//
// `openSky` é o céu aberto o bastante para se ver o que há atrás das nuvens —
// libera sol, lua **e** estrelas de uma vez. Chuva, tempestade, neve e neblina
// tampam os três; não faz sentido uma lua nítida sobre um temporal.
const PALETTES = {
  clear: { sky: 'scene-clear', ground: 'scene-clear-ground', cloud: 'scene-clear-cloud', particle: 'none', veil: null, openSky: true, cloudCount: 2, seasonBlend: 0.55 },
  cloudy: { sky: 'scene-cloudy', ground: 'scene-cloudy-ground', cloud: 'scene-cloudy-cloud', particle: 'none', veil: null, openSky: true, cloudCount: 6, seasonBlend: 0.5 },
  rain: { sky: 'scene-rain', ground: 'scene-rain-ground', cloud: 'scene-rain-cloud', particle: 'rain', veil: null, openSky: false, cloudCount: 7, seasonBlend: 0.4 },
  storm: { sky: 'scene-storm', ground: 'scene-storm-ground', cloud: 'scene-storm-cloud', particle: 'rain', veil: null, openSky: false, cloudCount: 7, lightning: true, seasonBlend: 0.35 },
  snow: { sky: 'scene-snow', ground: 'scene-snow-ground', cloud: 'scene-snow-cloud', particle: 'snow', veil: null, openSky: false, cloudCount: 5, seasonBlend: 0 },
  fog: { sky: 'scene-fog', ground: 'scene-fog-ground', cloud: 'scene-fog-cloud', particle: 'none', veil: 'scene-fog-veil', openSky: false, cloudCount: 4, seasonBlend: 0.35 },
}

const HILLS = [[-7, -1.7, -6, 3], [8, -1.9, -8, 4], [-3, -1.8, -10, 2.5]]
const TREES = [[-4, -0.4, 2], [4.5, -0.5, 1], [2, -0.3, 3.5]]
const CLOUD_PUFFS = [[0, 0, 0, 1], [0.8, 0.12, 0, 0.8], [-0.8, 0.08, 0, 0.75], [0.35, 0.4, 0, 0.6], [-0.35, 0.35, 0, 0.55]]

export function createWeatherScene(canvas) {
  // Orçamento de desempenho, **separado** de `reducedMotion`: aquilo é
  // acessibilidade e desacelera a cena; isto é só custo de GPU e não deve
  // deixar o cenário em câmera lenta no celular.
  const dpr = window.devicePixelRatio || 1
  const smallViewport = Math.min(window.innerWidth, window.innerHeight) <= 620
  const lowPower = smallViewport || dpr >= 2

  // `antialias` só pode ser decidido na construção. Com dpr alto o próprio
  // downsampling já esconde o serrilhado, e MSAA é caro em GPU móvel.
  const renderer = new WebGLRenderer({ canvas, antialias: dpr < 2 })
  renderer.setPixelRatio(Math.min(dpr, lowPower ? 1.5 : 2))

  const scene = new Scene()
  const camera = new PerspectiveCamera(45, (canvas.clientWidth || 1) / (canvas.clientHeight || 1), 0.1, 100)
  camera.position.set(0, 2.2, 11)
  camera.lookAt(0, 1.5, 0)

  const skyCanvas = document.createElement('canvas')
  skyCanvas.width = 4
  skyCanvas.height = 256
  const skyContext = skyCanvas.getContext('2d')
  const skyTexture = new CanvasTexture(skyCanvas)
  skyTexture.colorSpace = SRGBColorSpace
  scene.background = skyTexture

  const paintSky = (top, bottom) => {
    const gradient = skyContext.createLinearGradient(0, 0, 0, skyCanvas.height)
    gradient.addColorStop(0, toCssColor(top))
    gradient.addColorStop(1, toCssColor(bottom))
    skyContext.fillStyle = gradient
    skyContext.fillRect(0, 0, skyCanvas.width, skyCanvas.height)
    skyTexture.needsUpdate = true
  }

  const hemisphere = new HemisphereLight(0xffffff, sceneColor('scene-night-bounce'), LEGACY_LIGHT_SCALE)
  scene.add(hemisphere)

  const sunLight = new DirectionalLight(0xffffff, 1.2 * LEGACY_LIGHT_SCALE)
  sunLight.position.set(6, 9, 4)
  scene.add(sunLight)

  // Declarado antes de tudo que o consome: `scatterParticle` e a criação das
  // nuvens rodam ainda na montagem, e um `let` mais abaixo daria ReferenceError
  // por temporal dead zone — engolido pelo try/catch de useWeatherScene, o que
  // deixaria a cena morta sem nenhum erro no console.
  let squeeze = 1

  const disposables = []
  const track = (...items) => { disposables.push(...items); return items[0] }

  const groundGeometry = track(new CircleGeometry(16, 40))
  const groundMaterial = track(new MeshStandardMaterial({ color: sceneColor('scene-clear-ground'), flatShading: true, roughness: 1 }))
  const ground = new Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.4
  scene.add(ground)

  const decor = new Group()
  // O `squeeze` reposiciona estes meshes no eixo x. Guardar o x original é o
  // que permite reaplicar a cada resize sem acumular erro — e tem que ser
  // `position`, nunca `scale`: escalar o grupo achataria a geometria junto.
  const squeezable = []
  const hillGeometry = track(new SphereGeometry(1, 10, 8))
  const hillMaterial = track(new MeshStandardMaterial({ color: sceneColor('scene-hill'), flatShading: true, roughness: 1 }))
  HILLS.forEach(([x, y, z, size]) => {
    const hill = new Mesh(hillGeometry, hillMaterial)
    hill.position.set(x, y, z)
    hill.scale.set(size, size * 0.6, size)
    hill.userData.baseX = x
    squeezable.push(hill)
    decor.add(hill)
  })

  const trunkGeometry = track(new CylinderGeometry(0.12, 0.15, 1, 6))
  const trunkMaterial = track(new MeshStandardMaterial({ color: sceneColor('scene-trunk'), flatShading: true }))
  const leafGeometry = track(new ConeGeometry(0.7, 1.6, 7))
  const leafMaterial = track(new MeshStandardMaterial({ color: sceneColor('season-summer-leaf'), flatShading: true }))
  const leaves = []
  TREES.forEach(([x, y, z], index) => {
    const trunk = new Mesh(trunkGeometry, trunkMaterial)
    trunk.position.set(x, y, z)
    const leaf = new Mesh(leafGeometry, leafMaterial)
    leaf.position.set(x, y + 1.1, z)
    // Defasagem por árvore: sem ela as três balançam em uníssono e o efeito
    // deixa de parecer vento para parecer animação.
    leaf.userData.phase = index * 1.7
    leaves.push(leaf)
    trunk.userData.baseX = x
    leaf.userData.baseX = x
    squeezable.push(trunk, leaf)
    decor.add(trunk, leaf)
  })
  scene.add(decor)

  const sunGeometry = track(new IcosahedronGeometry(1.1, 1))
  const sunMaterial = track(new MeshStandardMaterial({
    color: sceneColor('scene-sun'),
    emissive: sceneColor('scene-sun-glow'),
    emissiveIntensity: 0.7,
    flatShading: true,
    roughness: 0.6,
  }))
  const sun = new Mesh(sunGeometry, sunMaterial)
  sun.position.set(5, 6, -8)
  scene.add(sun)

  // A lua é um disco chapado com a fase desenhada, não uma esfera iluminada:
  // combina com o resto do cenário low-poly e o terminador sai geometricamente
  // exato, sem depender de uma luz extra só para ela.
  //
  // Dois níveis por um motivo: o grupo externo encara a câmera (billboard) e o
  // plano interno gira pelo ângulo do limbo. Fundir os dois faria uma rotação
  // interferir na outra.
  const moon = new Group()
  const moonGlowMaterial = track(new MeshBasicMaterial({
    map: track(createMoonGlowTexture()),
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    opacity: 0,
  }))
  const moonGlow = new Mesh(track(new PlaneGeometry(6.5, 6.5)), moonGlowMaterial)
  // Fora do `track()` de propósito: esta referência é **substituída** quando a
  // fase muda, então quem descarta é o `dispose()`, que sempre olha a atual.
  let moonTexture = createMoonTexture(0.5)
  const moonMaterial = track(new MeshBasicMaterial({
    map: moonTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  }))
  const moonDisc = new Mesh(track(new PlaneGeometry(2.4, 2.4)), moonMaterial)
  moon.add(moonGlow, moonDisc)
  moon.visible = false
  scene.add(moon)

  // Estrelas num casco à frente e acima, atrás de tudo. Distribuídas por
  // ângulo (e não num cubo) para não adensarem nos cantos do quadro.
  const starGeometry = track(new BufferGeometry())
  const starPositions = new Float32Array(STAR_COUNT * 3)
  for (let i = 0; i < STAR_COUNT; i++) {
    const bearing = (Math.random() - 0.5) * Math.PI * 1.2
    const climb = Math.random() * Math.PI * 0.42
    const radius = 26 + Math.random() * 6
    starPositions[i * 3] = radius * Math.sin(bearing) * Math.cos(climb)
    starPositions[i * 3 + 1] = SKY.HORIZON_Y + radius * Math.sin(climb)
    starPositions[i * 3 + 2] = -radius * Math.cos(bearing) * Math.cos(climb)
  }
  starGeometry.setAttribute('position', new BufferAttribute(starPositions, 3))
  const starMaterial = track(new PointsMaterial({
    color: sceneColor('scene-star'),
    size: 0.16,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
  }))
  const stars = new Points(starGeometry, starMaterial)
  stars.visible = false
  scene.add(stars)

  const puffGeometry = track(new SphereGeometry(1, 8, 6))
  const clouds = []
  for (let i = 0; i < 7; i++) {
    const cloud = new Group()
    CLOUD_PUFFS.forEach(([x, y, z, size]) => {
      const material = track(new MeshStandardMaterial({ color: sceneColor('scene-clear-cloud'), flatShading: true, roughness: 1 }))
      const puff = new Mesh(puffGeometry, material)
      puff.position.set(x, y, z)
      puff.scale.setScalar(size)
      cloud.add(puff)
    })
    cloud.position.set((Math.random() - 0.5) * CLOUD_SPREAD_X, 3.5 + Math.random() * 3.5, -5 - Math.random() * 8)
    cloud.userData.baseScale = 0.7 + Math.random() * 0.9
    cloud.userData.speed = 0.12 + Math.random() * 0.18
    cloud.userData.presence = 0
    scene.add(cloud)
    clouds.push(cloud)
  }

  const particleGeometry = track(new BufferGeometry())
  const positions = new Float32Array(MAX_PARTICLES * 3)
  // A faixa horizontal também acompanha o `squeeze`: em retrato, espalhar
  // chuva por 28 unidades jogaria quase toda ela fora do quadro.
  const scatterParticle = (index) => {
    positions[index * 3] = (Math.random() - 0.5) * PARTICLE_WRAP_X * 2 * squeeze
    positions[index * 3 + 1] = Math.random() * 14 - 1
    positions[index * 3 + 2] = -10 + Math.random() * 18
  }
  for (let i = 0; i < MAX_PARTICLES; i++) scatterParticle(i)
  particleGeometry.setAttribute('position', new BufferAttribute(positions, 3))
  particleGeometry.setDrawRange(0, 0)
  const particleMaterial = track(new PointsMaterial({ size: 0.08, transparent: true, opacity: 0, sizeAttenuation: true }))
  scene.add(new Points(particleGeometry, particleMaterial))

  const lightningLight = new PointLight(sceneColor('scene-lightning'), 0, 40, 2)
  lightningLight.position.set(0, 10, -4)
  scene.add(lightningLight)

  scene.fog = new Fog(sceneColor('scene-fog-veil'), FOG_NEAR.off, FOG_FAR.off)

  let lightningTimer = 0
  let category = 'clear'
  let season = DEFAULT_SEASON
  let reduced = false
  let particleMode = 'none'
  let gust = 0
  let spread = FRAMING.landscape.spread
  let drawnFraction = 0.5

  /**
   * O que o céu real está fazendo agora. Fica fora de `target` porque não é
   * interpolado como número solto: `applyTargets` deriva daqui as grandezas que
   * de fato convergem (luz do dia, presença dos astros, calor do crepúsculo).
   */
  const celestial = {
    sunAltitude: 0.9,
    sunAzimuth: Math.PI,
    moonAltitude: -0.5,
    moonAzimuth: 0,
    moonFraction: 0.5,
    limbAngle: 0,
    latitude: null,
  }

  // Estado vivo da cena e o alvo para onde ele converge. Todo `setWeather`
  // mexe só no alvo — quem interpola é o loop.
  const live = {
    skyTop: new Color(), skyBottom: new Color(), ground: new Color(), cloud: new Color(), veil: new Color(),
    leaf: new Color(), hill: new Color(), fog: 0, hemi: 0, sun: 0, sunPresence: 0, particleOpacity: 0, wind: 0,
    sunAltitude: 0.9, sunBearing: 0, moonAltitude: -0.5, moonBearing: 0,
    moonPresence: 0, starOpacity: 0, limbAngle: 0,
  }
  const target = {
    skyTop: new Color(), skyBottom: new Color(), ground: new Color(), cloud: new Color(), veil: new Color(),
    leaf: new Color(), hill: new Color(), fog: 0, hemi: 0, sun: 0, sunPresence: 0, particleMode: 'none', lightning: false, wind: 0,
    sunAltitude: 0.9, sunBearing: 0, moonAltitude: -0.5, moonBearing: 0,
    moonPresence: 0, starOpacity: 0, limbAngle: 0,
  }
  const paintedSky = { top: new Color(), bottom: new Color() }

  // Contagem cortada tanto por acessibilidade quanto por orçamento de GPU —
  // são gatilhos diferentes que chegam ao mesmo lugar.
  const particleCount = (mode) => {
    const lean = reduced || lowPower
    if (mode === 'rain') return lean ? REDUCED_RAIN_PARTICLES : MAX_PARTICLES
    if (mode === 'snow') return lean ? REDUCED_SNOW_PARTICLES : SNOW_PARTICLES
    return 0
  }

  const applyParticleMode = (mode) => {
    particleMode = mode
    if (mode === 'none') {
      particleGeometry.setDrawRange(0, 0)
      return
    }
    particleMaterial.color.copy(sceneColor(mode === 'rain' ? 'scene-raindrop' : 'scene-snowflake'))
    particleMaterial.size = PARTICLE_SIZE[mode]
    const count = particleCount(mode)
    for (let i = 0; i < count; i++) scatterParticle(i)
    particleGeometry.attributes.position.needsUpdate = true
    particleGeometry.setDrawRange(0, count)
  }

  function applyTargets() {
    const palette = PALETTES[category]
    const { sunAltitude, moonAltitude, latitude } = celestial

    // A curva que substituiu o `is_day`: 0 na noite fechada, 1 com o sol solto
    // do horizonte, e todo o crepúsculo no meio.
    const daylight = smoothstep(DAYLIGHT_RANGE.from, DAYLIGHT_RANGE.to, sunAltitude)
    // Quanto o sol está rasante — é o que traz o laranja para o céu e para o
    // próprio disco. Vale tanto subindo quanto descendo.
    const golden = 1 - Math.min(Math.abs(sunAltitude) / GOLDEN_ALTITUDE, 1)
    const openSky = palette.openSky ? 1 : 0

    target.skyTop.copy(sceneColor(`${palette.sky}-sky-top`, NIGHT_SKY_TOP_DARKEN * (1 - daylight)))
    target.skyBottom.copy(sceneColor(`${palette.sky}-sky-bottom`, NIGHT_SKY_BOTTOM_DARKEN * (1 - daylight)))
    if (golden > 0) {
      // O calor entra por cima do escurecimento, senão o pôr do sol seria só um
      // céu cinza mais claro. Mais forte embaixo, onde o sol de fato está.
      target.skyTop.lerp(sceneColor('scene-dusk-sky-top'), golden * 0.55)
      target.skyBottom.lerp(sceneColor('scene-dusk-sky-bottom'), golden * 0.8)
    }

    // O chão da condição carrega a luz e a umidade do tempo; a estação puxa a
    // cor da vegetação por cima. A folhagem vem inteira da estação.
    target.ground.copy(sceneColor(palette.ground)).lerp(sceneColor(`season-${season}-ground`), palette.seasonBlend)
    target.leaf.copy(sceneColor(`season-${season}-leaf`))
    // As colinas são vegetação distante: sem isto, outono deixa árvore laranja
    // e chão dourado sobre morro verde-vivo.
    target.hill.copy(sceneColor('scene-hill')).lerp(sceneColor(`season-${season}-ground`), palette.seasonBlend)

    target.cloud.copy(sceneColor(palette.cloud))
    if (palette.veil) target.veil.copy(sceneColor(palette.veil))
    target.fog = palette.veil ? 1 : 0
    target.hemi = (0.3 + 0.7 * daylight) * LEGACY_LIGHT_SCALE
    target.sun = (0.15 + 1.05 * daylight) * LEGACY_LIGHT_SCALE
    target.particleMode = palette.particle
    target.lightning = !!palette.lightning

    // O sol **se põe** em vez de desaparecer: some ao cruzar o horizonte.
    target.sunPresence = openSky * smoothstep(RISE_RANGE.from, RISE_RANGE.to, sunAltitude)
    // A lua só aparece de noite e só se estiver mesmo acima do horizonte —
    // metade das noites ela não está, e é para isso que serve o seletor de
    // horário nas preferências.
    target.moonPresence = openSky
      * smoothstep(RISE_RANGE.from, RISE_RANGE.to, moonAltitude)
      * (1 - daylight)
    target.starOpacity = openSky * (1 - daylight) * STAR_OPACITY

    target.sunAltitude = sunAltitude
    target.sunBearing = bearingFor(celestial.sunAzimuth, latitude)
    target.moonAltitude = moonAltitude
    target.moonBearing = bearingFor(celestial.moonAzimuth, latitude)
    target.limbAngle = celestial.limbAngle

    sunMaterial.emissive.copy(sceneColor('scene-sun-glow')).lerp(sceneColor('scene-sun-low'), golden)
    sunMaterial.color.copy(sceneColor('scene-sun')).lerp(sceneColor('scene-sun-low'), golden * 0.7)

    clouds.forEach((cloud, index) => { cloud.userData.target = index < palette.cloudCount ? 1 : 0 })
  }

  function setWeather(nextCategory) {
    const changed = nextCategory !== category
    category = PALETTES[nextCategory] ? nextCategory : 'clear'
    applyTargets()

    // Rajada: as nuvens aceleram e desaceleram, para a mudança parecer que o
    // tempo "chegou" em vez de ter sido trocado.
    if (changed && !reduced) gust = 1
  }

  /**
   * Onde o sol e a lua estão de verdade, e como está a fase. Só escreve no
   * alvo — quem move é o `stepTransition`, como todo o resto da cena.
   */
  function setCelestial({ sun: sunAt, moon: moonAt, illumination, latitude }) {
    if (!sunAt || !moonAt || !illumination) return

    celestial.sunAltitude = sunAt.altitude
    celestial.sunAzimuth = sunAt.azimuth
    celestial.moonAltitude = moonAt.altitude
    celestial.moonAzimuth = moonAt.azimuth
    celestial.moonFraction = illumination.fraction
    // Ângulo do limbo brilhante medido a partir do zênite do observador: é o
    // desconto do ângulo paraláctico que faz a foice tombar para o lado certo
    // em cada hemisfério. O sinal negativo leva de "leste a partir do norte"
    // para a rotação em torno de z do plano, que cresce ao contrário.
    celestial.limbAngle = -(illumination.angle - moonAt.parallacticAngle)
    celestial.latitude = latitude ?? null

    applyTargets()
  }

  /** Estação já resolvida (hemisfério incluído) por `@/utils/season`. */
  function setSeason(nextSeason) {
    season = SEASONS.includes(nextSeason) ? nextSeason : DEFAULT_SEASON
    applyTargets()
  }

  /** Vento medido, em km/h. Interpola como o resto — trocar de cidade não deve
   *  fazer as nuvens saltarem de velocidade. */
  function setWind(kmh) {
    target.wind = windStrength(kmh)
  }

  function snapToTarget() {
    live.skyTop.copy(target.skyTop)
    live.skyBottom.copy(target.skyBottom)
    live.ground.copy(target.ground)
    live.cloud.copy(target.cloud)
    live.leaf.copy(target.leaf)
    live.hill.copy(target.hill)
    live.veil.copy(target.veil)
    live.fog = target.fog
    live.hemi = target.hemi
    live.sun = target.sun
    live.sunPresence = target.sunPresence
    live.wind = target.wind
    live.sunAltitude = target.sunAltitude
    live.sunBearing = target.sunBearing
    live.moonAltitude = target.moonAltitude
    live.moonBearing = target.moonBearing
    live.moonPresence = target.moonPresence
    live.starOpacity = target.starOpacity
    live.limbAngle = target.limbAngle
    applyParticleMode(target.particleMode)
    live.particleOpacity = PARTICLE_OPACITY[particleMode]
    clouds.forEach((cloud) => { cloud.userData.presence = cloud.userData.target })
    gust = 0
  }

  // Abaixo de 1/512 a diferença não sobrevive aos 8 bits da textura: repintar
  // aí seria upload de textura por frame para sempre, sem mudar um pixel.
  const colorMoved = (a, b) =>
    Math.abs(a.r - b.r) > 0.002 || Math.abs(a.g - b.g) > 0.002 || Math.abs(a.b - b.b) > 0.002

  function applyLive() {
    if (colorMoved(live.skyTop, paintedSky.top) || colorMoved(live.skyBottom, paintedSky.bottom)) {
      paintSky(live.skyTop, live.skyBottom)
      paintedSky.top.copy(live.skyTop)
      paintedSky.bottom.copy(live.skyBottom)
    }
    groundMaterial.color.copy(live.ground)
    leafMaterial.color.copy(live.leaf)
    hillMaterial.color.copy(live.hill)
    clouds.forEach((cloud) => {
      const presence = cloud.userData.presence
      cloud.visible = presence > 0.01
      cloud.scale.setScalar(cloud.userData.baseScale * presence)
      cloud.children.forEach((puff) => puff.material.color.copy(live.cloud))
    })
    hemisphere.intensity = live.hemi
    sunLight.intensity = live.sun

    const sunAt = positionFor(live.sunBearing, live.sunAltitude, spread)
    sun.position.set(sunAt.x, sunAt.y, sunAt.z)
    sun.visible = live.sunPresence > 0.01
    sun.scale.setScalar(live.sunPresence)

    const moonAt = positionFor(live.moonBearing, live.moonAltitude, spread)
    moon.position.set(moonAt.x, moonAt.y, moonAt.z)
    moon.visible = live.moonPresence > 0.01

    // A luz direcional segue o astro que está no céu. À noite ela é fraca, mas
    // apontar para a lua é o que evita sombra de sol num cenário sem sol.
    sunLight.position.copy(live.sunPresence > 0.05 ? sun.position : moon.position)

    if (moon.visible) {
      moon.lookAt(camera.position)
      moonDisc.rotation.z = live.limbAngle
      moonMaterial.opacity = live.moonPresence
      moonGlowMaterial.opacity = live.moonPresence * 0.6
    }

    stars.visible = live.starOpacity > 0.01
    starMaterial.opacity = live.starOpacity

    scene.fog.color.copy(live.veil)
    scene.fog.near = FOG_NEAR.off + (FOG_NEAR.on - FOG_NEAR.off) * live.fog
    scene.fog.far = FOG_FAR.off + (FOG_FAR.on - FOG_FAR.off) * live.fog
    particleMaterial.opacity = live.particleOpacity
  }

  function stepTransition(delta) {
    const lambda = reduced ? LAMBDA_REDUCED : LAMBDA.scene
    const blend = dampFactor(lambda, delta)

    live.skyTop.lerp(target.skyTop, blend)
    live.skyBottom.lerp(target.skyBottom, blend)
    live.ground.lerp(target.ground, blend)
    live.cloud.lerp(target.cloud, blend)
    live.leaf.lerp(target.leaf, blend)
    live.hill.lerp(target.hill, blend)
    // Com a neblina ainda invisível a cor viva não importa; copiá-la evita que
    // ela entre partindo do preto e escureça a cena no começo da transição.
    if (target.fog > 0) {
      if (live.fog < 0.02) live.veil.copy(target.veil)
      else live.veil.lerp(target.veil, blend)
    }
    live.fog = approach(live.fog, target.fog, lambda, delta)
    live.hemi = approach(live.hemi, target.hemi, lambda, delta)
    live.sun = approach(live.sun, target.sun, lambda, delta)
    live.wind = approach(live.wind, target.wind, reduced ? LAMBDA_REDUCED : LAMBDA.wind, delta)

    const sunLambda = reduced ? LAMBDA_REDUCED : LAMBDA.sun
    live.sunPresence = approach(live.sunPresence, target.sunPresence, sunLambda, delta)
    live.moonPresence = approach(live.moonPresence, target.moonPresence, sunLambda, delta)
    live.starOpacity = approach(live.starOpacity, target.starOpacity, lambda, delta)

    // O céu se move mais devagar que o resto: o sol atravessando o quadro num
    // salto de horário é para parecer viagem no tempo, não teletransporte.
    const skyLambda = reduced ? LAMBDA_REDUCED : LAMBDA.sky
    live.sunAltitude = approach(live.sunAltitude, target.sunAltitude, skyLambda, delta)
    live.moonAltitude = approach(live.moonAltitude, target.moonAltitude, skyLambda, delta)
    // Rumo e inclinação do limbo são ângulos: pelo caminho curto, senão dão a
    // volta inteira ao cruzarem o ponto oposto à câmera.
    live.sunBearing = approachAngle(live.sunBearing, target.sunBearing, skyLambda, delta)
    live.moonBearing = approachAngle(live.moonBearing, target.moonBearing, skyLambda, delta)
    live.limbAngle = approachAngle(live.limbAngle, target.limbAngle, skyLambda, delta)

    // A fase muda ao longo de dias, então na prática isto redesenha uma vez por
    // sessão — mas o seletor de horário pode saltar semanas de uma vez.
    if (Math.abs(celestial.moonFraction - drawnFraction) > PHASE_EPSILON) {
      drawnFraction = celestial.moonFraction
      const next = createMoonTexture(drawnFraction)
      moonTexture.dispose()
      moonTexture = next
      moonMaterial.map = next
      moonMaterial.needsUpdate = true
    }

    clouds.forEach((cloud) => {
      cloud.userData.presence = approach(cloud.userData.presence, cloud.userData.target, lambda, delta)
    })

    // Troca de tipo de partícula só acontece com a anterior já invisível —
    // senão chuva viraria neve no ar, no meio da queda.
    const particleLambda = reduced ? LAMBDA_REDUCED : LAMBDA.particle
    const wantsSwap = particleMode !== target.particleMode
    const wanted = wantsSwap ? 0 : PARTICLE_OPACITY[particleMode]
    live.particleOpacity = approach(live.particleOpacity, wanted, particleLambda, delta)
    if (wantsSwap && live.particleOpacity < 0.02) applyParticleMode(target.particleMode)

    if (gust > 0) {
      gust = approach(gust, 0, LAMBDA.gust, delta)
      if (isSettled(gust, 0, 0.01)) gust = 0
    }
  }

  function setReducedMotion(value) {
    reduced = !!value
    setWeather(category)
    applyParticleMode(target.particleMode)
  }

  /**
   * Reenquadra e recompõe para o aspecto atual. Chamado do `resize()`, que já
   * está ligado ao `ResizeObserver` — então girar o aparelho já passa por aqui.
   */
  function frameForAspect(aspect) {
    const { landscape, portrait } = FRAMING
    const t = Math.min(Math.max((landscape.aspect - aspect) / (landscape.aspect - portrait.aspect), 0), 1)

    camera.fov = mix(landscape.fov, portrait.fov, t)
    camera.position.z = mix(landscape.z, portrait.z, t)
    camera.lookAt(0, mix(landscape.targetY, portrait.targetY, t), 0)

    // Quanto mais estreito o quadro, mais o arco do céu precisa ser comprimido
    // para o astro continuar dentro dele.
    spread = mix(landscape.spread, portrait.spread, t)

    const nextSqueeze = mix(landscape.squeeze, portrait.squeeze, t)
    if (nextSqueeze !== squeeze) {
      // As nuvens estão em movimento: reescalar a posição atual mantém a
      // distribuição em vez de teleportá-las todas para o centro.
      const ratio = nextSqueeze / squeeze
      clouds.forEach((cloud) => { cloud.position.x *= ratio })
      squeeze = nextSqueeze
      squeezable.forEach((mesh) => { mesh.position.x = mesh.userData.baseX * squeeze })
    }
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    if (!width || !height) return
    camera.aspect = width / height
    frameForAspect(camera.aspect)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  // `Clock` está deprecado desde o three r183. O `Timer` ainda ganha a Page
  // Visibility API: em aba oculta ele congela, então voltar não produz um
  // delta gigante que teleporta nuvem e partícula.
  const timer = new Timer()
  timer.connect(document)
  let frameId = null

  function animate(timestamp) {
    frameId = requestAnimationFrame(animate)
    timer.update(timestamp)
    const delta = Math.min(timer.getDelta(), 0.05)
    const elapsed = timer.getElapsed()
    const speed = reduced ? 0.4 : 1

    stepTransition(delta)
    applyLive()

    const wind = live.wind
    const drift = speed * (1 + gust * 2) * (WIND.cloudBase + wind * WIND.cloudRange)
    const wrapX = CLOUD_WRAP_X * squeeze
    clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.speed * delta * drift
      if (cloud.position.x > wrapX) cloud.position.x = -wrapX
    })
    // O sol gira sobre si, mas não flutua mais: a altura dele agora é a
    // altitude real, e um seno por cima só a desmentiria.
    sun.rotation.y += delta * 0.1

    // Folhagem balança na frequência e na amplitude do vento medido.
    const swayAmount = wind * WIND.sway * speed
    leaves.forEach((leaf) => {
      leaf.rotation.z = Math.sin(elapsed * (1.2 + wind * 2) + leaf.userData.phase) * swayAmount
    })

    const attribute = particleGeometry.attributes.position
    const count = particleGeometry.drawRange.count
    if (count > 0) {
      const array = attribute.array
      const fallSpeed = (particleMode === 'snow' ? 1.6 : 9) * delta * speed
      // O empurrão lateral é o que inclina a chuva: sem ele, 35 km/h de vento
      // cai tão a prumo quanto calmaria.
      const slant = wind * WIND.slant * delta * speed
      const particleEdge = PARTICLE_WRAP_X * squeeze
      for (let i = 0; i < count; i++) {
        const index = i * 3
        array[index + 1] -= fallSpeed
        array[index] += slant
        if (particleMode === 'snow') array[index] += Math.sin(elapsed + i) * 0.004
        if (array[index] > particleEdge) array[index] -= particleEdge * 2
        if (array[index + 1] < -1.5) {
          array[index + 1] = 12 + Math.random() * 3
          array[index] = (Math.random() - 0.5) * particleEdge * 2
          array[index + 2] = -10 + Math.random() * 18
        }
      }
      attribute.needsUpdate = true
    }

    if (target.lightning) {
      lightningTimer -= delta
      if (lightningTimer <= 0 && Math.random() < 0.01) {
        lightningLight.intensity = (6 + Math.random() * 4) * LEGACY_LIGHT_SCALE
        lightningTimer = 0.15
      } else if (lightningLight.intensity > 0) {
        lightningLight.intensity = Math.max(0, lightningLight.intensity - delta * 20 * LEGACY_LIGHT_SCALE)
      }
    } else if (lightningLight.intensity > 0) {
      lightningLight.intensity = Math.max(0, lightningLight.intensity - delta * 20 * LEGACY_LIGHT_SCALE)
    }

    renderer.render(scene, camera)
  }

  resize()
  setWeather(category)
  snapToTarget()
  applyLive()
  animate()

  return {
    setWeather,
    setSeason,
    setWind,
    setCelestial,
    setReducedMotion,
    resize,
    dispose() {
      if (frameId !== null) cancelAnimationFrame(frameId)
      disposables.forEach((item) => item.dispose())
      timer.dispose()
      skyTexture.dispose()
      moonTexture.dispose()
      renderer.dispose()
    },
  }
}
