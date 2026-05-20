Idee: slimmere hints in formules omschrijven
Status: gepland, nog niet geïmplementeerd
Abstract oefenen:
De hintForExercise(ex) functie in abstract/index.html geeft nu een generieke tekst per level. Verbeteren door de formulestructuur te analyseren en een gerichte hint te geven:

Staat de doelgrootheid in een teller? → "De grootheid staat in de teller. Werk de breuk weg door beide kanten te vermenigvuldigen met de noemer."
Staat de doelgrootheid in een noemer? → "De grootheid staat in de noemer. Werk de breuk weg en breng de grootheid daarna naar boven."
Staat er een kwadraat bij de doelgrootheid? → "Er staat een kwadraat. Neem aan het einde de wortel van beide kanten."
Staat er een wortel? → "Er staat een wortel. Verwijder die door beide kanten te kwadrateren."

Tabel35:
Voeg een hint-veld toe aan elke formule in formulas.js. De hint beschrijft de eerste stap voor die specifieke omschrijving, bijv. voor E_k = ½mv² naar v: "Deel beide kanten door ½m, dan neem je de wortel."
Implementatie: beide aanpassingen zitten uitsluitend in de HTML-bestanden en formulas.js — geen wijzigingen in verify.js nodig.