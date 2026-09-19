import * as Cesium from 'cesium'
import type { ForceState } from '@/mock/forces'
import type { GeoPose, MovePath, SimEvent } from '@/sim/eventLog'

export type PlaybackEvent = SimEvent

const geodesicCache = new Map<string, Cesium.EllipsoidGeodesic>()

function pathKey(p: MovePath) {
  return `${p.fromLng},${p.fromLat},${p.toLng},${p.toLat}`
}

function geodesicFor(path: MovePath) {
  const key = pathKey(path)
  let g = geodesicCache.get(key)
  if (!g) {
    g = new Cesium.EllipsoidGeodesic(
      Cesium.Cartographic.fromDegrees(path.fromLng, path.fromLat),
      Cesium.Cartographic.fromDegrees(path.toLng, path.toLat),
    )
    geodesicCache.set(key, g)
  }
  return g
}

function forceById(forces: ForceState[], id: string) {
  return forces.find((f) => f.id === id)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function nextAttackTargetId(events: PlaybackEvent[], move: PlaybackEvent) {
  const attackerId = move.attacker?.id
  if (!attackerId) return ''
  if (move.target?.id) return move.target.id
  for (const e of events) {
    if (e.t < move.t) continue
    if ((e.type === 'attack' || e.type === 'lock') && e.attacker?.id === attackerId && e.target?.id) {
      return e.target.id
    }
  }
  return ''
}

/** 补全 mock / 旧日志里缺失的 path、雷达半径，便于回放出轨迹和特效。 */
export function enrichEvents(events: PlaybackEvent[], forces: ForceState[]): PlaybackEvent[] {
  return events.map((e) => {
    const copy: PlaybackEvent = { ...e }
    if (copy.type === 'scan') {
      const u = forceById(forces, copy.attacker?.id || '')
      if (copy.range == null) copy.range = u?.radarRange || 60000
      if (copy.durationSec == null) copy.durationSec = 3
      if (!copy.pose && u) copy.pose = { lng: u.lng, lat: u.lat, height: u.height || 0 }
    }
    if (copy.type === 'move' && !copy.path && copy.attacker?.id) {
      const from = forceById(forces, copy.attacker.id)
      if (from) {
        const to = forceById(forces, nextAttackTargetId(events, copy))
        copy.path = {
          fromLng: from.lng,
          fromLat: from.lat,
          toLng: to ? lerp(from.lng, to.lng, 0.32) : from.lng + 0.28,
          toLat: to ? lerp(from.lat, to.lat, 0.32) : from.lat + 0.22,
          height: from.height || 0,
          durationSec: copy.durationSec || 16,
        }
      }
    }
    return copy
  })
}

export function unitPoseAt(id: string, t: number, events: PlaybackEvent[], forces: ForceState[]): GeoPose | null {
  const force = forceById(forces, id)
  if (!force) return null
  let lng = force.lng
  let lat = force.lat
  let height = force.height || 0
  for (const e of events) {
    if (e.type !== 'move' || e.attacker?.id !== id || !e.path) continue
    if (e.t > t) continue
    const dur = Math.max(0.2, e.path.durationSec || 1)
    const frac = (t - e.t) / dur
    height = e.path.height
    if (frac >= 1) {
      lng = e.path.toLng
      lat = e.path.toLat
    } else if (frac > 0) {
      const carto = geodesicFor(e.path).interpolateUsingFraction(frac, new Cesium.Cartographic())
      lng = Cesium.Math.toDegrees(carto.longitude)
      lat = Cesium.Math.toDegrees(carto.latitude)
    } else {
      lng = e.path.fromLng
      lat = e.path.fromLat
    }
  }
  return { lng, lat, height }
}

export function unitCartesian(id: string, t: number, events: PlaybackEvent[], forces: ForceState[], result?: Cesium.Cartesian3) {
  const pose = unitPoseAt(id, t, events, forces)
  if (!pose) return Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO, result)
  return Cesium.Cartesian3.fromDegrees(pose.lng, pose.lat, pose.height, undefined, result)
}

export function isUnitMoving(id: string, t: number, events: PlaybackEvent[]) {
  return events.some((e) => (
    e.type === 'move'
    && e.attacker?.id === id
    && e.path
    && t >= e.t
    && t < e.t + Math.max(0.2, e.path.durationSec || 1)
  ))
}

export function activeMoves(t: number, events: PlaybackEvent[]) {
  return events.filter((e) => (
    e.type === 'move'
    && e.attacker?.id
    && e.path
    && t >= e.t
    && t < e.t + Math.max(0.2, e.path.durationSec || 1)
  ))
}

export function hiddenIdsAt(t: number, events: PlaybackEvent[]) {
  const dead = new Set<string>()
  for (const e of events) {
    if (e.t > t) continue
    if (e.type === 'kill' && e.target?.id) dead.add(e.target.id)
  }
  return dead
}

export function activeAttackPairs(t: number, events: PlaybackEvent[]) {
  const pairs = new Map<string, { from: string; to: string; side?: string }>()
  const dead = hiddenIdsAt(t, events)
  for (const e of events) {
    if (e.t > t) continue
    if ((e.type !== 'lock' && e.type !== 'attack') || !e.attacker?.id || !e.target?.id) continue
    if (dead.has(e.attacker.id) || dead.has(e.target.id)) continue
    if (t - e.t > 8) continue
    pairs.set(`${e.attacker.id}->${e.target.id}`, { from: e.attacker.id, to: e.target.id, side: e.side })
  }
  return Array.from(pairs.values())
}

export function activeScans(t: number, events: PlaybackEvent[]) {
  return events.filter((e) => (
    e.type === 'scan'
    && e.attacker?.id
    && t >= e.t
    && t < e.t + (e.durationSec || 3)
  ))
}

export function activeExplosions(t: number, events: PlaybackEvent[]) {
  return events.filter((e) => (
    e.type === 'kill'
    && e.target?.id
    && t >= e.t
    && t < e.t + 2
  ))
}

export function followUnitId(t: number, events: PlaybackEvent[], focusId?: string) {
  const booms = activeExplosions(t, events)
  if (focusId && booms.some((e) => e.target?.id === focusId)) return focusId
  if (focusId && isUnitMoving(focusId, t, events)) return focusId
  const moves = activeMoves(t, events)
  if (moves.length) return moves[moves.length - 1].attacker?.id || ''
  return focusId || ''
}
