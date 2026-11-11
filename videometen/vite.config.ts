import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  base: "/videometen/",
  // ffmpeg.wasm start zijn eigen worker via new URL(..., import.meta.url);
  // voorbundelen breekt dat pad.
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  resolve: {
    alias: {
      "@nh-assets": resolve(__dirname, "../assets"),
    },
  },
});
