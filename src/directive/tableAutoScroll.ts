interface ElType extends HTMLElement {
  timer: number | null;
  isScroll: boolean;
  curTableTopValue: number;
}
export default {
  created(el: ElType) {
    el.timer = null;
    el.isScroll = true;
    el.curTableTopValue = 0;
  },
  mounted(el: ElType, binding: { value?: { delay?: number } }) {
    const { delay = 15 } = binding.value || {};
    const tableDom = el.getElementsByClassName('el-scrollbar__wrap')[0] as HTMLElement;
    const viewDom = el.getElementsByClassName('el-scrollbar__view')[0] as HTMLElement;

    const onMouseOver = () => (el.isScroll = false);
    const onMouseOut = () => {
      el.curTableTopValue = tableDom.scrollTop;
      el.isScroll = true;
    };
    tableDom.addEventListener('mouseover', onMouseOver);
    tableDom.addEventListener('mouseout', onMouseOut);

    el.timer = window.setInterval(() => {
      const viewDomClientHeight = viewDom.scrollHeight;
      const tableDomClientHeight = el.clientHeight;

      if (el.isScroll && viewDomClientHeight > tableDomClientHeight) {
        const curScrollPosition = tableDom.clientHeight + el.curTableTopValue;
        el.curTableTopValue = curScrollPosition === tableDom.scrollHeight ? 0 : el.curTableTopValue + 1;
        tableDom.scrollTop = el.curTableTopValue;
      }
    }, delay);
  },
  unmounted(el: ElType) {
    if (el.timer !== null) {
      clearInterval(el.timer);
    }
    el.timer = null;

    const tableDom = el.getElementsByClassName('el-scrollbar__wrap')[0] as HTMLElement;
    tableDom.removeEventListener('mouseover', () => (el.isScroll = false));
    tableDom.removeEventListener('mouseout', () => {
      el.curTableTopValue = tableDom.scrollTop;
      el.isScroll = true;
    });
  },
};
