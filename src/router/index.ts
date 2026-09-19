import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'gis',
      component: () => import('@/views/gis/index.vue'),
    },
    {
      path: '/replay',
      name: 'replay',
      component: () => import('@/views/replay/index.vue'),
    },
  ],
})

export default router
