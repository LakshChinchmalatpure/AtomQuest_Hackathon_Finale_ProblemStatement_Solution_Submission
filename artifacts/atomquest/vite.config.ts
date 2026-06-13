import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// In Replit: PORT and BASE_PATH are required. Outside Replit: use defaults.
const isReplit = Boolean(process.env.REPL_ID);

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;

const basePath = process.env.BASE_PATH || "/";

if (isReplit && !rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    nodePolyfills({ globals: { global: true, Buffer: true, process: true }, include: ["events", "util", "buffer", "stream", "path"] }),
    ...(process.env.NODE_ENV !== "production" && isReplit
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  define: {
    global: "globalThis",
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    // In standalone mode (non-Replit), proxy /api to the local server
    ...(isReplit
      ? {}
      : {
          proxy: {
            "/api": {
              target: `http://localhost:${process.env.SERVER_PORT || 5000}`,
              changeOrigin: true,
              ws: true,
            },
          },
        }),
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
