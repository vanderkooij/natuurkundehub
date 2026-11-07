# NatuurkundeHub — Workflow & Structuur

## Mapstructuur

Elke tool krijgt een eigen map onder de root. Voor statische HTML-tools volstaat een `index.html` (eventueel met submappen voor modi of admin-interfaces). Tools met een eigen build (zoals CircuitSketch) hebben hun eigen project-structuur in de map; alleen de gebouwde output wordt door `build.sh` naar `dist/` gekopieerd.

De Vite/React-tools CircuitFlow, Videometen, Modelleren en Systeembord zijn **npm-workspaces** (zie `package.json` in de root) en delen `packages/shared` (`@nh/shared`). CircuitSketch is een los Vite-project met een eigen `npm install`.

Huidige situatie:

```
natuurkundehub/
├── index.html                        # Homepage
├── 404.html                          # Fallback-pagina
├── robots.txt                        # Voor zoekmachines; de sitemap maakt build.sh
├── package.json                      # npm-workspaces: packages/*, videometen, modelleren-app, circuitflow, systeembord
├── package-lock.json                 # Let op bij Windows, zie Deployment
├── netlify.toml                      # Build-commando, redirects en headers
├── packages/
│   └── shared/                       # @nh/shared: gedeelde code voor de workspace-apps (TS-bron, wordt niet apart gebouwd)
├── scripts/
│   └── sitemap.mjs                   # Maakt dist/sitemap.xml uit alle pagina's (laatste stap van build.sh)
├── plannen/                          # Bouwplannen per tool (bewegingsgrafieken, em-spectrum, systeembord, voorvoegsels)
├── assets/
│   └── logo/                         # JK_light.svg, JK_dark.svg, JK_black.svg, JK_white.svg
├── contact/
│   └── index.html                    # Contactformulier (Netlify Forms)
├── overhoor/
│   ├── index.html                    # Overhoorprogramma
│   ├── admin/
│   │   └── index.html                # Beheerinterface voor grootheden (wachtwoordbeveiligd)
│   └── data/
│       └── grootheden.js             # Vraagdata — download via admin en upload naar GitHub
├── formules-omschrijven/
│   ├── index.html                    # Keuzemenu: eerst onderbouw of bovenbouw (#onderbouw / #bovenbouw)
│   ├── uitleg/index.html             # Bovenbouw: uitlegmodus (9 stappen, met de stapper)
│   ├── oefenen/index.html            # Bovenbouw: letterformules (5 levels + oplopende reeks, met stapmodus)
│   ├── examenformules/index.html     # Bovenbouw: formules uit het examenprogramma (met stapmodus; ?thema=…&niveau=… zet keuzes vooraf)
│   ├── examenformules/overzicht/     # Formuleoverzicht: alle examenformules per thema, opgebouwd uit data/formulas.js
│   ├── onderbouw/
│   │   ├── uitleg/index.html         # Van vlek naar letter; ?spoor=plusmin geeft het plus-en-min-spoor
│   │   └── oefenen/index.html        # Keer/delen of plus/min; 4 levels + extra level 5 (klas 3), met de stapper
│   ├── css/stapper.css               # Opmaak van de stapper — gedeeld door uitleg en oefenen
│   └── js/
│       ├── stapper.js                # Stap-voor-stap vergelijking: parser, vereenvoudiger, animatie (ook onderbouwstand)
│       ├── onderbouw.js              # Onderbouw: vlek, woordcontexten, opgavegenerators, invulcontrole
│       ├── verify.js                 # Antwoordcontrole op gelijkwaardigheid (numeriek)
│       ├── keyboard.js               # Rekenbalk en subscript-invoer
│       └── katex-init.js             # KaTeX-weergave
├── modelleren/
│   └── MIGRATION.md                  # Alleen nog de migratienotitie; de tool zelf staat in modelleren-app/
├── modelleren-app/                   # Vite/React-workspace: numerieke modelleeromgeving, gedeployed op /modelleren/
├── circuitsketch/                    # Los Vite/React-project: schakelschema's tekenen (eigen npm install)
│   └── public/over/index.html        # Infopagina /circuitsketch/over/
├── circuitflow/                      # Vite/React-workspace: DC-schakelsimulator met stroomdeeltjes
│   └── public/over/index.html        # Infopagina /circuitflow/over/
├── videometen/                       # Vite/React-workspace: video-analyse, frame voor frame
│   └── public/over/index.html        # Infopagina /videometen/over/
├── significantie/
│   ├── index.html                    # Significante cijfers oefenen
│   └── uitleg/index.html             # Uitlegmodus
├── voorvoegsels/
│   ├── index.html                    # Keuzemenu
│   ├── uitleg/index.html             # Uitlegmodus
│   └── oefenen/index.html            # Oefenmodus (4 soorten, 5 levels)
├── bewegingsgrafieken/
│   ├── index.html                    # Keuzemenu: eerst onderbouw of bovenbouw (#onderbouw / #bovenbouw)
│   ├── uitleg/index.html             # Stappen met karretje en diagrammen; ?niveau=…&stap=… opent een stap
│   ├── oefenen/index.html            # Herkennen (onderbouw 6 levels, bovenbouw 8, incl. getallen en eindmix) en koppelen (bovenbouw, 4 levels; ?vorm=koppelen)
│   ├── css/beweging.css              # Opmaak van grafiek en karretje, gedeeld door uitleg en oefenen
│   ├── js/beweging.js                # Bewegingsmodel, vraaggenerator en feedback (ook in node te testen)
│   ├── js/getallen.js                # Rekenvragen bij het level met getallen: generator, controle, uitwerking
│   ├── js/koppel.js                  # Koppelen: bij een diagram het andere kiezen, foute opties uit denkfouten
│   ├── js/grafiek.js                 # x,t-, v,t- en a,t-diagram als SVG, met of zonder getallen
│   ├── js/karretje.js                # Baan met karretje en afdrukjes; scène die alles synchroon afspeelt
│   └── tests/                        # beweging, getallen en koppel: npm run test:bewegingen
├── em-spectrum/                      # EM-spectrumverkenner, schermvullend (statische HTML met canvas)
│   ├── index.html                    # De tool: spectrumbalk, marker, lagen, infopaneel
│   ├── plaatjes.js                   # Eigen tekeningen (witte lijn met kleurvlak), één regel per tekening
│   ├── invoer.js                     # Invoerveld: golflengte, frequentie of energie lezen
│   ├── over/index.html               # Infopagina /em-spectrum/over/
│   └── tests/                        # invoer: npm run test:em
├── systeembord/                      # Vite/React-workspace (zoals CircuitFlow); alleen systeembord/dist/ wordt gedeployed
│   ├── public/over/index.html        # Infopagina /systeembord/over/ (Vite kopieert hem mee)
│   └── src/                          # sim/ (rekenkern, tests), bord/ (tekenen, bediening), bestand/ (opslaan, link, XML, voorbeelden)
├── dist/                             # Gebouwde versies (automatisch, niet handmatig bewerken)
├── build.sh                          # Build-script — bron van waarheid voor wat er gedeployed wordt
├── IDEEEN.md                         # Backlog met status per tool
├── CLAUDE.md                         # Afspraken voor Claude
└── WORKFLOW.md                       # Dit bestand
```

### Nieuwe tool toevoegen

1. Maak een map met de tool-naam (kebab-case) onder de root.
2. Bouw de tool volgens de geldende conventies (header, thema, paginapresentatie, ontwerpprincipes — zie hieronder).
3. Voeg een tegel toe in `index.html` (de homepage), in de goede categorie. Zie **Homepage** hieronder.
4. Voeg een `cp -r <toolnaam> dist/<toolnaam>` regel toe in `build.sh` (of een eigen build-stap bij een Vite-project).
5. Geef elke pagina de vindbaarheidskoppen (zie **Vindbaarheid** hieronder). De sitemap neemt de pagina daarna vanzelf mee.
6. Werk dit bestand bij: tool in de mapstructuur, naam in de tabel onder Paginapresentatie, en eventueel de status in `IDEEEN.md`.

## Homepage

De homepage (`index.html`, opnieuw ingedeeld op 2026-10-10) is één pagina met de tools in **categorieën**: nu Basisvaardigheden, Beweging en kracht, Elektriciteit, Automatisering en Golven en straling. Bovenaan staan een korte hero met zoekveld, het pilletje *Verder waar je was* en een rij snelknoppen per categorie die onder de header blijft hangen.

**Tegel toevoegen.** Kopieer een bestaande `<a class="card">` binnen de juiste `<section class="category">` en vul in:

- `data-name` (de toolnaam) en `data-keys`: trefwoorden waarop een leerling zoekt, ook woorden die niet in de naam of beschrijving staan. De naam van de categorie telt vanzelf mee.
- Een korte beschrijving in leerlingentaal.
- Twee labels: het niveau (`alle klassen` of `bovenbouw`, met `tag--niveau`) en wat je doet (`oefenen`, `meten`, `simuleren`, `tekenen`).
- Het aantal tools in de snelknop van die categorie (`<span class="count">`).

Een nieuwe categorie is een nieuwe `<section class="category" id="…">` plus een snelknop met `href="#…"`. Maak er pas een als er een tool in komt; lege categorieën tonen we niet.

**Het podium.** Bovenaan elke tegel staat een podium van 128 px hoog dat bij hover beweegt.

- *Oefentools* krijgen een eigen kleine animatie in SVG of HTML die laat zien wat je oefent (de stapper bij formules, het karretje bij bewegingsgrafieken). Gewone CSS-animaties hangen aan `.card:hover`; animaties met stappen of een functie staan in het `anims`-object onderaan het script, gekoppeld via `data-anim` op de tegel.
- *Labs* (schermvullende apps) tonen hun schermafbeelding uit `assets/og/` met het label *Lab*. In `<div class="shot">` bepalen `--oy` (welk deel verticaal in beeld is) en `--zoom` de uitsnede; bij een zoom onder 1 vult `--fill` op de stage de rand met de randkleur van de schermafbeelding. Over het plaatje ligt een SVG-laag met `viewBox="0 0 1200 630"`, dus in pixels van de schermafbeelding. **Wordt een schermafbeelding vervangen, dan moeten de coördinaten in die laag mee** (meetpunten bij Videometen, de valkromme bij Modelleren, de draden bij CircuitFlow en CircuitSketch).
- Bij `prefers-reduced-motion` staan de animaties uit.

**Verder waar je was.** De homepage onthoudt zelf op welke tegel je het laatst klikte (`localStorage`, sleutel `nh-last`). De tools hoeven daar niets voor te doen.

## Vindbaarheid (SEO)

Elke pagina heeft in de `<head>`, direct na `<title>`:

- een `<title>` met de zoekterm waarop een leerling zoekt, eindigend op `· NatuurkundeHub` (bijv. `Significante cijfers oefenen · NatuurkundeHub`);
- `<meta name="description">`: een of twee zinnen (max. ca. 155 tekens) over wat je er kunt doen;
- `<link rel="canonical" href="https://natuurkundehub.nl/<pad>/">`, altijd met slash aan het eind;
- de Open Graph-tags `og:type`, `og:site_name`, `og:locale`, `og:title`, `og:description` en `og:url` (kopieer ze van een bestaande pagina).

Alleen de **hoofdpagina** van een tool (de keuzepagina, of de toolpagina zelf als de tool maar één pagina heeft) krijgt onderaan in `.main` een inklapbaar blok **Over deze tool** (`<section class="about"><details>…`), met de opmaak uit `/assets/about.css`. Daarin staan in gewone taal wat je oefent, voor wie, de kern van de stof en een link naar de uitleg. De tool zelf blijft bovenaan en ongewijzigd; het blok geeft Google leesbare tekst zonder leerlingen af te leiden. Subpagina's (uitleg, oefenen, examenformules, overzichten) krijgen het blok niet; afgesproken met Jop op 2026-10-10, omdat het daar alleen afleidt. Kijk het voorbeeld na in `significantie/index.html`.

Schermvullende apps (CircuitSketch, CircuitFlow, Videometen, Systeembord, EM-spectrum) kunnen geen blok onderaan hebben, want ze scrollen niet. Zij krijgen een **infopagina** op `/<app>/over/` (bron: `<app>/public/over/index.html`, Vite kopieert hem mee; bij het statische EM-spectrum staat hij direct in `em-spectrum/over/`). De app zelf blijft op `/<app>/` staan, zodat bladwijzers en de tegel op de homepage direct naar de tool gaan; de infopagina is voor wie via Google binnenkomt. Vanuit de app linkt het helpvenster (en waar dat kan het lege startscherm) naar de infopagina. Modelleren scrollt wel en heeft het blok gewoon onder de app.

Elke pagina heeft een **previewplaatje** (`og:image`, 1200×630) uit `assets/og/`: de apps hun eigen schermafbeelding, de overige pagina's `hub.jpg`. De infopagina's tonen dezelfde schermafbeelding als `.webp`.

Pagina's die niet in Google horen (admin, doorverwijzingen, 404) krijgen `<meta name="robots" content="noindex">`.

`robots.txt` staat in de root. `dist/sitemap.xml` wordt aan het eind van `build.sh` gemaakt door `scripts/sitemap.mjs`: alle `index.html`-pagina's in `dist/`, behalve die met `noindex`. Interne links naar een tool schrijf je met slash aan het eind (`/overhoor/`), zodat er geen omleiding tussen zit. Logo- en faviconpaden in statische pagina's zijn absoluut (`/assets/logo/...`).

## Ontwerpprincipes

Bij het ontwikkelen van nieuwe tools wordt — waar dat redelijk haalbaar is — rekening gehouden met toekomstbestendigheid in relatie tot meerdere tools. Concreet betekent dat:

- **Hergebruik boven eenmalig.** Visuele elementen, componenten, patronen en oplossingen die in meerdere tools voorkomen (theme-toggle, header, sliders, grafiek-componenten, sim-controls, animatie-loop) worden zo opgezet dat ze deelbaar zijn — al is het in eerste instantie via copy-paste-templates, met als doel ze later naar een gedeelde bibliotheek te verhuizen.
- **Consistentie boven creativiteit per tool.** Gebruikers (leerlingen) moeten in elke tool dezelfde interactiepatronen herkennen. Een slider werkt overal hetzelfde; play/pause-knoppen zien er overal hetzelfde uit.
- **Stack-keuze volgt de tool.** Eenvoudige oefen-tools blijven single-file HTML. Tools met substantiële interactie of animatie (PhET-stijl simulaties, video-analyse) verdienen de Vite + React + TS-stack zoals CircuitSketch, zodat ze profiteren van een gedeelde componenten- en sim-bibliotheek.
- **Niet vooraf overdesignen.** De gedeelde bibliotheek groeit organisch: pas extraheren als iets voor de tweede of derde keer nodig is, niet vooraf bedenken wat ooit nuttig zou kunnen zijn.

### Aanraken (digibord en Chromebook)

- Alles wat je aantikt of versleept (aansluitpunten, bussen, knoppen, grepen, schuifjes) heeft een aanraakvlak van minstens **40 schermpixels** doorsnee, op elk zoomniveau. Het zichtbare deel mag kleiner zijn; het onzichtbare klikvlak eromheen telt.
- Draden en lijnen die je aanklikt zijn minstens **28 schermpixels** breed. Breder gaat niet, want dan overlappen naastliggende draden.
- Wat je verwijdert of kiest, kan ook zonder toetsenbord: een knop bij de selectie (digibord).
- Systeembord voldoet hieraan (`MIN_RAAK` in `systeembord/src/bord/ModuleSvg.tsx`). CircuitFlow, CircuitSketch en Videometen nog niet helemaal; zie `IDEEEN.md`.

## Didactische ontwerpprincipes

Deze afspraken komen uit Voorvoegsels, Formules omschrijven, Bewegingsgrafieken en Systeembord, en gelden voor elke nieuwe oefentool.

- **Hufterproof.** Zonder instructie meteen duidelijk hoe het werkt: voorbeeldvragen op keuzekaarten, placeholders in invoervelden. De tool begeleidt zelf; een werkblad hoeft de bediening niet uit te leggen.
- **Twee sporen, één techniek.** Waar onderbouw en bovenbouw allebei met de tool werken, krijgt elk spoor een eigen taal, eigen levels en een eigen uitleg (onderbouw in woorden, bovenbouw met symbolen), op dezelfde code eronder. Leer de onderbouw niets aan wat de bovenbouw weer moet afleren.
- **Foutdiagnose uit denkfouten.** Feedback zegt zo concreet mogelijk wat er misgaat. Foute antwoordopties in meerkeuze komen uit echte denkfouten (vorm overgenomen uit het andere diagram, richting verwisseld, stap gemist), niet uit willekeurige waarden.
- **Rood betekent fout.** Gebruik rood alleen voor fout; markeren of uitlichten doe je met amber (`#D4923A`).
- **Past zonder scrollen.** Het oefenscherm past op een Chromebook (ongeveer 1366 × 650) zonder te scrollen; test ook op 1920 × 1080.

## Invoer van leerlingen (Chromebooks)

De leerlingen werken op **Chromebooks**. Daar maakt het toetsenbord van een dakje gevolgd door een cijfer één superscriptteken: wie `v^2` typt houdt `v²` over, en `5*10^3` wordt `5*10³`. Een parser die alleen `^` kent, keurt daardoor een goed antwoord af. Dat is geen randgeval maar de normale situatie in de les.

Elke tool met een invoerveld normaliseert de invoer daarom vóór het parsen:

- **Superscripttekens** `⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻` terug naar gewone tekens. In `formules-omschrijven` wordt dat `^(...)`, omdat die vorm ook bij negatieve exponenten door de rest van de parser komt.
- **Het echte minteken** `−` (U+2212) en gedachtestreepjes naar het gewone koppelteken. Tools tonen zelf een echt minteken, dus dat moet ook terug ingetypt kunnen worden.
- **Spaties** als duizendtalscheiding negeren, zodat `5 000` werkt.
- **Een kale tienmacht** zoals `10³` accepteren als `1·10³`.

Vaste testreeks bij een nieuwe invoerparser: `5000`, `5e3`, `5*10^3`, `5·10³`, `4,5·10⁻³` en `10³`. In `formules-omschrijven` staan hier zeven tests voor (`npm run test:formules`).

## Contactformulier (Netlify Forms)

Het contactformulier op `/contact/index.html` maakt gebruik van **Netlify Forms**.

### Hoe het werkt

- Het `<form>`-element heeft de attributen `netlify` en `name="contact"`. Netlify detecteert dit automatisch bij de eerste deploy en registreert het formulier.
- Inzendingen zijn zichtbaar in het **Netlify-dashboard** onder **Forms** (selecteer het project → Forms → contact).
- Het formulier bevat een verborgen honeypot-veld (`bot-field`) om spam te filteren.
- Na verzenden toont de pagina een bedankboodschap op dezelfde plek — er is geen redirect.

### E-mailmeldingen instellen

1. Ga naar het Netlify-dashboard → **Site settings** → **Forms**.
2. Klik op **Email notifications** (of **Form notifications**).
3. Voeg een e-mailadres toe om meldingen te ontvangen bij elke nieuwe inzending.

### Lokaal testen

Netlify Forms werkt alleen op de gedeployde site (niet op localhost). `netlify dev` werkt in deze monorepo niet, dus het formulier test je na de deploy op de echte site.

## Paginapresentatie

**Regels** (gelden voor elke nieuwe tool, tenzij expliciet anders besloten):

- Keuzepagina's (waar de gebruiker eerst een modus kiest) mogen een hero-sectie hebben met titel en subtitel.
- Een gekleurd woorddeel in een titel (zoals *bord* in Systeem**bord**) is effen cyaan (`var(--accent)`), net als *Hub* in het logo. Geen kleurverloop in tekst (besloten 2026-10-14).
- Tool-pagina's starten direct met de tool, zonder hero. Ze tonen wel een gecentreerde toolnaam (`.tool-name`) direct onder de header als ankerpunt — zonder badge of decoratie.
- Badges die de paginanaam herhalen worden nooit gebruikt — de breadcrumb volstaat.

**Definitieve namen per pagina** (bijwerken wanneer een tool wordt toegevoegd):

| Pagina | Toolnaam |
|---|---|
| `/overhoor/` | Overhoor |
| `/modelleren/` | Modelleren |
| `/formules-omschrijven/` | Kies een oefenmodus *(keuzepagina, hero)* |
| `/formules-omschrijven/uitleg/` | Leren omschrijven |
| `/formules-omschrijven/oefenen/` | Oefenen |
| `/formules-omschrijven/examenformules/` | Examenformules |
| `/formules-omschrijven/examenformules/overzicht/` | Formuleoverzicht |
| `/significantie/` | Significantie |
| `/significantie/uitleg/` | Significantie |
| `/voorvoegsels/` | Machten van 10 en voorvoegsels *(keuzepagina, hero)* |
| `/voorvoegsels/uitleg/` | Machten van 10 en voorvoegsels |
| `/voorvoegsels/oefenen/` | Oefenen |
| `/bewegingsgrafieken/` | Bewegingsgrafieken *(keuzepagina, hero)* |
| `/bewegingsgrafieken/uitleg/` | Bewegingsgrafieken |
| `/bewegingsgrafieken/oefenen/` | Oefenen |
| `/em-spectrum/` | Elektromagnetisch spectrum *(schermvullend; op een laag scherm valt de toolnaam weg, hij staat dan in de kruimel)* |
| `/em-spectrum/over/` | Elektromagnetisch spectrum *(infopagina)* |
| `/circuitsketch/` | CircuitSketch |
| `/circuitsketch/over/` | CircuitSketch *(infopagina)* |
| `/circuitflow/` | CircuitFlow |
| `/circuitflow/over/` | CircuitFlow *(infopagina)* |
| `/videometen/` | Videometen |
| `/videometen/over/` | Videometen *(infopagina)* |
| `/systeembord/` | Systeembord *(in de header, met de werkbalk ernaast)* |
| `/systeembord/over/` | Systeembord *(infopagina)* |
| `/contact/` | Contact & Feedback |

## Header stijl

Alle statische HTML-pagina's gebruiken een sticky header met `backdrop-filter: blur(12px)`:

- **Lichte modus:** `background: rgba(255,255,255,0.6)`
- **Donkere modus:** `background: rgba(15,17,23,0.6)` via `[data-theme="dark"] .app-header`

Header-elementen (knoppen, breadcrumb, help-icoon, thema-toggle) blijven per pagina visueel consistent. Nieuwe tools nemen deze stijl over zodat de hub als geheel uniform aanvoelt — pas afwijken wanneer er een goede reden is.

Vite-/React-gebaseerde tools (zoals CircuitSketch) hebben een eigen header-implementatie. Streef ernaar die zo dicht mogelijk bij dezelfde visuele stijl te houden (kleuren, blur, hoogte, gedrag), zodat de overgang tussen hub en tool naadloos blijft.

## Thema

Alle pagina's ondersteunen licht en donker thema via `localStorage` (`nh-theme`). De themavoorkeur wordt geladen via een inline script vóór de body-render om een FOUC te voorkomen. De toggle-knop staat rechtsbovenaan in de header.

## Deployment

De site wordt als statische HTML geserved via Netlify. Statische tools worden rechtstreeks gekopieerd; tools met een eigen build (zoals CircuitSketch) worden eerst gebouwd en daarna in `dist/<toolnaam>/` geplaatst.

**`build.sh` is de bron van waarheid voor wat er gedeployed wordt.** Bij elke nieuwe tool moet daar een regel worden toegevoegd — vergeet je dat, dan komt de tool niet op de productie-site terecht.

De hoofd-`netlify.toml` regelt redirects en headers voor de hele site; pas die aan wanneer een nieuwe tool eigen routes of headers nodig heeft.

Automatisch deployen na een push staat uit: na een push start Jop zelf de deploy in Netlify.

### Pakketten en lockfile

Netlify bouwt op Linux; er wordt lokaal op Windows gewerkt. Een gewone `npm install` op Windows kan de pakketten voor andere systemen uit `package-lock.json` halen (npm-bug 4828). Lokaal werkt alles dan nog, maar op Netlify faalt de build met `Cannot find module @rollup/rollup-linux-x64-gnu` (gebeurd op 2026-10-14).

- Na een nieuwe workspace of een nieuw pakket: werk de lockfile bij vanuit de vorige versie met `npm install --package-lock-only --ignore-scripts`.
- Controleer voor de commit dat er nog ongeveer 25 regels met `node_modules/@rollup/rollup-` in `package-lock.json` staan (ook `@esbuild/`, `lightningcss-` en `@tailwindcss/oxide-` hebben elk meerdere platforms).
- Is het toch misgegaan: zet de lockfile van de vorige commit terug en voer daarop de opdracht hierboven uit.

### Lokaal testen

`netlify dev` werkt niet in deze monorepo. Test zo:

1. `bash build.sh` bouwt alles naar `dist/`, precies zoals Netlify.
2. `npx serve dist -l 8888` serveert de gebouwde site op http://localhost:8888 (in Claude Code: de configuratie *dist* in `.claude/launch.json`).

Tijdens het bouwen aan één Vite-tool is de ontwikkelserver van die workspace handiger (bijvoorbeeld `npm run dev` in `systeembord/`, poort 5178). Plaatjes en het logo uit `assets/` ontbreken daar; die zie je alleen op de gebouwde site.
