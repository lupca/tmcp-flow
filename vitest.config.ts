import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
    exclude: ['e2e-tests/**', 'node_modules/**'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/out': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});
