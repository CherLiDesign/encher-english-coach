import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/encher-english-coach/",
  plugins: [react()],
  build: {
    outDir: "docs",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/@supabase/auth-js/")) return "supabase-auth";
          if (id.includes("/@supabase/realtime-js/")) return "supabase-realtime";
          if (id.includes("/@supabase/postgrest-js/")) return "supabase-postgrest";
          if (id.includes("/@supabase/storage-js/")) return "supabase-storage";
          if (id.includes("/@supabase/functions-js/")) return "supabase-functions";
          if (id.includes("/@supabase/supabase-js/")) return "supabase-core";
          if (id.includes("/react-dom/") || id.includes("/react/")) return "react";
        },
      },
    },
  },
});
