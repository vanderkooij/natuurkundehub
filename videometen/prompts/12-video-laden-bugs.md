# Claude Code prompt 12 — Videometen: Video-laden bugs (venster-verkleining + autoplay-frames)

## Context

Twee specifieke bugs in de video-laden flow die uit gebruik naar voren komen:

1. **Browser-venster verkleint** bij upload van een video — viewport of layout krimpt onverwacht na het loaden. Vervelend voor de leerling want werkbalk en panes kunnen mogelijk uit beeld vallen.
2. **Paar frames spelen automatisch af** na load — autoplay-achtig gedrag dat niet hoort. Video zou stil moeten blijven op het eerste frame totdat de leerling actief afspeelt.

**Aanpak**: code-trace door de hele video-laden flow vóór er ook maar een fix wordt toegepast. Geen gokken meer — eerst meten waar het breekt, dan gerichte fix. Bij twijfel: tijdelijke logs + Jop's output.

Voor context:
- `videometen/prompts/01-fundament.md` — video-upload + fps-detectie spec
- `videometen/src/features/video/VideoUpload.tsx` (of vergelijkbaar) — file-picker → URL.createObjectURL
- `videometen/src/features/video/VideoPane.tsx` — `<video>`-element + overlay
- `videometen/src/features/video/VideoPlayer.tsx` — frame-stepping + play/pause
- `videometen/src/features/video/useFpsDetection.ts` (of waar de fps-detectie zit) — sampling van frames

---

## Aanpak

### Stap 1 — Code-trace door de video-laden flow

Loop deze keten door en identificeer per stap wat er gebeurt:

1. **File-picker handler**: hoe wordt de geselecteerde file binnengehaald?
2. **`URL.createObjectURL`**: wanneer/waar wordt 'm aangemaakt? Wordt de oude correct revoked?
3. **`<video>`-element**: krijgt 'm de src direct, of via een state-update? Welke attributen heeft 'm — `autoplay`, `muted`, `preload`?
4. **`loadedmetadata`-event**: hoe wordt op metadata-beschikbaarheid gereageerd? Welke properties worden gelezen (duration, videoWidth/Height)?
5. **fps-detectie**: welke methode — `requestVideoFrameCallback`, dt-sampling via `play()` + `pause()`, of mediainfo.js? Wordt `video.play()` ergens aangeroepen voor sampling?
6. **`currentTime` initialisatie**: wordt 'm op 0 gezet (of op `trimStart`)? Asynchroon of synchroon?
7. **Eerste-frame render**: blijft de video stil staan op frame 0, of speelt 'ie even af?

### Stap 2 — Diagnoseren per bug

#### Bug A — Venster-verkleining

Mogelijke oorzaken:

1. **Layout-shift bij aspect-ratio bekend worden**: bij `loadedmetadata` weet de browser de echte `videoWidth/Height`, en het `<video>`-element herrekent zijn afmetingen. Als het in een flexbox/grid zit zonder expliciete dimensies, kan de hele layout reflowen.
2. **CSS `aspect-ratio: auto`** op het `<video>`-element of zijn container: voor metadata-load is de aspect-ratio onbekend, daarna verandert 'ie.
3. **Iets dat `window.resizeBy()` of `window.innerHeight` aanpast** — onwaarschijnlijk maar mogelijk in een ouder script.
4. **Container met `min-height` die op metadata-load verdwijnt**: een placeholder van een vaste hoogte die door de video wordt vervangen.

Check in de Verken/Analyseren-layout en `VideoPane`: hoe wordt de video-container gedimensioneerd vóór en ná load?

#### Bug B — Autoplay-frames

Mogelijke oorzaken:

1. **fps-detectie via play+pause sampling**: als de detectie `video.play()` aanroept om frames te samplen voor dt-bepaling, speelt de video een kortstondige tijd af. `requestVideoFrameCallback` is een betere methode — die werkt zonder afspelen.
2. **`autoplay`-attribuut** op het `<video>`-element (bewust of per ongeluk).
3. **`<video>` element met `preload="auto"`** dat in sommige browsers een paar frames laadt + toont — niet echt afspelen maar wel visueel beweging.
4. **Effect dat `video.currentTime` snel veranderlijkt** in een useEffect-cyclus (animatie-achtig effect).

Check de fps-detectie implementatie + alle `video.play()`-aanroepen in de codebase.

### Stap 3 — Gerichte fix per bug

Op basis van de bevinding(en):

#### Voor Bug A

- Stel een **expliciete aspect-ratio** in op de video-container (bv. `aspect-video` of `aspect-[16/9]`) zodat er geen layout-shift is bij metadata-load
- Of: een placeholder met dezelfde dimensies tijdens loading
- Of: een container met vaste hoogte (bv. `min-height: 360px`) zodat de overall layout stabiel blijft

Documenteer root cause in een comment.

#### Voor Bug B

- Als fps-detectie via play+pause werkt: vervang door `requestVideoFrameCallback`-based sampling (geen `video.play()` nodig — een paar requestAnimationFrame-ticks geeft genoeg samples om dt te bepalen)
- Of: gebruik `seekToNextFrame()` op specifieke browsers (Firefox only)
- Verzeker dat `<video>` geen `autoplay` heeft (zou expliciet false moeten zijn of attribuut weg)
- Bij `preload`: `metadata` is genoeg, geen `auto`
- Direct na load: zet `video.currentTime = 0` of `trimStart` zonder `play()`

Documenteer root cause in een comment.

### Stap 4 — Bij twijfel: logs

Als de code-trace niet eenduidig is bij één van de twee bugs:

- Voeg `console.log("[VM/VIDEO]")` toe op kritieke punten: file-picker, URL.create, video-attributes, loadedmetadata, fps-detection-start/end, currentTime-set
- Jop runt + deelt console-output
- Schrijf 12b met definitieve fix op basis van wat de logs aanwijzen

---

## Hygiëne-check

- Bekijk of de video-laden flow nog andere quirks heeft (memory-leak via niet-revoked objectURLs, race-conditions met state-updates)
- Niet uitvoeren tenzij triviaal — documenteer als opmerking in rapport
- Scope strict op de twee bugs, geen scope-creep

---

## Niet doen

- ❌ Geen wijziging aan tracking, kalibratie, grafiek-rendering
- ❌ Geen nieuwe features
- ❌ Geen schema-bump
- ❌ Geen andere video-laden polish buiten deze twee bugs (tenzij triviaal en zonder risico)

---

## Acceptatie-criteria

### Venster-verkleining

- [ ] Bij upload van een video: viewport / layout blijft stabiel
- [ ] Geen visuele "spring" van werkbalk of panes na metadata-load
- [ ] Aspect-ratio van de video wordt correct getoond in de pane
- [ ] Root cause gedocumenteerd in comment

### Autoplay-frames

- [ ] Na upload: video staat stil op het eerste frame (geen afspelen)
- [ ] fps-detectie loopt zonder zichtbare afspeel-beweging
- [ ] Eerste `loadedmetadata` → meteen stil
- [ ] `play()`-aanroep alleen bij expliciete user-actie (play-knop)
- [ ] Root cause gedocumenteerd in comment

### Algemeen

- [ ] Geen console-errors of warnings
- [ ] Bestaande functionaliteit blijft intact (frame-stepping, fps-detectie nauwkeurigheid, trim)
- [ ] `npm run build` succesvol

---

## Volgende prompts

- **13-presets**: per fysisch scenario (vrije val, slinger) met conditionele physica-uitleg
- **14-meerdere-meetreeksen**: multi-series datamodel
