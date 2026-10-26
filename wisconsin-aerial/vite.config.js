import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vercel exposes the deployed commit to the build; shown in the UI so any device
// can confirm which version it is actually running.
const buildId = (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
