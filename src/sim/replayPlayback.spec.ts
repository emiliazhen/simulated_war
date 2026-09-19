import { describe, expect, it } from 'vitest'
import { buildForces } from '@/mock/forces'
import type { SimEvent } from '@/sim/eventLog'
import {
  activeAttackPairs,
  activeExplosions,
  activeMoves,
  activeScans,
  enrichEvents,
  followUnitId,
  hiddenIdsAt,
  isUnitMoving,
  unitPoseAt,
} from '@/sim/replayPlayback'

const forces = buildForces()

function ev(partial: Partial<SimEvent> & Pick<SimEvent, 't' | 'type' | 'message'>): SimEvent {
  return partial
}

describe('hiddenIdsAt', () => {
  it('hides kill targets at and after kill time', () => {
    const events = [
      ev({ t: 10, type: 'kill', message: 'x', target: { id: 'H-06', label: 'h', unitType: 'UAV', faction: 'hostile', hpBefore: 0, hpAfter: 0 } }),
    ]
    expect(hiddenIdsAt(9.9, events).has('H-06')).toBe(false)
    expect(hiddenIdsAt(10, events).has('H-06')).toBe(true)
    expect(hiddenIdsAt(40, events).has('H-06')).toBe(true)
  })
})

describe('isUnitMoving / activeMoves', () => {
  const move: SimEvent = {
    t: 14,
    type: 'move',
    message: 'go',
    attacker: { id: 'F-10', label: 'uav', unitType: 'UAV', faction: 'friendly' },
    path: { fromLng: 124, fromLat: 24.7, toLng: 124.2, toLat: 25, height: 25000, durationSec: 16 },
  }
  it('is moving only inside [t, t+duration)', () => {
    expect(isUnitMoving('F-10', 13.9, [move])).toBe(false)
    expect(isUnitMoving('F-10', 14, [move])).toBe(true)
    expect(isUnitMoving('F-10', 29.9, [move])).toBe(true)
    expect(isUnitMoving('F-10', 30, [move])).toBe(false)
  })
  it('lists the in-progress move', () => {
    expect(activeMoves(20, [move]).map((e) => e.attacker?.id)).toEqual(['F-10'])
    expect(activeMoves(40, [move])).toEqual([])
  })
})

describe('unitPoseAt', () => {
  const F10 = forces.find((f) => f.id === 'F-10')!
  const move: SimEvent = {
    t: 14,
    type: 'move',
    message: 'go',
    attacker: { id: 'F-10', label: F10.label, unitType: 'UAV', faction: 'friendly' },
    path: { fromLng: 124, fromLat: 24.7, toLng: 124.4, toLat: 25.1, height: 25000, durationSec: 10 },
  }
  it('stays at force origin before the move', () => {
    const p = unitPoseAt('F-10', 0, [move], forces)!
    expect(p.lng).toBeCloseTo(F10.lng, 5)
    expect(p.lat).toBeCloseTo(F10.lat, 5)
  })
  it('snaps to destination after the move completes', () => {
    const p = unitPoseAt('F-10', 30, [move], forces)!
    expect(p.lng).toBeCloseTo(124.4, 5)
    expect(p.lat).toBeCloseTo(25.1, 5)
    expect(p.height).toBe(25000)
  })
  it('interpolates along the geodesic at mid-move', () => {
    const p = unitPoseAt('F-10', 19, [move], forces)!
    expect(p.lng).toBeGreaterThan(124)
    expect(p.lng).toBeLessThan(124.4)
    expect(p.lat).toBeGreaterThan(24.7)
    expect(p.lat).toBeLessThan(25.1)
  })
})

describe('followUnitId', () => {
  const move: SimEvent = {
    t: 14,
    type: 'move',
    message: 'go',
    attacker: { id: 'F-10', label: 'uav', unitType: 'UAV', faction: 'friendly' },
    path: { fromLng: 124, fromLat: 24.7, toLng: 124.2, toLat: 25, height: 25000, durationSec: 16 },
  }
  const boom: SimEvent = {
    t: 22,
    type: 'kill',
    message: 'boom',
    target: { id: 'H-06', label: 'h', unitType: 'UAV', faction: 'hostile', hpBefore: 0, hpAfter: 0 },
  }
  it('prefers the exploding focus target', () => {
    expect(followUnitId(22.5, [move, boom], 'H-06')).toBe('H-06')
  })
  it('follows a moving focus unit', () => {
    expect(followUnitId(20, [move], 'F-10')).toBe('F-10')
  })
  it('falls back to the latest in-progress move', () => {
    expect(followUnitId(20, [move], 'H-01')).toBe('F-10')
  })
})

describe('activeAttackPairs / scans / explosions', () => {
  const lock: SimEvent = {
    t: 18,
    type: 'lock',
    message: 'lock',
    attacker: { id: 'F-10', label: 'a', unitType: 'UAV', faction: 'friendly' },
    target: { id: 'H-06', label: 'b', unitType: 'UAV', faction: 'hostile', hpBefore: 160, hpAfter: 160 },
  }
  const kill: SimEvent = {
    t: 22,
    type: 'kill',
    message: 'k',
    target: { id: 'H-06', label: 'b', unitType: 'UAV', faction: 'hostile', hpBefore: 0, hpAfter: 0 },
  }
  const scan: SimEvent = {
    t: 4,
    type: 'scan',
    message: 's',
    attacker: { id: 'F-07', label: 'p', unitType: 'AIRCRAFT', faction: 'friendly' },
    durationSec: 3,
  }
  it('keeps the lock line until the target dies', () => {
    expect(activeAttackPairs(19, [lock, kill])).toEqual([{ from: 'F-10', to: 'H-06', side: undefined }])
    expect(activeAttackPairs(22, [lock, kill])).toEqual([])
  })
  it('shows scan during duration and explosion for 2s', () => {
    expect(activeScans(5, [scan]).length).toBe(1)
    expect(activeScans(8, [scan]).length).toBe(0)
    expect(activeExplosions(22.5, [kill]).length).toBe(1)
    expect(activeExplosions(24.1, [kill]).length).toBe(0)
  })
})

describe('enrichEvents', () => {
  it('fills radar range from the force profile', () => {
    const raw: SimEvent[] = [{
      t: 4,
      type: 'scan',
      message: 's',
      attacker: { id: 'F-07', label: '飞机-07', unitType: 'AIRCRAFT', faction: 'friendly' },
    }]
    const [out] = enrichEvents(raw, forces)
    expect(out.range).toBe(forces.find((f) => f.id === 'F-07')!.radarRange)
    expect(out.durationSec).toBe(3)
  })
})
