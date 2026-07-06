Idee: slimmere hints in formules omschrijven
Status: geïmplementeerd voor Oefenen (juli 2026), nog open voor Examenformules

Oefenen (letterformules):
✅ Klaar — elke generator in oefenen/index.html levert per opgave een structurele hint
mee (teller/noemer/kwadraat/wortel/term), die na de tweede foute poging verschijnt.

Examenformules:
Nog te doen: voeg een hint-veld toe aan elke formule in formulas.js. De hint beschrijft
de eerste stap voor die specifieke omschrijving, bijv. voor E_k = ½mv² naar v:
"Deel beide kanten door ½m, dan neem je de wortel." Tot die tijd toont de pagina een
generieke tip. Implementatie zit uitsluitend in examenformules/index.html en
formulas.js — geen wijzigingen in verify.js nodig.

Ander idee (nog open): stapsgewijze uitwerkingen i.p.v. alleen het eindantwoord,
in het stappenformat van de uitlegpagina (makeStepRow).
