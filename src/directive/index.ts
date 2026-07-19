import type { App } from 'vue';
import { wavesDirective } from '@/directive/customDirective';
import tableAutoScroll from '@/directive/tableAutoScroll';

export function directive(app: App) {
  wavesDirective(app);
  app.directive('tableAutoScroll', tableAutoScroll);
}