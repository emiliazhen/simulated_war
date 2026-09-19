<template>
  <div class="control-panel" :class="{ expanded: panelExpanded }">
    <div class="head-row">
      <div class="time-row"><span class="time-label">开始时间</span><span class="time-val">{{ startTimeStr }}</span></div>
      <button class="toggle-btn" @click="panelExpanded = !panelExpanded">
        <svg-icon :name="panelExpanded ? 'ele-CaretTop' : 'ele-CaretBottom'" :size="14" />
        <span>{{ panelExpanded ? '收起' : '展开' }}</span>
      </button>
    </div>

    <div class="time-row always"><span class="time-label">现时时间</span><span class="time-val">{{ currentTimeStr }}</span></div>

    <transition name="expand">
      <div v-show="panelExpanded" class="form-row">
        <div class="form-item">
          <span class="form-label">倍速</span>
          <el-select
            v-model="speedModel"
            popper-class="control-speed-popper"
            size="small"
            @change="changeSpeed"
          >
            <el-option v-for="s in speedOptions" :key="s" :value="s" :label="`${s}x`" />
          </el-select>
          <span v-if="speedModel >= 1000" class="speed-hint">快进倍速，短途机动可能一闪而过</span>
        </div>

        <div class="form-item">
          <span class="form-label">风场</span>
          <button class="chip toggle" :class="{ active: windOn }" @click="toggleWind">
            <span class="led" :class="{ on: windOn }"></span>{{ windOn ? 'ON' : 'OFF' }}
          </button>
        </div>

        <div class="form-item">
          <span class="form-label">天气</span>
          <el-select
            v-model="weatherValue"
            size="small"
            @change="emitWeather"
            popper-class="control-weather-popper"
          >
            <el-option v-for="w in weatherList" :key="w.value" :value="w.value" :label="w.name" />
          </el-select>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  speedOptions: number[]
  currentSpeed: number
  windOn: boolean
  windReady: boolean
  windSource?: 'open-meteo' | 'mock' | null
  startTime: Date
  currentTime: Date
}>()

const emit = defineEmits(['change-speed', 'toggle-wind', 'change-weather'])

const panelExpanded = ref(false)

const weatherList = [
  { name: '晴', value: 0 },
  { name: '雾', value: 1 },
  { name: '雨', value: 2 },
  { name: '雷', value: 3 },
  { name: '雷雨', value: 4 },
  { name: '雪', value: 5 },
  { name: '多云', value: 6 },
]

const weatherValue = ref(0)
const emitWeather = (v: any) => emit('change-weather', Number(v))

const speedModel = ref(props.currentSpeed)
watch(() => props.currentSpeed, (v) => { speedModel.value = v })
const changeSpeed = (s: number) => emit('change-speed', s)
const toggleWind = () => emit('toggle-wind')

const pad = (n: number) => String(n).padStart(2, '0')
function fmtTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const startTimeStr = computed(() => fmtTime(props.startTime))
const currentTimeStr = computed(() => fmtTime(props.currentTime))
</script>

<style lang="scss" scoped>
.control-panel {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 16px;
  background: rgba(0, 24, 56, 0.78);
  border: 1px solid rgba(0, 142, 255, 0.45);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  z-index: 5;
  backdrop-filter: blur(8px);
  color: rgba($white, 0.85);
  min-width: 280px;
}

.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: rgba($white, 0.75);
  background: rgba(0,30,70,0.55);
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: 12px;
  &:hover { color: #00e5ff; border-color: #00e5ff; }
}

.time-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  &.always { margin-left: 0; }
  .time-label { color: rgba($white, 0.5); min-width: 56px; }
  .time-val { font-family: 'Consolas', monospace; letter-spacing: 0.5px; color: #00e5ff; font-size: 13px; }
}

.form-row {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(0, 142, 255, 0.3);
  display: flex;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  color: rgba($white, 0.6);
  letter-spacing: 1px;
  margin-right: 4px;
}

.chip {
  min-width: 34px;
  height: 24px;
  padding: 0 8px;
  border-radius: 12px;
  border: 1px solid rgba(0, 229, 255, 0.35);
  background: rgba(0, 30, 70, 0.6);
  color: rgba($white, 0.78);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.18s;
  display: inline-flex;
  align-items: center;
  &:hover { color: $white; border-color: #00e5ff; }
  &.active {
    color: #00132b;
    background: #00e5ff;
    border-color: #00e5ff;
    box-shadow: 0 0 10px rgba(0, 229, 255, 0.45);
  }
}

.chip.toggle .led {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba($white, 0.4); margin-right: 5px;
  &.on { background: #6dff8a; box-shadow: 0 0 6px #6dff8a; }
}

:deep(.el-select) {
  width: 96px;
  --el-select-input-color: #00e5ff;
  --el-select-input-font-size: 13px;
  --el-fill-color-blank: rgba(0,30,70,0.6);
  --el-border-color: rgba(0, 142, 255, 0.45);
  --el-text-color-placeholder: rgba($white, 0.4);
  .el-select__wrapper {
    background: rgba(0, 30, 70, 0.6);
    box-shadow: inset 0 0 0 1px rgba(0, 142, 255, 0.45);
    color: $white;
    min-height: 24px;
  }
}

.speed-hint {
  margin-left: 8px;
  font-size: 11px;
  color: rgba(255, 210, 90, 0.9);
  white-space: nowrap;
}

.expand-enter-active, .expand-leave-active { transition: opacity 0.18s, max-height 0.22s; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }
.expand-enter-to, .expand-leave-from { opacity: 1; max-height: 120px; }
</style>

<style lang="scss">
.control-weather-popper, .control-speed-popper {
  .el-select-dropdown__item.selected { color: #00e5ff; font-weight: 600; }
}
</style>