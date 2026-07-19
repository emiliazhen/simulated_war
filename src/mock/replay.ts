/// <reference types="vite/client" />
/**
 * 回放 Mock 剧本：友军与敌对单位的简单"有来有回"时间线复盘（最终友军胜利）。
 * 不渲染 Cesium，仅产出事件数据供回放页面驱动进度条/事件列表/统计图表。
 */

export type Faction = 'friendly' | 'hostile'
export type ReplayEventType = 'move' | 'attack' | 'kill' | 'scan' | 'weather' | 'info'

export interface ReplayEvent {
  /** 相对开始的秒数 */
  t: number
  type: ReplayEventType
  side?: Faction
  attacker?: { id: string; label: string; unitType: string; faction: Faction }
  target?: { id: string; label: string; unitType: string; faction: Faction; hpBefore: number; hpAfter: number }
  message: string
}

export interface ReplayUnit {
  id: string
  label: string
  unitType: string
  faction: Faction
  maxHp: number
  /** 相对秒 → HP 快照，从 t=0 (100%) 到最后剩余(0% 若被击毁) */
  hpTimeline: Array<{ t: number; hp: number }>
}

/** 简化单位集合（与 mock/forces.ts 保持命名风格，但本剧本不依赖该数据） */
export const replayUnits: ReplayUnit[] = [
  // 友军
  { id: 'F-01', label: '编组-01·海面', unitType: 'SHIP', faction: 'friendly', maxHp: 1000, hpTimeline: [] },
  { id: 'F-02', label: '编组-02·海面', unitType: 'SHIP', faction: 'friendly', maxHp: 1000, hpTimeline: [] },
  { id: 'F-03', label: '编组-07·空中', unitType: 'AIRCRAFT', faction: 'friendly', maxHp: 400, hpTimeline: [] },
  { id: 'F-04', label: '编组-10·无人', unitType: 'UAV', faction: 'friendly', maxHp: 160, hpTimeline: [] },
  { id: 'F-05', label: '编组-12·地面', unitType: 'GROUND', faction: 'friendly', maxHp: 600, hpTimeline: [] },
  // 敌对
  { id: 'H-01', label: '单位-H01·海面', unitType: 'SHIP', faction: 'hostile', maxHp: 1000, hpTimeline: [] },
  { id: 'H-02', label: '单位-H04·空中', unitType: 'AIRCRAFT', faction: 'hostile', maxHp: 400, hpTimeline: [] },
  { id: 'H-03', label: '单位-H06·无人', unitType: 'UAV', faction: 'hostile', maxHp: 160, hpTimeline: [] },
  { id: 'H-04', label: '单位-H07·地面', unitType: 'GROUND', faction: 'hostile', maxHp: 600, hpTimeline: [] },
  { id: 'H-05', label: '单位-H02·海面', unitType: 'SHIP', faction: 'hostile', maxHp: 1000, hpTimeline: [] },
]

/** 用秒数整齐的时间线，便于交互拖动 */
const TIMELINE_SECONDS = 120

const ev = (
  t: number,
  type: ReplayEventType,
  message: string,
  extra: Partial<ReplayEvent> = {},
): ReplayEvent => ({ t, type, message, ...extra })

function setHp(id: string, timeline: Array<{ t: number; hp: number }>) {
  const u = replayUnits.find((x) => x.id === id)
  if (u) u.hpTimeline = timeline
}

/** 预编排剧本：有来有回，最终友军胜利。 */
export const replayEvents: ReplayEvent[] = [
  ev(2, 'info', '态势开始 · 友军与敌对单位进入预设海区'),
  ev(4, 'scan', 'F-03 空中单位完成雷达扫描，发现 H-02 / H-03', { side: 'friendly', attacker: { id: 'F-03', label: '编组-07·空中', unitType: 'AIRCRAFT', faction: 'friendly' } }),
  ev(8, 'weather', '天气切换：晴 → 多云'),
  ev(14, 'move', 'F-04 UAV 机动靠近敌对 H-03 无人目标', { side: 'friendly', attacker: { id: 'F-04', label: '编组-10·无人', unitType: 'UAV', faction: 'friendly' } }),

  ev(18, 'attack', 'F-04 UAV 对 H-03 UAV 发起攻击，命中', {
    side: 'friendly',
    attacker: { id: 'F-04', label: '编组-10·无人', unitType: 'UAV', faction: 'friendly' },
    target: { id: 'H-03', label: '单位-H06·无人', unitType: 'UAV', faction: 'hostile', hpBefore: 160, hpAfter: 70 },
  }),
  ev(22, 'attack', 'F-04 UAV 第二轮攻击，H-03 被击毁', {
    side: 'friendly',
    attacker: { id: 'F-04', label: '编组-10·无人', unitType: 'UAV', faction: 'friendly' },
    target: { id: 'H-03', label: '单位-H06·无人', unitType: 'UAV', faction: 'hostile', hpBefore: 70, hpAfter: 0 },
  }),
  ev(22, 'kill', '敌对 H-03 UAV 被击毁 · 爆炸 + 冲击波', { side: 'hostile', target: { id: 'H-03', label: '单位-H06·无人', unitType: 'UAV', faction: 'hostile', hpBefore: 70, hpAfter: 0 } }),

  ev(30, 'attack', '敌对 H-02 空中单位反击 F-04 UAV，命中', {
    side: 'hostile',
    attacker: { id: 'H-02', label: '单位-H04·空中', unitType: 'AIRCRAFT', faction: 'hostile' },
    target: { id: 'F-04', label: '编组-10·无人', unitType: 'UAV', faction: 'friendly', hpBefore: 160, hpAfter: 0 },
  }),
  ev(30, 'kill', '友军 F-04 UAV 被击毁', { side: 'friendly', target: { id: 'F-04', label: '编组-10·无人', unitType: 'UAV', faction: 'friendly', hpBefore: 160, hpAfter: 0 } }),

  ev(36, 'info', '风场开启 · 海面持续向量场渲染'),
  ev(42, 'attack', 'F-03 空中单位锁定 H-02 并命中', {
    side: 'friendly',
    attacker: { id: 'F-03', label: '编组-07·空中', unitType: 'AIRCRAFT', faction: 'friendly' },
    target: { id: 'H-02', label: '单位-H04·空中', unitType: 'AIRCRAFT', faction: 'hostile', hpBefore: 400, hpAfter: 220 },
  }),
  ev(48, 'attack', 'F-03 二轮攻击，H-02 残存 40 HP', {
    side: 'friendly',
    attacker: { id: 'F-03', label: '编组-07·空中', unitType: 'AIRCRAFT', faction: 'friendly' },
    target: { id: 'H-02', label: '单位-H04·空中', unitType: 'AIRCRAFT', faction: 'hostile', hpBefore: 220, hpAfter: 40 },
  }),
  ev(54, 'attack', 'H-02 反击 F-03，F-03 残存 120 HP', {
    side: 'hostile',
    attacker: { id: 'H-02', label: '单位-H04·空中', unitType: 'AIRCRAFT', faction: 'hostile' },
    target: { id: 'F-03', label: '编组-07·空中', unitType: 'AIRCRAFT', faction: 'friendly', hpBefore: 400, hpAfter: 120 },
  }),
  ev(60, 'attack', 'F-03 第三轮攻击，H-02 被击毁', {
    side: 'friendly',
    attacker: { id: 'F-03', label: '编组-07·空中', unitType: 'AIRCRAFT', faction: 'friendly' },
    target: { id: 'H-02', label: '单位-H04·空中', unitType: 'AIRCRAFT', faction: 'hostile', hpBefore: 40, hpAfter: 0 },
  }),
  ev(60, 'kill', '敌对 H-02 空中单位被击毁', { side: 'hostile', target: { id: 'H-02', label: '单位-H04·空中', unitType: 'AIRCRAFT', faction: 'hostile', hpBefore: 40, hpAfter: 0 } }),

  ev(70, 'attack', '敌对 H-04 地面单位对 F-05 地面单位开火', {
    side: 'hostile',
    attacker: { id: 'H-04', label: '单位-H07·地面', unitType: 'GROUND', faction: 'hostile' },
    target: { id: 'F-05', label: '编组-12·地面', unitType: 'GROUND', faction: 'friendly', hpBefore: 600, hpAfter: 500 },
  }),
  ev(74, 'attack', 'F-05 反击 H-04，H-04 残存 500 HP', {
    side: 'friendly',
    attacker: { id: 'F-05', label: '编组-12·地面', unitType: 'GROUND', faction: 'friendly' },
    target: { id: 'H-04', label: '单位-H07·地面', unitType: 'GROUND', faction: 'hostile', hpBefore: 600, hpAfter: 500 },
  }),
  ev(80, 'attack', 'F-01 / F-02 联合攻击 H-04，H-04 被击毁', {
    side: 'friendly',
    attacker: { id: 'F-01', label: '编组-01·海面', unitType: 'SHIP', faction: 'friendly' },
    target: { id: 'H-04', label: '单位-H07·地面', unitType: 'GROUND', faction: 'hostile', hpBefore: 500, hpAfter: 0 },
  }),
  ev(80, 'kill', '敌对 H-04 地面单位被击毁', { side: 'hostile', target: { id: 'H-04', label: '单位-H07·地面', unitType: 'GROUND', faction: 'hostile', hpBefore: 500, hpAfter: 0 } }),

  ev(86, 'attack', '敌对 H-01 海面单位攻击 F-01，F-01 残存 700 HP', {
    side: 'hostile',
    attacker: { id: 'H-01', label: '单位-H01·海面', unitType: 'SHIP', faction: 'hostile' },
    target: { id: 'F-01', label: '编组-01·海面', unitType: 'SHIP', faction: 'friendly', hpBefore: 1000, hpAfter: 700 },
  }),
  ev(92, 'attack', 'F-01 反击 H-01，H-01 残存 720 HP', {
    side: 'friendly',
    attacker: { id: 'F-01', label: '编组-01·海面', unitType: 'SHIP', faction: 'friendly' },
    target: { id: 'H-01', label: '单位-H01·海面', unitType: 'SHIP', faction: 'hostile', hpBefore: 1000, hpAfter: 720 },
  }),
  ev(98, 'attack', '敌对 H-05 海面单位支援 H-01，攻击 F-02，F-02 残存 750 HP', {
    side: 'hostile',
    attacker: { id: 'H-05', label: '单位-H02·海面', unitType: 'SHIP', faction: 'hostile' },
    target: { id: 'F-02', label: '编组-02·海面', unitType: 'SHIP', faction: 'friendly', hpBefore: 1000, hpAfter: 750 },
  }),
  ev(104, 'attack', 'F-01 联合 F-02 攻击 H-01，H-01 被击毁', {
    side: 'friendly',
    attacker: { id: 'F-01', label: '编组-01·海面', unitType: 'SHIP', faction: 'friendly' },
    target: { id: 'H-01', label: '单位-H01·海面', unitType: 'SHIP', faction: 'hostile', hpBefore: 720, hpAfter: 0 },
  }),
  ev(104, 'kill', '敌对 H-01 海面单位被击毁', { side: 'hostile', target: { id: 'H-01', label: '单位-H01·海面', unitType: 'SHIP', faction: 'hostile', hpBefore: 720, hpAfter: 0 } }),
  ev(108, 'attack', 'F-01 持续攻击 H-05，H-05 残存 200 HP', {
    side: 'friendly',
    attacker: { id: 'F-01', label: '编组-01·海面', unitType: 'SHIP', faction: 'friendly' },
    target: { id: 'H-05', label: '单位-H02·海面', unitType: 'SHIP', faction: 'hostile', hpBefore: 1000, hpAfter: 200 },
  }),
  ev(114, 'attack', '敌对 H-05 最后反击 F-02，F-02 残存 620 HP', {
    side: 'hostile',
    attacker: { id: 'H-05', label: '单位-H02·海面', unitType: 'SHIP', faction: 'hostile' },
    target: { id: 'F-02', label: '编组-02·海面', unitType: 'SHIP', faction: 'friendly', hpBefore: 750, hpAfter: 620 },
  }),
  ev(118, 'attack', 'F-01 / F-02 联合攻击 H-05，H-05 被击毁', {
    side: 'friendly',
    attacker: { id: 'F-01', label: '编组-01·海面', unitType: 'SHIP', faction: 'friendly' },
    target: { id: 'H-05', label: '单位-H02·海面', unitType: 'SHIP', faction: 'hostile', hpBefore: 200, hpAfter: 0 },
  }),
  ev(118, 'kill', '敌对 H-05 海面单位被击毁', { side: 'hostile', target: { id: 'H-05', label: '单位-H02·海面', unitType: 'SHIP', faction: 'hostile', hpBefore: 200, hpAfter: 0 } }),
  ev(120, 'info', '回放结束 · 友军胜利：所有敌对单位已被歼灭'),
]

/** 友军最终胜利 */
export const replayResult: 'win' | 'lose' = 'win'

/** 为每个单位生成 HP 时间线（基于 attack/kill 事件推算） */
export function buildHpTimelines() {
  // 起始满血
  for (const u of replayUnits) u.hpTimeline = [{ t: 0, hp: u.maxHp }]
  const sorted = [...replayEvents].filter((e) => e.type === 'attack' || e.type === 'kill').sort((a, b) => a.t - b.t)
  for (const e of sorted) {
    const tgt = e.target
    if (!tgt) continue
    const u = replayUnits.find((x) => x.id === tgt.id)
    if (!u) continue
    const last = u.hpTimeline[u.hpTimeline.length - 1]
    // 从 attack.target.hpBefore/hpAfter 中精确还原伤害
    const nextHp = tgt.hpAfter
    if (last.t === e.t) {
      last.hp = nextHp
    } else {
      u.hpTimeline.push({ t: e.t, hp: nextHp })
    }
    // 直到结束都保持该 HP
    u.hpTimeline.push({ t: TIMELINE_SECONDS, hp: nextHp })
  }
  // 压缩重复
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