# Claude Code prompt 13 — Videometen: Help-paneel uitbreiding

## Context

Voor de release in NatuurkundeHub moet de help-paneel content up-to-date en compleet zijn. De huidige 12 secties zijn pedagogisch sterk uitgewerkt, maar mist recent toegevoegde features (assen-toggles, tabel-kolommen-menu, verberg-modus) en een paar pedagogisch belangrijke onderwerpen (camera-tips, tracking-tips, shortcuts-overzicht).

Acht uitbreidingen:

1. **TL;DR-workflow** bovenaan — voor eerste-keer-gebruikers die niet alle secties willen lezen
2. **Camera-vereisten** als aparte sectie — stond eerder als drop-zone-hint, hoort in help
3. **Tracking-tips** uitgebreid in Meten-sectie — klik-locatie keuze, undo, correctie achteraf
4. **Assen-richting-toggles** toegevoegd aan Kalibreren-sectie (uit 11)
5. **Tabel-kolommen-menu** toegevoegd aan Analyseren-sectie (uit 10)
6. **Verberg-knop + pane-grootte slider** toegevoegd aan Analyseren-sectie (uit 09/09c)
7. **Grafiek-features** (auto-zoom, as-sleep, zoom-scroll) overzicht in Analyseren-sectie
8. **Toetsenbord-shortcuts** als aparte mini-sectie

Voor context:
- `videometen/src/features/help/HelpPanel.tsx` — 12 bestaande secties

---

## Te realiseren

### Sectie volgorde na uitbreiding

```
1. TL;DR — De workflow in één blik          (NIEUW)
2. Aan de slag                              (bestaand)
3. Camera-vereisten                         (NIEUW)
4. Kalibreren — schaal en assen             (uitgebreid)
5. Meten — tracking-workflow                (uitgebreid)
6. Analyseren — tabel, grafieken, raaklijn  (uitgebreid)
7. Toetsenbord-shortcuts                    (NIEUW)
8. Wat zegt R²?                             (bestaand)
9. Waarom is mijn afgeleide ruisig?         (bestaand)
10. Wanneer de fit niet volgt               (bestaand)
11. Trim-range vs fit-range                 (bestaand)
12. Wat doe je met de formule?              (bestaand)
13. Sync-problemen?                         (bestaand)
14. Frames vs meetpunten                    (bestaand)
15. Opslaan, exporteren                     (bestaand, kleine update)
```

Default openId blijft `"start"` (Aan de slag) — leerlingen die de help openen, beginnen daar. TL;DR is ervoor maar dichtgeklapt; wie 'm wil ziet 'm direct.

### Sectie 1 (NIEUW) — TL;DR — De workflow in één blik

```tsx
{
  id: "tldr",
  title: "TL;DR — De workflow in één blik",
  content: (
    <Prose>
      <p>
        <strong>1. Video laden</strong> — sleep een MP4/MOV/WebM het grijze
        vak in.
      </p>
      <p>
        <strong>2. Voorbereiden</strong> — controleer <Kbd>fps</Kbd>, kies
        je <em>trim</em>-bereik, kalibreer de <strong>schaal</strong>
        (stap 4) en <strong>assen</strong> (stap 5).
      </p>
      <p>
        <strong>3. Tracken</strong> — klik op <Kbd>▶ Start tracking</Kbd>,
        klik frame voor frame op je object. De tool springt automatisch
        vooruit.
      </p>
      <p>
        <strong>4. Analyseren</strong> — na de tweede meting schakelt de
        tool naar Analyseren-modus. Tabel, grafieken, fit, raaklijn,
        meten — alles om je beweging in kaart te brengen.
      </p>
      <p>
        <strong>5. Opslaan / exporteren</strong> — via het menu rechtsboven
        (drie puntjes). Project als JSON of tabel als CSV. Grafiek als PNG.
      </p>
    </Prose>
  ),
},
```

### Sectie 3 (NIEUW) — Camera-vereisten

```tsx
{
  id: "camera",
  title: "Camera-vereisten — wat maakt een goede video?",
  content: (
    <Prose>
      <p>
        De kwaliteit van je metingen begint bij de video. Een paar
        praktische tips:
      </p>
      <ul>
        <li>
          <strong>Stilstaande camera</strong> — pan of zoom tijdens
          opname zorgt voor verschuivende referentiepunten. Zet de camera
          op een statief of op een vlakke ondergrond.
        </li>
        <li>
          <strong>Filmt loodrecht op de beweging</strong> — als je object
          van links naar rechts beweegt, film je niet van schuin boven.
          Anders krijg je perspectief-vervorming.
        </li>
        <li>
          <strong>Voldoende belichting</strong> — een donker beeld maakt
          klikken op het object moeilijk. Goed licht, lage ISO, scherp
          beeld.
        </li>
        <li>
          <strong>Referentie-object in beeld</strong> — een meetlat, een
          deur, een A4-blad, of iets met een bekende afmeting. Zonder
          referentie kunnen pixels niet omgezet worden naar meters.
        </li>
        <li>
          <strong>Contrast tussen object en achtergrond</strong> — een
          rode bal voor een witte muur is makkelijk te tracken; een groene
          bal in het gras niet.
        </li>
        <li>
          <strong>Hoge framerate bij snelle bewegingen</strong> — 30 fps
          is genoeg voor een schommel, maar voor een springende bal of een
          vallend object wil je liever 60 fps of meer voor scherpere
          frames.
        </li>
      </ul>
    </Prose>
  ),
},
```

### Sectie 4 — Kalibreren (uitbreiding bestaand)

Vervang de bestaande "Kalibreren — schaal en assen"-content door uitgebreide versie. Voeg de assen-richting-toggles toe:

```tsx
<Prose>
  <p>
    <strong>Schaal</strong> vertelt de tool hoeveel meter (of cm/mm) er
    in één videopixel zit. Klik op stap <Kbd>4 Schaal</Kbd>, teken een
    streep over een bekend object (meetlat, deur, lichaamslengte) en
    vul de lengte in.
  </p>
  <p>
    <strong>Tip:</strong> film altijd een referentie-object in beeld
    (meetlat, A4-blad). Zonder schaal kunnen meters niet uit pixels
    afgeleid worden.
  </p>
  <p>
    <strong>Assen</strong> bepalen waar nul is en hoe je x- en y-as
    gericht zijn. Standaard staat de oorsprong links-onder en wijst{" "}
    <em>+x</em> naar rechts en <em>+y</em> omhoog. Bij stap{" "}
    <Kbd>5 Assen</Kbd> kun je:
  </p>
  <ul>
    <li>
      <strong>De oorsprong slepen</strong> — verplaats de origin-dot
      naar het beginpunt van je beweging.
    </li>
    <li>
      <strong>De assen draaien</strong> — sleep aan de +x-pijl-tip. Snap
      naar 15°; houd <Kbd>Shift</Kbd> ingedrukt om de snap uit te
      schakelen.
    </li>
    <li>
      <strong>Richting wisselen</strong> — twee swap-knoppen verschijnen
      rechtsboven in beeld: <Kbd>+x →</Kbd>/<Kbd>+x ←</Kbd> en{" "}
      <Kbd>+y ↑</Kbd>/<Kbd>+y ↓</Kbd>. Handig wanneer je positief de
      andere kant op wil meten (bv. bij een vallend object: +y omlaag).
    </li>
  </ul>
  <p>
    <strong>Slim:</strong> de assen-controls verschijnen automatisch
    zodra je de oorsprong of de rotatie-handle aanraakt — ook als je in
    een andere stap zit. Klik op een andere stap om ze weer te
    verbergen.
  </p>
</Prose>
```

### Sectie 5 — Meten (uitbreiding bestaand)

Vervang de bestaande "Meten — tracking-workflow"-content:

```tsx
<Prose>
  <p>
    Klik op <strong>▶ Start tracking</strong> in de werkbalk. De video
    schakelt naar <em>volle-breedte tracking-modus</em> en springt naar{" "}
    <Kbd>trim begin</Kbd>. Klik op het object in beeld; de tool plaatst
    een meetpunt en springt automatisch <em>frame-step</em> frames
    vooruit.
  </p>
  <p>
    <strong>Tips voor goed tracken:</strong>
  </p>
  <ul>
    <li>
      <strong>Klik consistent</strong> — kies een vast punt op het
      object (bv. linkerbovenhoek van een ballon, of het zwaartepunt van
      een blokje) en klik elke meting op datzelfde punt. Anders meet je
      vooral de fluctuaties van je klikken.
    </li>
    <li>
      <strong>Verkeerd geklikt?</strong> Druk <Kbd>Ctrl + Z</Kbd> (undo)
      om de laatste meting terug te halen. Je kunt meerdere keren
      ongedaan maken.
    </li>
    <li>
      <strong>Achteraf corrigeren</strong> — in Analyseren-modus kun je
      een meetpunt slepen om 'm op de juiste plek te zetten, zonder
      opnieuw te tracken.
    </li>
    <li>
      <strong>Trail-kleur wisselen</strong> — als je magenta moeilijk
      ziet op je achtergrond, klik op de kleurchip naast de fps-chip om
      door cyaan/magenta/geel/wit te cyclen.
    </li>
  </ul>
  <p>
    <strong>Frame-step</strong> (rechtsboven in de tracking-bar)
    bepaalt hoeveel frames tussen elke meting zitten. Default <Kbd>5</Kbd>{" "}
    — voldoende dichtheid voor een 30 fps-video van een paar seconden.
    Kies kleiner voor snelle bewegingen, groter voor lange video's.
  </p>
  <p>
    Druk op <Kbd>Esc</Kbd> of klik <strong>Klaar</strong> om de
    tracking-sessie te beëindigen.
  </p>
  <p>
    <strong>Belangrijk verschil:</strong> een <em>frame</em> is één
    beeldje van de video; een <em>meetpunt</em> is een frame waarop je
    geklikt hebt. Niet elke frame is een meetpunt.
  </p>
</Prose>
```

### Sectie 6 — Analyseren (uitbreiding bestaand)

Vervang de bestaande "Analyseren — tabel, grafieken, raaklijn"-content:

```tsx
<Prose>
  <p>
    In de <strong>tabel</strong> staat elke meting met haar tijd en
    (na kalibratie) wereldcoördinaten. Klik op een rij om naar dat
    frame te springen. De rij van het huidige frame is gemarkeerd.
  </p>
  <p>
    <strong>Extra kolommen</strong> — klik op <Kbd>Kolommen</Kbd>{" "}
    rechtsboven in de tabel. Je kunt zes afgeleide grootheden aan/uit
    vinken: <Kbd>vx</Kbd>, <Kbd>vy</Kbd>, <Kbd>|v|</Kbd>, <Kbd>ax</Kbd>,{" "}
    <Kbd>ay</Kbd>, <Kbd>|a|</Kbd>. Versnellingen kunnen ruisig zijn
    omdat ze de tweede afgeleide van ruwe meetpunten zijn — kijk in de
    grafiek voor een fit-versie.
  </p>
  <p>
    Voor elke grafiek-pane kies je een type uit het dropdown-menu
    (x tegen t, y tegen t, vx tegen t, etc.). De{" "}
    <strong>Raaklijn</strong>-knop tekent de afgeleide op het actieve
    punt, met de helling <Kbd>dy/dx</Kbd> erbij. <strong>Meten</strong>{" "}
    geeft twee verticale lijnen om verschillen <Kbd>Δx</Kbd> en{" "}
    <Kbd>Δy</Kbd> af te lezen. <strong>Fit</strong> tekent een
    wiskundig model door je data (lineair, kwadratisch, sinus) — zie
    de fit-secties verderop voor uitleg.
  </p>
  <p>
    <strong>Zoomen in grafieken:</strong>
  </p>
  <ul>
    <li>
      <strong>Scroll-wiel</strong> — zoomt rond je cursor. <Kbd>↺ Auto
      zoom</Kbd> reset naar passend bij je data.
    </li>
    <li>
      <strong>Sleep middenin een as</strong> — verschuift die as. Sleep
      aan een as-uiteinde om te in/uit-zoomen.
    </li>
    <li>
      <strong>Sleep middenin de grafiek</strong> — verschuift het hele
      beeld (pan).
    </li>
  </ul>
  <p>
    <strong>Pane-management:</strong>
  </p>
  <ul>
    <li>
      <strong>+ knop</strong> — voegt een grafiek toe (max 4).
    </li>
    <li>
      <strong>× knop</strong> — sluit een grafiek.
    </li>
    <li>
      <strong>Sleep tussen panes</strong> — herverdeelt de ruimte.
    </li>
    <li>
      <strong>Verberg-knop</strong> — verbergt video + tabel, grafieken
      vullen het volledige scherm. Handig op kleine schermen.
    </li>
    <li>
      <strong>Pane-grootte slider</strong> — maak panes groter dan het
      scherm en scroll erdoor. Goed bij 4 grafieken.
    </li>
  </ul>
  <p>
    Twee werkmodi via de knop bovenaan: <strong>Meten</strong> (alleen
    de video op volle breedte — om te kalibreren en te tracken) of{" "}
    <strong>Analyseren</strong> (video klein, met tabel + grafieken).
    Zodra je je tweede meetpunt zet schakelt de tool automatisch naar
    Analyseren.
  </p>
  <p>
    Met <Kbd>←</Kbd> en <Kbd>→</Kbd> stap je tussen meetpunten — over
    de hele meetreeks als de muis boven de video staat, en door de
    datapunten van een specifieke grafiek als de muis daar boven hangt.
    Met <Kbd>Shift</Kbd> spring je 10 meetpunten per keer.
  </p>
</Prose>
```

### Sectie 7 (NIEUW) — Toetsenbord-shortcuts

```tsx
{
  id: "shortcuts",
  title: "Toetsenbord-shortcuts",
  content: (
    <Prose>
      <p>
        <strong>Tracking-modus:</strong>
      </p>
      <ul>
        <li><Kbd>Esc</Kbd> — beëindig tracking-sessie</li>
        <li><Kbd>Ctrl + Z</Kbd> — laatste meetpunt ongedaan maken</li>
        <li><Kbd>Ctrl + Shift + Z</Kbd> — opnieuw doen</li>
      </ul>
      <p>
        <strong>Analyseren / algemeen:</strong>
      </p>
      <ul>
        <li><Kbd>←</Kbd>/<Kbd>→</Kbd> — vorige/volgende meetpunt (over de meetreeks of in actieve grafiek)</li>
        <li><Kbd>Shift + ←</Kbd>/<Kbd>→</Kbd> — 10 meetpunten per keer</li>
        <li><Kbd>Space</Kbd> — video play/pause</li>
        <li><Kbd>Esc</Kbd> — sluit popovers / verlaat assen-edit / sluit help</li>
      </ul>
      <p>
        <strong>Kalibreren:</strong>
      </p>
      <ul>
        <li><Kbd>Shift</Kbd> (tijdens slepen aan +x-as) — schakel snap op 15° uit</li>
      </ul>
    </Prose>
  ),
},
```

### Sectie 15 — Opslaan/exporteren (kleine update)

In de bestaande sectie, vervang het stuk over "Project opslaan / openen" door:

```
- **Project opslaan** — een dialog vraagt om locatie en bestandsnaam (in
  ondersteunde browsers). Bewaart je hele sessie als JSON.
```

In plaats van de huidige beschrijving die de automatic download impliceert.

---

## Hygiëne-check

Tijdens uitvoer:
- Bekijk consistent gebruik van `<Kbd>` en `<strong>` door alle secties
- Check of de huidige tekst nog up-to-date is bij andere kleine details (bv. "drie puntjes" vs "Menu" — de menu-knop heet nu "Menu" met icoon)
- Documenteer in rapport

---

## Niet doen

- ❌ Geen wijziging aan de help-modal-structuur of accordion-gedrag
- ❌ Geen wijziging aan tracking, kalibratie, grafieken, etc.
- ❌ Geen versie-bump in deze prompt — komt bij release (14)

---

## Acceptatie-criteria

- [ ] Sectie 1 (TL;DR) toegevoegd bovenaan, dichtgeklapt by default
- [ ] Sectie 3 (Camera-vereisten) toegevoegd na "Aan de slag"
- [ ] Sectie 4 (Kalibreren) uitgebreid met assen-richting-toggles + auto-show-bij-sleep
- [ ] Sectie 5 (Meten) uitgebreid met tracking-tips (consistent klikken, undo, slepen, trail-kleur)
- [ ] Sectie 6 (Analyseren) uitgebreid met Kolommen-menu, zoom-uitleg, pane-management, Verberg-knop, slider
- [ ] Sectie 7 (Toetsenbord-shortcuts) toegevoegd na "Analyseren"
- [ ] Sectie 15 (Opslaan/exporteren) update over native save-dialog
- [ ] Default openId blijft `"start"`
- [ ] Geen typos, NL-tekst correct
- [ ] `npm run build` succesvol

---

## Volgende prompt

**14-release**: opnemen in NatuurkundeHub
- Uit `videometen/` uit `.gitignore` halen
- Root `build.sh` uitbreiden om `videometen/` mee te builden
- Root `index.html` link naar `/videometen/` toevoegen op de tool-index
- Versie-bump van `0.0.1` naar `1.0.0`
- Eventuele final QA-checklist
