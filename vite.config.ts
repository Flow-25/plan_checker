import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Use a relative base so the built app works when served from any
// sub-path on a static host (GitHub Pages project pages, etc.).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
