import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Tamamen kendi sunucunda çalışır: ön yüz statik bir SPA olarak derlenir (dist/client),
// Node.js sunucusu (server/index.js) hem /api'yi hem bu dosyaları sunar.
// Dev'de /api ve /api/ws isteklerini Node sunucusuna yönlendiririz.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true },
    },
  },
  plugins: [tailwindcss(), tanstackStart({ srcDirectory: "src", spa: { enabled: true } }), react()],
});
