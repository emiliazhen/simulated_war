<template>
  <div class="gis-wrap">
    <scene
      ref="cesiumRef"
      @selectedEntityChange="selectedEntityChange"
      @battleUpdate="onBattleUpdate"
      @battleReport="onBattleReport"
    />
    <div class="left-arrow-wrap" @click="leftArrowClick"></div>
    <work
      v-show="isWorkShow"
      ref="workRef"
      @close="isWorkShow = false"
      @flyToIdClick="flyToIdClick"
      @selectedEntityByIdClick="selectedEntityByIdClick"
      @command="command"
    />
    <control-panel
      :speed-options="speedOptions"
      :current-speed="currentSpeed"
      :wind-on="windOn"
      :wind-ready="windReady"
      :wind-source="windSource"
      :start-time="startTime"
      :current-time="currentTime"
      @change-speed="changeSpeed"
      @toggle-wind="toggleWind"
      @change-weather="changeWeather"
    />
    <battle-report v-if="reportLog.length" :log="reportLog" />
  </div>
</template>

<script setup lang="ts">
import Scene from './components/scene.vue';
import Work from './components/work.vue';
import ControlPanel from './components/controlPanel.vue';
import BattleReport from './components/battleReport.vue';
import { buildForces, type ForceState } from '@/mock/forces';

const dataList = ref(buildGroupedDataList());
provide('dataList', dataList);

function buildGroupedDataList() {
  const all = buildForces();
  const friendly = all.filter((f) => f.faction === 'friendly');
  const hostile = all.filter((f) => f.faction === 'hostile');
  const TYPE_CN_FOR_LABEL: Record<string, string> = {
    SHIP: '舰船',
    AIRCRAFT: '飞机',
    UAV: '无人机',
    GROUND: '坦克',
  }
  const toFriendly = (list: ForceState[]) =>
    list.map((f) => ({
      id: f.id,
      label: f.label,
      unitType: f.unitType,
      faction: f.faction,
      hp: f.hp,
      maxHp: f.maxHp,
      attackRange: f.attackRange,
      visionRange: f.visionRange,
      radarRange: f.radarRange,
      attackPower: f.attackPower,
      moveSpeed: f.moveSpeed,
      start: {
        longitude: String(f.lng),
        latitude: String(f.lat),
        height: f.height,
      },
      end: { longitude: '', latitude: '' },
      height: f.height,
      state: 0,
      speed: 0,
      vehicle: {
        vehicleType: f.unitType,
        vehicleName: f.label,
        speedKnots: Math.round(f.moveSpeed * 1.94),
        fuelCapacity: f.fuel,
        currentFuel: f.fuel,
        fuelConsumptionRate: 20,
        fuelConsumptionPerNm: 0,
      },
    }));
  const toHostile = (list: ForceState[]) =>
    list.map((f) => {
      // 敌对条目默认显示 "单位-HXX" 出现后在友军视野中变为 "类型-HXX"
      // 例：label "单位-H04" → visibleLabel "飞机-H04"
      const origSuffix = /^单位-(.+)$/.exec(f.label)?.[1] ?? ''
      const visibleLabel = origSuffix
        ? `${TYPE_CN_FOR_LABEL[f.unitType] || '单位'}-${origSuffix}`
        : f.label
      return {
        id: f.id,
        label: f.label, // 初始默认显示原始 "单位-HXX"
        unitType: f.unitType,
        faction: f.faction,
        hp: f.hp,
        maxHp: f.maxHp,
        attackRange: f.attackRange,
        visionRange: f.visionRange,
        radarRange: f.radarRange,
        attackPower: f.attackPower,
        moveSpeed: f.moveSpeed,
        start: {
          longitude: String(f.lng),
          latitude: String(f.lat),
          height: f.height,
        },
        end: { longitude: '', latitude: '' },
        height: f.height,
        state: 0,
        speed: 0,
        _visibleLabel: visibleLabel,
        _invisibleLabel: f.label,
        vehicle: {
          vehicleType: f.unitType,
          vehicleName: f.label,
          fuelCapacity: f.fuel,
          currentFuel: f.fuel,
        },
      };
    });
  return [
    { label: '友军单位', isGroup: true, faction: 'friendly', children: toFriendly(friendly) },
    { label: '敌对目标', isGroup: true, faction: 'hostile', children: toHostile(hostile) },
  ];
}

const isWorkShow = ref(true);
const workRef = ref();
const cesiumRef = ref();

const leftArrowClick = () => {
  isWorkShow.value = true;
};

const flyToIdClick = (id: string) => {
  cesiumRef.value?.flyToEntityById(id);
};
const selectedEntityByIdClick = (id: string) => {
  cesiumRef.value?.selectedEntityById(id);
};
const selectedEntityChange = (id: string) => {
  workRef.value?.setTreeCheckedKey(id);
};
const command = (action: string) => {
  cesiumRef.value?.commandClick(action);
};

/** 战斗日志：5 秒内同一目标只记录首次（去重在 scene.vue 触发 */
const reportLog = ref<Array<{ time: string; targetId: string; targetLabel: string; attackerId: string; attackerLabel: string; damage: number }>>([]);
const recentReportMap = new Map<string, number>();
const onBattleReport = (ev: any) => {
  const now = Date.now();
  const dedupKey = `${ev.targetId}`;
  const last = recentReportMap.get(dedupKey);
  if (last && now - last < 5000) {
    return;
  }
  recentReportMap.set(dedupKey, now);
  reportLog.value.unshift({
    time: new Date().toLocaleTimeString(),
    targetId: ev.targetId,
    targetLabel: ev.targetLabel,
    attackerId: ev.attackerId,
    attackerLabel: ev.attackerLabel,
    damage: ev.damage,
  });
  if (reportLog.value.length > 50) {
    reportLog.value.length = 50;
  }
};

const onBattleUpdate = (_forces: ForceState[]) => {
  // 后续阶段透传
};

/** ===== 控制面板状态 ===== */
const speedOptions: number[] = [1, 2, 5, 10, 30, 50, 100, 150, 300, 500, 1000, 1500, 3000, 6000]
const currentSpeed = ref(1)
const windOn = ref(true)
const windReady = ref(false)
const windSource = ref<'open-meteo' | 'mock' | null>(null)
const startTime = ref(new Date())
const currentTime = ref(new Date())
let tickTimer: number | null = null

const changeSpeed = (s: number) => {
  currentSpeed.value = s
  cesiumRef.value?.setSpeed(s)
}
const toggleWind = () => {
  windOn.value = !windOn.value
  cesiumRef.value?.toggleWindField(windOn.value)
}
const changeWeather = (w: number) => {
  cesiumRef.value?.changeWeather(w)
}

onMounted(() => {
  startTime.value = cesiumRef.value?.getStartTime?.() ?? new Date()
  // 实时同步当前时间 + 风场就绪状态
  tickTimer = window.setInterval(() => {
    currentTime.value = cesiumRef.value?.getCurrentTime?.() ?? new Date()
    if (cesiumRef.value?.isWindReady?.()) {
      windReady.value = true
      windSource.value = cesiumRef.value?.getWindSource?.() ?? 'mock'
    }
  }, 500)
})

onUnmounted(() => {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
})
</script>

<style lang="scss" scoped>
.gis-wrap {
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.left-arrow-wrap {
  position: absolute;
  cursor: pointer;
  top: 90px;
  left: 0; // 与屏幕左面对齐
  width: 32px;
  height: 118px;
  background: url('@/assets/images/left_arrow.png') center center / 100% 100% no-repeat;
  z-index: 2;
}
</style>