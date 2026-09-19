import * as Cesium from 'cesium'

export function updateSharedVision(opts: {
  viewer: Cesium.Viewer
  now: Cesium.JulianDate
  simSec: number
  multiplier: number
  lastVisionSim: { value: number }
  hostileIds: string[]
  collectHostileIds: () => void
  groups: any[]
  dead: Set<string>
  findItem: (id: string) => any
}) {
  const { viewer, now, simSec, multiplier, lastVisionSim, hostileIds, collectHostileIds, groups, dead, findItem } = opts
  if (multiplier < 200 && lastVisionSim.value >= 0 && simSec - lastVisionSim.value < 0.2) return
  lastVisionSim.value = simSec
  if (hostileIds.length === 0) collectHostileIds()
  const friendlySensors: Array<{ pos: Cesium.Cartesian3; range: number }> = []
  for (const group of groups || []) {
    if (group.faction !== 'friendly') continue
    for (const item of group.children || []) {
      if (dead.has(item.id)) continue
      const ent = viewer.entities.getById(item.id)
      const pos = ent?.position?.getValue(now)
      if (pos) friendlySensors.push({ pos, range: item.visionRange || 60000 })
    }
  }
  for (const hid of hostileIds) {
    if (dead.has(hid)) continue
    const ent = viewer.entities.getById(hid)
    if (!ent) continue
    const pos = ent.position?.getValue(now)
    if (!pos) continue
    let visible = false
    for (const s of friendlySensors) {
      if (Cesium.Cartesian3.distance(pos, s.pos) <= s.range) {
        visible = true
        break
      }
    }
    if (ent.show !== visible) {
      ent.show = visible
      const item = findItem(hid)
      if (item && item.faction === 'hostile') {
        if (visible && item._visibleLabel) item.label = item._visibleLabel
        else if (!visible && item._invisibleLabel) item.label = item._invisibleLabel
      }
    }
  }
}
