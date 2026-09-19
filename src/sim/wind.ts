import * as Cesium from 'cesium'

/**
 * 气象流线风场：粒子沿矢量场平流，拖尾按风速上色（淡蓝→青→黄→橙），
 * 观感接近预报产品里的 streamline / particle flow，而不是等长短划线。
 */
type WindParticle = {
  lng: number
  lat: number
  age: number
  maxAge: number
  trail: { lng: number; lat: number }[]
  speed: number
}

const windBox = { minLng: 80, maxLng: 170, minLat: 0, maxLat: 55 }
const WIND_HEIGHT = 14000

function fieldAt(lng: number, lat: number, simSec: number): { dx: number; dy: number; speed: number } {
  const t = simSec * 0.012
  // 西太平洋常见西南—东北向盛行气流，叠加缓变槽脊
  const baseDir = Cesium.Math.toRadians(240 + 18 * Math.sin(lat * 0.08 + t) + 8 * Math.cos(lng * 0.04 - t))
  const baseSpeed = 6 + 5 * Math.sin((lat - 18) * 0.12) + 3 * Math.cos(lng * 0.06 + t)

  const cx = 132 + 1.2 * Math.sin(t * 0.7)
  const cy = 24 + 0.7 * Math.cos(t * 0.55)
  const rx = lng - cx
  const ry = lat - cy
  const r = Math.sqrt(rx * rx + ry * ry)
  const vortexW = Math.max(0, 1 - r / 16)
  const tangent = Math.atan2(rx, -ry)
  let vx = baseSpeed * Math.cos(baseDir) + 16 * vortexW * Math.cos(tangent)
  let vy = baseSpeed * Math.sin(baseDir) + 16 * vortexW * Math.sin(tangent)
  const speed = Math.sqrt(vx * vx + vy * vy)
  if (speed > 0.001) {
    vx /= speed
    vy /= speed
  }
  // 视觉平流：风速越大拖尾越长、走得越快（预报风场同样会夸张位移）
  const stepDeg = 0.018 + 0.055 * Math.min(1, speed / 22)
  return { dx: vx * stepDeg, dy: vy * stepDeg, speed }
}

function colorForSpeed(speed: number) {
  const t = Math.max(0, Math.min(1, speed / 24))
  if (t < 0.25) return Cesium.Color.fromCssColorString('#3d8bff').withAlpha(0.45 + t)
  if (t < 0.45) return Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.55)
  if (t < 0.65) return Cesium.Color.fromCssColorString('#4dffc0').withAlpha(0.65)
  if (t < 0.82) return Cesium.Color.fromCssColorString('#ffe066').withAlpha(0.75)
  return Cesium.Color.fromCssColorString('#ff8a3d').withAlpha(0.85)
}

export function createWindField() {
  const config = { enabled: true, count: 420, trailMax: 18, fps: 24, ready: false }
  let particles: WindParticle[] = []
  let collection: Cesium.PolylineCollection | null = null
  const polylines: any[] = []
  let tickHandler: (() => void) | null = null
  let lastMs = 0

  function seedOne(): WindParticle {
    const lng = windBox.minLng + Math.random() * (windBox.maxLng - windBox.minLng)
    const lat = windBox.minLat + Math.random() * (windBox.maxLat - windBox.minLat)
    return {
      lng,
      lat,
      age: Math.floor(Math.random() * 80),
      maxAge: 90 + Math.floor(Math.random() * 70),
      trail: [{ lng, lat }],
      speed: 8,
    }
  }

  function seed() {
    particles = Array.from({ length: config.count }, () => seedOne())
  }

  function step(simSec: number) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const f = fieldAt(p.lng, p.lat, simSec)
      p.speed = f.speed
      p.trail.push({ lng: p.lng, lat: p.lat })
      const maxTrail = Math.max(8, Math.round(config.trailMax * (0.55 + Math.min(1, f.speed / 20) * 0.7)))
      if (p.trail.length > maxTrail) p.trail.splice(0, p.trail.length - maxTrail)
      const cosLat = Math.max(0.2, Math.cos(Cesium.Math.toRadians(p.lat)))
      p.lng += f.dx / cosLat
      p.lat += f.dy
      p.age++
      if (p.age > p.maxAge || p.lng < windBox.minLng || p.lng > windBox.maxLng || p.lat < windBox.minLat || p.lat > windBox.maxLat) {
        particles[i] = seedOne()
      }
    }
  }

  function syncPolylines() {
    if (!collection) return
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const line = polylines[i]
      if (!line) continue
      if (p.trail.length < 2) {
        line.show = false
        continue
      }
      line.show = config.enabled
      line.positions = p.trail.map((t) => Cesium.Cartesian3.fromDegrees(t.lng, t.lat, WIND_HEIGHT))
      line.width = 1.1 + Math.min(2.2, p.speed / 14)
      if (line.material?.uniforms) {
        line.material.uniforms.color = colorForSpeed(p.speed)
      }
    }
  }

  function init(
    viewer: Cesium.Viewer,
    getState: () => { paused: boolean; multiplier: number; simSec: number },
  ) {
    seed()
    collection = new Cesium.PolylineCollection()
    viewer.scene.primitives.add(collection)
    polylines.length = 0
    const placeholder = [
      Cesium.Cartesian3.fromDegrees(120, 25, WIND_HEIGHT),
      Cesium.Cartesian3.fromDegrees(120.2, 25.1, WIND_HEIGHT),
    ]
    for (let i = 0; i < config.count; i++) {
      polylines.push(collection.add({
        positions: placeholder,
        width: 1.4,
        show: false,
        material: Cesium.Material.fromType('Color', { color: Cesium.Color.CYAN.withAlpha(0.4) }),
      }))
    }
    config.ready = true
    lastMs = Date.now()
    tickHandler = () => {
      const { paused, multiplier, simSec } = getState()
      if (!config.enabled || paused) return
      if (multiplier >= 300) return
      const now = Date.now()
      if (now - lastMs < 1000 / config.fps) return
      lastMs = now
      step(simSec)
      syncPolylines()
    }
    viewer.scene.preUpdate.addEventListener(tickHandler)
  }

  function toggle(on: boolean) {
    config.enabled = on
    if (collection) collection.show = on
  }

  function destroy(viewer: Cesium.Viewer | null) {
    if (tickHandler && viewer) {
      viewer.scene.preUpdate.removeEventListener(tickHandler)
    }
    tickHandler = null
    if (collection && viewer) {
      viewer.scene.primitives.remove(collection)
    }
    collection = null
    polylines.length = 0
    particles = []
    config.ready = false
  }

  return {
    config,
    init,
    toggle,
    destroy,
    isReady: () => config.ready,
  }
}
