#!/bin/bash
set -e

# Build de CircuitSketch Vite app
cd circuitsketch
npm install
npm run build
cd ..

# Maak de output map aan
rm -rf dist
mkdir -p dist

# Kopieer de hub en statische bestanden
cp index.html dist/
cp -r assets dist/assets

# Kopieer het Overhoorprogramma (statische HTML)
cp -r overhoor dist/overhoor

# Kopieer de gebouwde CircuitSketch app
cp -r circuitsketch/dist dist/circuitsketch
