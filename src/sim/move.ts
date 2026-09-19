import * as Cesium from 'cesium'

export type MoveTask = {
  entityId: string
  startLng: number
  startLat: number
  endLng: number
  endLat: number
  height: number
  tStart: Cesium.JulianDate
  durationSec: number
  geodesic: Cesium.EllipsoidGeodesic
  startPos: Cesium.Cartesian3
  targetPos: Cesium.Cartesian3
}

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t))
}

function interpolate(task: MoveTask, t: number) {
  const tt = clamp01(t)
  let carto: Cesium.Cartographic
  if (tt <= 0) {
    carto = Cesium.Cartographic.fromDegrees(task.startLng, task.startLat, task.height)
  } else if (tt >= 1) {
    carto = Cesium.Cartographic.fromDegrees(task.endLng, task.endLat, task.height)
  } else {
    carto = task.geodesic.interpolateUsingFraction(tt, new Cesium.Cartographic())
    carto.height = task.height
  }
  return {
    pos: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, task.height),
    lng: Cesium.Math.toDegrees(carto.longitude),
    lat: Cesium.Math.toDegrees(carto.latitude),
  }
}

function fractionAt(task: MoveTask, time: Cesium.JulianDate) {
  const elapsed = Cesium.JulianDate.secondsDifference(time, task.tStart)
  return elapsed / task.durationSec
}

/**
 * ConstantPositionProperty.isConstant === true，BillboardVisualizer 会缓存第一次采样。
 * 6000x 下即使每 tick 换新 Constant，图标也经常停在起点。运动中必须用 isConstant=false。
 */
function bindGeodesicMove(entity: Cesium.Entity, task: MoveTask) {
  entity.position = new Cesium.CallbackPositionProperty((time, result) => {
    const t = time || task.tStart
    const { pos } = interpolate(task, fractionAt(task, t))
    return Cesium.Cartesian3.clone(pos, result)
  }, false)
}

export function applyEntityPos(viewer: Cesium.Viewer, entityId: string, pos: Cesium.Cartesian3) {
  const ent = viewer.entities.getById(entityId)
  if (!ent) return
  freezeEntityTo(ent, pos)
}

export function freezeEntityTo(entity: Cesium.Entity, pos: Cesium.Cartesian3) {
  entity.position = new Cesium.ConstantPositionProperty(Cesium.Cartesian3.clone(pos))
}

export function createMoveController() {
  const tasks = new Map<string, MoveTask>()

  function start(opts: {
    viewer: Cesium.Viewer
    entity: Cesium.Entity
    targetCarto: Cesium.Cartographic
    moveSpeed: number
  }): { ok: true; startPos: Cesium.Cartesian3; targetPos: Cesium.Cartesian3; durationSec: number } | { ok: false; reason: string } {
    const { viewer, entity, targetCarto, moveSpeed } = opts
    const id = String(entity.id)
    const startPosRaw = entity.position?.getValue(viewer.clock.currentTime)
    if (!startPosRaw) return { ok: false, reason: 'no-pos' }
    const startPos = Cesium.Cartesian3.clone(startPosRaw)
    const startCarto = Cesium.Cartographic.fromCartesian(startPos)
    const height = Number.isFinite(startCarto.height) ? startCarto.height : 0
    const startSurf = new Cesium.Cartographic(startCarto.longitude, startCarto.latitude, 0)
    const endSurf = new Cesium.Cartographic(targetCarto.longitude, targetCarto.latitude, 0)
    let geodesic: Cesium.EllipsoidGeodesic
    try {
      geodesic = new Cesium.EllipsoidGeodesic(startSurf, endSurf)
    } catch {
      return { ok: false, reason: 'geodesic' }
    }
    const distanceMeters = geodesic.surfaceDistance
    if (!Number.isFinite(distanceMeters) || distanceMeters < 2) return { ok: false, reason: 'too-close' }
    const durationSec = Math.max(2, distanceMeters / (moveSpeed || 50))
    const targetPos = Cesium.Cartesian3.fromRadians(endSurf.longitude, endSurf.latitude, height)
    const task: MoveTask = {
      entityId: id,
      startLng: Cesium.Math.toDegrees(startCarto.longitude),
      startLat: Cesium.Math.toDegrees(startCarto.latitude),
      endLng: Cesium.Math.toDegrees(endSurf.longitude),
      endLat: Cesium.Math.toDegrees(endSurf.latitude),
      height,
      tStart: Cesium.JulianDate.clone(viewer.clock.currentTime),
      durationSec,
      geodesic,
      startPos,
      targetPos,
    }
    tasks.set(id, task)
    bindGeodesicMove(entity, task)
    return { ok: true, startPos, targetPos, durationSec }
  }

  function tick(
    viewer: Cesium.Viewer,
    onProgress: (id: string, pos: Cesium.Cartesian3, lng: number, lat: number) => void,
    onArrive: (id: string, pos: Cesium.Cartesian3) => void,
  ) {
    const now = viewer.clock.currentTime
    for (const [id, task] of Array.from(tasks.entries())) {
      const t = fractionAt(task, now)
      const { pos, lng, lat } = interpolate(task, t)
      onProgress(id, pos, lng, lat)
      if (t >= 1) {
        tasks.delete(id)
        const ent = viewer.entities.getById(id)
        if (ent) freezeEntityTo(ent, pos)
        onArrive(id, pos)
      }
    }
  }

  function stop(viewer: Cesium.Viewer, id: string) {
    const task = tasks.get(id)
    tasks.delete(id)
    const ent = viewer.entities.getById(id)
    if (!ent) return
    const pos = task
      ? interpolate(task, fractionAt(task, viewer.clock.currentTime)).pos
      : ent.position?.getValue(viewer.clock.currentTime)
    if (pos) freezeEntityTo(ent, pos)
  }

  return {
    start,
    tick,
    stop,
    has: (id: string) => tasks.has(id),
    get: (id: string) => tasks.get(id),
    clear: () => tasks.clear(),
  }
}
