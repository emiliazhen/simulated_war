import * as Cesium from 'cesium'

export const ATTACK_INTERVAL_S = 1.5
export const BULLET_DURATION_S = 0.35

export type BulletMeta = {
  attackerId: string
  targetId: string
  targetReached: boolean
  tStart: Cesium.JulianDate
  duration: number
  startPos: Cesium.Cartesian3
  targetPos: Cesium.Cartesian3
}

export type LockState = { attackerId: string; targetId: string; cooldownUntil: number }

export function fireBullet(opts: {
  viewer: Cesium.Viewer
  bullets: Map<string, BulletMeta>
  attackerId: string
  targetId: string
  startPos: Cesium.Cartesian3
  targetPos: Cesium.Cartesian3
  tStart: Cesium.JulianDate
  colorCss: string
}) {
  const { viewer, bullets, attackerId, targetId, startPos, targetPos, tStart, colorCss } = opts
  const bulletColor = Cesium.Color.fromCssColorString(colorCss)
  const bid = `bullet-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
  const meta: BulletMeta = {
    attackerId,
    targetId,
    targetReached: false,
    tStart: tStart.clone(),
    duration: BULLET_DURATION_S,
    startPos: Cesium.Cartesian3.clone(startPos),
    targetPos: Cesium.Cartesian3.clone(targetPos),
  }
  bullets.set(bid, meta)
  viewer.entities.add({
    id: bid,
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const start = meta.startPos
        const end = meta.targetPos
        if (meta.targetReached) return [end, end]
        const elapsed = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, meta.tStart)
        const t = Math.max(0, Math.min(1, elapsed / meta.duration))
        const cur = new Cesium.Cartesian3(
          start.x + (end.x - start.x) * t,
          start.y + (end.y - start.y) * t,
          start.z + (end.z - start.z) * t,
        )
        return [start, cur]
      }, false),
      width: 4,
      material: new Cesium.PolylineArrowMaterialProperty(bulletColor),
      arcType: Cesium.ArcType.NONE,
      clampToGround: false,
    },
  })
  return bid
}

export function updateBullets(opts: {
  viewer: Cesium.Viewer
  now: Cesium.JulianDate
  bullets: Map<string, BulletMeta>
  onHit: (attackerId: string, targetId: string) => void
}) {
  const { viewer, now, bullets, onHit } = opts
  bullets.forEach((meta, bid) => {
    const elapsed = Cesium.JulianDate.secondsDifference(now, meta.tStart)
    if (!meta.targetReached && elapsed >= BULLET_DURATION_S) {
      meta.targetReached = true
      onHit(meta.attackerId, meta.targetId)
    }
    if (elapsed >= BULLET_DURATION_S + 0.08) {
      viewer.entities.removeById(bid)
      bullets.delete(bid)
    }
  })
}

export function updateLocks(opts: {
  viewer: Cesium.Viewer
  now: Cesium.JulianDate
  locks: Map<string, LockState>
  dead: Set<string>
  findItem: (id: string) => { attackRange?: number; faction?: string } | undefined
  fire: (attackerId: string, targetId: string, atkPos: Cesium.Cartesian3, tgtPos: Cesium.Cartesian3, now: Cesium.JulianDate) => void
}) {
  const { viewer, now, locks, dead, findItem, fire } = opts
  const nowSecs = Cesium.JulianDate.secondsDifference(now, viewer.clock.startTime)
  locks.forEach((state, attackerId) => {
    if (dead.has(attackerId) || dead.has(state.targetId)) return
    if (nowSecs < (state.cooldownUntil || 0)) return
    const attacker = viewer.entities.getById(attackerId)
    const target = viewer.entities.getById(state.targetId)
    if (!attacker || !target) return
    const atkPos = attacker.position?.getValue(now)
    const tgtPos = target.position?.getValue(now)
    if (!atkPos || !tgtPos) return
    const attackerItem = findItem(attackerId)
    if (!attackerItem) return
    const range = attackerItem.attackRange || 20000
    if (Cesium.Cartesian3.distance(atkPos, tgtPos) <= range) {
      fire(attackerId, state.targetId, atkPos, tgtPos, now)
      state.cooldownUntil = nowSecs + ATTACK_INTERVAL_S
    }
  })
}
