import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Hardcoded fallbacks so the app works when cloned to GitHub / deployed
// outside Lovable where the auto-generated `.env` is not present.
// The publishable (anon) key is safe to expose in client bundles.
const FALLBACK_SUPABASE_URL = "https://iuledmffqgjjcwjfvxns.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1bGVkbWZmcWdqamN3amZ2eG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzIzOTEsImV4cCI6MjA4ODU0ODM5MX0.357O-miFXrCXWplpeqOg9wbpwTKs-eqFfRL7XHDhpdY";
const FALLBACK_SUPABASE_PROJECT_ID = "iuledmffqgjjcwjfvxns";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: { overlay: false },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        env.VITE_SUPABASE_PROJECT_ID || FALLBACK_SUPABASE_PROJECT_ID
      ),
    },
  };
});
