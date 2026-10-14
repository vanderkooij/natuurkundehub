import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { Plugin } from "vite";

/**
 * Tijdens het ontwikkelen stuurt Vite elk adres onder /systeembord/ naar de
 * app. De infopagina /systeembord/over/ is een los bestand in public/; dit
 * stuurt dat adres naar dat bestand, zoals Netlify en de gebouwde site doen.
 */
const overPagina = (): Plugin => ({
  name: "over-pagina",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /^\/systeembord\/over\/?(\?.*)?$/.test(req.url))
        req.url = "/systeembord/over/index.html";
      next();
    });
  },
});

// base "/systeembord/" zodat assets kloppen wanneer de gebouwde app op die
// route wordt geserveerd (zie build.sh / netlify.toml).
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths(), overPagina()],
  base: "/systeembord/",
  test: {
    // De rekenkern (src/sim) is pure TS: node-omgeving is genoeg en snel.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
