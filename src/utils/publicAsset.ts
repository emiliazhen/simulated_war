/** 把 public 目录或 Cesium 静态资源接到 Vite base 后面，适配 GitHub Pages 子路径。 */
export function publicAsset(path: string) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${path.replace(/^\//, '')}`
}
