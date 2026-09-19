import * as Cesium from 'cesium'

/** 拾取地球表面点。禁止用 pickPosition：会打到视野/雷达/火力圈。 */
export function pickGlobeCartesian(viewer: Cesium.Viewer, windowPosition: Cesium.Cartesian2): Cesium.Cartesian3 | undefined {
  const ray = viewer.camera.getPickRay(windowPosition)
  if (ray) {
    const globeHit = viewer.scene.globe.pick(ray, viewer.scene)
    if (globeHit) return globeHit
  }
  return viewer.camera.pickEllipsoid(windowPosition, viewer.scene.globe.ellipsoid) || undefined
}

export function isClickOnBillboard(
  viewer: Cesium.Viewer,
  entity: Cesium.Entity,
  windowPosition: { x: number; y: number },
  half = 18,
) {
  const pos = entity.position?.getValue(viewer.clock.currentTime)
  if (!pos) return false
  const screen = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos)
  if (!screen) return false
  return Math.abs(windowPosition.x - screen.x) <= half && Math.abs(windowPosition.y - screen.y) <= half
}

export function getScreenBoundingBox(viewer: Cesium.Viewer, entity: Cesium.Entity, size = 12) {
  const pos = entity.position?.getValue(viewer.clock.currentTime)
  if (!pos) return null
  const windowPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos)
  if (!windowPos) return null
  return {
    left: windowPos.x - size,
    right: windowPos.x + size,
    top: windowPos.y - size,
    bottom: windowPos.y + size,
  }
}

export function nearestSelectableOnScreen(
  viewer: Cesium.Viewer,
  windowPos: Cesium.Cartesian2,
  tolerancePx: number,
  entities: Cesium.Entity[],
): Cesium.Entity | null {
  let nearest: Cesium.Entity | null = null
  let minDist = tolerancePx
  for (const ent of entities) {
    if (!ent.show) continue
    const pos = ent.position?.getValue(viewer.clock.currentTime)
    if (!pos) continue
    const sp = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos)
    if (!sp) continue
    const d = Math.hypot(sp.x - windowPos.x, sp.y - windowPos.y)
    if (d <= minDist) {
      minDist = d
      nearest = ent
    }
  }
  return nearest
}
