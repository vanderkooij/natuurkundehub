# Grafieken-oefentool — Ontwikkelplan

## Doel

Een oefentool voor bewegingsleer (kinematica) met twee modi:

1. **Type beweging herkennen** — leerling ziet een x-t- of v-t-grafiek zonder getallen, met één segment gemarkeerd als aandachtsgebied, en kiest welk type beweging dat is (stilstand, constante snelheid, versnelling, vertraging).
2. **Grafieken koppelen** — leerling krijgt één grafiek (x-t, v-t of a-t) en kiest de bijbehorende andere twee.

Beide modi delen dezelfde grafiekmotor en instellingen (alleen x-t / alleen v-t / gemengd).

## Doelgroep

Voortgezet onderwijs, natuurkunde — bewegingsleer.

## Stack

Simpele oefen-tool → single-file HTML, zoals `significantie/` en `formules-omschrijven/` (per workflow.md: eenvoudige oefen-tools blijven single-file HTML, geen Vite/React nodig).

## Datamodel (concepten)

- **Segment**: `type` (stilstand · constante-snelheid · versnelling · vertraging), `duur`. Een segment wordt getekend als lijnstuk (recht of gekromd, afhankelijk van type en van of het een x-t- of v-t-grafiek is).
- **Grafiek**: lijst van één of meer segmenten na elkaar (bv. eerst horizontaal, dan licht hellend omhoog). Precies één segment is gemarkeerd als **interessant** (kan ook het enige segment zijn als de grafiek uit 1 stuk bestaat).
- **Grafiektype**: `x-t` of `v-t` — bepaalt hoe elk segment-type getekend wordt (bv. versnelling = oplopende rechte lijn op v-t, maar een kromme met toenemende helling op x-t).
- **Vraag (modus 1)**: grafiek + gemarkeerd segment + 4 antwoordopties (de 4 typen) + juist antwoord.
- **Vraag (modus 2)**: gegeven grafiek (x-t, v-t of a-t) + set kandidaat-grafieken voor de andere twee assen + juiste combinatie.

## Vormgeving

- **Geen getallen op de assen** — alleen een dunne neutrale as-lijn voor oriëntatie.
- **Geen vlakken/arcering** — het aandachtsgebied wordt uitsluitend gemarkeerd door de lijnkleur, nooit door het vlak eronder te vullen. Reden: bij een v-t-grafiek wordt een gevuld vlak al snel gelezen als "oppervlakte = afgelegde weg", en dat associatie willen we hier niet oproepen.
- **Rest van de grafiek**: neutrale grijze lijn, 2px (`var(--text-muted)`).
- **Interessante segment**: bestaande accentkleur van de hub, `var(--accent)` (teal), 3px, ronde uiteinden.
- Geen nieuwe kleuren nodig — hergebruik van de tokens uit `significantie/index.html` (`--accent`, `--accent-dim`, `--text-muted`, enz.) zodat de tool visueel bij de hub aansluit.
- Kleur is nooit het enige signaal: dikte + ronde eindpunten werken als secundaire aanwijzing (kleurenblind-vriendelijk).
- Geen losse legenda nodig — de vraagtekst wijst al aan wat het gemarkeerde deel is.

## Score

- **Nauwkeurigheid**: "X goed van Y gemaakt (Z%)" — hoofdscore.
- **Streak**: huidige reeks + beste reeks van de sessie.
- **Geen tijd/countdown** — bewust weggelaten, om te voorkomen dat leerlingen op snelheid i.p.v. op juistheid gaan werken.

## Testaanpak

Na elke fase hieronder: lokaal draaien (zoals de andere tools, via `netlify dev` op localhost:8080), Jop test in de browser en geeft feedback voordat de volgende fase start. Geen fase wordt gestart voordat de vorige is getest en akkoord bevonden.

---

## Fase 1 — Grafiekmotor & basisscherm

- [ ] Map `grafieken-oefentool/` aanmaken (kebab-case, per workflow.md)
- [ ] Segment-generator: willekeurige x-t-grafiek opbouwen uit 1+ segmenten (stilstand, constante snelheid, versnelling, vertraging)
- [ ] Rendering: lijn tekenen zonder as-getallen, één segment in accentkleur volgens Vormgeving hierboven
- [ ] Paginastructuur (header, thema-toggle, tool-naam) volgens de conventies in workflow.md

**Test:** grafieken bekijken op localhost:8080 — kloppen de vormen (stilstand/constante snelheid/versnelling/vertraging herkenbaar), ziet de markering er goed uit?

## Fase 2 — Quizflow & score

- [ ] Multiple-choice knoppen met de 4 typen beweging
- [ ] Feedback bij antwoord (goed/fout)
- [ ] "Volgende"-knop → nieuwe willekeurige grafiek/vraag
- [ ] Score: goed/totaal + percentage, huidige streak + beste streak (geen tijd)

**Test:** een aantal rondes zelf doorlopen — voelt de score goed (niet te straf bij een foutje), is de flow prettig?

## Fase 3 — v-t erbij + modus "gemengd"

- [ ] Segment-rendering uitbreiden voor v-t-grafieken (andere vormlogica per type dan bij x-t)
- [ ] Instelscherm: kies alleen x-t, alleen v-t, of gemengd
- [ ] Bij "gemengd": willekeurig wisselen tussen x-t en v-t per vraag

**Test:** zijn v-t-grafieken net zo duidelijk als x-t? Voelt de gemengde modus goed aan?

## Fase 4 — Modus "grafieken koppelen"

- [ ] Vraaggenerator voor modus 2: gegeven grafiek + kandidaat-opties voor de andere twee assen
- [ ] UI voor deze modus (multiple-choice selectie van de juiste combinatie)
- [ ] Keuzemenu op de startpagina uitbreiden: modus kiezen (type herkennen / grafieken koppelen) naast het x-t/v-t/gemengd-filter — vergelijkbaar met het keuzemenu van `formules-omschrijven/`

**Test:** losse doorloop van deze modus, feedback voordat fase 5 start.

## Fase 5 — Afwerking & opname in de hub

- [ ] Styling polijsten (licht + donker thema)
- [ ] Tegel toevoegen op de homepage (`index.html`)
- [ ] Regel toevoegen in `build.sh`
- [ ] Tabel in `workflow.md` (Paginapresentatie) bijwerken
- [ ] Status in `ideeen.md` bijwerken naar Afgerond

**Test:** eindcontrole op de hub zelf — tegel, navigatie, thema licht/donker.
