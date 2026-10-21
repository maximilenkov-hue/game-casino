import { defineConfig } from 'vite';

export default defineConfig({
  base: '/game-casino/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://game-casino.onrender.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
});
