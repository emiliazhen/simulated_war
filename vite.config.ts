import vue from '@vitejs/plugin-vue';
// import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'path';
import { loadEnv, ConfigEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import vueSetupExtend from 'vite-plugin-vue-setup-extend';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import topLevelAwait from 'vite-plugin-top-level-await';
import { createStyleImportPlugin, VxeTableResolve } from 'vite-plugin-style-import';
import viteCompression from 'vite-plugin-compression';
import cesium from 'vite-plugin-cesium';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

const pathResolve = (dir: string) => {
  return resolve(__dirname, '.', dir);
};

const alias: Record<string, string> = {
  '@': pathResolve('./src/'),
};

export default defineConfig((mode) => {
  const env = loadEnv(mode.mode, process.cwd(), '');
  return {
    plugins: [
      vue(), // Vue 插件
      cesium(),
      createSvgIconsPlugin({
        // 指定要缓存的图标文件夹
        iconDirs: [resolve(process.cwd(), 'src/assets/svgs')],
        // 执行icon name的格式
        symbolId: 'icon-[dir]-[name]',
      }),
      // vueDevTools(), //开发辅助
      vueSetupExtend(), // setup语法糖增强插件
      AutoImport({
        resolvers: [ElementPlusResolver()], // ELMessageBox, ELMessage...
        imports: ['vue', 'pinia'], // 自动导入的依赖库数组  ref, computed...
        dts: 'src/auto-imports.d.ts', // 自动导入类型定义文件路径
      }),
      Components({
        // resolvers: [ElementPlusResolver()], // element-plus 组件
        dts: 'src/components.d.ts',
        dirs: ['src/components'],
      }),
      createStyleImportPlugin({
        resolves: [VxeTableResolve()], // 配置vxetable 按需加载
      }),
      topLevelAwait({
        promiseExportName: '__tla', // TLA Promise 变量名
        promiseImportName: (i) => `__tla_${i}`, // TLA Promise 导入名
      }),
      viteCompression({
        deleteOriginFile: false, // 压缩后删除原来的文件
      }),
    ],

    root: process.cwd(), // 项目根目录

    resolve: { alias }, // 路径别名配置

    base: mode.command === 'serve' ? './' : env.VITE_PUBLIC_PATH,

    optimizeDeps: {
      include: ['element-plus/es/locale/lang/zh-cn', 'element-plus/es/locale/lang/en'],
    },

    server: {
      host: '0.0.0.0', // 服务器地址
      port: 8070, // 服务器端口号
      open: env.VITE_OPEN === 'true', // 是否自动打开浏览器
      hmr: true, // 启用热更新
      proxy: {
        '/api/gen': {
          //单体架构下特殊处理代码生成模块代理
          target: env.VITE_IS_MICRO === 'true' ? env.VITE_ADMIN_PROXY_PATH : env.VITE_GEN_PROXY_PATH,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/api': {
          target: env.VITE_ADMIN_PROXY_PATH, // 目标服务器地址
          ws: true, // 是否启用 WebSocket
          changeOrigin: true, // 是否修改请求头中的 Origin 字段
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },

    build: {
      outDir: 'dist', // 打包输出目录
      chunkSizeWarningLimit: 1500, // 代码分包阈值
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`,
          compact: true,
          manualChunks: {
            vue: ['vue', 'pinia'],
          },
        },
      },
      // 移除控制台console.log
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/variables.scss";`,
        },
        css: { charset: false },
      },
    },

    define: {
      __INTLIFY_PROD_DEVTOOLS__: JSON.stringify(false),
      __VERSION__: JSON.stringify(process.env.npm_package_version),
      __NEXT_NAME__: JSON.stringify(process.env.npm_package_name),
    },

    test: {
      environment: 'node',
      include: ['src/**/*.spec.ts'],
    },
  };
});
