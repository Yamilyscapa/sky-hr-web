import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // VITE_API_URL is used for both API and Better Auth endpoints
  // Better Auth is mounted at /auth on the same API server
  // So VITE_API_URL should match BETTER_AUTH_URL on the backend
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
        // Proxy auth endpoints (Better Auth)
        "/auth": {
          target: apiUrl,
          changeOrigin: true,
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
      // TanStack Start with Nitro handles client/server separation automatically
      // No need to externalize Node.js built-ins as they're not used in client code
    },
    // optimizeDeps.exclude for better-auth removed - test if needed
    // If you encounter SSR or cookie issues in dev, add back: exclude: ["better-auth"]
  };
});
