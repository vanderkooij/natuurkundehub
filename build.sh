#!/bin/bash
set -e

# Installeer alle workspaces in één keer (videometen, modelleren-app, @nh/shared).
# npm linkt @nh/shared als symlink in node_modules; het package wordt NIET
# gebouwd — Vite + tsc consumeren de TS-bron direct in elke consumer.
npm install

# Build de CircuitSketch Vite app (standalone — geen workspace)
cd circuitsketch
npm install
npm run build
cd ..

# Build de Videometen Vite app (workspace)
cd videometen
npm run build
cd ..

# Build de Modelleren Vite app (workspace)
cd modelleren-app
npm run build
cd ..

# Build de CircuitFlow Vite app (workspace)
cd circuitflow
npm run build
cd ..

# Maak de output map aan
rm -rf dist
mkdir -p dist

# Kopieer de hub en statische bestanden
cp index.html dist/
cp 404.html dist/
cp -r assets dist/assets

# Kopieer het Overhoorprogramma (statische HTML)
cp -r overhoor dist/overhoor

# Kopieer de gebouwde Modelleren app
cp -r modelleren-app/dist dist/modelleren

# Kopieer Formules omschrijven (statische HTML)
cp -r formules-omschrijven dist/formules-omschrijven

# Kopieer Significantie (statische HTML)
cp -r significantie dist/significantie

# Kopieer de Contactpagina (statische HTML)
cp -r contact dist/contact

# Kopieer de gebouwde CircuitSketch app
cp -r circuitsketch/dist dist/circuitsketch

# Kopieer de gebouwde Videometen app
cp -r videometen/dist dist/videometen

# Kopieer de gebouwde CircuitFlow app
cp -r circuitflow/dist dist/circuitflow
