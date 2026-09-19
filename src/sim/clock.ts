import * as Cesium from 'cesium'

export const SPEED_OPTIONS = [1, 2, 5, 10, 30, 50, 100, 150, 300, 500, 1000, 1500, 3000, 6000]

export function simSeconds(clock: Cesium.Clock, time?: Cesium.JulianDate) {
  return Cesium.JulianDate.secondsDifference(time || clock.currentTime, clock.startTime)
}

export function applyClockSpeed(clock: Cesium.Clock, multiplier: number, paused: boolean) {
  const m = Number(multiplier)
  clock.multiplier = Number.isFinite(m) && m > 0 ? m : 1
  clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER
  clock.canAnimate = true
  clock.shouldAnimate = !paused
}

export function applyClockPaused(clock: Cesium.Clock, paused: boolean) {
  clock.canAnimate = true
  clock.shouldAnimate = !paused
}

export function initSimClock(clock: Cesium.Clock) {
  const now = Cesium.JulianDate.now()
  clock.startTime = now.clone()
  clock.currentTime = now.clone()
  clock.clockRange = Cesium.ClockRange.UNBOUNDED
  clock.stopTime = Cesium.JulianDate.addDays(now, 365, new Cesium.JulianDate())
  applyClockSpeed(clock, 1, false)
  return now.clone()
}
