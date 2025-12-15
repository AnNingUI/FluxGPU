import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8005,
    // Required for SharedArrayBuffer
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // 确保 Worker 文件正确输出
        entryFileNames: '[name].js',
      },
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  optimizeDeps: {
    exclude: ['@fluxgpu/host-browser'],
  },
});
