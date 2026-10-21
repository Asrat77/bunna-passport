import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    // Telegram loads the Mini App over HTTPS from a tunnel, so listen beyond localhost.
    host: true,
    port: 5173,
  },
  test: {
    environment: "jsdom",
  },
});
