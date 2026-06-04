import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      // 将前端 /api/* 请求代理到后端服务器，消除 CORS 问题
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 将前端 /traces/* 请求代理到后端，查看 trace HTML 报告
      '/traces': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  test: {
    environment: 'happy-dom'
  }
})
