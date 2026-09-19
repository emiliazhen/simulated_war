import * as Cesium from 'cesium'

export const PATROL_BEACON_LNG = 124.85
export const PATROL_BEACON_LAT = 30.05

type PatrolState = {
  tStart: Cesium.JulianDate
  radius: number
  height: number
  phase: number
  speedFactor: number
}

function patrolCartesian(state: PatrolState, time: Cesium.JulianDate, result?: Cesium.Cartesian3) {
  const elapsedSecs = Cesium.JulianDate.secondsDifference(time, state.tStart)
  const angle = state.phase + elapsedSecs * state.speedFactor
  const lat = PATROL_BEACON_LAT + state.radius * Math.sin(angle)
  const lng = PATROL_BEACON_LNG + state.radius * Math.cos(angle) / Math.cos(Cesium.Math.toRadians(lat))
  return Cesium.Cartesian3.fromDegrees(lng, lat, state.height, Cesium.Ellipsoid.WGS84, result)
}

function bindPatrol(entity: Cesium.Entity, state: PatrolState) {
  entity.position = new Cesium.CallbackPositionProperty((time, result) => {
    return patrolCartesian(state, time || state.tStart, result)
  }, false)
  ;(entity as any).__patrolBound = true
}

export function createPatrolController() {
  const patrolStateMap = new Map<string, PatrolState>()

  function init(viewer: Cesium.Viewer, groups: any[]) {
    patrolStateMap.clear()
    for (const group of groups || []) {
      if (group.faction !== 'hostile') continue
      for (const item of group.children || []) {
        if (item.unitType === 'GROUND') continue
        const isAir = item.unitType === 'AIRCRAFT' || item.unitType === 'UAV'
        const state: PatrolState = {
          tStart: viewer.clock.currentTime.clone(),
          radius: item.unitType === 'SHIP' ? 0.35 : isAir ? 0.55 : 0.4,
          height: item.height || (isAir ? 50000 : 0),
          phase: Math.random() * Math.PI * 2,
          speedFactor: item.unitType === 'SHIP' ? 0.05 : 0.18,
        }
        patrolStateMap.set(item.id, state)
        const ent = viewer.entities.getById(item.id)
        if (ent) bindPatrol(ent, state)
      }
    }
  }

  function tick(
    viewer: Cesium.Viewer,
    now: Cesium.JulianDate,
    shouldSkip: (id: string) => boolean,
    findItem: (id: string) => any,
  ) {
    patrolStateMap.forEach((state, id) => {
      const ent = viewer.entities.getById(id)
      if (!ent) return
      if (shouldSkip(id)) {
        ;(ent as any).__patrolBound = false
        return
      }
      if (!(ent as any).__patrolBound) bindPatrol(ent, state)
      const item = findItem(id)
      if (!item) return
      const pos = ent.position?.getValue(now)
      if (!pos) return
      const carto = Cesium.Cartographic.fromCartesian(pos)
      item.start.longitude = String(Cesium.Math.toDegrees(carto.longitude))
      item.start.latitude = String(Cesium.Math.toDegrees(carto.latitude))
    })
  }

  return {
    init,
    tick,
    has: (id: string) => patrolStateMap.has(id),
    clear: () => patrolStateMap.clear(),
  }
}
