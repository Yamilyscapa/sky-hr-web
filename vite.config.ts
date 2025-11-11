import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:8080";

  return {
    envPrefix: ["VITE_"],
    plugins: [
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
      tanstackStart(),
      nitro({
        config: { preset: "node-server" },
      }),
      viteReact(),
    ],
    server: {
      proxy: {
        // Proxy API requests to the backend to avoid CORS issues in development
        "/api": {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          secure: true,
        },
        // Also proxy common API paths directly
        "/attendance": {
          target: apiUrl,
          changeOrigin: true,
          secure: true,
        },
        "/announcements": {
          target: apiUrl,
          changeOrigin: true,
          secure: true,
        },
        "/schedules": {
          target: apiUrl,
          changeOrigin: true,
          secure: true,
        },
        "/geofence": {
          target: apiUrl,
          changeOrigin: true,
          secure: true,
        },
        "/user-geofence": {
          target: apiUrl,
          changeOrigin: true,
          secure: true,
        },
        "/permissions": {
          target: apiUrl,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      rollupOptions: {
        external: (id) => {
          // Externalize Node.js built-in modules for browser builds
          if (id.startsWith("node:") || id === "async_hooks") {
            return true;
          }
          return false;
        },
      },
    },
    optimizeDeps: {
      exclude: ["better-auth"],
    },
  };
});
