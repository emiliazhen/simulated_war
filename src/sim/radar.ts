import * as Cesium from 'cesium'

export function attachRadarSweep(opts: {
  viewer: Cesium.Viewer
  entity: Cesium.Entity
  id: string
  radius: number
  durationSec?: number
  color: Cesium.Color
  onComplete?: () => void
}): { remove: () => void } {
  const { viewer, entity, id, radius, color, onComplete } = opts
  const durationSec = opts.durationSec ?? 3
  const t0 = Cesium.JulianDate.clone(viewer.clock.currentTime)
  let angle = 0
  let stop = false

  const radarFollow = new Cesium.CallbackPositionProperty((time, result) => {
    const pos = entity.position?.getValue(time || viewer.clock.currentTime)
    return pos ? Cesium.Cartesian3.clone(pos, result) : Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO, result)
  }, false)

  viewer.entities.add({
    id: `radar-base-${id}`,
    position: radarFollow,
    ellipse: {
      semiMajorAxis: new Cesium.ConstantProperty(radius),
      semiMinorAxis: new Cesium.ConstantProperty(radius),
      material: new Cesium.ColorMaterialProperty(color.withAlpha(0.08)),
      outline: true,
      outlineColor: color.withAlpha(0.5),
      height: 0,
    },
  })
  viewer.entities.add({
    id: `radar-sweep-${id}`,
    position: radarFollow,
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const center = entity.position?.getValue(viewer.clock.currentTime)
        if (!center) return []
        const sph = Cesium.Cartographic.fromCartesian(center)
        const lng = Cesium.Math.toDegrees(sph.longitude)
        const lat = Cesium.Math.toDegrees(sph.latitude)
        const a = Cesium.Math.toRadians(angle)
        const targetLng = lng + (radius * Math.cos(a)) / (111320 * Math.cos(Cesium.Math.toRadians(lat)))
        const targetLat = lat + (radius * Math.sin(a)) / 110540
        return [Cesium.Cartesian3.fromDegrees(lng, lat, 0), Cesium.Cartesian3.fromDegrees(targetLng, targetLat, 0)]
      }, false),
      width: 3,
      material: color,
      arcType: Cesium.ArcType.NONE,
    },
  })

  const onTick = (clock: Cesium.Clock) => {
    if (stop) return
    const elapsed = Cesium.JulianDate.secondsDifference(clock.currentTime, t0)
    angle = (elapsed * 360) % 360
    if (elapsed >= durationSec) remove()
  }
  viewer.clock.onTick.addEventListener(onTick)

  function remove() {
    if (stop) return
    stop = true
    viewer.entities.removeById(`radar-base-${id}`)
    viewer.entities.removeById(`radar-sweep-${id}`)
    viewer.clock.onTick.removeEventListener(onTick)
    onComplete?.()
  }

  return { remove }
}
