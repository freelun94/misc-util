import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  publicDir: false,
  server: {
    proxy: {
      "/api": "http://localhost:3001"
    }
  },
  build: {
    outDir: resolve(rootDir, "public"),
    rollupOptions: {
      input: {
        main: resolve(rootDir, "index.html"),
        chinchess: resolve(rootDir, "chinchess.html"),
        mortgage: resolve(rootDir, "mortgage.html")
      }
    }
  }
});
