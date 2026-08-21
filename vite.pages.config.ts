import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/encher-english-coach/",
  plugins: [react()],
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
