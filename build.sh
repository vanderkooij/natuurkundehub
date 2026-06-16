#!/bin/bash
set -e

# Build de CircuitSketch Vite app
cd circuitsketch
npm install
npm run build
cd ..

# Build de Videometen Vite app
cd videometen
npm install
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

# Kopieer de Modelleer-tool (statische HTML)
cp -r modelleren dist/modelleren

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
