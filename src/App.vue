<template>
  <div class="showroom-app">
    <router-view v-slot="{ Component }">
      <keep-alive include="gis">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup lang="ts" name="app">
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
  width: 100%;
  overflow: hidden;
}
</style>
