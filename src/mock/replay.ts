/**
 * 回放预编排剧本。单位 ID / 类型 / 名称 / 坐标与 mock/forces.ts 一致。
 */
import { buildForces, type ForceState } from '@/mock/forces'
import type { SimEvent, SimEventType, SimUnitSnap } from '@/sim/eventLog'

const forceMap = new Map(buildForces().map((u) => [u.id, u]))

function force(id: string): ForceState {
  const u = forceMap.get(id)
  if (!u) throw new Error(`unknown force ${id}`)
  return u
}

function actor(id: string) {
  const u = force(id)
  return { id: u.id, label: u.label, unitType: u.unitType, faction: u.faction }
}

function tgt(id: string, hpBefore: number, hpAfter: number) {
  return { ...actor(id), hpBefore, hpAfter }
}

function hop(fromId: string, toId: string, frac: number) {
  const a = force(fromId)
  const b = force(toId)
  return {
    fromLng: a.lng,
    fromLat: a.lat,
    toLng: a.lng + (b.lng - a.lng) * frac,
    toLat: a.lat + (b.lat - a.lat) * frac,
    height: a.height,
  }
}

/** 参演单位：与地图编成同一套 ID */
const CAST_IDS = ['F-01', 'F-02', 'F-07', 'F-10', 'F-12', 'H-01', 'H-02', 'H-04', 'H-06', 'H-07'] as const

export const replayUnits: SimUnitSnap[] = CAST_IDS.map((id) => {
  const u = force(id)
  return {
    id: u.id,
    label: u.label,
    unitType: u.unitType,
    faction: u.faction,
    maxHp: u.maxHp,
    hpTimeline: [],
  }
})

const TIMELINE_SECONDS = 120

const ev = (
  t: number,
  type: SimEventType,
  message: string,
  extra: Partial<SimEvent> = {},
): SimEvent => ({ t, type, message, ...extra })

export const replayEvents: SimEvent[] = [
  ev(2, 'info', '态势开始 · 友军与敌对单位进入预设海区'),
  ev(4, 'scan', `${force('F-07').label} 完成雷达扫描，发现 ${force('H-04').label} / ${force('H-06').label}`, {
    side: 'friendly',
    attacker: actor('F-07'),
    range: force('F-07').radarRange,
    durationSec: 3,
  }),
  ev(8, 'weather', '天气切换：晴 → 多云'),
  ev(14, 'move', `${force('F-10').label} 机动靠近 ${force('H-06').label}`, {
    side: 'friendly',
    attacker: actor('F-10'),
    target: tgt('H-06', force('H-06').hp, force('H-06').hp),
    path: { ...hop('F-10', 'H-06', 0.22), durationSec: 16 },
  }),
  ev(18, 'lock', `${force('F-10').label} 锁定 ${force('H-06').label}`, {
    side: 'friendly',
    attacker: actor('F-10'),
    target: tgt('H-06', force('H-06').hp, force('H-06').hp),
  }),
  ev(18, 'attack', `${force('F-10').label} 对 ${force('H-06').label} 发起攻击，命中`, {
    side: 'friendly',
    attacker: actor('F-10'),
    target: tgt('H-06', 160, 70),
  }),
  ev(22, 'attack', `${force('F-10').label} 第二轮攻击，${force('H-06').label} 被击毁`, {
    side: 'friendly',
    attacker: actor('F-10'),
    target: tgt('H-06', 70, 0),
  }),
  ev(22, 'kill', `敌对 ${force('H-06').label} 被击毁 · 爆炸 + 冲击波`, {
    side: 'hostile',
    target: tgt('H-06', 70, 0),
  }),
  ev(30, 'attack', `${force('H-04').label} 反击 ${force('F-10').label}，命中`, {
    side: 'hostile',
    attacker: actor('H-04'),
    target: tgt('F-10', 160, 0),
  }),
  ev(30, 'kill', `友军 ${force('F-10').label} 被击毁`, {
    side: 'friendly',
    target: tgt('F-10', 160, 0),
  }),
  ev(32, 'move', `${force('F-07').label} 向 ${force('H-04').label} 机动接敌`, {
    side: 'friendly',
    attacker: actor('F-07'),
    target: tgt('H-04', 400, 400),
    path: { ...hop('F-07', 'H-04', 0.22), durationSec: 26 },
  }),
  ev(36, 'info', '风场开启 · 海面持续向量场渲染'),
  ev(38, 'scan', `${force('F-07').label} 接敌前雷达扫描`, {
    side: 'friendly',
    attacker: actor('F-07'),
    range: force('F-07').radarRange,
    durationSec: 3,
  }),
  ev(42, 'attack', `${force('F-07').label} 锁定 ${force('H-04').label} 并命中`, {
    side: 'friendly',
    attacker: actor('F-07'),
    target: tgt('H-04', 400, 220),
  }),
  ev(48, 'attack', `${force('F-07').label} 二轮攻击，${force('H-04').label} 残存 40 HP`, {
    side: 'friendly',
    attacker: actor('F-07'),
    target: tgt('H-04', 220, 40),
  }),
  ev(54, 'attack', `${force('H-04').label} 反击 ${force('F-07').label}，残存 120 HP`, {
    side: 'hostile',
    attacker: actor('H-04'),
    target: tgt('F-07', 400, 120),
  }),
  ev(60, 'attack', `${force('F-07').label} 第三轮攻击，${force('H-04').label} 被击毁`, {
    side: 'friendly',
    attacker: actor('F-07'),
    target: tgt('H-04', 40, 0),
  }),
  ev(60, 'kill', `敌对 ${force('H-04').label} 被击毁`, {
    side: 'hostile',
    target: tgt('H-04', 40, 0),
  }),
  ev(70, 'attack', `${force('H-07').label} 对 ${force('F-12').label} 开火`, {
    side: 'hostile',
    attacker: actor('H-07'),
    target: tgt('F-12', 600, 500),
  }),
  ev(74, 'attack', `${force('F-12').label} 反击 ${force('H-07').label}，残存 500 HP`, {
    side: 'friendly',
    attacker: actor('F-12'),
    target: tgt('H-07', 600, 500),
  }),
  ev(80, 'attack', `${force('F-01').label} 联合攻击 ${force('H-07').label}，将其击毁`, {
    side: 'friendly',
    attacker: actor('F-01'),
    target: tgt('H-07', 500, 0),
  }),
  ev(80, 'kill', `敌对 ${force('H-07').label} 被击毁`, {
    side: 'hostile',
    target: tgt('H-07', 500, 0),
  }),
  ev(86, 'attack', `${force('H-01').label} 攻击 ${force('F-01').label}，残存 700 HP`, {
    side: 'hostile',
    attacker: actor('H-01'),
    target: tgt('F-01', 1000, 700),
  }),
  ev(92, 'attack', `${force('F-01').label} 反击 ${force('H-01').label}，残存 720 HP`, {
    side: 'friendly',
    attacker: actor('F-01'),
    target: tgt('H-01', 1000, 720),
  }),
  ev(98, 'attack', `${force('H-02').label} 支援攻击 ${force('F-02').label}，残存 750 HP`, {
    side: 'hostile',
    attacker: actor('H-02'),
    target: tgt('F-02', 1000, 750),
  }),
  ev(104, 'attack', `${force('F-01').label} 联合 ${force('F-02').label} 击毁 ${force('H-01').label}`, {
    side: 'friendly',
    attacker: actor('F-01'),
    target: tgt('H-01', 720, 0),
  }),
  ev(104, 'kill', `敌对 ${force('H-01').label} 被击毁`, {
    side: 'hostile',
    target: tgt('H-01', 720, 0),
  }),
  ev(108, 'attack', `${force('F-01').label} 持续攻击 ${force('H-02').label}，残存 200 HP`, {
    side: 'friendly',
    attacker: actor('F-01'),
    target: tgt('H-02', 1000, 200),
  }),
  ev(114, 'attack', `${force('H-02').label} 最后反击 ${force('F-02').label}，残存 620 HP`, {
    side: 'hostile',
    attacker: actor('H-02'),
    target: tgt('F-02', 750, 620),
  }),
  ev(118, 'attack', `${force('F-01').label} / ${force('F-02').label} 联合击毁 ${force('H-02').label}`, {
    side: 'friendly',
    attacker: actor('F-01'),
    target: tgt('H-02', 200, 0),
  }),
  ev(118, 'kill', `敌对 ${force('H-02').label} 被击毁`, {
    side: 'hostile',
    target: tgt('H-02', 200, 0),
  }),
  ev(120, 'info', '回放结束 · 友军胜利：参战敌对单位已被歼灭'),
]

export const replayResult: 'win' | 'lose' = 'win'

export function buildHpTimelines() {
  for (const u of replayUnits) u.hpTimeline = [{ t: 0, hp: u.maxHp }]
  const sorted = [...replayEvents].filter((e) => e.type === 'attack' || e.type === 'kill').sort((a, b) => a.t - b.t)
  for (const e of sorted) {
    const tgtEv = e.target
    if (!tgtEv) continue
    const u = replayUnits.find((x) => x.id === tgtEv.id)
    if (!u) continue
    const last = u.hpTimeline[u.hpTimeline.length - 1]
    const nextHp = tgtEv.hpAfter
    if (last.t === e.t) last.hp = nextHp
    else u.hpTimeline.push({ t: e.t, hp: nextHp })
    u.hpTimeline.push({ t: TIMELINE_SECONDS, hp: nextHp })
  }
  for (const u of replayUnits) {
    const merged: Array<{ t: number; hp: number }> = []
    for (const p of u.hpTimeline) {
      const last = merged[merged.length - 1]
      if (last && last.hp === p.hp) continue
      merged.push(p)
    }
    u.hpTimeline = merged
  }
}

export const REPLAY_TOTAL_SECONDS = TIMELINE_SECONDS
