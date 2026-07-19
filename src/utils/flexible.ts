const BASE_FONT_SIZE = 192;
const rootFontSize = ref(BASE_FONT_SIZE);
const docEl = document.documentElement;
let initialized = false;

const updateRootFontSize = () => {
  const rem = docEl.clientWidth / 10;
  docEl.style.fontSize = rem + 'px';
  rootFontSize.value = rem;
};

const onResize = () => {
  updateRootFontSize();
};
const initRem = () => {
  if (initialized) return;
  initialized = true;
  updateRootFontSize();
  window.addEventListener('resize', onResize);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      updateRootFontSize();
    }
  });
};

const disposeRem = () => {
  if (!initialized) return;
  window.removeEventListener('resize', onResize);
  initialized = false;
};
export { rootFontSize, BASE_FONT_SIZE, initRem, disposeRem };
