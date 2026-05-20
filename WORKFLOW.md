# NatuurkundeHub — Workflow & Structuur

## Mapstructuur

Elke tool krijgt een eigen map onder de root. Voor statische HTML-tools volstaat een `index.html` (eventueel met submappen voor modi of admin-interfaces). Tools met een eigen build (zoals CircuitSketch) hebben hun eigen project-structuur in de map; alleen de gebouwde output wordt door `build.sh` naar `dist/` gekopieerd.

Huidige situatie:

```
natuurkundehub/
├── index.html                        # Homepage
├── 404.html                          # Fallback-pagina
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
├── circuitsketch/                    # Eigen Vite/React-project — alleen circuitsketch/dist/ wordt gedeployed
├── formules-omschrijven/
│   ├── index.html                    # Keuzemenu
│   ├── uitleg/index.html             # Uitlegmodus
│   ├── abstract/index.html           # Abstracte formules
│   └── tabel35/index.html            # Tabel 35-formules
├── modelleren/
│   └── index.html                    # Numerieke modelleeromgeving
├── significantie/
│   └── index.html                    # Significante cijfers oefenen
├── dist/                             # Gebouwde versies (automatisch, niet handmatig bewerken)
├── build.sh                          # Build-script — bron van waarheid voor wat er gedeployed wordt
└── workflow.md                       # Dit bestand
```

### Nieuwe tool toevoegen

1. Maak een map met de tool-naam (kebab-case) onder de root.
2. Bouw de tool volgens de geldende conventies (header, thema, paginapresentatie, ontwerpprincipes — zie hieronder).
3. Voeg een tegel toe in `index.html` (de homepage).
4. Voeg een `cp -r <toolnaam> dist/<toolnaam>` regel toe in `build.sh` (of een eigen build-stap bij een Vite-project).
5. Werk dit bestand bij: tool in de mapstructuur, naam in de tabel onder Paginapresentatie, en eventueel de status in `ideeen.md`.

## Ontwerpprincipes

Bij het ontwikkelen van nieuwe tools wordt — waar dat redelijk haalbaar is — rekening gehouden met toekomstbestendigheid in relatie tot meerdere tools. Concreet betekent dat:

- **Hergebruik boven eenmalig.** Visuele elementen, componenten, patronen en oplossingen die in meerdere tools voorkomen (theme-toggle, header, sliders, grafiek-componenten, sim-controls, animatie-loop) worden zo opgezet dat ze deelbaar zijn — al is het in eerste instantie via copy-paste-templates, met als doel ze later naar een gedeelde bibliotheek te verhuizen.
- **Consistentie boven creativiteit per tool.** Gebruikers (leerlingen) moeten in elke tool dezelfde interactiepatronen herkennen. Een slider werkt overal hetzelfde; play/pause-knoppen zien er overal hetzelfde uit.
- **Stack-keuze volgt de tool.** Eenvoudige oefen-tools blijven single-file HTML. Tools met substantiële interactie of animatie (PhET-stijl simulaties, video-analyse) verdienen de Vite + React + TS-stack zoals CircuitSketch, zodat ze profiteren van een gedeelde componenten- en sim-bibliotheek.
- **Niet vooraf overdesignen.** De gedeelde bibliotheek groeit organisch: pas extraheren als iets voor de tweede of derde keer nodig is, niet vooraf bedenken wat ooit nuttig zou kunnen zijn.

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

Netlify Forms werkt alleen op de gedeployde site (niet localhost). Om het formulier lokaal te testen, gebruik je Netlify Dev (`netlify dev`).

## Paginapresentatie

**Regels** (gelden voor elke nieuwe tool, tenzij expliciet anders besloten):

- Keuzepagina's (waar de gebruiker eerst een modus kiest) mogen een hero-sectie hebben met titel en subtitel.
- Tool-pagina's starten direct met de tool, zonder hero. Ze tonen wel een gecentreerde toolnaam (`.tool-name`) direct onder de header als ankerpunt — zonder badge of decoratie.
- Badges die de paginanaam herhalen worden nooit gebruikt — de breadcrumb volstaat.

**Definitieve namen per pagina** (bijwerken wanneer een tool wordt toegevoegd):

| Pagina | Toolnaam |
|---|---|
| `/overhoor/` | Overhoor |
| `/modelleren/` | Modelleren |
| `/formules-omschrijven/` | Kies een oefenmodus *(keuzepagina, hero)* |
| `/formules-omschrijven/uitleg/` | Leren omschrijven |
| `/formules-omschrijven/abstract/` | Oefenmodus |
| `/formules-omschrijven/tabel35/` | Natuurkunde formules |
| `/significantie/` | Significantie |
| `/circuitsketch/` | CircuitSketch |
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

### Lokaal testen

Gebruik `netlify dev` — dit spiegelt de productie-omgeving exact, inclusief de redirect-regels in `netlify.toml`. Alternatief: `npx serve dist` (serveert vanuit de gebouwde `dist/` map).
