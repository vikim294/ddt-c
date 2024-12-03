import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 要关公用网络的防火墙 手机端才能访问开发服务器
    port: 2940
    // host: '0.0.0.0',
  }
})
