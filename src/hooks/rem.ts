import { rootFontSize, BASE_FONT_SIZE } from '@/utils/flexible';

export function useRem() {
  const pxToRem = (px: number) => {
    return `${px / rootFontSize.value}rem`;
  };

  const designPxToRealPx = (px: number) => {
    return Math.round((px / BASE_FONT_SIZE) * rootFontSize.value);
  };

  return {
    rootFontSize,
    pxToRem,
    designPxToRealPx,
  };
}
