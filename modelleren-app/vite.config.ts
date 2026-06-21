import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "/modelleren/" zodat assets kloppen wanneer de gebouwde app op die
// route wordt geserveerd (zie build.sh / netlify.toml — pas in Fase 6 gekoppeld).
export default defineConfig({
  plugins: [react()],
  base: "/modelleren/",
});
