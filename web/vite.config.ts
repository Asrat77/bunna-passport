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
    // Vite refuses requests for hosts it doesn't know. Tailscale Funnel
    // (*.ts.net) is how Telegram reaches this dev server.
    allowedHosts: [".ts.net"],
    // Rails only answers its own host in development, hence changeOrigin.
    // /cards serves the share card images Telegram fetches through the tunnel.
    proxy: {
      "/api": { target: process.env.API_ORIGIN ?? "http://localhost:3000", changeOrigin: true },
      "/cards": { target: process.env.API_ORIGIN ?? "http://localhost:3000", changeOrigin: true },
    },
    // Leave CORS to Rails (rack-cors). Vite's own CORS answers every preflight
    // itself with a 204 that only allows localhost, so a front end on another
    // origin (the Appwrite site) could never reach the API through this proxy.
    cors: false,
  },
  test: {
    environment: "node",
  },
});
