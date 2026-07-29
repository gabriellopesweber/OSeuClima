import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Clock,
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

import { sceneColor, sceneCssColor } from './themeColor'

// A partir do three r155 a intensidade das luzes é física: os valores herdados
// do protótipo (feito no r128) só reproduzem o mesmo brilho multiplicados por π.
const LEGACY_LIGHT_SCALE = Math.PI

const MAX_PARTICLES = 900
const SNOW_PARTICLES = 550
const REDUCED_RAIN_PARTICLES = 250
const REDUCED_SNOW_PARTICLES = 180

const NIGHT_SKY_TOP_DARKEN = 0.55
const NIGHT_SKY_BOTTOM_DARKEN = 0.6

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
    gradient.addColorStop(0, top)
    gradient.addColorStop(1, bottom)
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
    cloud.scale.setScalar(0.7 + Math.random() * 0.9)
    cloud.userData.speed = 0.12 + Math.random() * 0.18
    scene.add(cloud)
    clouds.push(cloud)
  }

  const particleGeometry = track(new BufferGeometry())
  const positions = new Float32Array(MAX_PARTICLES * 3)
  for (let i = 0; i < MAX_PARTICLES; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 28
    positions[i * 3 + 1] = Math.random() * 14 - 1
    positions[i * 3 + 2] = -10 + Math.random() * 18
  }
  particleGeometry.setAttribute('position', new BufferAttribute(positions, 3))
  particleGeometry.setDrawRange(0, 0)
  const particleMaterial = track(new PointsMaterial({ size: 0.08, transparent: true, opacity: 0.85, sizeAttenuation: true }))
  scene.add(new Points(particleGeometry, particleMaterial))

  const lightningLight = new PointLight(sceneColor('scene-lightning'), 0, 40, 2)
  lightningLight.position.set(0, 10, -4)
  scene.add(lightningLight)

  let lightningTimer = 0
  let lightningActive = false
  let category = 'clear'
  let isDay = true
  let reduced = false
  let particleMode = 'none'

  function setWeather(nextCategory, dayFlag) {
    category = PALETTES[nextCategory] ? nextCategory : 'clear'
    isDay = dayFlag !== false
    const palette = PALETTES[category]

    paintSky(
      sceneCssColor(`${palette.sky}-sky-top`, isDay ? 0 : NIGHT_SKY_TOP_DARKEN),
      sceneCssColor(`${palette.sky}-sky-bottom`, isDay ? 0 : NIGHT_SKY_BOTTOM_DARKEN),
    )
    hemisphere.intensity = (isDay ? 1 : 0.3) * LEGACY_LIGHT_SCALE
    sunLight.intensity = (isDay ? 1.2 : 0.15) * LEGACY_LIGHT_SCALE

    groundMaterial.color.copy(sceneColor(palette.ground))
    const cloudColor = sceneColor(palette.cloud)
    clouds.forEach((cloud, index) => {
      cloud.visible = index < palette.cloudCount
      cloud.children.forEach((puff) => puff.material.color.copy(cloudColor))
    })

    sun.visible = palette.sun && isDay
    scene.fog = palette.veil ? new Fog(sceneColor(palette.veil), 5, 24) : null

    particleMode = palette.particle
    if (particleMode === 'rain') {
      particleMaterial.color.copy(sceneColor('scene-raindrop'))
      particleMaterial.size = 0.05
      particleMaterial.opacity = 0.7
      particleGeometry.setDrawRange(0, reduced ? REDUCED_RAIN_PARTICLES : MAX_PARTICLES)
    } else if (particleMode === 'snow') {
      particleMaterial.color.copy(sceneColor('scene-snowflake'))
      particleMaterial.size = 0.14
      particleMaterial.opacity = 0.9
      particleGeometry.setDrawRange(0, reduced ? REDUCED_SNOW_PARTICLES : SNOW_PARTICLES)
    } else {
      particleGeometry.setDrawRange(0, 0)
    }

    lightningActive = !!palette.lightning
  }

  function setReducedMotion(value) {
    reduced = !!value
    setWeather(category, isDay)
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

    clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.speed * delta * speed
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

    if (lightningActive) {
      lightningTimer -= delta
      if (lightningTimer <= 0 && Math.random() < 0.01) {
        lightningLight.intensity = (6 + Math.random() * 4) * LEGACY_LIGHT_SCALE
        lightningTimer = 0.15
      } else if (lightningLight.intensity > 0) {
        lightningLight.intensity = Math.max(0, lightningLight.intensity - delta * 20 * LEGACY_LIGHT_SCALE)
      }
    } else if (lightningLight.intensity > 0) {
      lightningLight.intensity = 0
    }

    renderer.render(scene, camera)
  }

  resize()
  setWeather(category, isDay)
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
