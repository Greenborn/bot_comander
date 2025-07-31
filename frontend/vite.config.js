
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173
  },
  envDir: '../' // Buscar archivos .env en el directorio padre
});
