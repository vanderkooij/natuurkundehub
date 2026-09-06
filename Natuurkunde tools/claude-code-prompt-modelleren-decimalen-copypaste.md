# Opdracht voor Claude Code — Modelleren: decimaalteken + startwaarden copy/paste

Bestand: `modelleren/index.html` (single-file tool, vanilla JS).

## Fix 1 — Komma én punt accepteren als decimaalteken

Op dit moment geeft een komma in een getal stille, foute resultaten (geen foutmelding):
- `parseFloat("9,8")` → `9` (stopt bij de komma).
- In `parseExpr()` wordt de expressie na variabele-substitutie door `eval()` gehaald. `eval("9,8")` levert via de JS-komma-operator stilletjes `8` op.

Voeg een helper toe, bijvoorbeeld vlak boven `parseExpr`:

```js
function toDecimalPoint(s){
  return String(s).replace(/(\d),(\d)/g,'$1.$2');
}
```

(Bewust een gerichte regex die alleen cijfer-komma-cijfer omzet, zodat het geen toekomstige meerargument-functies als `min(a,b)` in de weg zit.)

Pas toe op:
1. **Startwaarden** — in `runModel()`, regel met `const val=parseFloat(row.value);` → eerst `toDecimalPoint(row.value)` toepassen voordat `parseFloat` het verwerkt.
2. **Formules** — in `parseExpr(expr,vars)`, helemaal aan het begin (vóór de bestaande replace-regels) `e = toDecimalPoint(e);` toepassen op de input-expressie. Let op: dit mag niet de namen van variabelen breken die toevallig een komma naast een cijfer hebben staan — variabelenamen zijn hier altijd `\w+` (letters/cijfers/underscore), dus een komma kan daar nooit middenin zitten. Test specifiek met voorbeelden als `a = 9,8` en `Fw = k*v*v` met `k = 0,1`.
3. **Grafiek-as instellingen** (zoom/pan min-max velden) — de vier plekken met `parseFloat(yMin)`, `parseFloat(yMax)`, `parseFloat(xMin)`, `parseFloat(xMax)` (rond regel 813-821): ook hier `toDecimalPoint(...)` toepassen voor het parsen.

Niet aanpassen: de `parseInt(...)` aanroepen (max-iteraties, opgeslagen modellen) — die zijn altijd hele getallen, geen decimalen relevant.

Test na implementatie: voer een startwaarde in als `9,8` en als `9.8` — beide moeten identiek resultaat geven. Idem voor een formule met een letterlijk decimaalgetal met komma.

## Fix 2 — Startwaarden kopiëren/plakken

De startwaarden-tabel (`renderSvTable()`) rendert elke rij als losse `<input>`-velden in een `<tr>`. Daardoor werkt slepen-en-kopiëren over meerdere rijen niet (browsers kopiëren niet over losse inputs heen zoals bij een spreadsheet of textarea).

Behoud de huidige tabel-UI (met los naam/waarde/eenheid-veld) voor handmatige invoer — voeg er twee knoppen aan toe, bijvoorbeeld naast de tabel-titel "Startwaarden":

- **"📋 Kopieer"** — serialiseert `svRows` naar platte tekst, één regel per startwaarde in het formaat:
  ```
  naam = waarde eenheid
  ```
  (eenheid weglaten als leeg, bv. `t = 0 s` / `b = 0.8`). Schrijf dit naar het klembord met `navigator.clipboard.writeText(...)`. Toon een korte bevestiging (vergelijkbaar met bestaande status-meldingen in de tool).

- **"📥 Plak"** — leest het klembord met `navigator.clipboard.readText()`, parseert elke regel met een regex zoals `/^(\w+)\s*=\s*(-?[\d.,eE+-]+)\s*(.*)$/`, zet de geparste waarde door `toDecimalPoint()` (zie Fix 1) zodat komma-decimalen ook hier werken, en vervangt of vult `svRows` aan. Roep daarna `renderSvTable()` aan. Geef een foutmelding via de bestaande status-bar als een regel niet te parsen is, zonder de hele actie te laten mislukken (sla de regel over, meld hoeveel regels wel/niet zijn verwerkt).

Plaatsing en styling: gebruik dezelfde knop-stijl als de bestaande knoppen in de tool (bv. `del-btn` / andere bestaande button-classes) zodat het visueel consistent blijft met de rest van de pagina.

## Niet doen
- Geen wijzigingen aan de React-tool Videometen.
- Geen architecturale wijziging aan Modelleren (geen React-migratie) — dat is een apart, later traject.

## Na implementatie
- Lokaal testen met `npx serve .` vanuit de repo-root, navigeer naar `/modelleren/`.
- Kort verslag van wat er is aangepast (bestand/regelnummers) zodat het makkelijk te reviewen is voor handmatige deploy via Netlify.
