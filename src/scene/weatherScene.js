import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Clock,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'

import { approach, dampFactor, isSettled } from './interpolate'
import { sceneColor, toCssColor } from './themeColor'

// A partir do three r155 a intensidade das luzes é física: os valores herdados
// do protótipo (feito no r128) só reproduzem o mesmo brilho multiplicados por π.
const LEGACY_LIGHT_SCALE = Math.PI

const MAX_PARTICLES = 900
const SNOW_PARTICLES = 550
const REDUCED_RAIN_PARTICLES = 250
const REDUCED_SNOW_PARTICLES = 180

const NIGHT_SKY_TOP_DARKEN = 0.55
const NIGHT_SKY_BOTTOM_DARKEN = 0.6

// Velocidade de convergência (1/s). `REDUCED` é alto o bastante para a troca
// parecer imediata sem virar um corte de um frame só.
const LAMBDA = { scene: 2.4, sun: 5, particle: 4, gust: 1.1 }
const LAMBDA_REDUCED = 30

// A neblina fica sempre montada: alternar `scene.fog` entre null e Fog força
// recompilação de shader e trava um frame bem no meio da transição.
const FOG_NEAR = { off: 60, on: 5 }
const FOG_FAR = { off: 400, on: 24 }

const PARTICLE_OPACITY = { none: 0, rain: 0.7, snow: 0.9 }
const PARTICLE_SIZE = { rain: 0.05, snow: 0.14 }

const PALETTES = {
  clear: { sky: 'scene-clear', ground: 'scene-clear-ground', cloud: 'scene-clear-cloud', particle: 'none', veil: null, sun: true, cloudCount: 2 },
  cloudy: { sky: 'scene-cloudy', ground: 'scene-cloudy-ground', cloud: 'scene-cloudy-cloud', particle: 'none', veil: null, sun: true, cloudCount: 6 },
  rain: { sky: 'scene-rain', ground: 'scene-rain-ground', cloud: 'scene-rain-cloud', particle: 'rain', veil: null, sun: false, cloudCount: 7 },
  storm: { sky: 'scene-storm', ground: 'scene-storm-ground', cloud: 'scene-storm-cloud', particle: 'rain', veil: null, sun: false, cloudCount: 7, lightning: true },
  snow: { sky: 'scene-snow', ground: 'scene-snow-ground', cloud: 'scene-snow-cloud', particle: 'snow', veil: null, sun: false, cloudCount: 5 },
  fog: { sky: 'scene-fog', ground: 'scene-fog-ground', cloud: 'scene-fog-cloud', particle: 'none', veil: 'scene-fog-veil', sun: false, cloudCount: 4 },
}

const HILLS = [[-7, -1.7, -6, 3], [8, -1.9, -8, 4], [-3, -1.8, -10, 2.5]]
const TREES = [[-4, -0.4, 2], [4.5, -0.5, 1], [2, -0.3, 3.5]]
const CLOUD_PUFFS = [[0, 0, 0, 1], [0.8, 0.12, 0, 0.8], [-0.8, 0.08, 0, 0.75], [0.35, 0.4, 0, 0.6], [-0.35, 0.35, 0, 0.55]]

export function createWeatherScene(canvas) {
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

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

  const disposables = []
  const track = (...items) => { disposables.push(...items); return items[0] }

  const groundGeometry = track(new CircleGeometry(16, 40))
  const groundMaterial = track(new MeshStandardMaterial({ color: sceneColor('scene-clear-ground'), flatShading: true, roughness: 1 }))
  const ground = new Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.4
  scene.add(ground)

  const decor = new Group()
  const hillGeometry = track(new SphereGeometry(1, 10, 8))
  const hillMaterial = track(new MeshStandardMaterial({ color: sceneColor('scene-hill'), flatShading: true, roughness: 1 }))
  HILLS.forEach(([x, y, z, size]) => {
    const hill = new Mesh(hillGeometry, hillMaterial)
    hill.position.set(x, y, z)
    hill.scale.set(size, size * 0.6, size)
    decor.add(hill)
  })

  const trunkGeometry = track(new CylinderGeometry(0.12, 0.15, 1, 6))
  const trunkMaterial = track(new MeshStandardMaterial({ color: sceneColor('scene-trunk'), flatShading: true }))
  const leafGeometry = track(new ConeGeometry(0.7, 1.6, 7))
  const leafMaterial = track(new MeshStandardMaterial({ color: sceneColor('scene-leaf'), flatShading: true }))
  TREES.forEach(([x, y, z]) => {
    const trunk = new Mesh(trunkGeometry, trunkMaterial)
    trunk.position.set(x, y, z)
    const leaf = new Mesh(leafGeometry, leafMaterial)
    leaf.position.set(x, y + 1.1, z)
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
    cloud.position.set((Math.random() - 0.5) * 26, 3.5 + Math.random() * 3.5, -5 - Math.random() * 8)
    cloud.userData.baseScale = 0.7 + Math.random() * 0.9
    cloud.userData.speed = 0.12 + Math.random() * 0.18
    cloud.userData.presence = 0
    scene.add(cloud)
    clouds.push(cloud)
  }

  const particleGeometry = track(new BufferGeometry())
  const positions = new Float32Array(MAX_PARTICLES * 3)
  const scatterParticle = (index) => {
    positions[index * 3] = (Math.random() - 0.5) * 28
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
  let isDay = true
  let reduced = false
  let particleMode = 'none'
  let gust = 0

  // Estado vivo da cena e o alvo para onde ele converge. Todo `setWeather`
  // mexe só no alvo — quem interpola é o loop.
  const live = {
    skyTop: new Color(), skyBottom: new Color(), ground: new Color(), cloud: new Color(), veil: new Color(),
    fog: 0, hemi: 0, sun: 0, sunPresence: 0, particleOpacity: 0,
  }
  const target = {
    skyTop: new Color(), skyBottom: new Color(), ground: new Color(), cloud: new Color(), veil: new Color(),
    fog: 0, hemi: 0, sun: 0, sunPresence: 0, particleMode: 'none', lightning: false,
  }
  const paintedSky = { top: new Color(), bottom: new Color() }

  const particleCount = (mode) => {
    if (mode === 'rain') return reduced ? REDUCED_RAIN_PARTICLES : MAX_PARTICLES
    if (mode === 'snow') return reduced ? REDUCED_SNOW_PARTICLES : SNOW_PARTICLES
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

  function setWeather(nextCategory, dayFlag) {
    const changed = nextCategory !== category || dayFlag !== isDay
    category = PALETTES[nextCategory] ? nextCategory : 'clear'
    isDay = dayFlag !== false
    const palette = PALETTES[category]

    target.skyTop.copy(sceneColor(`${palette.sky}-sky-top`, isDay ? 0 : NIGHT_SKY_TOP_DARKEN))
    target.skyBottom.copy(sceneColor(`${palette.sky}-sky-bottom`, isDay ? 0 : NIGHT_SKY_BOTTOM_DARKEN))
    target.ground.copy(sceneColor(palette.ground))
    target.cloud.copy(sceneColor(palette.cloud))
    if (palette.veil) target.veil.copy(sceneColor(palette.veil))
    target.fog = palette.veil ? 1 : 0
    target.hemi = (isDay ? 1 : 0.3) * LEGACY_LIGHT_SCALE
    target.sun = (isDay ? 1.2 : 0.15) * LEGACY_LIGHT_SCALE
    target.sunPresence = palette.sun && isDay ? 1 : 0
    target.particleMode = palette.particle
    target.lightning = !!palette.lightning

    clouds.forEach((cloud, index) => { cloud.userData.target = index < palette.cloudCount ? 1 : 0 })

    // Rajada: as nuvens aceleram e desaceleram, para a mudança parecer que o
    // tempo "chegou" em vez de ter sido trocado.
    if (changed && !reduced) gust = 1
  }

  function snapToTarget() {
    live.skyTop.copy(target.skyTop)
    live.skyBottom.copy(target.skyBottom)
    live.ground.copy(target.ground)
    live.cloud.copy(target.cloud)
    live.veil.copy(target.veil)
    live.fog = target.fog
    live.hemi = target.hemi
    live.sun = target.sun
    live.sunPresence = target.sunPresence
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
    clouds.forEach((cloud) => {
      const presence = cloud.userData.presence
      cloud.visible = presence > 0.01
      cloud.scale.setScalar(cloud.userData.baseScale * presence)
      cloud.children.forEach((puff) => puff.material.color.copy(live.cloud))
    })
    hemisphere.intensity = live.hemi
    sunLight.intensity = live.sun
    sun.visible = live.sunPresence > 0.01
    sun.scale.setScalar(live.sunPresence)
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
    // Com a neblina ainda invisível a cor viva não importa; copiá-la evita que
    // ela entre partindo do preto e escureça a cena no começo da transição.
    if (target.fog > 0) {
      if (live.fog < 0.02) live.veil.copy(target.veil)
      else live.veil.lerp(target.veil, blend)
    }
    live.fog = approach(live.fog, target.fog, lambda, delta)
    live.hemi = approach(live.hemi, target.hemi, lambda, delta)
    live.sun = approach(live.sun, target.sun, lambda, delta)

    const sunLambda = reduced ? LAMBDA_REDUCED : LAMBDA.sun
    live.sunPresence = approach(live.sunPresence, target.sunPresence, sunLambda, delta)

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
    setWeather(category, isDay)
    applyParticleMode(target.particleMode)
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  const clock = new Clock()
  let frameId = null

  function animate() {
    frameId = requestAnimationFrame(animate)
    const delta = Math.min(clock.getDelta(), 0.05)
    const speed = reduced ? 0.4 : 1

    stepTransition(delta)
    applyLive()

    const drift = speed * (1 + gust * 2)
    clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.speed * delta * drift
      if (cloud.position.x > 16) cloud.position.x = -16
    })
    sun.rotation.y += delta * 0.1
    sun.position.y += Math.sin(clock.elapsedTime * 0.5) * 0.0015

    const attribute = particleGeometry.attributes.position
    const count = particleGeometry.drawRange.count
    if (count > 0) {
      const array = attribute.array
      const fallSpeed = (particleMode === 'snow' ? 1.6 : 9) * delta * speed
      for (let i = 0; i < count; i++) {
        const index = i * 3
        array[index + 1] -= fallSpeed
        if (particleMode === 'snow') array[index] += Math.sin(clock.elapsedTime + i) * 0.004
        if (array[index + 1] < -1.5) {
          array[index + 1] = 12 + Math.random() * 3
          array[index] = (Math.random() - 0.5) * 28
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
  setWeather(category, isDay)
  snapToTarget()
  applyLive()
  animate()

  return {
    setWeather,
    setReducedMotion,
    resize,
    dispose() {
      if (frameId !== null) cancelAnimationFrame(frameId)
      disposables.forEach((item) => item.dispose())
      skyTexture.dispose()
      renderer.dispose()
    },
  }
}
