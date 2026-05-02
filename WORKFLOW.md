\# NatuurkundeHub — Workflow \& Projectstructuur



\## Repositories



| Repo | Lokaal | GitHub |

|------|--------|--------|

| Website | `C:\\Users\\jopva\\Documents\\GitHub\\natuurkundehub` | `vanderkooij/natuurkundehub` |

| CircuitSketch (broncode) | `C:\\Users\\jopva\\Documents\\GitHub\\circuitsketch` | `vanderkooij/sketch-circuit-draw` |



\## Mapstructuur natuurkundehub



natuurkundehub/

index.html              ← homepage

overhoor/

index.html            ← overhoor app

data/

grootheden.js       ← groothedendata, gegenereerd via admin

admin/

index.html          ← admin pagina (wachtwoord beveiligd)

circuitsketch/          ← gebouwde output van de circuit app

assets/

logo/                 ← vier SVG logo varianten

colors.css            ← kleurenpalet

build.sh                ← Netlify build script

netlify.toml            ← Netlify configuratie

IDEEEN.md               ← ideeën voor nieuwe apps



\## Kleurenpalet



| Variabele | Kleurcode | Gebruik |

|-----------|-----------|---------|

| Bijna-zwart | `#1A1A2E` | Tekst, JK-letter light variant |

| Cyaan | `#0BB5C8` | Primair accent, golf in logo |

| Amber | `#D4923A` | Secundair accent, pijl in logo |

| Achtergrond licht | `#f8f9fa` | Lichte modus |

| Achtergrond donker | `#0f1117` | Donkere modus |



\## Logo varianten



| Bestand | Gebruik |

|---------|---------|

| `JK\_light.svg` | Navbar op lichte achtergrond |

| `JK\_dark.svg` | Navbar op donkere achtergrond |

| `JK\_black.svg` | Footer op lichte achtergrond |

| `JK\_white.svg` | Footer op donkere achtergrond |



\## Grootheden aanpassen (overhoor)



1\. Ga naar `natuurkundehub.nl/overhoor/admin/`

2\. Voer wachtwoord in

3\. Pas grootheden aan

4\. Klik "Download grootheden.js"

5\. Zet bestand in `overhoor/data/grootheden.js`

6\. Commit en push naar natuurkundehub



\## CircuitSketch aanpassen



1\. Werk in `C:\\Users\\jopva\\Documents\\GitHub\\circuitsketch`

2\. Test lokaal

3\. Push naar `vanderkooij/sketch-circuit-draw`

4\. Kopieer gebouwde output naar `natuurkundehub\\circuitsketch\\`

5\. Commit en push naar natuurkundehub

6\. Netlify deployt automatisch



\## Deployen



cd C:\\Users\\jopva\\Documents\\GitHub\\natuurkundehub

git add .

git commit -m "Omschrijving van wijziging"

git push



Netlify pikt de push automatisch op en deployt naar natuurkundehub.nl.



Daarna committen en pushen.



\## Naamgeving in de header



De header van elke subpagina toont een breadcrumb: **NatuurkundeHub › Paginanaam**.



| Pagina | Header tekst |

|--------|-------------|

| Homepage | NatuurkundeHub (alleen logo-tekst) |

| Overhoor | NatuurkundeHub › Overhoor |

| Modelleren | NatuurkundeHub › Modelleren |

| CircuitSketch | NatuurkundeHub › CircuitSketch |



"NatuurkundeHub" is een klikbare link naar `/`. De `›` separator en de paginanaam staan in `--text-muted` kleur, iets kleiner lettertype (15px, font-weight 600).

De stijl gebruikt de bestaande `.app-title` CSS-klasse voor de NatuurkundeHub-link.

