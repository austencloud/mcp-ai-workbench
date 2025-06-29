import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [sveltekit()],

  resolve: {
    alias: {
      $lib: path.resolve("./src/client/lib"),
      $shared: path.resolve("./src/shared"),
      $types: path.resolve("./src/shared/types"),
      $server: path.resolve("./src/server"),
    },
  },

  server: {
    host: true,
    port: 4174,
    strictPort: false,
    proxy: {
      "/rpc": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:4000",
        ws: true,
      },
    },
  },

  preview: {
    host: true,
    port: 4173,
    strictPort: false,
    proxy: {
      "/rpc": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:4000",
        ws: true,
      },
    },
  },

  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    environment: "jsdom",
    setupFiles: ["src/tests/setup.ts"],
  },
});
