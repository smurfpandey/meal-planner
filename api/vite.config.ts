import { cloudflare } from "@cloudflare/vite-plugin";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare({
      configPath: "wrangler.jsonc",
      experimental: { remoteBindings: true },
    }),
  ],
  resolve: { alias: { "#schema": resolve(__dirname, "../schema") } },
  server: { port: 5174 },
});
