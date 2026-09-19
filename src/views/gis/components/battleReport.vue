<template>
  <ul class="battle-report-list">
    <li v-for="(item, i) in log" :key="i" :class="[item.targetFaction, item.kind]">
      <span class="br-time">{{ item.time }}</span>
      <span class="br-main">
        <span class="br-who br-target">{{ item.targetLabel }}</span>
        <template v-if="item.kind === 'kill'">
          <span class="br-verb kill">被击毁</span>
          <span v-if="item.attackerLabel" class="br-from-wrap">
            <span class="br-arrow">击毁方</span>
            <span class="br-who br-from">{{ item.attackerLabel }}</span>
          </span>
        </template>
        <template v-else>
          <span class="br-arrow">被</span>
          <span class="br-who br-from">{{ item.attackerLabel }}</span>
          <span class="br-verb">命中</span>
        </template>
      </span>
      <span v-if="item.kind === 'hit'" class="br-damage">-{{ item.damage }}</span>
    </li>
    <li v-if="!log.length" class="empty">交战后在此显示友军伤亡与敌方战损</li>
  </ul>
</template>

<script setup lang="ts">
export type BattleReportItem = {
  time: string
  targetId: string
  targetLabel: string
  targetFaction: 'friendly' | 'hostile'
  attackerId: string
  attackerLabel: string
  damage: number
  kind: 'hit' | 'kill'
}

defineProps<{ log: BattleReportItem[] }>()
</script>

<style lang="scss" scoped>
.battle-report-list {
  margin: 0;
  padding: 0;
  list-style: none;
  height: 100%;
  overflow-y: auto;
  > li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 4px;
    color: rgba($white, 0.85);
    font-size: 12px;
    line-height: 1.4;
    border-bottom: 1px dashed rgba($white, 0.08);
    .br-time {
      color: rgba($white, 0.5);
      min-width: 64px;
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }
    .br-main {
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
      min-width: 0;
    }
    .br-arrow { color: rgba($white, 0.4); }
    .br-from-wrap { display: flex; gap: 4px; align-items: center; }
    .br-target { color: #00e5ff; }
    .br-from { color: #ff8a3d; }
    .br-damage { color: #ff4d4f; font-weight: 600; flex-shrink: 0; }
    .br-verb.kill { color: #ff4d4f; font-weight: 600; }
    &.hostile .br-target { color: #ff8a3d; }
    &.hostile .br-from { color: #00e5ff; }
    &.empty {
      color: rgba($white, 0.4);
      border-bottom: none;
      justify-content: center;
      padding: 24px 8px;
    }
  }
}
</style>
