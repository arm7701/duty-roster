import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // เปิดให้เข้าถึงผ่าน IP ในวงเน็ตเดียวกัน (Wi-Fi / LAN)
    port: 5173,
    strictPort: true,
  },
})
