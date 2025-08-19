import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare({
      configPath: "wrangler.jsonc",
      experimental: { remoteBindings: true },
    }),
  ],
});
