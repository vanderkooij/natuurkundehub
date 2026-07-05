import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// base "/circuitflow/" zodat assets kloppen wanneer de gebouwde app op die
// route wordt geserveerd (zie build.sh / netlify.toml).
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  base: "/circuitflow/",
  test: {
    // De rekenkern (src/sim) is pure TS — node-omgeving is genoeg en snel.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
