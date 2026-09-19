import { reactive } from 'vue'

export type Faction = 'friendly' | 'hostile'
export type SimEventType = 'move' | 'attack' | 'kill' | 'scan' | 'weather' | 'info' | 'lock'

export type GeoPose = { lng: number; lat: number; height: number }

export type MovePath = {
  fromLng: number
  fromLat: number
  toLng: number
  toLat: number
  height: number
  durationSec: number
}

export interface SimEvent {
  t: number
  type: SimEventType
  side?: Faction
  message: string
  attacker?: { id: string; label: string; unitType: string; faction: Faction }
  target?: { id: string; label: string; unitType: string; faction: Faction; hpBefore: number; hpAfter: number }
  /** 机动大地线（回放插值用） */
  path?: MovePath
  /** 事件发生位置（击毁爆炸 / 雷达中心） */
  pose?: GeoPose
  fromPose?: GeoPose
  toPose?: GeoPose
  /** 雷达半径（米） */
  range?: number
  durationSec?: number
}

export interface SimUnitSnap {
  id: string
  label: string
  unitType: string
  faction: Faction
  maxHp: number
  hpTimeline: Array<{ t: number; hp: number }>
}

const units = new Map<string, SimUnitSnap>()
const events = reactive<SimEvent[]>([])

export function resetBattleLog() {
  events.length = 0
  units.clear()
}

export function registerLogUnit(u: { id: string; label: string; unitType: string; faction: Faction; maxHp: number; hp?: number }) {
  units.set(u.id, {
    id: u.id,
    label: u.label,
    unitType: u.unitType,
    faction: u.faction,
    maxHp: u.maxHp,
    hpTimeline: [{ t: 0, hp: u.hp ?? u.maxHp }],
  })
}

export function pushSimEvent(e: SimEvent) {
  events.push(e)
  if (e.target && (e.type === 'attack' || e.type === 'kill')) {
    const u = units.get(e.target.id)
    if (u) u.hpTimeline.push({ t: e.t, hp: e.target.hpAfter })
  }
}

export function getLiveEvents(): SimEvent[] {
  return events
}

export function getLiveUnits(): SimUnitSnap[] {
  return Array.from(units.values())
}

export function liveReplayTotalSeconds() {
  if (!events.length) return 0
  return Math.max(30, Math.ceil(events[events.length - 1].t + 4))
}

export function hasLiveReplay() {
  return events.some((e) => e.type === 'move' || e.type === 'attack' || e.type === 'kill' || e.type === 'scan' || e.type === 'lock')
}
