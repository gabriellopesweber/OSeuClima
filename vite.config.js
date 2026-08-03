import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import Checker from 'vite-plugin-checker'
import path from 'path'

// GitHub Pages serve o projeto em /OSeuClima/. BASE_PATH permite sobrescrever
// (domínio próprio, preview local do build) sem tocar no arquivo.
const productionBase = process.env.BASE_PATH ?? '/OSeuClima/'

export default defineConfig(({ mode }) => {
  const plugins = [
    vue({ template: { transformAssetUrls } }),
    vuetify(),
  ]

  if (mode === 'development') {
    plugins.push(Checker({
      eslint: {
        lintCommand: 'eslint "./src/**/*.{js,vue}"',
        useFlatConfig: true,
      }
    }))
  }

  return {
    base: mode === 'production' ? productionBase : '/',
    plugins,
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
  }
})
