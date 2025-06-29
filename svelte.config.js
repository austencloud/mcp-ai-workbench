import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    files: {
      routes: "src/client/routes",
      lib: "src/client/lib",
      assets: "public",
    },
    alias: {
      $lib: "src/client/lib",
      $client: "src/client",
      $shared: "src/shared",
    },
  },
};

export default config;
