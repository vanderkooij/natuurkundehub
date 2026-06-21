# Videometen — Gedeelde componenten

Lopende lijst van componenten, hooks en utilities binnen `videometen/` die als
`@reusable` zijn gemarkeerd. Zie ook `PLAN.md` (sectie *Hergebruik-markering*)
en het ontwerpprincipe *niet vooraf overdesignen* uit `workflow.md`.

Extractie naar een gedeelde bibliotheek wordt pas relevant zodra een **tweede**
NH-tool er gebruik van wil maken. Tot die tijd blijft alles in de tool zelf
wonen — de markering hieronder zorgt dat we het moment niet missen en het
extractiewerk overzichtelijk blijft.

> **Fase 6b — eerste echte extractie.** De data-groep (InteractiveChart +
> chart-plugins, niceAxis, useThemeColors, csvNL) is verhuisd naar het gedeelde
> npm-workspace-package [`@nh/shared`](../packages/shared/) en wordt nu door
> **zowel videometen als modelleren-app** geïmporteerd (`@nh/shared/…`). De
> chrome-groep (AppHeader, ModalPanel, ThreePaneLayout) en de nog niet door een
> tweede tool gebruikte helpers blijven voorlopig in `src/_reusable/`.

## Tabel

| Bestand | Categorie | Beschrijving | Kandidaat-tools | Extractie-status |
|---|---|---|---|---|
| [`src/_reusable/AppHeader.tsx`](src/_reusable/AppHeader.tsx) | layout | NatuurkundeHub-header: blur, logo + breadcrumb, gecentreerde tool-naam, help + theme-toggle | CircuitSketch, Modelleren, Significantie | kandidaat — wacht op tweede gebruiker |
| [`src/_reusable/useNhTheme.ts`](src/_reusable/useNhTheme.ts) | ui | Hook voor de gedeelde `nh-theme` localStorage-key (light/dark) — houdt `data-theme` op `<html>` in sync | Alle React-tools (CircuitSketch, latere v2-tools) | kandidaat — wacht op tweede gebruiker |
| [`src/_reusable/ThreePaneLayout.tsx`](src/_reusable/ThreePaneLayout.tsx) | layout | 3-paneel-grid (links over volle hoogte, twee rechts gestapeld) met resizable handles + standaard pane-shell | Toekomstige data-analyse-tools, dashboards | kandidaat — wacht op tweede gebruiker |
| [`src/_reusable/useGlobalShortcut.ts`](src/_reusable/useGlobalShortcut.ts) | ui | Globale keydown-hook met automatische input-blocking (key-string of matcher-functie + handler) — vervangt het herhaalde "negeer als focus in input"-patroon | Alle React-tools met sneltoetsen (CircuitSketch, Modelleren) | kandidaat — wacht op tweede gebruiker |
| [`src/_reusable/useUndoRedo.ts`](src/_reusable/useUndoRedo.ts) | data | Domein-agnostische undo/redo-stack op basis van inverse-acties (apply + invert, default 200-stap limit) | Elke edit-tool met historie (CircuitSketch-schemata, formule-editor) | kandidaat — wacht op tweede gebruiker |
| [`src/_reusable/Toaster.tsx`](src/_reusable/Toaster.tsx) | ui | Minimalistische single-toast met `toast()`-functie buiten React (3 s auto-dismiss, klik-om-te-sluiten). Geen externe dep; voor complexer → swap naar `sonner` | Alle tools die korte feedback-meldingen nodig hebben | kandidaat — wacht op tweede gebruiker |
| [`src/features/calibration/coords.ts`](src/features/calibration/coords.ts) | data | Pixel → wereldcoördinaten transformatie (translate + flip-y + rotate + scale) voor meet-tools met scale + origin + angle. Pure functie, geen React-deps. Volgt physics-convention (y omhoog, angle CCW positief) — consistent met `AxesOverlay` | Toekomstige meet/coordinaat-tools | kandidaat — wacht op tweede gebruiker (woont nog naast de calibration-feature omdat 'ie de bestaande `ScaleCalibration`/`AxisCalibration` types gebruikt) |
| [`packages/shared/src/InteractiveChart.tsx`](../packages/shared/src/InteractiveChart.tsx) | data | React-wrapper rond Chart.js (line + scatter) met playhead-, raaklijn-, meet-lijn-plugins, klik/hover events, wheel/pinch zoom + pan, gedimde punten en theme-aware kleuren. Volledig domein-agnostisch. `compact`-prop voor kleinere puntmarkers (modelleren) | videometen, modelleren-app | ✅ **geëxtraheerd → `@nh/shared`** (Fase 6b) |
| [`packages/shared/src/chart-plugins/playhead.ts`](../packages/shared/src/chart-plugins/playhead.ts) | data | Chart.js plugin: verticale stippellijn op een data-x-waarde (timeline-playhead) | videometen, modelleren-app | ✅ geëxtraheerd → `@nh/shared` (Fase 6b) |
| [`packages/shared/src/chart-plugins/tangent.ts`](../packages/shared/src/chart-plugins/tangent.ts) | data | Chart.js plugin: label-pill met `dy/dx = …` rond het midden van een (extern als dataset getekende) raaklijn | videometen, modelleren-app | ✅ geëxtraheerd → `@nh/shared` (Fase 6b) |
| [`packages/shared/src/chart-plugins/measureLines.ts`](../packages/shared/src/chart-plugins/measureLines.ts) | data | Chart.js plugin: twee verticale meet-lijnen (cyan + amber). Handles zelf worden door de wrapper als absolute divs gerenderd | videometen, modelleren-app | ✅ geëxtraheerd → `@nh/shared` (Fase 6b) |
| [`packages/shared/src/niceAxis.ts`](../packages/shared/src/niceAxis.ts) | data | Snap as-bereik [lo, hi] naar nette ronde stappen (1/2/5·10ⁿ), optioneel pinMin + padTop. Geport uit modelleren | videometen, modelleren-app | ✅ geëxtraheerd → `@nh/shared` (Fase 6b) |
| [`packages/shared/src/useThemeColors.ts`](../packages/shared/src/useThemeColors.ts) | ui | Theme-aware hook die NH-design-token CSS-vars (`--accent`, `--text-muted`, etc.) als concrete strings teruggeeft. Updates bij `data-theme`-wissel via MutationObserver — handig in canvas-renderers | videometen, modelleren-app | ✅ geëxtraheerd → `@nh/shared` (Fase 6b) |
| [`src/_reusable/ModalPanel.tsx`](src/_reusable/ModalPanel.tsx) | ui | Generieke modal-overlay: backdrop-blur, gecentreerde card met scrollable body, sluit via X / Escape / klik-buiten. Body krijgt een slot — consumer levert de inhoud (geen accordion of widgets ingebouwd) | Alle NH-tools die een help-, info- of preview-modal willen | kandidaat — wacht op tweede gebruiker |
| [`packages/shared/src/csvNL.ts`](../packages/shared/src/csvNL.ts) | data | Excel-NL-vriendelijke CSV-generatie: `;` als separator, `,` als decimaal, UTF-8 BOM, automatische quoting van strings met `;`/`"`/newline. Plus `downloadBlob`-helper voor browser-downloads | videometen, modelleren-app | ✅ geëxtraheerd → `@nh/shared` (Fase 6b) |
| [`src/_reusable/fit.ts`](src/_reusable/fit.ts) | data | 1D least-squares regressie-helpers (lineair + kwadratisch). Closed-form, geen externe deps. Exposeert `Fit1D`, `fitByType`, `evalFit`, `evalFitDerivative`, `evalFitSecondDerivative` + R²-berekening. Bedoeld voor analyse-tools die ruwe data willen modelleren en analytische afgeleiden willen evalueren | Modelleren, toekomstige data-analyse-tools | actief — eerste klant videometen |

## Overwogen, niet (nog) gemarkeerd

Componenten waarover we tijdens een prompt hebben getwijfeld of ze `@reusable` moesten worden, maar die voorlopig in `features/` blijven omdat ze te tool-specifiek zijn:

| Component | Locatie | Reden om voorlopig in `features/` te laten |
|---|---|---|
| `VideoPlayer` aspect-ratio fitter | `features/video/VideoPlayer.tsx` | Specifiek voor video (gebruikt `<video>` + state-binding). Pas extraheren als een tweede tool dezelfde fit-logic nodig heeft. |
| `CalibrationOverlay` SVG-root | `features/calibration/overlays/CalibrationOverlay.tsx` | Volledig kalibratie-specifiek. Als generieke "SVG over media" een tweede gebruiker krijgt: dán abstraheren. |
| Tool-mode-context (`scale-edit`, `origin-edit`, …) | `features/calibration/CalibrationState.tsx` | Modes zijn tool-specifiek; geen generiek mode-systeem proberen te ontwerpen voordat we er een tweede nodig hebben. |
| `AppMode` view-context (`analyse`/`tracking`) | `features/app/AppMode.tsx` | View-modes zijn tool-specifiek (analyse vs tracking-modus). Generiek view-modus-systeem zou nu over-design zijn. |
| `TrailOverlay` SVG-sub-overlay | `features/tracking/TrailOverlay.tsx` | Tool-specifiek (tracking-datamodel + click/drag-gedrag voor meetpunten). |
| `TrackingBar` | `features/tracking/TrackingBar.tsx` | Volledig tracking-specifiek (frame-step, undo/redo, trail-toggle). |
| `buildRows` / `MeasurementRow` | `features/measurements/derive.ts` | Combineert tool-specifieke types (`TrackedPoint`, `CalibrationState`). Generieke 2D-numerieke-differentiatie zou bruikbaar zijn maar buiten scope van deze feature. |
| `MeasurementTable` | `features/measurements/Table.tsx` | Kolom-schema (`frame · t · x · y · v…`) en empty-states zijn videometen-specifiek. |
| `MeasurementHoverState` | `features/measurements/MeasurementHoverState.tsx` | Provider-vorm is generiek, maar `hoveredFrame: number \| null` is video-specifiek vocabulair. |
| `Graphs` / `GraphPane` / `graph-types` | `features/measurements/` | Mapt `MeasurementRow` op chart-points, kent video-frame → `t`-mapping, scale-unit-labels en de versnellings-tooltip. Bouwt op `InteractiveChart` maar is zelf tool-specifiek. |
| `projectSchema` (serialize / deserialize) | `features/project/projectSchema.ts` | Schema is tool-specifiek (kent `TrackedPoint`, `CalibrationState`, `PaneState`, `TrailColor`). Het patroon "versioned JSON met migratie" zou wel generiek zijn, maar de schema-velden zelf zijn niet. |
| `HelpPanel` | `features/help/HelpPanel.tsx` | De zeven sectie-teksten zijn videometen-specifiek; de modal-structuur is via `_reusable/ModalPanel.tsx` wel geabstraheerd. |

## Conventies

- Reusables wonen in `src/_reusable/`.
- Bovenaan elk bestand een JSDoc-blok in dit format:

  ```ts
  /**
   * @reusable
   * @category layout | ui | data | sim
   * @description Korte uitleg van het algemene doel
   */
  ```
- Houd deze tabel bij wanneer je een nieuwe reusable toevoegt of de status
  wijzigt (bijvoorbeeld bij extractie naar een gedeelde bibliotheek).
