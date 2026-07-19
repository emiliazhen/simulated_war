<template>
  <div class="showroom-app">
    <header class="showroom-topbar">
      <div class="brand">
        <span class="brand-dot"></span>
        <span class="brand-title">GIS 能力 Showroom</span>
        <span class="brand-sub">地图渲染 · 空间分析 · 实时数据可视化 · 交互</span>
      </div>
      <nav class="topbar-nav">
        <button :class="['nav-btn', { active: activeView === 'gis' }]" @click="activeView = 'gis'">态势实时</button>
        <button :class="['nav-btn', { active: activeView === 'replay' }]" @click="activeView = 'replay'">回放复盘</button>
      </nav>
      <div class="topbar-status">
        <span class="status-led"></span>
        <span>Mock 数据驱动</span>
      </div>
    </header>
    <main class="showroom-stage">
      <keep-alive>
        <gis-view v-if="activeView === 'gis'" />
      </keep-alive>
      <keep-alive>
        <replay-view v-if="activeView === 'replay'" />
      </keep-alive>
    </main>
  </div>
</template>

<script setup lang="ts" name="app">
import { defineAsyncComponent } from 'vue';
const GisView = defineAsyncComponent(() => import('@/views/gis/index.vue'));
const ReplayView = defineAsyncComponent(() => import('@/views/replay/index.vue'));

const activeView = ref<'gis' | 'replay'>('gis');
</script>

<style lang="scss">
@import '@/assets/styles/index.scss';

#app {
  height: 100%;
  min-width: 600px;
  overflow: hidden;
  position: relative;
  background: url('@/assets/images/body_background.png') center center / 100% 100% no-repeat;
}

.showroom-app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.showroom-topbar {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: linear-gradient(180deg, rgba(0, 24, 56, 0.9), rgba(0, 16, 40, 0.75));
  border-bottom: 1px solid rgba(0, 142, 255, 0.4);
  backdrop-filter: blur(8px);
  z-index: 100;

  .brand {
    display: flex;
    align-items: baseline;
    gap: 12px;

    .brand-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #00e5ff;
      box-shadow: 0 0 8px #00e5ff;
    }

    .brand-title {
      font-size: 18px;
      font-weight: 600;
      color: $white;
      letter-spacing: 1px;
    }

    .brand-sub {
      font-size: 12px;
      color: rgba($white, 0.55);
      letter-spacing: 0.5px;
    }
  }

  .topbar-nav {
    display: flex;
    gap: 8px;

    .nav-btn {
      min-width: 96px;
      height: 32px;
      border: 1px solid rgba(0, 142, 255, 0.5);
      background: rgba(0, 30, 70, 0.6);
      color: rgba($white, 0.78);
      font-size: 14px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        color: $white;
        border-color: #00e5ff;
      }

      &.active {
        color: #00132b;
        background: #00e5ff;
        border-color: #00e5ff;
        box-shadow: 0 0 12px rgba(0, 229, 255, 0.5);
      }
    }
  }

  .topbar-status {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba($white, 0.65);
    font-size: 12px;

    .status-led {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6dff8a;
      box-shadow: 0 0 8px #6dff8a;
      animation: pulse 1.6s ease-in-out infinite;
    }
  }
}

.showroom-stage {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
</style>