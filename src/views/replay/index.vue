<template>
  <div class="replay-wrap">
    <aside class="replay-aside">
      <header>
        <div class="title">回放记录</div>
        <div class="filter">
          <button :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</button>
          <button :class="{ active: filter === 'friendly' }" @click="filter = 'friendly'">友军</button>
          <button :class="{ active: filter === 'hostile' }" @click="filter = 'hostile'">敌对</button>
        </div>
      </header>
      <ul class="event-list">
        <li
          v-for="item in filteredEvents"
          :key="item._idx"
          :class="['event-item', item.side, item.type, { current: focusKey === eventKey(item) }]"
          @click="seek(item.t)"
        >
          <span class="ev-time">{{ formatTime(item.t) }}</span>
          <span class="ev-side" :class="item.side">{{ sideText(item.side) }}</span>
          <span class="ev-icon">{{ iconText(item.type) }}</span>
          <span class="ev-text">{{ item.message }}</span>
        </li>
        <li v-if="!filteredEvents.length" class="empty">进度拖拽时此处显示对应记录</li>
      </ul>
    </aside>

    <section class="replay-stage">
      <button class="replay-close" title="退出回放" @click="leave">
        <svg-icon name="ele-Close" :size="22" />
      </button>

      <div class="map-hud">
        <div class="hud-title">
          <p>态势回放</p>
          <span>{{ usingLive ? '本次推演实战事件' : '预编排剧本' }}</span>
        </div>
        <div class="hud-badges">
          <span class="badge friendly">友军剩余 {{ stats.friendly }}</span>
          <span class="badge hostile">敌对剩余 {{ stats.hostile }}</span>
          <span class="badge">攻击 {{ stats.attackCount }}</span>
          <span class="badge">{{ formatTime(currentSeconds) }}</span>
        </div>
        <div class="cam-mode">
          <button :class="{ active: cameraMode === 'auto' }" @click="cameraMode = 'auto'">自动镜头</button>
          <button :class="{ active: cameraMode === 'free' }" @click="cameraMode = 'free'">自由镜头</button>
        </div>
      </div>

      <ReplayMap
        :current-seconds="currentSeconds"
        :playing="isPlaying"
        :events="replayEvents"
        :focus-id="focusEntityId"
        :focus-key="focusKey"
        :camera-mode="cameraMode"
      />
    </section>

    <footer class="replay-bar">
      <button class="ctl-btn" @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</button>
      <button class="ctl-btn ghost" @click="reset">重置</button>
      <div class="slider-wrap">
        <div class="slider-top">
          <span>{{ formatTime(0) }}</span>
          <span class="now">{{ formatTime(currentSeconds) }}</span>
          <span>{{ formatTime(totalSeconds) }}</span>
        </div>
        <input
          type="range"
          class="slider"
          min="0"
          :max="totalSeconds * 10"
          step="1"
          :value="Math.floor(currentSeconds * 10)"
          @input="onSeek"
        />
      </div>
      <div class="speed">
        <button v-for="s in speedList" :key="s" :class="{ active: speed === s }" @click="speed = s">{{ s }}x</button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts" name="replay">
import { useRouter } from 'vue-router'
import { replayEvents as mockEvents, replayUnits as mockUnits, buildHpTimelines, REPLAY_TOTAL_SECONDS as MOCK_TOTAL } from '@/mock/replay'
import { getLiveEvents, getLiveUnits, hasLiveReplay, liveReplayTotalSeconds } from '@/sim/eventLog'
import ReplayMap from './ReplayMap.vue'

buildHpTimelines()

const router = useRouter()
const leave = () => router.push('/')

const usingLive = computed(() => hasLiveReplay())
const replayEvents = computed(() => usingLive.value ? getLiveEvents() : mockEvents)
const replayUnits = computed(() => usingLive.value ? getLiveUnits() : mockUnits)
const totalSeconds = computed(() => usingLive.value ? Math.max(liveReplayTotalSeconds(), 8) : MOCK_TOTAL)

const currentSeconds = ref(0)
const isPlaying = ref(false)
const speed = ref(1)
const speedList = [0.5, 1, 2, 4]
const filter = ref<'all' | 'friendly' | 'hostile'>('all')
const cameraMode = ref<'auto' | 'free'>('auto')

const visibleEvents = computed(() =>
  replayEvents.value
    .filter((e) => e.t <= currentSeconds.value)
    .map((e, idx) => ({ ...e, _idx: idx }))
    .slice()
    .reverse(),
)
const filteredEvents = computed(() => {
  if (filter.value === 'all') return visibleEvents.value
  return visibleEvents.value.filter((e) => e.side === filter.value || e.type === 'info' || e.type === 'weather')
})

function eventEntityId(e: { type: string; attacker?: { id: string }; target?: { id: string } }) {
  if (e.type === 'attack' || e.type === 'kill' || e.type === 'lock') return e.target?.id || e.attacker?.id
  return e.attacker?.id || e.target?.id
}
function eventKey(e: { t: number; type: string; attacker?: { id: string }; target?: { id: string } }) {
  return `${e.t}-${e.type}-${eventEntityId(e) || ''}`
}

const activeEvent = computed(() => {
  const list = replayEvents.value.filter((e) => e.t <= currentSeconds.value && eventEntityId(e))
  return list.length ? list[list.length - 1] : null
})
const focusEntityId = computed(() => (activeEvent.value ? eventEntityId(activeEvent.value) : ''))
const focusKey = computed(() => (activeEvent.value ? eventKey(activeEvent.value) : ''))

function hpAt(u: { hpTimeline: Array<{ t: number; hp: number }>; maxHp: number }, t: number) {
  if (!u.hpTimeline || !u.hpTimeline.length) return u.maxHp
  let hp = u.hpTimeline[0].hp
  for (const p of u.hpTimeline) {
    if (p.t > t) break
    hp = p.hp
  }
  return hp
}

const stats = computed(() => {
  const items = replayEvents.value.filter((e) => e.t <= currentSeconds.value)
  const attackCount = items.filter((e) => e.type === 'attack').length
  const friendlyKills = items.filter((e) => e.type === 'kill' && e.side === 'hostile').length
  const hostileKills = items.filter((e) => e.type === 'kill' && e.side === 'friendly').length

  let friendly = 0
  let hostile = 0
  for (const u of replayUnits.value) {
    if (hpAt(u, currentSeconds.value) > 0) {
      if (u.faction === 'friendly') friendly++
      else hostile++
    }
  }
  if (currentSeconds.value < 0.5) {
    friendly = replayUnits.value.filter((u) => u.faction === 'friendly').length
    hostile = replayUnits.value.filter((u) => u.faction === 'hostile').length
  }
  return { attackCount, friendlyKills, hostileKills, friendly, hostile }
})

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
function sideText(side?: string) {
  return side === 'friendly' ? '友' : side === 'hostile' ? '敌' : '态'
}
function iconText(type: string) {
  switch (type) {
    case 'attack': return '攻'
    case 'kill': return '毁'
    case 'move': return '动'
    case 'scan': return '扫'
    case 'lock': return '锁'
    case 'weather': return '天'
    case 'info': return '态'
    default: return '·'
  }
}

function seek(t: number) {
  currentSeconds.value = Math.max(0, Math.min(totalSeconds.value, Number(t.toFixed(2))))
}
function onSeek(e: Event) {
  const v = Number((e.target as HTMLInputElement).value) / 10
  seek(v)
}

let rafId: number | null = null
let lastTs = 0
function loop(ts: number) {
  if (!isPlaying.value) return
  if (!lastTs) lastTs = ts
  const dt = (ts - lastTs) / 1000
  lastTs = ts
  currentSeconds.value = Math.min(totalSeconds.value, currentSeconds.value + dt * speed.value)
  if (currentSeconds.value >= totalSeconds.value) {
    isPlaying.value = false
    return
  }
  rafId = requestAnimationFrame(loop)
}
function togglePlay() {
  if (currentSeconds.value >= totalSeconds.value) currentSeconds.value = 0
  isPlaying.value = !isPlaying.value
  lastTs = 0
  if (isPlaying.value) rafId = requestAnimationFrame(loop)
  else if (rafId) cancelAnimationFrame(rafId)
}
function reset() {
  isPlaying.value = false
  if (rafId) cancelAnimationFrame(rafId)
  currentSeconds.value = 0
  lastTs = 0
}
watch(isPlaying, (playing) => {
  if (playing) {
    lastTs = 0
    rafId = requestAnimationFrame(loop)
  } else if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style lang="scss" scoped>
.replay-wrap {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 320px 1fr;
  grid-template-rows: 1fr 88px;
  color: rgba($white, 0.85);
}

.replay-aside {
  grid-row: 1 / 3;
  border-right: 1px solid rgba(0, 142, 255, 0.3);
  background: linear-gradient(180deg, rgba(0, 24, 56, 0.88), rgba(0, 14, 36, 0.78));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2;

  header {
    padding: 16px 18px 10px;
    border-bottom: 1px solid rgba(0, 142, 255, 0.25);
    .title { font-size: 18px; letter-spacing: 2px; color: $white; }
    .filter { margin-top: 10px; display: flex; gap: 8px;
      button {
        padding: 4px 10px; font-size: 12px; border: 1px solid rgba(0,229,255,0.35);
        border-radius: 12px; background: rgba(0,30,70,0.55); color: rgba($white,0.7); cursor: pointer;
        &.active { background: #00e5ff; color: #00132b; border-color: #00e5ff; }
      }
    }
  }
  .event-list { list-style: none; padding: 6px 12px 16px; margin: 0; overflow-y: auto; flex: 1; }
  .event-item {
    display: grid; grid-template-columns: 44px 22px 22px 1fr; align-items: center;
    gap: 6px;
    padding: 8px 10px; margin-bottom: 4px; border-radius: 6px;
    font-size: 13px; color: rgba($white,0.78); cursor: pointer;
    background: rgba(0,30,70,0.35); border: 1px solid rgba(0,142,255,0.18);
    transition: all 0.18s;
    &:hover, &.current { background: rgba(0, 78, 150, 0.35); border-color: rgba(0,229,255,0.4); }
    &.current { box-shadow: inset 2px 0 0 #00e5ff; }
    .ev-time { color: rgba($white,0.5); font-size: 12px; }
    .ev-side {
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 11px;
      &.friendly { background: rgba(0,229,255,0.18); color: #00e5ff; }
      &.hostile { background: rgba(255,138,61,0.18); color: #ff8a3d; }
    }
    .ev-icon {
      width: 22px; height: 22px; border-radius: 4px;
      display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;
      background: rgba(255,255,255,0.08); color: rgba($white,0.75);
    }
    &.kill .ev-icon { background: rgba(255, 77, 79, 0.3); color: #ff7c7e; }
    &.attack .ev-icon { background: rgba(250, 219, 20, 0.22); color: #fadb14; }
    &.scan .ev-icon { background: rgba(0, 229, 255, 0.18); color: #00e5ff; }
    &.weather .ev-icon { background: rgba(127, 219, 255, 0.22); color: #7fdbff; }
    &.move .ev-icon { background: rgba(127,255,160,0.22); color: #7ffaa0; }
    .ev-text { line-height: 1.45; }
  }
  .empty { padding: 24px; color: rgba($white,0.4); text-align: center; font-size: 12px; }
}

.replay-stage {
  grid-column: 2;
  grid-row: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.replay-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 8;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 229, 255, 0.45);
  background: rgba(0, 16, 40, 0.78);
  color: $white;
  cursor: pointer;
  border-radius: 4px;
  &:hover { background: rgba(255, 77, 79, 0.35); border-color: #ff4d4f; }
}

.map-hud {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 7;
  pointer-events: none;
  .hud-title {
    p { font-size: 18px; letter-spacing: 2px; color: $white; }
    span { font-size: 12px; color: rgba($white, 0.55); }
  }
  .hud-badges { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
  .badge {
    padding: 3px 10px; font-size: 12px; border-radius: 12px;
    background: rgba(0, 20, 48, 0.7); border: 1px solid rgba(0,142,255,0.35);
    &.friendly { color: #00e5ff; }
    &.hostile { color: #ff8a3d; }
  }
  .cam-mode {
    pointer-events: auto;
    margin-top: 10px;
    display: flex;
    gap: 6px;
    button {
      padding: 4px 12px; font-size: 12px; border: 1px solid rgba(0,229,255,0.35);
      background: rgba(0,30,70,0.7); color: rgba($white,0.75); cursor: pointer; border-radius: 12px;
      &.active { background: #00e5ff; color: #00132b; border-color: #00e5ff; }
    }
  }
}

.replay-bar {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 18px 14px;
  background: linear-gradient(180deg, rgba(0, 18, 44, 0.92), rgba(0, 10, 28, 0.96));
  border-top: 1px solid rgba(0, 142, 255, 0.35);
  z-index: 3;

  .ctl-btn {
    padding: 8px 18px; border: 1px solid rgba(0,229,255,0.45);
    background: rgba(0,30,70,0.55); color: $white; cursor: pointer;
    border-radius: 4px; font-size: 13px; white-space: nowrap;
    &:hover { background: rgba(0,229,255,0.15); }
    &.ghost { background: transparent; }
  }
  .slider-wrap { flex: 1; min-width: 200px;
    .slider-top {
      display: flex; justify-content: space-between; align-items: center;
      color: rgba($white,0.5); font-size: 11px; margin-bottom: 4px;
      .now { color: #00e5ff; font-size: 13px; }
    }
    .slider { width: 100%; accent-color: #00e5ff; }
  }
  .speed { display: flex; gap: 6px;
    button {
      padding: 4px 10px; font-size: 12px; border: 1px solid rgba(0,229,255,0.35);
      background: rgba(0,30,70,0.4); color: rgba($white,0.7); cursor: pointer; border-radius: 10px;
      &.active { background: #00e5ff; color: #00132b; border-color: #00e5ff; }
    }
  }
}
</style>
