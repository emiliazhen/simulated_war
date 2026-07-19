import { createApp } from 'vue';
import { defineAsyncComponent } from 'vue';
import * as elementIcons from '@element-plus/icons-vue';
import type { App } from 'vue';
import pinia from '@/stores/index';
import App from './App.vue';
import { directive } from '@/directive';

import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'virtual:svg-icons-register';

import { Pagination } from '@/components/index';

// 根据屏幕调整根字体大小
import { initRem } from '@/utils/flexible.js';
initRem();

// 注册 element-plus 图标为 ele-<Name> 全局组件
function registerElementIcons(app: App) {
  const icons = elementIcons as any;
  for (const key in icons) {
    app.component(`ele-${icons[key].name}`, icons[key]);
  }
  const SvgIcon = defineAsyncComponent(() => import('@/components/SvgIcon/index.vue'));
  app.component('SvgIcon', SvgIcon);
}

const app = createApp(App);
app.component('Pagination', Pagination);
directive(app);
registerElementIcons(app);
app
  .use(pinia)
  .use(ElementPlus, { zIndex: 3000, locale: zhCn })
  .mount('#app');