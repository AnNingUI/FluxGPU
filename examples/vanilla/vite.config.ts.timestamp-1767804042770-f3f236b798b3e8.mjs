// vite.config.ts
import { defineConfig } from "file:///D:/Dev-Project/js-gdk/fluxgpu/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.25/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  root: ".",
  build: {
    outDir: "dist"
  },
  server: {
    port: 8e3
  },
  plugins: [
    {
      name: "configure-response-headers",
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      }
    }
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxEZXYtUHJvamVjdFxcXFxqcy1nZGtcXFxcZmx1eGdwdVxcXFxleGFtcGxlc1xcXFx2YW5pbGxhXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxEZXYtUHJvamVjdFxcXFxqcy1nZGtcXFxcZmx1eGdwdVxcXFxleGFtcGxlc1xcXFx2YW5pbGxhXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9EZXYtUHJvamVjdC9qcy1nZGsvZmx1eGdwdS9leGFtcGxlcy92YW5pbGxhL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHJvb3Q6ICcuJyxcclxuICBidWlsZDoge1xyXG4gICAgb3V0RGlyOiAnZGlzdCcsXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDgwMDAsXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICB7XHJcbiAgICAgIG5hbWU6ICdjb25maWd1cmUtcmVzcG9uc2UtaGVhZGVycycsXHJcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcjogKHNlcnZlcikgPT4ge1xyXG4gICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKF9yZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgcmVzLnNldEhlYWRlcignQ3Jvc3MtT3JpZ2luLU9wZW5lci1Qb2xpY3knLCAnc2FtZS1vcmlnaW4nKTtcclxuICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0Nyb3NzLU9yaWdpbi1FbWJlZGRlci1Qb2xpY3knLCAncmVxdWlyZS1jb3JwJyk7XHJcbiAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIF0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdVLFNBQVMsb0JBQW9CO0FBRXJXLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1A7QUFBQSxNQUNFLE1BQU07QUFBQSxNQUNOLGlCQUFpQixDQUFDLFdBQVc7QUFDM0IsZUFBTyxZQUFZLElBQUksQ0FBQyxNQUFNLEtBQUssU0FBUztBQUMxQyxjQUFJLFVBQVUsOEJBQThCLGFBQWE7QUFDekQsY0FBSSxVQUFVLGdDQUFnQyxjQUFjO0FBQzVELGVBQUs7QUFBQSxRQUNQLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
