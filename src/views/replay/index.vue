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
          :class="['event-item', item.side, item.type]"
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

    <main class="replay-main">
      <div class="header-row">
        <div>
          <p class="page-title">回放复盘 · 时间轴回放</p>
          <p class="page-sub">基于预编排剧本驱动 · 拖动进度条可任意定位历史节点</p>
        </div>
        <div class="badges">
          <span class="badge friendly">友军剩余 {{ stats.friendly }}</span>
          <span class="badge hostile">敌对剩余 {{ stats.hostile }}</span>
          <span class="badge result win">最终结果：友军胜利</span>
        </div>
      </div>

      <div class="card-row">
        <div class="card big">
          <div class="card-title">
            <p>HP 演化曲线</p>
            <div class="legend">
              <span class="l friendly"></span> 友军
              <span class="l hostile"></span> 敌对
            </div>
          </div>
          <div ref="chartRef" class="chart"></div>
        </div>

        <div class="card">
          <div class="card-title"><p>战损统计</p></div>
          <div class="stat-grid">
            <div class="stat">
              <p class="stat-label">总攻击次数</p>
              <p class="stat-value">{{ stats.attackCount }}</p>
            </div>
            <div class="stat">
              <p class="stat-label">友军击毁单位</p>
              <p class="stat-value hostile-color">{{ stats.friendlyKills }}</p>
            </div>
            <div class="stat">
              <p class="stat-label">敌对击毁单位</p>
              <p class="stat-value host-color">{{ stats.hostileKills }}</p>
            </div>
            <div class="stat">
              <p class="stat-label">当前时刻</p>
              <p class="stat-value small">{{ formatTime(currentSeconds) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="controls">
        <button class="ctl-btn" @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</button>
        <button class="ctl-btn ghost" @click="reset">重置</button>
        <div class="slider-wrap">
          <div class="slider-top">
            <span>{{ formatTime(0) }}</span>
            <span class="mid" :style="{ left: `${(currentSeconds / REPLAY_TOTAL_SECONDS) * 100}%` }"></span>
            <span>{{ formatTime(REPLAY_TOTAL_SECONDS) }}</span>
          </div>
          <input
            type="range"
            class="slider"
            min="0"
            :max="REPLAY_TOTAL_SECONDS * 10"
            step="1"
            :value="Math.floor(currentSeconds * 10)"
            @input="onSeek"
          />
        </div>
        <div class="speed">
          <button v-for="s in speedList" :key="s" :class="{ active: speed === s }" @click="speed = s">{{ s }}x</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts" name="replay">
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, watch, computed, nextTick } from 'vue'
import { replayEvents, replayUnits, buildHpTimelines, REPLAY_TOTAL_SECONDS } from '@/mock/replay'

buildHpTimelines()

const currentSeconds = ref(0)
const isPlaying = ref(false)
const speed = ref(1)
const speedList = [0.5, 1, 2, 4]
const filter = ref<'all' | 'friendly' | 'hostile'>('all')

const visibleEvents = computed(() =>
  replayEvents
    .filter((e) => e.t <= currentSeconds.value)
    .map((e, idx) => ({ ...e, _idx: idx }))
    .slice()
    .reverse(),
)
const filteredEvents = computed(() => {
  if (filter.value === 'all') return visibleEvents.value
  return visibleEvents.value.filter((e) => e.side === filter.value || e.type === 'info' || e.type === 'weather')
})

function hpAt(u: { hpTimeline: Array<{ t: number; hp: number }> }, t: number) {
  if (!u.hpTimeline || !u.hpTimeline.length) return u.maxHp
  let hp = u.hpTimeline[0].hp
  for (const p of u.hpTimeline) {
    if (p.t > t) break
    hp = p.hp
  }
  return hp
}

const stats = computed(() => {
  const items = replayEvents.filter((e) => e.t <= currentSeconds.value)
  const attackCount = items.filter((e) => e.type === 'attack').length
  const friendlyKills = items.filter((e) => e.type === 'kill' && e.side === 'hostile').length
  const hostileKills = items.filter((e) => e.type === 'kill' && e.side === 'friendly').length

  let friendly = 0
  let hostile = 0
  for (const u of replayUnits) {
    if (hpAt(u, currentSeconds.value) > 0) {
      if (u.faction === 'friendly') friendly++
      else hostile++
    }
  }
  // 起始期所有单位应均存在
  if (currentSeconds.value < 0.5) {
    friendly = replayUnits.filter((u) => u.faction === 'friendly').length
    hostile = replayUnits.filter((u) => u.faction === 'hostile').length
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
    case 'weather': return '天'
    case 'info': return '态'
    default: return '·'
  }
}

function seek(t: number) {
  currentSeconds.value = Math.max(0, Math.min(REPLAY_TOTAL_SECONDS, Number(t.toFixed(2))))
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
  currentSeconds.value = Math.min(REPLAY_TOTAL_SECONDS, currentSeconds.value + dt * speed.value)
  if (currentSeconds.value >= REPLAY_TOTAL_SECONDS) {
    isPlaying.value = false
    return
  }
  rafId = requestAnimationFrame(loop)
}
function togglePlay() {
  if (currentSeconds.value >= REPLAY_TOTAL_SECONDS) currentSeconds.value = 0
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

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
let markerIdx = -1

function reapplyMarker() {
  if (!chart) return
  const idx = Math.floor(currentSeconds.value / 2)
  if (idx === markerIdx) return
  markerIdx = idx
  chart.setOption({
    series: [{ id: 'marker' as any, markLine: { symbol: 'none', silent: true, data: [{ xAxis: `${idx * 2}s`, lineStyle: { color: '#fadb14', type: 'dashed', width: 1.6 } }] } as any }],
  } as any)
}

function initChart() {
  if (!chartRef.value || chart) return
  chart = echarts.init(chartRef.value)
  const xs: number[] = []
  for (let t = 0; t <= REPLAY_TOTAL_SECONDS; t += 2) xs.push(t)

  function seriesOf(faction: 'friendly' | 'hostile') {
    return replayUnits.filter((u) => u.faction === faction).map((u) => ({
      name: u.label,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: xs.map((t) => hpAt(u, t)),
    }))
  }

  chart.setOption({
    grid: { left: 48, right: 40, top: 28, bottom: 36 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: 'rgba(250,219,20,0.5)' } } },
    xAxis: { type: 'category', data: xs.map((t) => `${t}s`), boundaryGap: false,
      axisLabel: { color: 'rgba(255,255,255,0.55)' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } } },
    yAxis: { type: 'value', name: 'HP',
      axisLabel: { color: 'rgba(255,255,255,0.55)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
      axisLine: { show: false } },
    color: ['#00e5ff', '#7ff0ff', '#a5ddff', '#bcceff', '#8ce0ff',
           '#ff8a3d', '#ffb27a', '#ffcf9c', '#ffd9b1', '#ffe2c8'],
    series: [
      ...seriesOf('friendly'),
      ...seriesOf('hostile'),
      {
        id: 'marker',
        type: 'line',
        data: xs.map(() => null),
        markLine: { symbol: 'none', silent: true, data: [] },
      } as any,
    ],
  })
  reapplyMarker()
}

const resizeHandler = () => chart?.resize()
onMounted(() => {
  nextTick(initChart)
  window.addEventListener('resize', resizeHandler)
})
onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resizeHandler)
  chart?.dispose()
  chart = null
})
watch(currentSeconds, reapplyMarker)
</script>

<style lang="scss" scoped>
.replay-wrap {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 340px 1fr;
  color: rgba($white, 0.85);
}

.replay-aside {
  border-right: 1px solid rgba(0, 142, 255, 0.3);
  background: linear-gradient(180deg, rgba(0, 24, 56, 0.78), rgba(0, 14, 36, 0.6));
  display: flex;
  flex-direction: column;
  overflow: hidden;

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
    &:hover { background: rgba(0, 78, 150, 0.35); border-color: rgba(0,229,255,0.4); transform: translateX(2px); }
    .ev-time { color: rgba($white,0.5); font-size: 12px; }
    .ev-side {
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 11px;
      &.friendly { background: rgba(0,229,255,0.18); color: #00e5ff; }
      &.hostile { background: rgba(255,138,61,0.18); color: #ff8a3d; }
      &.info { background: rgba(255,255,255,0.06); color: #aaa; }
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

.replay-main { padding: 20px 26px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }

.header-row {
  display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 14px;
  .page-title { font-size: 22px; letter-spacing: 2px; color: $white; }
  .page-sub { font-size: 12px; color: rgba($white, 0.55); margin-top: 4px; }
  .badges { display: flex; gap: 10px; flex-wrap: wrap; }
  .badge {
    padding: 4px 12px; font-size: 12px; border-radius: 14px;
    background: rgba(0,30,70,0.55); border: 1px solid rgba(0,142,255,0.3);
    &.friendly { color: #00e5ff; border-color: rgba(0,229,255,0.45); }
    &.hostile { color: #ff8a3d; border-color: rgba(255,138,61,0.45); }
    &.result.win {
      color: #00e5ff; background: rgba(0,229,255,0.16);
      border-color: #00e5ff; box-shadow: 0 0 16px rgba(0,229,255,0.3);
    }
  }
}

.card-row { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; }
.card {
  background: rgba(0,30,70,0.5); border: 1px solid rgba(0,142,255,0.32);
  border-radius: 10px; padding: 14px 16px;
  &.big { min-height: 260px; display: flex; flex-direction: column; }
  .card-title {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
    p { font-size: 14px; letter-spacing: 1px; color: rgba($white,0.82); }
    .legend { font-size: 12px; color: rgba($white,0.55); display: flex; align-items: center; gap: 6px;
      .l { display: inline-block; width: 14px; height: 4px; border-radius: 2px; margin-right: 4px;
        &.friendly { background: #00e5ff; } &.hostile { background: #ff8a3d; }
      }
    }
  }
}
.chart { flex: 1; min-height: 220px; }

.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.stat {
  background: rgba(0,16,40,0.45); border: 1px solid rgba(0,142,255,0.2);
  border-radius: 8px; padding: 12px 14px;
  .stat-label { font-size: 12px; color: rgba($white,0.6); }
  .stat-value { margin-top: 6px; font-size: 26px; font-weight: 700; color: #fadb14;
    &.small { font-size: 22px; color: $white; }
  }
  .host-color { color: #ff4d4f; }
  .hostile-color { color: #00e5ff; }
}

.controls {
  display: flex; align-items: center; gap: 14px; padding-top: 4px; flex-wrap: wrap;
  .ctl-btn {
    padding: 8px 18px; border: 1px solid rgba(0,229,255,0.45);
    background: rgba(0,30,70,0.55); color: $white; cursor: pointer;
    border-radius: 4px; font-size: 13px;
    &:hover { background: rgba(0,229,255,0.15); }
    &.ghost { background: transparent; }
  }
  .slider-wrap { flex: 1; min-width: 280px; position: relative;
    .slider-top {
      position: relative; height: 18px;
      display: flex; justify-content: space-between;
      color: rgba($white,0.45); font-size: 11px; line-height: 18px;
      .mid { position: absolute; width: 2px; height: 100%;
        background: #fadb14; opacity: 0.6; transform: translateX(-1px);
        pointer-events: none;
      }
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