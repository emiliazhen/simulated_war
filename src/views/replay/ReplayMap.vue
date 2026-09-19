<template>
  <div class="replay-map" ref="mapRef"></div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { buildForces, FACTION_THEME, type ForceState } from '@/mock/forces'
import type { PlaybackEvent } from '@/sim/replayPlayback'
import {
  activeAttackPairs,
  activeExplosions,
  activeMoves,
  activeScans,
  enrichEvents,
  followUnitId,
  hiddenIdsAt,
  isUnitMoving,
  unitCartesian,
  unitPoseAt,
} from '@/sim/replayPlayback'

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || ''

const props = defineProps<{
  currentSeconds: number
  playing: boolean
  events: PlaybackEvent[]
  focusId?: string
  focusKey?: string
  /** auto：事件切镜并跟随机动；free：完全不改相机 */
  cameraMode?: 'auto' | 'free'
}>()

const mapRef = ref<HTMLElement | null>(null)
let viewer: Cesium.Viewer | null = null
let lastFocusKey = ''
let cameraLocked = false
let applyingCamera = false
let userAdjustedZoom = false
let userHeight = 0
const forces = buildForces()
const playback = {
  t: 0,
  playing: false,
  events: [] as PlaybackEvent[],
  forces,
}

/** 自动切镜默认高度：能看到周边单位，且不再贴地 */
const DEFAULT_CUT_HEIGHT = 380000
const FX_PREFIX = 'rp-'
const trackSig = new Map<string, string>()
const boomSig = new Map<string, string>()

const UNIT_ICON: Record<string, string> = {
  AIRCRAFT: 'fight_plane',
  UAV: 'fight_plane',
  GROUND: 'tank',
  SHIP: 'battle_ship',
}

function explosionImage() {
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
const explosionImageData = explosionImage()

function cartesianOf(id: string, result?: Cesium.Cartesian3) {
  return unitCartesian(id, playback.t, playback.events, playback.forces, result)
}

function themeOf(id: string) {
  const force = forces.find((f) => f.id === id)
  return FACTION_THEME[force?.faction || 'friendly']
}

function initViewer() {
  if (!mapRef.value || viewer) return
  viewer = new Cesium.Viewer(mapRef.value, {
    animation: false,
    timeline: false,
    homeButton: false,
    geocoder: false,
    fullscreenButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: false,
  })
  const imageryLayer = new Cesium.UrlTemplateImageryProvider({
    url: '/tiles/{z}/{x}/{y}.png',
    maximumLevel: 17,
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
  })
  viewer.imageryLayers.removeAll()
  viewer.imageryLayers.addImageryProvider(imageryLayer)
  ;(viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none'
  viewer.scene.globe.baseColor = Cesium.Color.BLACK
  viewer.scene.mode = Cesium.SceneMode.COLUMBUS_VIEW
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 2500
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000000
  viewer.clock.shouldAnimate = false
  viewer.clock.currentTime = viewer.clock.startTime.clone()

  addCity('三亚', 108.763054, 18.453434)
  addCity('青岛', 120.369557, 36.094406)
  addCity('大连', 121.118622, 38.71459)
  addBeacon(124.85, 30.05, '敌对集结海区')

  for (const force of forces) addUnit(force)

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(123.2, 28.4, 1_200_000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
  })
  viewer.scene.screenSpaceCameraController.enableZoom = true
  viewer.scene.screenSpaceCameraController.enableTranslate = true
  viewer.scene.screenSpaceCameraController.enableRotate = true
  viewer.camera.changed.addEventListener(onUserCameraChanged)
  viewer.scene.canvas.addEventListener('wheel', onUserZoomWheel, { passive: true })
}

function addCity(title: string, lng: number, lat: number) {
  viewer!.entities.add({
    name: title,
    position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
    billboard: {
      image: '/images/location_point.png',
      width: 18,
      height: 18,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: title,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -12),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

function addBeacon(lng: number, lat: number, title: string) {
  const color = Cesium.Color.fromCssColorString('#ff4d4f')
  viewer!.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
    ellipse: {
      semiMajorAxis: 28000,
      semiMinorAxis: 28000,
      material: color.withAlpha(0.12),
      outline: true,
      outlineColor: color.withAlpha(0.55),
      height: 0,
    },
    label: {
      text: title,
      font: '16px sans-serif',
      fillColor: color,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -18),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

function addUnit(force: ForceState) {
  const theme = FACTION_THEME[force.faction]
  const icon = UNIT_ICON[force.unitType] || 'battle_ship'
  const id = force.id
  viewer!.entities.add({
    id,
    name: force.label,
    position: new Cesium.CallbackPositionProperty((time, result) => {
      return cartesianOf(id, result)
    }, false),
    billboard: {
      image: `/images/${icon}.png`,
      width: 30,
      height: 30,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: `${force.label}\n${id}`,
      font: '13px sans-serif',
      fillColor: Cesium.Color.fromCssColorString(theme.labelFill),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -16),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

function unlockCamera() {
  if (!viewer || !cameraLocked) return
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
  cameraLocked = false
}

function onUserZoomWheel() {
  captureUserHeight()
}

function onUserCameraChanged() {
  if (applyingCamera) return
  captureUserHeight()
}

function captureUserHeight() {
  if (!viewer) return
  const h = viewer.camera.positionCartographic.height
  if (!Number.isFinite(h) || h < 2000) return
  userHeight = h
  userAdjustedZoom = true
}

function cutHeight() {
  if (userAdjustedZoom && userHeight > 2000) return userHeight
  return DEFAULT_CUT_HEIGHT
}

/** 只平移到目标经纬，保留当前缩放（相机高度）与姿态，不使用 lookAt 锁定。 */
function panToId(id: string, animate: boolean) {
  if (!viewer || !id) return
  const pose = unitPoseAt(id, playback.t, playback.events, playback.forces)
  if (!pose) return
  unlockCamera()
  const height = cutHeight()
  const dest = Cesium.Cartesian3.fromDegrees(pose.lng, pose.lat, height)
  const orientation = {
    heading: viewer.camera.heading,
    pitch: viewer.camera.pitch,
    roll: 0,
  }
  applyingCamera = true
  viewer.camera.cancelFlight()
  if (animate) {
    viewer.camera.flyTo({
      destination: dest,
      orientation,
      duration: 0.45,
      complete: () => { applyingCamera = false },
      cancel: () => { applyingCamera = false },
    })
  } else {
    viewer.camera.setView({ destination: dest, orientation })
    applyingCamera = false
  }
}

function highlight(id: string) {
  if (!viewer) return
  for (const force of forces) {
    const other = viewer.entities.getById(force.id)
    if (!other?.billboard) continue
    const on = force.id === id
    other.billboard.width = on ? 42 : 30
    other.billboard.height = on ? 42 : 30
  }
}

function applyHidden() {
  if (!viewer) return
  const hidden = hiddenIdsAt(playback.t, playback.events)
  for (const force of forces) {
    const ent = viewer.entities.getById(force.id)
    if (ent) ent.show = !hidden.has(force.id)
  }
}

function removeFxIfUnused(keep: Set<string>) {
  if (!viewer) return
  const stale: string[] = []
  for (const ent of viewer.entities.values) {
    const id = String(ent.id)
    if (id.startsWith(FX_PREFIX) && !keep.has(id)) stale.push(id)
  }
  for (const id of stale) viewer.entities.removeById(id)
  for (const id of Array.from(trackSig.keys())) {
    if (!keep.has(`rp-dash-${id}`)) trackSig.delete(id)
  }
  for (const id of Array.from(boomSig.keys())) {
    if (!keep.has(id)) boomSig.delete(id)
  }
}

function ensureTrack(move: PlaybackEvent, keep: Set<string>) {
  if (!viewer || !move.attacker?.id || !move.path) return
  const id = move.attacker.id
  const dashId = `rp-dash-${id}`
  const solidId = `rp-solid-${id}`
  keep.add(dashId)
  keep.add(solidId)
  const sig = `${move.t}-${move.path.toLng}-${move.path.toLat}`
  if (trackSig.get(id) === sig && viewer.entities.getById(dashId)) return
  viewer.entities.removeById(dashId)
  viewer.entities.removeById(solidId)
  const start = Cesium.Cartesian3.fromDegrees(move.path.fromLng, move.path.fromLat, move.path.height)
  const dest = Cesium.Cartesian3.fromDegrees(move.path.toLng, move.path.toLat, move.path.height)
  viewer.entities.add({
    id: dashId,
    polyline: {
      positions: [start, dest],
      width: 2,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.CYAN.withAlpha(0.8),
        dashLength: 18,
      }),
      clampToGround: false,
    },
  })
  viewer.entities.add({
    id: solidId,
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const cur = cartesianOf(id)
        if (!cur) return []
        return [start, Cesium.Cartesian3.clone(cur)]
      }, false),
      width: 4,
      material: Cesium.Color.CYAN.withAlpha(0.9),
      clampToGround: false,
    },
  })
  trackSig.set(id, sig)
}

function ensureAttack(pair: { from: string; to: string }, keep: Set<string>) {
  if (!viewer) return
  const id = `rp-atk-${pair.from}-${pair.to}`
  keep.add(id)
  if (viewer.entities.getById(id)) return
  const fromId = pair.from
  const toId = pair.to
  viewer.entities.add({
    id,
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const p1 = cartesianOf(fromId)
        const p2 = cartesianOf(toId)
        if (!p1 || !p2) return []
        return [Cesium.Cartesian3.clone(p1), Cesium.Cartesian3.clone(p2)]
      }, false),
      width: 6,
      material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString('#ff8a3d')),
      clampToGround: false,
    },
  })
}

function ensureRadar(scan: PlaybackEvent, keep: Set<string>) {
  if (!viewer || !scan.attacker?.id) return
  const id = scan.attacker.id
  const baseId = `rp-radar-base-${id}`
  const sweepId = `rp-radar-sweep-${id}`
  keep.add(baseId)
  keep.add(sweepId)
  if (viewer.entities.getById(baseId)) return
  const radius = scan.range || 60000
  const t0 = scan.t
  const faction = scan.attacker.faction || scan.side
  const themeColor = faction === 'hostile'
    ? Cesium.Color.fromCssColorString('#ff8a3d')
    : Cesium.Color.fromCssColorString('#00e5ff')
  const follow = new Cesium.CallbackPositionProperty((time, result) => cartesianOf(id, result), false)
  viewer.entities.add({
    id: baseId,
    position: follow,
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
    id: sweepId,
    position: follow,
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const pose = unitPoseAt(id, playback.t, playback.events, playback.forces)
        if (!pose) return []
        const elapsed = Math.max(0, playback.t - t0)
        const a = Cesium.Math.toRadians((elapsed * 360) % 360)
        const targetLng = pose.lng + (radius * Math.cos(a)) / (111320 * Math.cos(Cesium.Math.toRadians(pose.lat)))
        const targetLat = pose.lat + (radius * Math.sin(a)) / 110540
        return [
          Cesium.Cartesian3.fromDegrees(pose.lng, pose.lat, 0),
          Cesium.Cartesian3.fromDegrees(targetLng, targetLat, 0),
        ]
      }, false),
      width: 3,
      material: themeColor,
      arcType: Cesium.ArcType.NONE,
    },
  })
}

function ensureExplosion(kill: PlaybackEvent, keep: Set<string>) {
  if (!viewer || !kill.target?.id) return
  const key = `rp-boom-${kill.t}-${kill.target.id}`
  const flashId = `${key}-flash`
  const shockId = `${key}-shock`
  const ringId = `${key}-ring`
  keep.add(flashId)
  keep.add(shockId)
  keep.add(ringId)
  if (boomSig.get(key) === key && viewer.entities.getById(flashId)) return
  viewer.entities.removeById(flashId)
  viewer.entities.removeById(shockId)
  viewer.entities.removeById(ringId)
  const pose = kill.pose || unitPoseAt(kill.target.id, kill.t, playback.events, playback.forces)
  if (!pose) return
  const cartesian = Cesium.Cartesian3.fromDegrees(pose.lng, pose.lat, pose.height)
  const theme = themeOf(kill.target.id).primary
  const color = Cesium.Color.fromCssColorString(theme)
  const maxRadius = Math.max(2800, (pose.height || 0) + 5000)
  const t0 = kill.t
  viewer.entities.add({
    id: flashId,
    position: cartesian,
    billboard: {
      image: explosionImageData,
      width: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
        return 48 + 140 * Math.sin(Math.min(1, t * 1.15) * Math.PI)
      }, false),
      height: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
        return 48 + 140 * Math.sin(Math.min(1, t * 1.15) * Math.PI)
      }, false),
      color: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
        return Cesium.Color.WHITE.withAlpha(1 - t * 0.85)
      }, false),
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(5e3, 1.4, 5e6, 0.45),
    },
  })
  viewer.entities.add({
    id: shockId,
    position: cartesian,
    ellipse: {
      semiMajorAxis: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
        return 180 + (maxRadius - 180) * t
      }, false),
      semiMinorAxis: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
        return 180 + (maxRadius - 180) * t
      }, false),
      material: new Cesium.ColorMaterialProperty(
        new Cesium.CallbackProperty(() => {
          const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
          return color.withAlpha(0.55 * (1 - t))
        }, false),
      ),
      outline: true,
      outlineColor: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
        return color.withAlpha(0.95 * (1 - t))
      }, false),
      height: 0,
    },
  })
  viewer.entities.add({
    id: ringId,
    position: cartesian,
    ellipse: {
      semiMajorAxis: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
        const r = 180 + (maxRadius - 180) * t
        return Math.max(80, r * 0.45)
      }, false),
      semiMinorAxis: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
        const r = 180 + (maxRadius - 180) * t
        return Math.max(80, r * 0.45)
      }, false),
      material: Cesium.Color.WHITE.withAlpha(0.12),
      outline: true,
      outlineColor: new Cesium.CallbackProperty(() => {
        const t = Math.min(1, Math.max(0, (playback.t - t0) / 2))
        return Cesium.Color.WHITE.withAlpha(0.7 * (1 - t))
      }, false),
      height: 8,
    },
  })
  boomSig.set(key, key)
}

function syncFx() {
  if (!viewer) return
  const keep = new Set<string>()
  for (const move of activeMoves(playback.t, playback.events)) ensureTrack(move, keep)
  for (const pair of activeAttackPairs(playback.t, playback.events)) ensureAttack(pair, keep)
  for (const scan of activeScans(playback.t, playback.events)) ensureRadar(scan, keep)
  for (const kill of activeExplosions(playback.t, playback.events)) ensureExplosion(kill, keep)
  removeFxIfUnused(keep)
}

function updateCamera() {
  if (!viewer) return
  const followId = followUnitId(playback.t, playback.events, props.focusId)
  highlight(followId || props.focusId || '')
  if (props.cameraMode === 'free') {
    unlockCamera()
    return
  }
  const moving = !!(followId && isUnitMoving(followId, playback.t, playback.events))
  if (followId && moving) {
    if (props.focusKey) lastFocusKey = props.focusKey
    panToId(followId, false)
    return
  }
  if (props.focusKey && props.focusId && props.focusKey !== lastFocusKey) {
    lastFocusKey = props.focusKey
    panToId(props.focusId, true)
  }
}

function applyFrame() {
  if (!viewer) return
  playback.t = props.currentSeconds || 0
  playback.playing = !!props.playing
  const clockTime = Cesium.JulianDate.addSeconds(viewer.clock.startTime, playback.t, new Cesium.JulianDate())
  viewer.clock.currentTime = clockTime
  applyHidden()
  syncFx()
  updateCamera()
  viewer.scene.requestRender()
}

watch(
  () => props.events,
  (ev) => {
    playback.events = enrichEvents((ev || []) as PlaybackEvent[], forces)
    applyFrame()
  },
  { immediate: true, deep: true },
)

watch(
  () => [props.currentSeconds, props.playing, props.focusId, props.focusKey] as const,
  () => applyFrame(),
  { flush: 'sync' },
)

watch(
  () => props.cameraMode,
  (mode) => {
    if (mode === 'free') {
      viewer?.camera.cancelFlight()
      unlockCamera()
      applyingCamera = false
      return
    }
    lastFocusKey = ''
    applyFrame()
  },
)

onMounted(() => {
  initViewer()
  applyFrame()
  window.addEventListener('resize', onResize)
})

function onResize() {
  viewer?.resize()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (viewer) {
    viewer.camera.changed.removeEventListener(onUserCameraChanged)
    viewer.scene.canvas.removeEventListener('wheel', onUserZoomWheel)
  }
  unlockCamera()
  viewer?.destroy()
  viewer = null
})
</script>

<style lang="scss" scoped>
.replay-map {
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #000;
  :deep(.cesium-viewer),
  :deep(.cesium-viewer-cesiumWidgetContainer),
  :deep(.cesium-widget),
  :deep(.cesium-widget canvas) {
    width: 100%;
    height: 100%;
  }
  :deep(.cesium-viewer-bottom),
  :deep(.cesium-viewer-timelineContainer),
  :deep(.cesium-viewer-animationContainer) {
    display: none;
  }
}
</style>
