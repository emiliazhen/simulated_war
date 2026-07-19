<template>
  <div class="cesium-wrap" ref="cesiumRef" id="CesiumDom"></div>
  <div v-show="menuObject.isShow" class="context-menu-wrap" ref="menuRef">
    <ul>
      <li v-for="(item, index) in menuActions" :key="index" @click="commandClick(item.action)">{{ item.label }}
      </li>
    </ul>
  </div>
  <div class="select-box" v-show="menuObject.isShowSelectBox" ref="entitySelectRef"></div>
  <div class="attack-lock-box" v-show="lockObject.isShow" ref="attackLockRef"></div>
  <div class="lock-tip" v-show="lockObject.isShow">点击敌对单位锁定目标 · ESC 取消</div>
  <transition name="result-fade">
    <div v-if="battleResult" class="battle-result" :class="battleResult">
      <p class="result-title">{{ battleResult === 'win' ? '胜利' : '失败' }}</p>
      <p class="result-sub">{{ battleResult === 'win' ? '敌对单位已被全部歼灭' : '友军单位已被全部歼灭' }}</p>
      <button class="result-reset" @click="resetBattle">重新开始</button>
    </div>
  </transition>
  <div class="common-card info-list" :class="entryInfoObjet.infoData.faction" v-show="entryInfoObjet.isShow">
    <div class="common-card-title">
      <p>单位信息</p>
      <svg-icon name="ele-Close" :size="20" @click="editInfoClose" />
    </div>
    <div class="common-card-content">
      <div class="avatar"
        :style="`background-image: url(/models/avatar/${model3dInfoMap[entryInfoObjet.infoData.unitType]?.source || 'fight_plane'}.jpg)`">
      </div>
      <el-descriptions :column="1" border :label-width="designPxToRealPx(80)">
        <el-descriptions-item label="名称">
          <span class="row-with-dot">
            <span class="dot" :class="entryInfoObjet.infoData.faction"></span>
            {{ entryInfoObjet.infoData.label || '-' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="ID"> {{ entryInfoObjet.infoData.id || '-' }} </el-descriptions-item>
        <el-descriptions-item label="类型"> {{ unitTypeCn(entryInfoObjet.infoData.unitType) }} </el-descriptions-item>
        <el-descriptions-item label="阵营">
          {{ entryInfoObjet.infoData.faction === 'friendly' ? '友军' : (entryInfoObjet.infoData.__masked ? '敌对(?未发现)' : '敌对') }}
        </el-descriptions-item>
        <el-descriptions-item label="经度"> {{ entryInfoObjet.infoData.start?.longitude || '-' }} </el-descriptions-item>
        <el-descriptions-item label="纬度"> {{ entryInfoObjet.infoData.start?.latitude || '-' }} </el-descriptions-item>
        <el-descriptions-item label="高度"> {{ entryInfoObjet.infoData.height ?? '-' }}{{ isMasked(entryInfoObjet.infoData) ? '' : ' m' }} </el-descriptions-item>
        <el-descriptions-item label="生命值">
          <div v-if="isMasked(entryInfoObjet.infoData)"> {{ '?' }} </div>
          <div v-else class="current-fuel-wrap">
            <div>
              <span :style="`--with: ${hpPercent(entryInfoObjet.infoData)}%`"></span>
              <p>{{ hpPercent(entryInfoObjet.infoData) }}%</p>
            </div>
            <span>{{ entryInfoObjet.infoData.hp ?? '-' }} / {{ entryInfoObjet.infoData.maxHp ?? '-' }}</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="移动速度"> {{ entryInfoObjet.infoData.moveSpeed || '-' }}{{ isMasked(entryInfoObjet.infoData) ? '' : ' m/s' }} </el-descriptions-item>
        <el-descriptions-item label="攻击范围"> {{ entryInfoObjet.infoData.attackRange || '-' }}{{ isMasked(entryInfoObjet.infoData) ? '' : ' m' }} </el-descriptions-item>
        <el-descriptions-item label="视野范围"> {{ entryInfoObjet.infoData.visionRange || '-' }}{{ isMasked(entryInfoObjet.infoData) ? '' : ' m' }} </el-descriptions-item>
        <el-descriptions-item label="雷达范围"> {{ entryInfoObjet.infoData.radarRange || '-' }}{{ isMasked(entryInfoObjet.infoData) ? '' : ' m' }} </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium';
import { ElNotification } from 'element-plus';
import HeatMap from '@/utils/heatmap.js'
import { toFixed } from '@/utils/index'
import { useRem } from '@/hooks/rem'
import { FACTION_THEME } from '@/mock/forces'

const { designPxToRealPx } = useRem()
const emit = defineEmits(['selectedEntityChange', 'battleUpdate', 'battleReport'])

const cesiumRef = ref();
const modelList = inject('dataList') as any

const menuActions = [
  { action: 'move', label: '移动' },
  { action: 'stop', label: '停止' },
  { action: 'attack', label: '攻击' },
  { action: 'scan', label: '雷达扫描' },
];

const hpPercent = (data: any) => {
  const max = data?.maxHp || 1;
  const cur = data?.hp ?? 0;
  return toFixed(Math.max(0, Math.min(100, (cur / max) * 100)), 1);
}

const UNIT_TYPE_CN: Record<string, string> = {
  SHIP: '舰船',
  AIRCRAFT: '飞机',
  UAV: '无人机',
  GROUND: '坦克',
}
const unitTypeCn = (t?: string) => (t ? (UNIT_TYPE_CN[t] || t) : '-')
const isMasked = (data: any) => !!(data as any)?.__masked

const mainPointList = [
  { label: '三亚', latitude: 18.453434, longitude: 108.763054 },
  { label: '青岛', latitude: 36.094406, longitude: 120.369557 },
  { label: '大连', latitude: 38.71459, longitude: 121.118622 },
];
// Token
Cesium.Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwMDlhNmM4MC02Yzk5LTQ3Y2UtYmIyMy1iZmM3NWViNWE0YTYiLCJpZCI6MTg4OTA2LCJpYXQiOjE3MDQ4NzMxMDl9.Ia9jjPeYwBT53v_eDiXNdXrOsT30uxbBh7hWlxqYHHM';
Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(89.5, 20.4, 110.4, 61.2);

let viewer: Cesium.Viewer | null = null;
let handler: Cesium.ScreenSpaceEventHandler | null = null
let selectedEntry: any = null
const attackLineMap = new Map()
const moveTrackMap = new Map<string, { solidLineId: string; dashedLineId: string; tickHandler: (clock: Cesium.Clock) => void }>()

/** ====================== 战斗引擎（模块级状态） ====================== */
type LockState = { attackerId: string; targetId: string }
const lockStateMap = new Map<string, LockState & { cooldownUntil: number }>()
const deadEntitySet = new Set<string>()
const bulletIdToMeta = new Map<string, { attackerId: string; targetId: string; targetReached: boolean; tStart: Cesium.JulianDate; duration: number; startPos: Cesium.Cartesian3; delta: Cesium.Cartesian3 }>()
const shockwaveStateMap = new Map<string, { stop: boolean }>()
let lockModeActive = false
let adhesionEntity: Cesium.Entity | null = null
let adhesionBoxRef = ref<HTMLElement | null>(null)
let combatTickHandler: ((clock: Cesium.Clock) => void) | null = null

/** 每个单位类型的展示参数（雷达圈半径等）。 */
const model3dInfoMap: { [key: string]: any } = {
  AIRCRAFT: { source: 'fight_plane', minimumPixelSize: 200, maximumScale: 500 },
  UAV: { source: 'fight_plane', minimumPixelSize: 200, maximumScale: 400 },
  GROUND: { source: 'tank', minimumPixelSize: 2000, maximumScale: 3000 },
  SHIP: { source: 'battle_ship', minimumPixelSize: 50, maximumScale: 500 },
}

const entryInfoObjet = reactive({
  isShow: false,
  infoData: {} as any,
})

const lockObject = reactive({ isShow: false })
const attackLockRef = ref<HTMLElement | null>(null)
adhesionBoxRef = attackLockRef

const editInfoClose = () => {
  entryInfoObjet.isShow = false
}

onMounted(() => {
  viewer = new Cesium.Viewer(cesiumRef.value!, {
    shouldAnimate: true,
    animation: false,
    homeButton: false,
    geocoder: false,
    timeline: true,
    fullscreenButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
  });
  const imageryLayer = new Cesium.UrlTemplateImageryProvider({
    url: '/tiles/{z}/{x}/{y}.png',
    maximumLevel: 17,
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
  });
  viewer.imageryLayers.removeAll();
  viewer.imageryLayers.addImageryProvider(imageryLayer);
  (viewer.cesiumWidget.creditContainer as any).style.display = 'none';
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 2500;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000000;
  viewer.scene.screenSpaceCameraController.enableLook = false;
  viewer.scene.globe.baseColor = Cesium.Color.BLACK;
  viewer.scene.mode = Cesium.SceneMode.COLUMBUS_VIEW
  handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  leftClickEntity()
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
  )

  mainPointList.forEach(({ label, longitude, latitude }) => addMainPoint(label, longitude, latitude))

  // 敌对指示标记：固定写死在敌对集结海区上，红色光柱 + 旗帜标签
  addHostileBeacon(124.85, 30.05, '敌对集结海区')

  // 渲染所有单位（友军 + 敌对）
  modelList.value.forEach((group: any) => {
    if (group.children?.length) {
      group.children.forEach((item: any) => {
        const lng = parseFloat(item.start.longitude)
        const lat = parseFloat(item.start.latitude)
        if (lng && lat) {
          const ent = addUnit(item, lng, lat, item.height || (item.unitType === 'AIRCRAFT' || item.unitType === 'UAV' ? 50000 : 0))
          // 敌对单位初始默认隐藏：需进入友军视野范围才显示
          if (item.faction === 'hostile') ent.show = false
        }
      })
    }
  })
  // 收集敌对 entity 列表供视野更新使用
  collectHostileIds()
  // 初次执行一次视野判定
  updateVisionVisibility(viewer.clock.currentTime)

  const canvas = viewer.scene.canvas
  canvas.addEventListener('contextmenu', sceneContextmenu)
  viewer.scene.postRender.addEventListener(() => {
    if (menuObject.isShowSelectBox && selectedEntry) {
      showSelectBox(selectedEntry)
    }
  })
  initTimeline()
  initHeatMap()
  initWeather()
  initWindField()
  startCombatTick()
});
const getCanvasOffset = () => {
  const canvas = viewer?.scene?.canvas as HTMLCanvasElement | undefined
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  return { x: rect.left, y: rect.top }
}
const sceneContextmenu = (e: MouseEvent) => {
  menuObject.isShow = false
  e.preventDefault()
  if (!viewer || !handler) return
  // Cesium pick / SceneTransforms 都使用 canvas-local 坐标；菜单/选中框基于 cesium-wrap 内 absolute 定位，
  // 因此把 clientX/clientY 先减画布相对页面的偏移，使左键/右键与黄色选中框完全对齐
  const offset = getCanvasOffset()
  const cx = e.clientX - offset.x
  const cy = e.clientY - offset.y
  const pos = new Cesium.Cartesian2(cx, cy)
  const picked = viewer?.scene.pick(pos)
  if (!Cesium.defined(picked) || !picked.id) return
  if (!(picked.id as any).__isSelectable || !isClickOnBillboard(picked.id as Cesium.Entity, pos, 24)) {
    return
  }
  menuObject.isShowSelectBox = false
  const entity = picked.id as Cesium.Entity
  // 敌对且不在友军视野中（隐藏）→ 不允许右键菜单（未发现目标）
  if ((entity as any).__faction === 'hostile' && !(entity as any).show) {
    ElNotification({ title: '指令', message: '未发现目标，无法下达指令', type: 'warning', duration: 1200 })
    return
  }
  showEntityMenu(entity, cx, cy)
}
const isClickOnBillboard = (entity: Cesium.Entity, windowPosition: any, half = 18) => {
  const pos = entity.position?.getValue(viewer!.clock.currentTime)
  if (!pos) return false
  const screen = Cesium.SceneTransforms.worldToWindowCoordinates(viewer!.scene, pos)
  if (!screen) return false
  return (
    Math.abs(windowPosition.x - screen.x) <= half &&
    Math.abs(windowPosition.y - screen.y) <= half
  )
}
const initTimeline = () => {
  const now = Cesium.JulianDate.now();
  viewer!.clock.startTime = now.clone();
  viewer!.clock.currentTime = now.clone();
  viewer!.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
  viewer!.clock.stopTime = Cesium.JulianDate.addDays(now, 365, new Cesium.JulianDate());
  viewer!.clock.multiplier = 1;
  viewer!.clock.shouldAnimate = true;
  viewer!.useDefaultRenderLoop = true;
  // 记录进入 GIS 系统的起始时刻，控制面板展示"开始时间"
  entryStartJulian = now.clone()
}
const menuObject = reactive({
  isShow: false,
  isShowSelectBox: false
})
const menuRef = ref()
const entitySelectRef = ref()
const showEntityMenu = (entity: any, x: number, y: number) => {
  menuObject.isShow = true
  menuRef.value.style.left = x + 'px'
  menuRef.value.style.top = y + 'px'
  selectedEntry = entity
  emit('selectedEntityChange', entity.id)
  document.addEventListener('click', chenWhenAnywhereClick)
  showSelectBox(entity)
}
const chenWhenAnywhereClick = () => {
  menuObject.isShow = false
  menuObject.isShowSelectBox = false
  document.removeEventListener('click', chenWhenAnywhereClick)
}
const showSelectBox = (entity: any) => {
  const box = getScreenBoundingBox(entity)
  if (!box) return
  menuObject.isShowSelectBox = true
  entitySelectRef.value.style.left = box.left + 'px'
  entitySelectRef.value.style.top = box.top + 'px'
  entitySelectRef.value.style.width = box.right - box.left + 'px'
  entitySelectRef.value.style.height = box.bottom - box.top + 'px'
}
const getScreenBoundingBox = (entity: any) => {
  const scene = viewer!.scene
  const time = viewer!.clock.currentTime
  const pos = entity.position?.getValue(time)
  if (!pos) return null
  const windowPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, pos)
  if (!windowPos) return null
  const size = 12
  return {
    left: windowPos.x - size,
    right: windowPos.x + size,
    top: windowPos.y - size,
    bottom: windowPos.y + size,
  }
}
const leftClickEntity = () => {
  menuObject.isShowSelectBox = false
  handler!.setInputAction((e) => {
    const picked = viewer?.scene.pick(e.position)
    if (Cesium.defined(picked) && picked.id) {
      if (!(picked.id as any).__isSelectable) {
        return
      }
      // 二次屏幕距离校验放宽：取 billboard 屏幕半径（约 18 px）做容差；pick 自身已能精确命中，
      // 此处只是兜底防止鼠标点击位置因极小像素图（远视角缩放）落在 billboard 外的细微漂移
      if (!isClickOnBillboard(picked.id as Cesium.Entity, e.position, 24)) {
        // pick 命中但屏幕坐标稍有偏差不通过时，再做一个最近邻兜底
        const near = nearestSelectableEntityOnScreen(e.position, 40)
        if (!near) return
        ;(picked as any).id = near
      }
      if (deadEntitySet.has(String((picked.id as any).id))) {
        ElNotification({ title: '单位已击毁', message: '该单位无法再被操作', type: 'warning', duration: 1200 })
        return
      }
      selectedEntry = picked.id
      emit('selectedEntityChange', (picked.id as any).id)
      // 敌对且不在视野中（ent.show=false）→ 仅弹信息面板（内容为 ???），不画选择框
      if ((selectedEntry as any).__faction === 'hostile' && !(selectedEntry as any).show) {
        menuObject.isShowSelectBox = false
      } else {
        showSelectBox(selectedEntry)
      }
      bindInfoFromEntity((selectedEntry as any).id)
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

/** 指定屏幕半径内最近的可选中 unit entity。容差用于点击精度兜底。 */
function nearestSelectableEntityOnScreen(windowPos: Cesium.Cartesian2, tolerancePx: number): Cesium.Entity | null {
  if (!viewer) return null
  let nearest: Cesium.Entity | null = null
  let minDist = tolerancePx
  for (const group of modelList.value || []) {
    for (const item of group.children || []) {
      const id = item.id
      if (deadEntitySet.has(id)) continue
      const ent = viewer.entities.getById(id)
      if (!ent || !(ent as any).__isSelectable || !ent.show) continue
      const pos = ent.position?.getValue(viewer.clock.currentTime)
      if (!pos) continue
      const sp = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos)
      if (!sp) continue
      const d = Math.hypot(sp.x - windowPos.x, sp.y - windowPos.y)
      if (d <= minDist) {
        minDist = d
        nearest = ent
      }
    }
  }
  return nearest
}
const bindInfoFromEntity = (id: string) => {
  const item = findItemFromList(id)
  if (!item) return
  const ent = viewer?.entities.getById(id)
  // 敌对且不在友军视野中（entity 隐藏）→ 全部信息以 ??? 显示
  if (item.faction === 'hostile' && ent && !ent.show) {
    entryInfoObjet.isShow = true
    entryInfoObjet.infoData = {
      ...item,
      label: '????-????',
      id: '????',
      unitType: '????',
      faction: 'hostile',
      start: { longitude: '???', latitude: '???' },
      height: '???',
      hp: '???',
      maxHp: '???',
      moveSpeed: '???',
      attackRange: '???',
      visionRange: '???',
      radarRange: '???',
      __masked: true,
    }
    return
  }
  entryInfoObjet.isShow = true
  entryInfoObjet.infoData = item
}
const findItemFromList = (id: string) => {
  for (const group of modelList.value) {
    for (const item of group.children || []) {
      if (item.id === id) return item
    }
  }
  return null
}
const addMainPoint = (title: string, lng: number, lat: number) => {
  viewer!.entities.add({
    name: title,
    position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
    billboard: {
      image: '/images/location_point.png',
      width: 20,
      height: 20,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
    },
    label: {
      text: title,
      font: '16px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -10),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    }
  });
}

/** 敌对集结海区信标：写死的位置，红色光柱（Cylinder 几何体）+ 旗帜式标签，便于进入即可见 */
const addHostileBeacon = (lng: number, lat: number, title: string) => {
  const color = Cesium.Color.fromCssColorString('#ff4d4f')
  const heightMeters = 40000 // 40 km 高的光柱，确保大尺度下也可识别
  // 光柱主体：高瘦圆柱
  viewer!.entities.add({
    id: `hostile-beacon-cyl-${lng}-${lat}`,
    name: title,
    position: Cesium.Cartesian3.fromDegrees(lng, lat, heightMeters / 2),
    cylinder: {
      length: heightMeters,
      topRadius: 0,
      bottomRadius: 4000,
      material: color.withAlpha(0.18),
      outline: true,
      outlineColor: color.withAlpha(0.55),
      numberOfVerticalLines: 12,
      slices: 24,
    },
  })
  // 顶部光晕（小亮点 + 文字旗）
  viewer!.entities.add({
    id: `hostile-beacon-top-${lng}-${lat}`,
    position: Cesium.Cartesian3.fromDegrees(lng, lat, heightMeters),
    point: {
      pixelSize: 14,
      color: color,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: title,
      font: '18px sans-serif',
      fillColor: color,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -22),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString('rgba(20, 4, 8, 0.55)'),
      backgroundPadding: new Cesium.Cartesian2(8, 6),
    },
  })
  // 顶端不断下落的脉冲点（简易动画，期间切换可见性）
  let pulseT = 0
  const pulseEntity = viewer!.entities.add({
    id: `hostile-beacon-pulse-${lng}-${lat}`,
    position: new Cesium.CallbackProperty(() => {
      const t = (pulseT % 100) / 100
      const h = heightMeters * (1 - t)
      return Cesium.Cartesian3.fromDegrees(lng, lat, h)
    }, false),
    point: {
      pixelSize: new Cesium.CallbackProperty(() => {
        const t = (pulseT % 100) / 100
        return 5 + 10 * (1 - t)
      }, false),
      color: color.withAlpha(0.85),
      outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
      outlineWidth: 1,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
  const pulseTick = () => {
    if (!viewer) return
    pulseT += 1
    ;(pulseEntity.point as any).show = true
  }
  viewer.clock.onTick.addEventListener(pulseTick)
  // 旋转的旗帜圆环（地表 ellipse 转动指示，用 CallbackProperty 描绘半径呼吸效果）
  // semiMajor / semiMinor 必须共享同一值，避免两次 Date.now() 取到不同毫秒导致 semiMajor < semiMinor 抛异常
  const beaconRadiusHolder = { value: 30000 }
  const beaconAlphaHolder = { value: 0.16 }
  viewer.clock.onTick.addEventListener(() => {
    const t = (Date.now() % 3000) / 3000
    beaconRadiusHolder.value = 30000 + 12000 * Math.sin(t * Math.PI * 2)
    beaconAlphaHolder.value = 0.32 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))
  })
  viewer!.entities.add({
    id: `hostile-beacon-ring-${lng}-${lat}`,
    position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
    ellipse: {
      semiMajorAxis: new Cesium.CallbackProperty(() => beaconRadiusHolder.value, false),
      semiMinorAxis: new Cesium.CallbackProperty(() => beaconRadiusHolder.value, false),
      material: new Cesium.ColorMaterialProperty(
        new Cesium.CallbackProperty(() => color.withAlpha(beaconAlphaHolder.value), false)
      ),
      outline: true,
      outlineColor: color.withAlpha(0.6),
      height: 0,
    },
  })
}
const addUnit = (data: any, lng: number, lat: number, height: number) => {
  const theme = FACTION_THEME[data.faction] || FACTION_THEME.friendly
  const source = model3dInfoMap[data.unitType]?.source || 'fight_plane'
  const thisModel = viewer!.entities.add({
    id: data.id,
    name: data.label,
    position: Cesium.Cartesian3.fromDegrees(lng, lat, height),
    billboard: {
      image: `/images/${source}.png`,
      width: 30,
      height: 30,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      // 远视角下不允许被深度遮挡（保证 entity 在地图上始终可见可选）
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    ellipse: {
      semiMajorAxis: data.attackRange || 20000,
      semiMinorAxis: data.attackRange || 20000,
      material: Cesium.Color.fromCssColorString(theme.ringFill),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(theme.ringOutline),
      height,
    },
    label: {
      text: data.label,
      font: '16px sans-serif',
      fillColor: Cesium.Color.fromCssColorString(theme.labelFill),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -10),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    }
  });
  if (data.unitType === 'AIRCRAFT' || data.unitType === 'UAV') {
    thisModel.billboard!.alignedAxis = Cesium.Cartesian3.UNIT_Z
  }
  thisModel.__isSelectable = true
  thisModel.__faction = data.faction
  thisModel.__unitType = data.unitType

  // 视野范围 / 雷达扫描范围：作为 parent 的子实体，跟随父级别 show 一起显隐
  const trackedPos = new Cesium.CallbackProperty(() => {
    return thisModel.position?.getValue(viewer!.clock.currentTime)
  }, false)
  viewer!.entities.add({
    id: `${data.id}-vision-ring`,
    parent: thisModel,
    position: trackedPos,
    ellipse: {
      semiMajorAxis: data.visionRange || 60000,
      semiMinorAxis: data.visionRange || 60000,
      material: Cesium.Color.fromCssColorString(theme.ringFill).withAlpha(0.04),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(theme.ringOutline).withAlpha(0.3),
      height,
    },
  });
  (thisModel as any).__meta = {
    faction: data.faction,
    visionRange: data.visionRange,
    radarRange: data.radarRange,
  }
  viewer!.entities.add({
    id: `${data.id}-radar-ring`,
    parent: thisModel,
    position: trackedPos,
    ellipse: {
      semiMajorAxis: data.radarRange || 80000,
      semiMinorAxis: data.radarRange || 80000,
      material: Cesium.Color.fromCssColorString(theme.ringFill).withAlpha(0.02),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(theme.ringOutline).withAlpha(0.2),
      height,
    },
  })

  return thisModel
}
const commandClick = (action: string) => {
  menuObject.isShowSelectBox = false
  if (!selectedEntry) { return }
  if (action === 'move') {
    triggerMove()
  } else if (action === 'stop') {
    triggerStop()
  } else if (action === 'attack') {
    triggerAttackLockMode()
  } else if (action === 'scan') {
    startRadarScan(selectedEntry)
  }
}

/** 雷达扫描：在单位上画一个旋转 3 圈的扫描扇形动画。每个单位独立计时。 */
const radarScanStateMap = new Map<string, { entity: Cesium.Entity; remove: () => void }>()
function startRadarScan(entity: any) {
  if (!viewer || !entity?.id) return
  const id = String(entity.id)
  // 已在扫描中则忽略
  if (radarScanStateMap.has(id)) {
    ElNotification({ title: '雷达扫描', message: '该单位正在执行扫描', type: 'info' })
    return
  }
  const item = findItemFromList(id)
  const radius = item?.radarRange || 60000
  let angle = 0
  const sweepDeg = 360
  const rpm = 60 // 3 圈用时 = 3 秒
  const stepDeg = (360 * (rpm / 60)) * 0.016 // 每 16ms 步进，约 9.6 度
  const totalSweep = sweepDeg * 3
  const faction = entity.__faction || 'friendly'
  const themeColor = faction === 'hostile' ? Cesium.Color.fromCssColorString('#ff8a3d') : Cesium.Color.fromCssColorString('#00e5ff')

  // 扇形（椭圆实体配合 CallbackProperty 半径恒定，靠 rotation 旋转表示扫描方向，但 Cesium ellipse 无 rotation。
  // 这里改用 Polyline + 椭圆填充层叠：椭圆代表底圈，Polyline 代表扫描指针。
  viewer.entities.add({
    id: `radar-base-${id}`,
    position: entity.position,
    ellipse: {
      semiMajorAxis: new Cesium.ConstantProperty(radius),
      semiMinorAxis: new Cesium.ConstantProperty(radius),
      material: new Cesium.ColorMaterialProperty(themeColor.withAlpha(0.08)),
      outline: true,
      outlineColor: themeColor.withAlpha(0.5),
      height: 0,
    },
  })
  viewer.entities.add({
    id: `radar-sweep-${id}`,
    position: entity.position,
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const center = entity.position?.getValue(viewer!.clock.currentTime)
        if (!center) return []
        // 指针端点：角度 angle 的圆周点
        const sph = Cesium.Cartographic.fromCartesian(center)
        const lng = Cesium.Math.toDegrees(sph.longitude)
        const lat = Cesium.Math.toDegrees(sph.latitude)
        const a = Cesium.Math.toRadians(angle)
        const targetLng = lng + (radius * Math.cos(a)) / (111320 * Math.cos(Cesium.Math.toRadians(lat)))
        const targetLat = lat + (radius * Math.sin(a)) / 110540
        return [Cesium.Cartesian3.fromDegrees(lng, lat, 0), Cesium.Cartesian3.fromDegrees(targetLng, targetLat, 0)]
      }, false),
      width: 3,
      material: themeColor,
      arcType: Cesium.ArcType.NONE,
    },
  })

  let stop = false
  let sweeped = 0
  const onTick = () => {
    if (stop || !viewer) return
    angle = (angle + stepDeg) % 360
    sweeped += stepDeg
    if (sweeped >= totalSweep) {
      finish()
    }
  }
  viewer.clock.onTick.addEventListener(onTick)

  function finish() {
    stop = true
    if (viewer) {
      viewer.entities.removeById(`radar-base-${id}`)
      viewer.entities.removeById(`radar-sweep-${id}`)
      viewer.clock.onTick.removeEventListener(onTick)
    }
    radarScanStateMap.delete(id)
  }
  radarScanStateMap.set(id, { entity, remove: finish })
  ElNotification({ title: '雷达扫描', message: `${item?.label || id} 已开始 3 圈扫描`, type: 'success' })
}

/** ====================== 攻击指令 / 自动战斗 / 爆炸 / 弹道 ====================== */
const ATTACK_INTERVAL_S = 1.5
const BULLET_DURATION_S = 0.35
const ADHESION_PX = 60

/** 攻击流程：用户下达 attack 后进入"锁定模式"，在敌对实体附近吸附高亮，鼠标点击确认目标；
 *  之后由 combatTick 监测距离，进入攻击范围自动开火。 */
let currentAttackerId: string | null = null
let lockEscHandlerRef: ((e: KeyboardEvent) => void) | null = null

function triggerAttackLockMode() {
  if (!viewer || !handler || !selectedEntry) {
    ElNotification({ title: '攻击指令', message: '请先选中单位', type: 'warning' })
    return
  }
  const attackerId = String(selectedEntry.id)
  const item = findItemFromList(attackerId)
  if (!item) return
  if (item.faction !== 'friendly') {
    ElNotification({ title: '攻击指令', message: '只能通过友军发起攻击', type: 'warning' })
    return
  }
  if (deadEntitySet.has(attackerId)) {
    ElNotification({ title: '攻击指令', message: '该单位已被击毁，无法行动', type: 'warning' })
    return
  }
  currentAttackerId = attackerId
  lockModeActive = true
  menuObject.isShowSelectBox = false
  lockObject.isShow = false
  adhesionEntity = null
  handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
  handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  handler.setInputAction(attackPickMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  handler.setInputAction(attackPickClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  const escHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape') cancelLockMode()
  }
  lockEscHandlerRef = escHandler
  window.addEventListener('keydown', escHandler)
  ElNotification({ title: '攻击指令', message: '在地图上鼠标靠近敌对单位将自动吸附，左键锁定目标，ESC 取消', type: 'info' })
}

function cancelLockMode() {
  lockModeActive = false
  lockObject.isShow = false
  adhesionEntity = null
  currentAttackerId = null
  if (handler) {
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }
  if (lockEscHandlerRef) {
    window.removeEventListener('keydown', lockEscHandlerRef)
    lockEscHandlerRef = null
  }
  leftClickEntity()
}

function attackPickMove(movement: { startPosition: Cesium.Cartesian2; endPosition: Cesium.Cartesian2 }) {
  const e = movement.endPosition
  if (!viewer) return
  adhesionEntity = nearestHostileEntityOnScreen(e)
  if (adhesionEntity) {
    positionAttackLockBox(adhesionEntity)
    lockObject.isShow = true
  } else {
    lockObject.isShow = false
  }
}

function attackPickClick(movement: { position: Cesium.Cartesian2 }) {
  if (!viewer) return
  const e = movement.position
  // 重要：cancelLockMode 会清空 currentAttackerId / adhesionEntity，所以先取出 attacker id 与 target 引用
  const attackerId = currentAttackerId
  let target = adhesionEntity
  if (!target) {
    const picked = viewer.scene.pick(e)
    if (Cesium.defined(picked) && (picked as any).id?.__faction === 'hostile') {
      target = (picked as any).id
    } else {
      // 即使没 pick 到敌人（敌对 entity 默认隐藏、或屏幕像素小），用鼠标周围 60px 内最近邻吸附兜底
      target = nearestHostileEntityOnScreen(e)
    }
  }
  cancelLockMode()
  if (!target || (target as any).__faction !== 'hostile' || !attackerId) {
    ElNotification({ title: '攻击指令', message: '未锁定到敌对目标', type: 'warning' })
    return
  }
  // 视野外的敌对目标不能被锁定攻击
  if (!(target as any).show) {
    ElNotification({ title: '攻击指令', message: '目标未在视野中，无法锁定', type: 'warning' })
    return
  }
  const targetId = String((target as any).id)
  if (deadEntitySet.has(targetId)) {
    ElNotification({ title: '攻击指令', message: '该目标已被击毁', type: 'warning' })
    return
  }
  const attacker = viewer.entities.getById(attackerId)
  const attackerItem = findItemFromList(attackerId)
  const targetItem = findItemFromList(targetId)
  lockStateMap.set(attackerId, {
    attackerId,
    targetId,
    cooldownUntil: 0,
  })
  if (attacker && target) addAttackLine(attacker, target as any)
  ElNotification({
    title: '目标锁定',
    message: `${attackerItem?.label || attackerId} 已锁定 ${targetItem?.label || targetId}，进入射程自动攻击`,
    type: 'success',
  })
}

function nearestHostileEntityOnScreen(windowPos: Cesium.Cartesian2): Cesium.Entity | null {
  if (!viewer) return null
  let nearest: Cesium.Entity | null = null
  let minDist = ADHESION_PX
  for (const group of modelList.value || []) {
    if (group.faction !== 'hostile') continue
    for (const item of group.children || []) {
      if (deadEntitySet.has(item.id)) continue
      const ent = viewer.entities.getById(item.id)
      if (!ent) continue
      // 视野外的敌方单位不参与吸附锁定
      if (!ent.show) continue
      const pos = ent.position?.getValue(viewer.clock.currentTime)
      if (!pos) continue
      const sp = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos)
      if (!sp) continue
      const d = Math.hypot(sp.x - windowPos.x, sp.y - windowPos.y)
      if (d <= minDist) {
        minDist = d
        nearest = ent
      }
    }
  }
  return nearest
}

function positionAttackLockBox(entity: Cesium.Entity) {
  if (!viewer || !attackLockRef.value) return
  const pos = entity.position?.getValue(viewer.clock.currentTime)
  if (!pos) return
  const sp = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos)
  if (!sp) return
  const size = 28
  attackLockRef.value.style.left = (sp.x - size / 2) + 'px'
  attackLockRef.value.style.top = (sp.y - size / 2) + 'px'
  attackLockRef.value.style.width = size + 'px'
  attackLockRef.value.style.height = size + 'px'
}

function startCombatTick() {
  if (!viewer) return
  initHostilePatrols()
  combatTickHandler = (clock: Cesium.Clock) => {
    if (!viewer) return
    updateBullets(clock.currentTime)
    updateLocks(clock.currentTime)
    // 先更新敌对巡逻位置，再判视野（依赖最新位置）
    updateHostilePatrols(clock.currentTime)
    updateVisionVisibility(clock.currentTime)
  }
  viewer.clock.onTick.addEventListener(combatTickHandler)
}

/** 敌对单位自动巡逻（在集结海区附近做圆周轨迹，按单位类型不同半径/高度） */
const BEACON_LNG = 124.85
const BEACON_LAT = 30.05
const patrolStateMap = new Map<string, { tStart: Cesium.JulianDate; radius: number; height: number; phase: number; speedFactor: number }>()

function initHostilePatrols() {
  if (!viewer) return
  for (const group of modelList.value || []) {
    if (group.faction !== 'hostile') continue
    for (const item of group.children || []) {
      if (item.unitType === 'GROUND') continue // 地面单位不动
      const isAir = item.unitType === 'AIRCRAFT' || item.unitType === 'UAV'
      const radius = item.unitType === 'SHIP' ? 0.35 : isAir ? 0.55 : 0.4 // 经纬度半径
      const height = item.height || (isAir ? 50000 : 0)
      const speedFactor = item.unitType === 'SHIP' ? 0.05 : 0.18 // 完整一圈周期约 2π/speedFactor 模拟秒
      patrolStateMap.set(item.id, {
        tStart: viewer.clock.currentTime.clone(),
        radius,
        height,
        phase: Math.random() * Math.PI * 2,
        speedFactor,
      })
      // 同步初始 entity position 为巡逻起点
      applyPatrolPosition(item, viewer.clock.currentTime)
    }
  }
}

function updateHostilePatrols(now: Cesium.JulianDate) {
  if (!viewer) return
  patrolStateMap.forEach((state, id) => {
    const item = findItemFromList(id)
    if (!item) return
    applyPatrolPosition(item, now, state)
  })
}

function applyPatrolPosition(item: any, now: Cesium.JulianDate, stateOverride?: any) {
  if (!viewer) return
  const state = stateOverride || patrolStateMap.get(item.id)
  if (!state) return
  const elapsedSecs = Cesium.JulianDate.secondsDifference(now, state.tStart)
  const angle = state.phase + elapsedSecs * state.speedFactor
  const lat = BEACON_LAT + state.radius * Math.sin(angle)
  const lng = BEACON_LNG + state.radius * Math.cos(angle) / Math.cos(Cesium.Math.toRadians(lat))
  const ent = viewer!.entities.getById(item.id)
  if (ent) {
    // 必须包成 ConstantPositionProperty，直接赋 Cartesian3 会让 entity.position.getValue() 返回 undefined
    ent.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(lng, lat, state.height)
    )
  }
  item.start.longitude = String(lng)
  item.start.latitude = String(lat)
}

/** ====================== 视野 / 友方共享视野 / 敌对显隐 ====================== */
const hostileIdList: string[] = []
function collectHostileIds() {
  hostileIdList.length = 0
  for (const group of modelList.value || []) {
    if (group.faction !== 'hostile') continue
    for (const item of group.children || []) hostileIdList.push(item.id)
  }
}
function updateVisionVisibility(now: Cesium.JulianDate) {
  if (!viewer) return
  if (hostileIdList.length === 0) collectHostileIds()
  const friendlySensors: Array<{ pos: Cesium.Cartesian3; range: number }> = []
  for (const group of modelList.value || []) {
    if (group.faction !== 'friendly') continue
    for (const item of group.children || []) {
      if (deadEntitySet.has(item.id)) continue
      const ent = viewer!.entities.getById(item.id)
      const pos = ent?.position?.getValue(now)
      if (pos) friendlySensors.push({ pos, range: item.visionRange || 60000 })
    }
  }
  // hostileIdList 与 modelList 中对应 item 通过 id 查找
  for (const hid of hostileIdList) {
    if (deadEntitySet.has(hid)) continue
    const ent = viewer!.entities.getById(hid)
    if (!ent) continue
    const pos = ent.position?.getValue(now)
    if (!pos) continue
    let visible = false
    for (const s of friendlySensors) {
      const d = Cesium.Cartesian3.distance(pos, s.pos)
      if (d <= s.range) {
        visible = true
        break
      }
    }
    if (ent.show !== visible) {
      ent.show = visible
      // 同步更新列表中的 label：视野内 → "类型-编号"，未发现 → "单位-XXX"（或保留默认）
      const item = findItemFromList(hid)
      if (item && item.faction === 'hostile') {
        if (visible && item._visibleLabel) {
          item.label = item._visibleLabel
        } else if (!visible && item._invisibleLabel) {
          item.label = item._invisibleLabel
        }
      }
    }
  }
}

function updateBullets(now: Cesium.JulianDate) {
  if (!viewer) return
  bulletIdToMeta.forEach((meta, bid) => {
    const elapsed = Cesium.JulianDate.secondsDifference(now, meta.tStart)
    if (!meta.targetReached && elapsed >= BULLET_DURATION_S) {
      meta.targetReached = true
      applyDamage(meta.attackerId, meta.targetId)
      // 弹道完成后短暂保留 0.05s 再清理
      setTimeout(() => {
        if (viewer) {
          viewer.entities.removeById(bid)
          bulletIdToMeta.delete(bid)
        }
      }, 50)
    }
  })
}

function updateLocks(now: Cesium.JulianDate) {
  if (!viewer) return
  // 用模拟时间（受 viewer.clock.multiplier 控制）做冷却判定，倍速越快冷却越快
  const nowSecs = Cesium.JulianDate.secondsDifference(now, viewer.clock.startTime)
  lockStateMap.forEach((state, attackerId) => {
    if (deadEntitySet.has(attackerId) || deadEntitySet.has(state.targetId)) {
      // 死亡清理交给 onDeath
      return
    }
    if (nowSecs < (state.cooldownUntil || 0)) return
    const attacker = viewer!.entities.getById(attackerId)
    const target = viewer!.entities.getById(state.targetId)
    if (!attacker || !target) return
    const atkPos = attacker.position?.getValue(now)
    const tgtPos = target.position?.getValue(now)
    if (!atkPos || !tgtPos) return
    const distance = Cesium.Cartesian3.distance(atkPos, tgtPos)
    const attackerItem = findItemFromList(attackerId)
    if (!attackerItem) return
    const range = attackerItem.attackRange || 20000
    if (distance <= range) {
      fireBullet(attackerId, state.targetId, atkPos, tgtPos, now)
      state.cooldownUntil = nowSecs + ATTACK_INTERVAL_S
    }
  })
}

function fireBullet(
  attackerId: string,
  targetId: string,
  startPos: Cesium.Cartesian3,
  targetPos: Cesium.Cartesian3,
  tStart: Cesium.JulianDate
) {
  if (!viewer) return
  const attackerItem = findItemFromList(attackerId)
  const theme = attackerItem?.faction === 'friendly' ? '#00e5ff' : '#ff8a3d'
  const bulletColor = Cesium.Color.fromCssColorString(theme)
  const bid = `bullet-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
  // 持续靶点快照（命中前不改；高速弹道，目标移动较小可接受）
  const tgtSnapshot = targetPos.clone()
  const meta = {
    attackerId,
    targetId,
    targetReached: false,
    tStart: tStart.clone(),
    duration: BULLET_DURATION_S,
    startPos: startPos.clone(),
    targetPos: tgtSnapshot,
  }
  bulletIdToMeta.set(bid, meta)
  viewer.entities.add({
    id: bid,
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const start = meta.startPos
        const end = meta.targetPos
        if (meta.targetReached) return [end, end]
        const elapsed = Cesium.JulianDate.secondsDifference(viewer!.clock.currentTime, meta.tStart)
        const t = Math.max(0, Math.min(1, elapsed / meta.duration))
        const cur = new Cesium.Cartesian3(
          start.x + (end.x - start.x) * t,
          start.y + (end.y - start.y) * t,
          start.z + (end.z - start.z) * t
        )
        return [start, cur]
      }, false),
      width: 4,
      material: new Cesium.PolylineArrowMaterialProperty(bulletColor),
      arcType: Cesium.ArcType.NONE,
      clampToGround: false,
    },
  })
}

function applyDamage(attackerId: string, targetId: string) {
  const attackerItem = findItemFromList(attackerId)
  const targetItem = findItemFromList(targetId)
  if (!attackerItem || !targetItem) return
  if (deadEntitySet.has(targetId)) return
  const damage = attackerItem.attackPower || 80
  targetItem.hp = Math.max(0, (targetItem.hp ?? 0) - damage)
  // 触发右侧报告（仅友军被攻击时记录）
  if (targetItem.faction === 'friendly') {
    emit('battleReport', {
      attackerId,
      attackerLabel: attackerItem.label,
      targetId,
      targetLabel: targetItem.label,
      damage,
    })
  }
  // 若死者已为0或本次命中将其打至0 → 触发爆炸
  if ((targetItem.hp ?? 0) <= 0) {
    triggerDeath(targetItem)
  }
}

/** 触发单位被击毁：失能 + 爆炸 + 冲击波 + 清理锁定关系 */
function triggerDeath(targetItem: any) {
  if (!viewer || deadEntitySet.has(targetItem.id)) return
  deadEntitySet.add(targetItem.id)
  // 失能：移除可选中标志，移除锁定涉及该实体的关系
  const target = viewer.entities.getById(targetItem.id)
  if (target) {
    target.__isSelectable = false
    target.show = false
    const pos = target.position?.getValue(viewer.clock.currentTime)
    if (pos) {
      const theme = targetItem.faction === 'friendly' ? '#00e5ff' : '#ff8a3d'
      playExplosion(pos, theme, targetItem.height || 0)
    }
  }
  // 清理该 entity 关联的锁定与攻击线
  for (const [attackerId, state] of Array.from(lockStateMap.entries())) {
    if (attackerId === targetItem.id || state.targetId === targetItem.id) {
      const key = `${attackerId}->${state.targetId}`
      if (attackLineMap.has(key)) {
        viewer!.entities.removeById(attackLineMap.get(key))
        attackLineMap.delete(key)
      }
      lockStateMap.delete(attackerId)
    }
  }
  // 通知一次
  ElNotification({
    title: '战况更新',
    message: `${targetItem.label} 被击毁`,
    type: (targetItem.faction === 'friendly' ? 'error' : 'success') as any,
    duration: 1500,
  })
  // 判定胜负条件
  checkBattleEnd()
}

/** 爆炸效果：火焰 billboard + 扩张冲击波（一秒内扩张淡出） */
function getExplosionImage() {
  // 用一个简单的彩色圆作为爆炸图（不依赖外部资源）
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,230,150,1)')
  grad.addColorStop(0.4, 'rgba(255,140,40,0.9)')
  grad.addColorStop(1, 'rgba(255,40,20,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  return canvas.toDataURL()
}
const explosionImageData = getExplosionImage()

function playExplosion(cartesian: Cesium.Cartesian3, theme: string, baseHeight: number) {
  if (!viewer) return
  const color = Cesium.Color.fromCssColorString(theme)
  // 火焰/闪光 billboard
  const flash = viewer.entities.add({
    position: cartesian,
    billboard: {
      image: explosionImageData,
      width: 120,
      height: 120,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      scaleByDistance: new Cesium.NearFarScalar(5e3, 1.2, 5e6, 0.4),
    },
  })
  // 冲击波：扩张椭圆，1 模拟秒内淡出（受 GIS 倍速影响）
  const startSecs = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, viewer.clock.startTime)
  const durationSecs = 1.0
  let shockRadius = 200
  const maxRadius = Math.max(2000, baseHeight + 4000)
  const shockId = `shock-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
  const shockware = viewer.entities.add({
    id: shockId,
    position: cartesian,
    ellipse: {
      semiMajorAxis: new Cesium.CallbackProperty(() => shockRadius, false),
      semiMinorAxis: new Cesium.CallbackProperty(() => shockRadius, false),
      material: new Cesium.ColorMaterialProperty(
        new Cesium.CallbackProperty(() => {
          if (!viewer) return color.withAlpha(0)
          const t = Math.min(1, Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, viewer.clock.startTime) - startSecs)
          return color.withAlpha(0.5 * (1 - t))
        }, false)
      ),
      outline: true,
      outlineColor: new Cesium.CallbackProperty(() => {
        if (!viewer) return color.withAlpha(0)
        const t = Math.min(1, Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, viewer.clock.startTime) - startSecs)
        return color.withAlpha(0.9 * (1 - t))
      }, false),
      height: 0,
    },
  })
  let stop = false
  const tick = () => {
    if (stop || !viewer) return
    const t = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, viewer.clock.startTime) - startSecs
    shockRadius = 200 + (maxRadius - 200) * Math.min(1, t)
    if (t >= 1) finish()
  }
  viewer.clock.onTick.addEventListener(tick)
  function finish() {
    stop = true
    if (viewer) {
      viewer.entities.remove(flash)
      viewer.entities.remove(shockware)
      viewer.clock.onTick.removeEventListener(tick)
    }
    shockwaveStateMap.delete(shockId)
  }
  shockwaveStateMap.set(shockId, { stop })
  // 火焰稍短暂消失（使用模拟秒检测，避免 setTimeout 受倍速错位）
  let flashStop = false
  const flashTick = () => {
    if (flashStop || !viewer) return
    const t = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, viewer.clock.startTime) - startSecs
    if (t >= 0.8) {
      flashStop = true
      viewer.entities.remove(flash)
      viewer.clock.onTick.removeEventListener(flashTick)
    }
  }
  viewer.clock.onTick.addEventListener(flashTick)
}
/**
 * 移动指令：左键选目标点，沿插值轨迹匀速移动。
 */
const triggerMove = () => {
  handler!.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
  handler!.setInputAction((e) => {
    menuObject.isShowSelectBox = false
    let target: Cesium.Cartesian3 | undefined = viewer!.scene.pickPosition(e.position) || undefined
    // 兜底：Columbus 视图或 pickPosition 返回 null 情况下，用 ray 与 globe 拾取
    if (!target) {
      const ray = viewer!.camera.getPickRay(e.position)
      if (ray) target = viewer!.scene.globe.pick(ray, viewer!.scene) || undefined
    }
    if (!target) {
      handler!.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
      leftClickEntity()
      return
    }
    const carto = Cesium.Cartographic.fromCartesian(target);
    const longitude = Cesium.Math.toDegrees(carto.longitude);
    const latitude = Cesium.Math.toDegrees(carto.latitude);
    const tStart = viewer!.clock.currentTime
    const startPos = selectedEntry.position?.getValue(tStart)
    if (!startPos) {
      handler!.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
      leftClickEntity()
      return
    }
    const item = findItemFromList(selectedEntry.id)
    const speed = item?.moveSpeed || 50
    const startCarto = Cesium.Cartographic.fromCartesian(startPos)
    const geodesic = new Cesium.EllipsoidGeodesic()
    geodesic.setEndPoints(startCarto, carto)
    const distanceMeters = geodesic.surfaceDistance
    const durationSeconds = Math.max(2, distanceMeters / speed)
    const targetHeight = carto.height || (item?.height ?? 0)
    const targetPos = Cesium.Cartesian3.fromDegrees(longitude, latitude, targetHeight)
    const tEnd = Cesium.JulianDate.addSeconds(tStart, durationSeconds, new Cesium.JulianDate())
    const movePos = new Cesium.SampledPositionProperty()
    movePos.addSample(tStart, startPos)
    movePos.addSample(tEnd, targetPos)
    // Lagrange 多项式插值，避免 2 个样本时插值在某些 tick 上不前进
    movePos.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
    })
    movePos.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD
    movePos.forwardExtrapolationDuration = Number.POSITIVE_INFINITY
    selectedEntry.position = movePos
    selectedEntry.orientation = new Cesium.VelocityOrientationProperty(movePos)
    addMoveTrack(selectedEntry, tStart, tEnd, startPos, targetPos)

    if (item) {
      item.start.longitude = String(longitude)
      item.start.latitude = String(latitude)
    }

    handler!.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    leftClickEntity()
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}
const triggerStop = () => {
  const t = viewer!.clock.currentTime
  const pos = selectedEntry.position?.getValue(t)
  if (!pos) return
  const hold = new Cesium.ConstantPositionProperty(pos)
  selectedEntry.position = hold
  const item = findItemFromList(selectedEntry.id)
  if (item) {
    const carto = Cesium.Cartographic.fromCartesian(pos)
    item.start.longitude = String(Cesium.Math.toDegrees(carto.longitude))
    item.start.latitude = String(Cesium.Math.toDegrees(carto.latitude))
  }
}
const addAttackLine = (entityFrom: any, entityTo: any) => {
  const key = `${entityFrom.id}->${entityTo.id}`
  if (attackLineMap.has(key)) {
    viewer!.entities.removeById(attackLineMap.get(key))
    attackLineMap.delete(key)
    return
  }
  const lineEntity = viewer!.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const p1 = entityFrom.position?.getValue(Cesium.JulianDate.now())
        const p2 = entityTo.position?.getValue(Cesium.JulianDate.now())
        if (!p1 || !p2) return []
        return [p1, p2]
      }, false),
      width: 6,
      material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString('#ff8a3d')),
      clampToGround: false
    }
  })
  attackLineMap.set(key, lineEntity.id)
}
const clearMoveTrackByEntityId = (entityId: string) => {
  if (!viewer || !moveTrackMap.has(entityId)) return
  const { solidLineId, dashedLineId, tickHandler } = moveTrackMap.get(entityId)!
  viewer.entities.removeById(solidLineId)
  viewer.entities.removeById(dashedLineId)
  viewer.clock.onTick.removeEventListener(tickHandler)
  moveTrackMap.delete(entityId)
}
const addMoveTrack = (
  entity: Cesium.Entity,
  tStart: Cesium.JulianDate,
  tEnd: Cesium.JulianDate,
  startPos: Cesium.Cartesian3,
  targetPos: Cesium.Cartesian3
) => {
  if (!viewer || !entity.id) return
  const entityId = String(entity.id)
  clearMoveTrackByEntityId(entityId)
  const dashedLineEntity = viewer.entities.add({
    polyline: {
      positions: [startPos, targetPos],
      width: 2,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.CYAN.withAlpha(0.8),
        dashLength: 18
      }),
      clampToGround: false
    }
  })
  const solidLineEntity = viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        if (!viewer) return []
        const currentPos = entity.position?.getValue(viewer.clock.currentTime)
        if (!currentPos) return []
        return [startPos, currentPos]
      }, false),
      width: 4,
      material: Cesium.Color.CYAN.withAlpha(0.9),
      clampToGround: false
    }
  })
  const tickHandler = (clock: Cesium.Clock) => {
    if (Cesium.JulianDate.greaterThanOrEquals(clock.currentTime, tEnd)) {
      clearMoveTrackByEntityId(entityId)
    }
  }
  viewer.clock.onTick.addEventListener(tickHandler)
  moveTrackMap.set(entityId, {
    solidLineId: String(solidLineEntity.id),
    dashedLineId: String(dashedLineEntity.id),
    tickHandler
  })
}
const flyToEntityById = (id: string) => {
  if (selectedEntry && selectedEntry.id === id) {
    viewer!.flyTo(selectedEntry)
    return
  }
  const entity = viewer!.entities.getById(id)
  entity && viewer!.flyTo(entity)
}
const selectedEntityById = (id: string) => {
  if (selectedEntry && selectedEntry.id === id) {
    return
  }
  const entity = viewer!.entities.getById(id)
  if (!entity) return
  selectedEntry = entity
  emit('selectedEntityChange', entity.id)
  // 敌对且当前不在友军视野中（ent.show=false）→ 不画选择框，仅弹信息面板（且信息为???）
  if ((entity as any).__faction === 'hostile' && !entity.show) {
    menuObject.isShowSelectBox = false
  } else {
    showSelectBox(selectedEntry)
  }
  bindInfoFromEntity(entity.id)
}

const generateRadiationPoints = (
  centerLon = 126.267896,
  centerLat = 32.287421,
  count = 300,
  maxRadius = 0.3
) => {
  const points = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.pow(Math.random(), 0.5) * maxRadius
    const dx = r * Math.cos(angle)
    const dy = r * Math.sin(angle)
    const lon = centerLon + dx / Math.cos((centerLat * Math.PI) / 180)
    const lat = centerLat + dy
    const value = 100 * Math.exp(-r * 80) * (0.7 + Math.random() * 0.6)
    points.push({ lnglat: [lon, lat], value: Math.max(1, Math.round(value)) })
  }
  return points
}
let heatMapInstance: Heatmap | null = null
const HEAT_CENTER_LNG = 124.1098234
const HEAT_CENTER_LAT = 29.487421
/** 初始 / 最终 / 步进半径（度数）。每 20 模拟秒扩散一次，单调递增到 MAX 后停止 */
const HEAT_INIT_RADIUS = 0.1
const HEAT_MAX_RADIUS = 1.2
const HEAT_STEP_RADIUS = 0.18
let heatCurrentRadius = HEAT_INIT_RADIUS
let heatAccumulatedSecs = 0
let heatRadiateHandler: ((clock: Cesium.Clock) => void) | null = null
function rebuildHeatMap(maxRadius: number, count: number) {
  const points = generateRadiationPoints(HEAT_CENTER_LNG, HEAT_CENTER_LAT, count, maxRadius)
  heatMapInstance?.destory?.()
  if (!viewer) return
  heatMapInstance = new HeatMap(viewer, { list: points })
}
function doRadiateStep() {
  if (heatCurrentRadius >= HEAT_MAX_RADIUS) {
    // 已扩散到上限 → 不再扩张，停止后续重建
    return
  }
  heatCurrentRadius = Math.min(HEAT_MAX_RADIUS, heatCurrentRadius + HEAT_STEP_RADIUS)
  rebuildHeatMap(heatCurrentRadius, 5000)
}
const initHeatMap = () => {
  heatCurrentRadius = HEAT_INIT_RADIUS
  rebuildHeatMap(heatCurrentRadius, 5000)
  if (!viewer) return
  let lastTime = viewer.clock.currentTime.clone()
  heatRadiateHandler = (clock: Cesium.Clock) => {
    if (!viewer) return
    const dt = Cesium.JulianDate.secondsDifference(clock.currentTime, lastTime)
    if (dt <= 0) {
      lastTime = clock.currentTime.clone()
      return
    }
    heatAccumulatedSecs += dt
    lastTime = clock.currentTime.clone()
    if (heatAccumulatedSecs >= 20) {
      heatAccumulatedSecs = 0
      doRadiateStep()
    }
  }
  viewer.clock.onTick.addEventListener(heatRadiateHandler)
}
const weatherStage = new Cesium.PostProcessStage({
  name: 'WeatherStage',
  fragmentShader: `
#version 300 es
precision highp float;

uniform sampler2D colorTexture;
uniform int   weatherType;
uniform float time;
uniform float strength;

in vec2 v_textureCoordinates;
out vec4 fragColor;

float hash1(float n) { return fract(sin(n) * 43758.5453123); }
vec2 hash2(vec2 p) {
  return fract(sin(vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  )) * 43758.5453123);
}
vec4 fogEffect(vec4 scene) {
  vec3 fogColor = vec3(0.8, 0.8, 0.85);
  float fogDensity = 0.7;
  float f = 1.0 - v_textureCoordinates.y;
  float fog = 1.0 - exp(-f * fogDensity);
  fog = clamp(fog, 0.0, 1.0);
  return vec4(mix(scene.rgb, fogColor, fog * strength), 1.0);
}
vec4 rainEffect(vec4 scene) {
  vec2 res = czm_viewport.zw;
  vec2 uv = (gl_FragCoord.xy * 2.0 - res) / min(res.x, res.y);
  float a = -0.4;
  float si = sin(a), co = cos(a);
  uv *= mat2(co, -si, si, co);
  uv *= length(uv + vec2(0.0, 4.9)) * 0.3 + 1.0;
  float v = 1.0 - sin(hash1(floor(uv.x * 100.0)) * 2.0);
  float b = clamp(abs(sin(20.0 * time * v + uv.y * (5.0 / (2.0 + v)))) - 0.95, 0.0, 1.0) * 20.0;
  vec3 rain = vec3(0.6, 0.7, 0.8) * v * b;
  return mix(scene, vec4(rain, 1.0), 0.4 * strength);
}
float dseg(vec2 p, vec2 a) {
  float h = clamp(dot(p, a) / dot(a, a), 0.0, 1.0);
  return length(p - a * h);
}
vec4 lightningEffect() {
  float flash = step(0.97, fract(time * 0.6 + hash1(floor(time))));
  if (flash < 0.5) return vec4(0.0);
  vec2 res = czm_viewport.zw;
  vec2 p = (gl_FragCoord.xy * 2.0 - res) / res.y;
  float mdist = 1000.0;
  vec2 pos = vec2(hash1(time) * 1.6 - 0.8, 1.2);
  for (int i = 0; i < 50; i++) {
    vec2 dir = vec2((hash2(vec2(float(i), time)).x - 0.5) * 0.07, -0.08 - hash1(float(i) + time) * 0.05);
    mdist = min(mdist, dseg(p - pos, dir));
    pos += dir;
  }
  float core = exp(-180.0 * mdist);
  float glow = exp(-20.0 * mdist);
  float i = (core * 3.0 + glow) * strength;
  return vec4(i * vec3(0.75, 0.85, 1.0), clamp(i, 0.0, 1.0));
}
vec4 snowEffect(vec4 scene) {
  vec2 res = czm_viewport.zw;
  vec2 uv = gl_FragCoord.xy / res;
  float snow = 0.0;
  const int COUNT = 80;
  for (int i = 0; i < COUNT; i++) {
    float fi = float(i);
    float randX = hash1(fi * 12.34);
    float randY = hash1(fi * 56.78);
    float speed = 0.15 + hash1(fi * 90.12) * 0.3;
    float size  = 0.002 + hash1(fi * 34.56) * 0.003;
    float y = fract(randY - time * speed);
    vec2 pos = vec2(randX, y);
    float d = distance(uv, pos);
    snow += smoothstep(size, 0.0, d);
  }
  snow = clamp(snow, 0.0, 1.0);
  vec3 snowColor = vec3(1.0);
  vec3 result = mix(scene.rgb, snowColor, snow * strength);
  return vec4(result, 1.0);
}
float hash2to1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash2to1(i); float b = hash2to1(i + vec2(1.0,0.0));
  float c = hash2to1(i + vec2(0.0,1.0)); float d = hash2to1(i + vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0,100.0);
  for(int i=0;i<4;i++){ v += a*noise(p); p = p*2.0 + shift; a *= 0.5; }
  return v;
}
vec4 cloudyEffect(vec4 scene) {
  vec2 res = czm_viewport.zw;
  vec2 uv = gl_FragCoord.xy / res;
  float cloud = 1.0;
  float hole = 0.0;
  hole += 0.6 * fbm(uv * 1.2 + vec2(time * 0.15, time * 0.05));
  hole += 0.3 * fbm(uv * 2.5 + vec2(-time * 0.3, time * 0.15));
  hole += 0.15 * fbm(uv * 5.0 + vec2(time * 0.45, -time * 0.25));
  hole /= (0.6 + 0.3 + 0.15);
  hole = smoothstep(0.3, 0.6, hole);
  cloud = 1.0 - hole;
  cloud = pow(cloud, 1.8);
  float edge = abs(dFdx(cloud)) + abs(dFdy(cloud));
  edge = smoothstep(0.02, 0.08, edge);
  float cloudEdge = edge * 0.4;
  vec3 base = scene.rgb;
  base *= 1.0 - cloud * 0.45;
  vec3 cloudColor = vec3(1.0);
  float alpha = cloud * 0.85 * strength;
  vec3 result = mix(base, cloudColor, alpha);
  return vec4(result, 1.0);
}
void main() {
  vec4 scene = texture(colorTexture, v_textureCoordinates);
  vec4 result = scene;
  if (weatherType == 1) result = fogEffect(scene);
  else if (weatherType == 2) result = rainEffect(scene);
  else if (weatherType == 3) { vec4 bolt = lightningEffect(); result = mix(scene, bolt, bolt.a); }
  else if (weatherType == 4) { vec4 rain = rainEffect(scene); vec4 bolt = lightningEffect(); result = mix(rain, bolt, bolt.a); }
  else if (weatherType == 5) result = snowEffect(scene);
  else if (weatherType == 6) result = cloudyEffect(scene);
  fragColor = result;
}
`,
  uniforms: { time: 0.0, strength: 1.0, weatherType: 0 }
})
const initWeather = () => {
  viewer!.scene.postProcessStages.add(weatherStage)
  viewer!.scene.preUpdate.addEventListener(() => {
    weatherStage.uniforms.time += 0.016
  })
}
const changeWeather = (weatherType: number) => {
  weatherStage.uniforms.weatherType = weatherType
}

/**
 * 地图风场（外网公开数据优先，大范围 Mock 兜底）
 * - 加载阶段调用 mock/wind.ts.loadWindGrid() 拉取 Open-Meteo 风场网格
 * - 粒子系统：1200 个，每个粒子每帧根据所在格点的风向/风速步进
 * - 粒子拖尾用 Polyline + CallbackProperty，颜色由风速强度上色（淡蓝→亮青）
 * - 风场更新绑在 preUpdate 上（实时帧率驱动），不受 GIS 倍速影响
 */
/**
 * 地图风场（Mock 数据驱动）
 * 在大范围海区（80°E–170°E / 0°–55°N）渲染粒子拖尾，长风线（trail 12 点）
 * 其中部分粒子在固定涡心区域（约 130°E, 25°N 附近）做气旋式运动
 * 总体感受近似气象预报中的西太平洋风场（带旋涡）
 */
type WindParticle = {
  lng: number
  lat: number
  age: number
  maxAge: number
  trail: { lng: number; lat: number }[]
  /** 是否受涡心影响（用于颜色加亮） */
  vortex: boolean
}
const windBox = { minLng: 80, maxLng: 170, minLat: 0, maxLat: 55 }
const windConfig = reactive({ enabled: true, count: 1800, trailMax: 12, fps: 30, ready: false })
let windParticles: WindParticle[] = []
let windEntityMap = new Map<string, Cesium.Entity>()
let windTickHandler: (() => void) | null = null
let windLastMs = 0
const windIdPrefix = 'wind-p-'

/** 大尺度风场函数：返回 [经度增量, 纬度增量] per m */
function fieldAt(lng: number, lat: number): { dx: number; dy: number; speed: number } {
  // 基础场：东北向盛行风（drift 风）
  const t = Date.now() * 0.00003
  let baseDir = Cesium.Math.toRadians(220 + 12 * Math.sin(t + lng * 0.05))
  let baseSpeed = 7 + 2.5 * Math.sin(lat * 0.15 + t)

  // 气旋涡心：中心位置 = 轻微缓慢旋转的中心
  const vortexCenter = { lng: 132, lat: 24 }
  // 涡心半径（经纬度单位）
  const vortexMaxRadius = 18
  const dLng = lng - vortexCenter.lng
  const dLat = lat - vortexCenter.lat
  // 缓慢漂移涡心（气旋不会固定位置）
  const cx = vortexCenter.lng + 1.5 * Math.sin(t * 2)
  const cy = vortexCenter.lat + 0.8 * Math.cos(t * 2)
  const rx = lng - cx
  const ry = lat - cy
  const r = Math.sqrt(rx * rx + ry * ry)
  // 距涡心越近切向速度越大；超出半径则按距离衰减
  const tangentialStrength = Math.max(0, 1 - r / vortexMaxRadius)
  // 切向方向（顺时针旋转 = 北半球气旋）
  const tangentAngle = Math.atan2(rx, -ry)
  // 把 baseDir 转为向量再叠加切向向量再归一化
  let vx = baseSpeed * Math.cos(baseDir) + 22 * tangentialStrength * Math.cos(tangentAngle)
  let vy = baseSpeed * Math.sin(baseDir) + 22 * tangentialStrength * Math.sin(tangentAngle)
  const magnitude = Math.sqrt(vx * vx + vy * vy)
  if (magnitude > 0.001) {
    vx = (vx / magnitude) * (baseSpeed + 18 * tangentialStrength)
    vy = (vy / magnitude) * (baseSpeed + 18 * tangentialStrength)
  }
  // 单位 m/s → 经纬度步长：1 度 ≈ 111 km，每秒走 speed m，单帧 dt 设定后步长另行换算
  // 这里简化为每帧 dx/dy 度/帧
  const stepDeg = 0.05
  const speed = Math.sqrt(vx * vx + vy * vy)
  return { dx: (vx / Math.max(1, speed)) * stepDeg, dy: (vy / Math.max(1, speed)) * stepDeg, speed }
}

function seedWindParticles() {
  windParticles = []
  for (let i = 0; i < windConfig.count; i++) {
    const vortex = Math.random() < 0.18
    let lng: number, lat: number
    if (vortex) {
      // 涡心附近布置
      const r = Math.pow(Math.random(), 0.7) * 18
      const a = Math.random() * Math.PI * 2
      lng = 132 + r * Math.cos(a)
      lat = 24 + r * Math.sin(a) * 0.5
    } else {
      lng = windBox.minLng + Math.random() * (windBox.maxLng - windBox.minLng)
      lat = windBox.minLat + Math.random() * (windBox.maxLat - windBox.minLat)
    }
    windParticles.push({
      lng,
      lat,
      age: Math.floor(Math.random() * 100),
      maxAge: 80 + Math.floor(Math.random() * 80),
      trail: [],
      vortex,
    })
  }
}
function lerpColor(t: number) {
  // t in [0,1]，淡蓝 → 亮青/紫（旋涡区高亮）
  const r = Math.round(150 + (140 - 150) * t)
  const g = Math.round(200 + (90 - 200) * t)
  const b = Math.round(255)
  const a = 0.35 + 0.55 * t
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
}
function stepWind() {
  for (const p of windParticles) {
    const f = fieldAt(p.lng, p.lat)
    p.trail.push({ lng: p.lng, lat: p.lat })
    if (p.trail.length > windConfig.trailMax) p.trail.shift()
    const cosLat = Math.cos(Cesium.Math.toRadians(p.lat))
    p.lng += f.dx / cosLat
    p.lat += f.dy
    p.age++
    if (p.age > p.maxAge || p.lng < windBox.minLng || p.lng > windBox.maxLng || p.lat < windBox.minLat || p.lat > windBox.maxLat) {
      const vortex = Math.random() < 0.18
      if (vortex) {
        const r = Math.pow(Math.random(), 0.7) * 18
        const a = Math.random() * Math.PI * 2
        p.lng = 132 + r * Math.cos(a)
        p.lat = 24 + r * Math.sin(a) * 0.5
      } else {
        p.lng = windBox.minLng + Math.random() * (windBox.maxLng - windBox.minLng)
        p.lat = windBox.minLat + Math.random() * (windBox.maxLat - windBox.minLat)
      }
      p.age = 0
      p.trail = [{ lng: p.lng, lat: p.lat }]
      p.vortex = vortex
    }
  }
}
function createWindEntities() {
  if (!viewer) return
  windParticles.forEach((p, i) => {
    const id = `${windIdPrefix}${i}`
    const positions = new Cesium.CallbackProperty(() => {
      return p.trail.map((t) => Cesium.Cartesian3.fromDegrees(t.lng, t.lat, 12000))
    }, false)
    const color = p.vortex
      ? Cesium.Color.fromCssColorString(lerpColor(0.95))
      : Cesium.Color.fromCssColorString(lerpColor(Math.min(1, 6 / 18)))
    const ent = viewer!.entities.add({
      id,
      polyline: {
        positions,
        width: p.vortex ? 2.0 : 1.3,
        material: new Cesium.ColorMaterialProperty(color),
        arcType: Cesium.ArcType.NONE,
        clampToGround: false,
      },
    })
    windEntityMap.set(id, ent)
  })
}
const initWindField = () => {
  if (!viewer) return
  seedWindParticles()
  createWindEntities()
  windConfig.ready = true
  windLastMs = Date.now()
  windTickHandler = () => {
    if (!windConfig.enabled || !viewer) return
    const now = Date.now()
    if (now - windLastMs < 1000 / windConfig.fps) return
    windLastMs = now
    stepWind()
  }
  viewer.scene.preUpdate.addEventListener(windTickHandler)
  ElNotification({
    title: '风场加载',
    message: `已加载大范围 Mock 风场（${windConfig.count} 粒子，含气旋涡心）`,
    type: 'success',
    duration: 2000,
  })
}
const toggleWindField = (on: boolean) => {
  windConfig.enabled = on
  if (!viewer) return
  windEntityMap.forEach((ent) => {
    ent.show = on
  })
}
/** 胜负判定：友军全灭→失败，敌对全灭→胜利 */
const battleResult = ref<'win' | 'lose' | null>(null)
function checkBattleEnd() {
  if (battleResult.value || !viewer) return
  let friendlyAlive = 0
  let hostileAlive = 0
  for (const group of modelList.value || []) {
    for (const item of group.children || []) {
      if (deadEntitySet.has(item.id)) continue
      if (item.faction === 'friendly') friendlyAlive++
      else if (item.faction === 'hostile') hostileAlive++
    }
  }
  if (hostileAlive === 0) battleResult.value = 'win'
  else if (friendlyAlive === 0) battleResult.value = 'lose'
  if (battleResult.value) {
    emit('battleReport', {
      attackerId: '',
      attackerLabel: '',
      targetId: '',
      targetLabel: '',
      damage: 0,
    })
  }
}
const triggerAttack = (targetId?: string) => {
  if (!selectedEntry) return
  if (targetId) {
    // 直接通过 API 锁定目标（右侧指令兼容）
    const target = viewer!.entities.getById(targetId)
    if (target && (target as any).__faction === 'hostile') {
      lockStateMap.set(String(selectedEntry.id), {
        attackerId: String(selectedEntry.id),
        targetId,
        cooldownUntil: 0,
      })
      addAttackLine(selectedEntry, target)
      const aItem = findItemFromList(String(selectedEntry.id))
      const tItem = findItemFromList(targetId)
      ElNotification({
        title: '目标锁定',
        message: `${aItem?.label || ''} 已锁定 ${tItem?.label || ''}，进入射程自动攻击`,
        type: 'success',
      })
    }
  } else {
    triggerAttackLockMode()
  }
}
onUnmounted(() => {
  if (heatRadiateHandler && viewer) {
    viewer.clock.onTick.removeEventListener(heatRadiateHandler)
    heatRadiateHandler = null
  }
  heatMapInstance?.destory?.()
  heatMapInstance = null
  if (windTickHandler && viewer) {
    viewer.scene.preUpdate.removeEventListener(windTickHandler)
    windTickHandler = null
  }
  if (combatTickHandler && viewer) {
    viewer.clock.onTick.removeEventListener(combatTickHandler)
    combatTickHandler = null
  }
  if (viewer) {
    windEntityMap.forEach((_, id) => {
      viewer!.entities.removeById(id)
    })
  }
  windEntityMap.clear()
  radarScanStateMap.forEach((_, __) => { /* entity refs will be destroyed with viewer */ })
  radarScanStateMap.clear()
  // 清理战斗状态
  lockStateMap.clear()
  bulletIdToMeta.clear()
  shockwaveStateMap.clear()
  if (lockEscHandlerRef) {
    window.removeEventListener('keydown', lockEscHandlerRef)
    lockEscHandlerRef = null
  }
  if (viewer) {
    const canvas = viewer.scene.canvas
    handler?.destroy()
    canvas.removeEventListener('contextmenu', sceneContextmenu as any)
    moveTrackMap.forEach(({ solidLineId, dashedLineId, tickHandler }) => {
      viewer!.entities.removeById(solidLineId)
      viewer!.entities.removeById(dashedLineId)
      viewer!.clock.onTick.removeEventListener(tickHandler)
    })
    moveTrackMap.clear()
    viewer.destroy()
    viewer = null
  }
})
const SPEED_OPTIONS = [1, 2, 5, 10, 30, 50, 100, 150, 300, 500, 1000, 1500, 3000, 6000]
let entryStartJulian: Cesium.JulianDate | null = null
function setSpeed(multiplier: number) {
  if (!viewer) return
  const m = Number(multiplier)
  viewer.clock.multiplier = (isFinite(m) && m > 0) ? m : 1
  viewer.clock.shouldAnimate = true
  viewer.useDefaultRenderLoop = true
}
function getSpeed() {
  return viewer ? viewer.clock.multiplier : 1
}
function getStartTime() {
  if (viewer && entryStartJulian) {
    return Cesium.JulianDate.toDate(entryStartJulian)
  }
  return new Date()
}
function getCurrentTime() {
  if (viewer) {
    return Cesium.JulianDate.toDate(viewer.clock.currentTime)
  }
  return new Date()
}
function isWindReady() {
  return !!windConfig.ready
}
function getWindSource(): 'open-meteo' | 'mock' | null {
  return 'mock'
}

defineExpose({
  flyToEntityById,
  selectedEntityById,
  commandClick,
  changeWeather,
  triggerAttack,
  startRadarScan,
  toggleWindField,
  setSpeed,
  getSpeed,
  getStartTime,
  getCurrentTime,
  isWindReady,
  getWindSource,
  SPEED_OPTIONS,
})

/** 重置战斗：复活所有单位，清除爆炸与锁定，关闭结算 */
function resetBattle() {
  battleResult.value = null
  deadEntitySet.clear()
  lockStateMap.clear()
  bulletIdToMeta.forEach((_meta, bid) => {
    if (viewer) viewer!.entities.removeById(bid)
  })
  bulletIdToMeta.clear()
  attackLineMap.forEach((lineId) => viewer?.entities.removeById(lineId))
  attackLineMap.clear()
  for (const group of modelList.value || []) {
    for (const item of group.children || []) {
      item.hp = item.maxHp
      // 敌对单位捺回 "单位-HXX"
      if (item.faction === 'hostile' && item._invisibleLabel) {
        item.label = item._invisibleLabel
      }
      const ent = viewer?.entities.getById(item.id)
      if (ent) {
        ent.show = item.faction === 'hostile' ? false : true
        ent.__isSelectable = true
      }
    }
  }
  updateVisionVisibility(viewer?.clock.currentTime ?? Cesium.JulianDate.now())
  ElNotification({ title: '战斗重置', message: '所有单位状态已恢复', type: 'success' })
}
</script>

<style lang="scss" scoped>
.cesium-wrap {
  height: 100%;
  width: 100%;
  position: relative;
}

:deep(.cesium-viewer-animationContainer),
:deep(.cesium-viewer-timelineContainer) {
  display: none;
}

.info-list {
  position: absolute;
  top: 150px;
  right: 30px;
  width: 320px;
  z-index: 2;

  // 默认友军主题（青色）
  border: 1px solid rgba(0, 229, 255, 0.45);
  background: linear-gradient(180deg, rgba(0, 32, 64, 0.78), rgba(0, 16, 40, 0.72));
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.22);
  :deep(.el-descriptions__label) { color: rgba($white, 0.55); }
  :deep(.el-descriptions__content) { color: rgba($white, 0.82); }

  &.hostile {
    border-color: rgba(255, 138, 61, 0.55);
    background: linear-gradient(180deg, rgba(60, 18, 4, 0.78), rgba(34, 8, 0, 0.72));
    box-shadow: 0 0 12px rgba(255, 138, 61, 0.32);
    :deep(.el-descriptions__label) { color: rgba(255, 220, 200, 0.65); }
    :deep(.el-descriptions__content) { color: #ffd9b8; }
    .row-with-dot .dot.hostile { background: #ff8a3d; box-shadow: 0 0 6px #ff8a3d; }
  }

  >.common-card-content {
    >.avatar {
      width: 100%;
      height: 120px;
      margin-bottom: 10px;
      background-position: center center;
      background-repeat: no-repeat;
      background-size: cover;
    }
  }
}

.row-with-dot {
  display: flex;
  align-items: center;
  gap: 6px;
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    &.friendly { background: #00e5ff; box-shadow: 0 0 6px #00e5ff; }
    &.hostile { background: #ff8a3d; box-shadow: 0 0 6px #ff8a3d; }
  }
}

.select-box {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  border: 3px solid #fadb14;
}

.attack-lock-box {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  border: 2px dashed #ff4d4f;
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(255, 77, 79, 0.6);
  animation: lockPulse 0.8s ease-in-out infinite;
}

.lock-tip {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 6px 14px;
  font-size: 13px;
  color: $white;
  background: rgba(0, 24, 56, 0.7);
  border: 1px solid rgba(255, 77, 79, 0.55);
  border-radius: 16px;
  backdrop-filter: blur(6px);
  pointer-events: none;
}

@keyframes lockPulse {
  0%, 100% { box-shadow: 0 0 14px rgba(255, 77, 79, 0.4); }
  50% { box-shadow: 0 0 20px rgba(255, 77, 79, 0.8); }
}

.battle-result {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, rgba(0, 16, 40, 0.6), rgba(0, 0, 0, 0.85));
  backdrop-filter: blur(2px);

  .result-title {
    font-size: 120px;
    font-weight: 700;
    letter-spacing: 24px;
    text-shadow: 0 0 32px currentColor;
    animation: titleRise 1.2s ease-out;
  }
  .result-sub {
    margin-top: 12px;
    font-size: 20px;
    letter-spacing: 4px;
    color: rgba($white, 0.65);
  }
  .result-reset {
    margin-top: 36px;
    padding: 10px 28px;
    background: rgba(0, 30, 70, 0.6);
    color: $white;
    border: 1px solid rgba(0, 229, 255, 0.5);
    border-radius: 4px;
    font-size: 15px;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: rgba(0, 229, 255, 0.18);
      border-color: #00e5ff;
      box-shadow: 0 0 16px rgba(0, 229, 255, 0.45);
    }
  }

  &.win .result-title { color: #00e5ff; }
  &.lose .result-title { color: #ff4d4f; }
}

@keyframes titleRise {
  0% { opacity: 0; transform: translateY(40px) scale(0.8); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.result-fade-enter-active, .result-fade-leave-active { transition: opacity 0.5s ease; }
.result-fade-enter-from, .result-fade-leave-to { opacity: 0; }

.context-menu-wrap {
  background-color: rgba(0, 78, 150, 0.5);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  border-radius: 7px;
  padding-bottom: 5px;
  backdrop-filter: blur(5px);

  >ul {
    padding: 0 5px;

    >li {
      cursor: pointer;
      border-radius: 7px;
      line-height: 36px;
      font-size: 16px;
      padding: 0 20px;
      margin-top: 5px;

      &:hover {
        background-color: $primary;
      }
    }
  }
}

.current-fuel-wrap {
  display: flex;
  align-items: center;
  width: 100%;

  >div {
    width: 100px;
    min-width: 0;
    border: 1px solid #236da6;
    height: 20 px;
    margin-right: 5px;
    position: relative;
    overflow: hidden;

    >p {
      position: relative;
      width: 100%;
      text-align: center;
      color: $gray-300;
      font-size: 12px;
      z-index: 1;
    }

    >span {
      position: absolute;
      width: var(--with);
      height: 40px;
      top: -9px;
      left: 0;
      background-color: #236da6;
      z-index: 0;
      transform: rotate(4deg);
      animation: rollOil .5s ease infinite;
    }
  }

  >span {
    flex: 1;
  }
}

@keyframes rollOil {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(2deg); }
  50% { transform: rotate(0deg); }
  75% { transform: rotate(-2deg); }
  100% { transform: rotate(0deg); }
}
</style>