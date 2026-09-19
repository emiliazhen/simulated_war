import * as Cesium from 'cesium'

function explosionImage() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,230,150,1)')
  grad.addColorStop(0.4, 'rgba(255,140,40,0.9)')
  grad.addColorStop(1, 'rgba(255,40,20,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  return canvas.toDataURL()
}

const explosionImageData = explosionImage()

/** 火球 + 双层冲击波，墙钟 2 秒（不受倍速压缩） */
export function playExplosion(
  viewer: Cesium.Viewer,
  cartesian: Cesium.Cartesian3,
  theme: string,
  baseHeight: number,
  shockwaveStateMap?: Map<string, { stop: boolean }>,
) {
  const color = Cesium.Color.fromCssColorString(theme)
  const durationMs = 2000
  const t0 = performance.now()
  const flash = viewer.entities.add({
    position: cartesian,
    billboard: {
      image: explosionImageData,
      width: 48,
      height: 48,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(5e3, 1.4, 5e6, 0.45),
    },
  })
  let shockRadius = 180
  const maxRadius = Math.max(2800, baseHeight + 5000)
  const shockId = `shock-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
  const shockware = viewer.entities.add({
    id: shockId,
    position: cartesian,
    ellipse: {
      semiMajorAxis: new Cesium.CallbackProperty(() => shockRadius, false),
      semiMinorAxis: new Cesium.CallbackProperty(() => shockRadius, false),
      material: new Cesium.ColorMaterialProperty(
        new Cesium.CallbackProperty(() => {
          const t = Math.min(1, (performance.now() - t0) / durationMs)
          return color.withAlpha(0.55 * (1 - t))
        }, false),
      ),
      outline: true,
      outlineColor: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, (performance.now() - t0) / durationMs)
        return color.withAlpha(0.95 * (1 - t))
      }, false),
      height: 0,
    },
  })
  const ring = viewer.entities.add({
    position: cartesian,
    ellipse: {
      semiMajorAxis: new Cesium.CallbackProperty(() => Math.max(80, shockRadius * 0.45), false),
      semiMinorAxis: new Cesium.CallbackProperty(() => Math.max(80, shockRadius * 0.45), false),
      material: Cesium.Color.WHITE.withAlpha(0.12),
      outline: true,
      outlineColor: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, (performance.now() - t0) / durationMs)
        return Cesium.Color.WHITE.withAlpha(0.7 * (1 - t))
      }, false),
      height: 8,
    },
  })
  let stop = false
  const tick = () => {
    if (stop) return
    const t = Math.min(1, (performance.now() - t0) / durationMs)
    shockRadius = 180 + (maxRadius - 180) * t
    const scale = 48 + 140 * Math.sin(Math.min(1, t * 1.15) * Math.PI)
    if (flash.billboard) {
      flash.billboard.width = scale
      flash.billboard.height = scale
      flash.billboard.color = Cesium.Color.WHITE.withAlpha(1 - t * 0.85)
    }
    if (t >= 1) finish()
  }
  viewer.clock.onTick.addEventListener(tick)
  function finish() {
    stop = true
    viewer.entities.remove(flash)
    viewer.entities.remove(shockware)
    viewer.entities.remove(ring)
    viewer.clock.onTick.removeEventListener(tick)
    shockwaveStateMap?.delete(shockId)
  }
  shockwaveStateMap?.set(shockId, { stop: false })
  return { id: shockId, stop: finish }
}
