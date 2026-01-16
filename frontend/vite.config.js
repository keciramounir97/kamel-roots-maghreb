import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss({
      config: "./tailwind.config.js",
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
