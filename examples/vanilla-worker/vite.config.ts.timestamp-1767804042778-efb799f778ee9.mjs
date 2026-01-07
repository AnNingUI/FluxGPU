// vite.config.ts
import { defineConfig } from "file:///D:/Dev-Project/js-gdk/fluxgpu/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.25/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  server: {
    port: 8005,
    // Required for SharedArrayBuffer
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        // 确保 Worker 文件正确输出
        entryFileNames: "[name].js"
      }
    }
  },
  worker: {
    format: "es",
    rollupOptions: {
      output: {
        entryFileNames: "[name].js"
      }
    }
  },
  optimizeDeps: {
    exclude: ["@fluxgpu/host-browser"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxEZXYtUHJvamVjdFxcXFxqcy1nZGtcXFxcZmx1eGdwdVxcXFxleGFtcGxlc1xcXFx2YW5pbGxhLXdvcmtlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcRGV2LVByb2plY3RcXFxcanMtZ2RrXFxcXGZsdXhncHVcXFxcZXhhbXBsZXNcXFxcdmFuaWxsYS13b3JrZXJcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0Rldi1Qcm9qZWN0L2pzLWdkay9mbHV4Z3B1L2V4YW1wbGVzL3ZhbmlsbGEtd29ya2VyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogODAwNSxcclxuICAgIC8vIFJlcXVpcmVkIGZvciBTaGFyZWRBcnJheUJ1ZmZlclxyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAnQ3Jvc3MtT3JpZ2luLU9wZW5lci1Qb2xpY3knOiAnc2FtZS1vcmlnaW4nLFxyXG4gICAgICAnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeSc6ICdyZXF1aXJlLWNvcnAnLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHByZXZpZXc6IHtcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0Nyb3NzLU9yaWdpbi1PcGVuZXItUG9saWN5JzogJ3NhbWUtb3JpZ2luJyxcclxuICAgICAgJ0Nyb3NzLU9yaWdpbi1FbWJlZGRlci1Qb2xpY3knOiAncmVxdWlyZS1jb3JwJyxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgdGFyZ2V0OiAnZXNuZXh0JyxcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgLy8gXHU3ODZFXHU0RkREIFdvcmtlciBcdTY1ODdcdTRFRjZcdTZCNjNcdTc4NkVcdThGOTNcdTUxRkFcclxuICAgICAgICBlbnRyeUZpbGVOYW1lczogJ1tuYW1lXS5qcycsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgd29ya2VyOiB7XHJcbiAgICBmb3JtYXQ6ICdlcycsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnW25hbWVdLmpzJyxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGV4Y2x1ZGU6IFsnQGZsdXhncHUvaG9zdC1icm93c2VyJ10sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlYsU0FBUyxvQkFBb0I7QUFFMVgsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFFTixTQUFTO0FBQUEsTUFDUCw4QkFBOEI7QUFBQSxNQUM5QixnQ0FBZ0M7QUFBQSxJQUNsQztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLFNBQVM7QUFBQSxNQUNQLDhCQUE4QjtBQUFBLE1BQzlCLGdDQUFnQztBQUFBLElBQ2xDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBO0FBQUEsUUFFTixnQkFBZ0I7QUFBQSxNQUNsQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixnQkFBZ0I7QUFBQSxNQUNsQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsdUJBQXVCO0FBQUEsRUFDbkM7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
