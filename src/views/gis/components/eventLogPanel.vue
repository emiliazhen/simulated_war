<template>
  <div class="common-card event-log-wrap">
    <div class="common-card-title">
      <p>{{ tab === 'log' ? '事件日志' : '实时战况' }}</p>
      <button type="button" class="title-switch" @click="tab = tab === 'log' ? 'report' : 'log'">
        {{ tab === 'log' ? '战况' : '日志' }}
      </button>
      <div class="title-actions">
        <svg-icon
          v-if="tab === 'report'"
          name="ele-Refresh"
          :size="16"
          title="清空"
          @click="emit('clear')"
        />
        <svg-icon name="ele-Close" :size="20" @click="emit('close')" />
      </div>
    </div>
    <div class="common-card-content">
      <ul v-show="tab === 'log'" class="event-list">
        <li v-for="(item, i) in reversed" :key="`${item.t}-${i}`" :class="['event-row', item.side, item.type]">
          <span class="ev-time">{{ formatTime(item.t) }}</span>
          <span class="ev-tag">{{ typeText(item.type) }}</span>
          <span class="ev-msg">{{ item.message }}</span>
        </li>
        <li v-if="!reversed.length" class="empty">暂无事件 · 下达指令后在此记录</li>
      </ul>
      <battle-report v-show="tab === 'report'" :log="log" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getLiveEvents, type SimEventType } from '@/sim/eventLog'
import BattleReport, { type BattleReportItem } from './battleReport.vue'

defineProps<{ log: BattleReportItem[] }>()
const emit = defineEmits(['close', 'clear'])

const tab = ref<'log' | 'report'>('log')
const events = getLiveEvents()
const reversed = computed(() => events.slice().reverse())

function formatTime(t: number) {
  const s = Math.max(0, Math.floor(t))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function typeText(type: SimEventType | string) {
  switch (type) {
    case 'move': return '机动'
    case 'attack': return '命中'
    case 'kill': return '击毁'
    case 'scan': return '扫描'
    case 'lock': return '锁定'
    case 'weather': return '天气'
    default: return '通报'
  }
}
</script>

<style lang="scss" scoped>
.event-log-wrap {
  position: absolute;
  left: 60px;
  bottom: 16px;
  width: 360px;
  height: 248px;
  z-index: 2;
}

.common-card-title {
  > p {
    width: auto;
    max-width: 140px;
    padding-right: 12px;
    flex: 0 0 auto;
  }
}

.title-switch {
  position: relative;
  z-index: 2;
  height: 24px;
  margin-left: 4px;
  padding: 0 10px;
  border: 1px solid rgba(0, 229, 255, 0.45);
  border-radius: 12px;
  background: rgba(0, 229, 255, 0.12);
  color: #00e5ff;
  font-size: 12px;
  letter-spacing: 1px;
  cursor: pointer;
  line-height: 22px;
  &:hover {
    background: rgba(0, 229, 255, 0.22);
    color: $white;
  }
}

.title-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
  cursor: pointer;
}

.event-list,
.common-card-content :deep(.battle-report-list) {
  margin: 0;
  padding: 0;
  list-style: none;
  height: 100%;
  overflow-y: auto;
}

.event-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 4px;
  border-bottom: 1px dashed rgba($white, 0.08);
  font-size: 12px;
  color: rgba($white, 0.82);
  line-height: 1.4;

  .ev-time {
    flex-shrink: 0;
    width: 42px;
    color: rgba($white, 0.5);
    font-variant-numeric: tabular-nums;
  }
  .ev-tag {
    flex-shrink: 0;
    min-width: 36px;
    height: 18px;
    padding: 0 6px;
    line-height: 16px;
    font-size: 11px;
    text-align: center;
    border-radius: 9px;
    color: #00e5ff;
    background: rgba(0, 229, 255, 0.12);
    border: 1px solid rgba(0, 229, 255, 0.35);
  }
  .ev-msg { flex: 1; min-width: 0; }

  &.hostile .ev-tag {
    color: #ff8a3d;
    background: rgba(255, 138, 61, 0.12);
    border-color: rgba(255, 138, 61, 0.35);
  }
  &.kill .ev-tag {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.12);
    border-color: rgba(255, 77, 79, 0.4);
  }
}

.empty {
  padding: 24px 8px;
  text-align: center;
  color: rgba($white, 0.4);
  font-size: 12px;
  list-style: none;
}
</style>
