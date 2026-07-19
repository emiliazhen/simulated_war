<template>
  <div class="battle-report-wrap">
    <div class="battle-report-head">
      <p><i class="dot"></i> 实时战况</p>
      <svg-icon name="ele-Refresh" :size="16" @click="$emit('clear')" v-if="false" />
    </div>
    <ul class="battle-report-list">
      <li v-for="(item, i) in log" :key="i">
        <span class="br-time">{{ item.time }}</span>
        <span class="br-main">
          <span class="br-who br-target">{{ item.targetLabel }}</span>
          <span class="br-arrow">被</span>
          <span class="br-who br-from">{{ item.attackerLabel }}</span>
          <span class="br-verb">命中</span>
        </span>
        <span class="br-damage">-{{ item.damage }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineProps<{ log: Array<{ time: string; targetLabel: string; attackerLabel: string; damage: number }> }>();
</script>

<style lang="scss" scoped>
.battle-report-wrap {
  position: absolute;
  top: 80px;
  right: 30px;
  width: 320px;
  max-height: 360px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  background: rgba(0, 24, 56, 0.72);
  border: 1px solid rgba(0, 142, 255, 0.35);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.battle-report-head {
  height: 38px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid rgba(0, 142, 255, 0.25);
  color: $white;
  font-size: 14px;
  letter-spacing: 1px;
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff8a3d;
    box-shadow: 0 0 8px #ff8a3d;
    margin-right: 8px;
  }
}

.battle-report-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  > li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    color: rgba($white, 0.85);
    font-size: 12px;
    border-bottom: 1px dashed rgba($white, 0.08);
    .br-time { color: rgba($white, 0.55); min-width: 64px; }
    .br-main { display: flex; flex: 1; flex-wrap: wrap; gap: 4px; align-items: center; }
    .br-arrow { color: rgba($white, 0.4); }
    .br-target { color: #00e5ff; }
    .br-from { color: #ff8a3d; }
    .br-damage { color: #ff4d4f; font-weight: 600; }
  }
}
</style>