# CLAUDE.md — Samenwerkingsafspraken natuurkundehub

Dit bestand leggen de afspraken vast tussen Jop en Claude (Cowork + Claude Code) voor dit project. Claude Code leest dit automatisch als projectgeheugen; in Cowork kan Jop er expliciet naar verwijzen bij het starten van een nieuwe sessie.

## Twee omgevingen, twee rollen

- **Claude Code (terminal, lokaal)** — daadwerkelijk coderen: features bouwen, bugs fixen, testen, git add/commit/push. Dit is de plek waar code verandert.
- **Cowork (cloud, via chat)** — ideeën uitwerken en plannen: nieuwe tools bedenken, `ideeen.md` bijhouden/aanvullen, aanpak doordenken vóórdat er gebouwd wordt. Geen zware coding-sessies hier, tenzij Jop daar expliciet om vraagt.

Vuistregel: idee ontstaat en rijpt in Cowork → landt in `ideeen.md` → wordt gebouwd in Claude Code.

## Scope

- **Focus: natuurkundehub** (dit project) — de site met interactieve fysica-tools.
- `claude-code` (buurmap in dezelfde GitHub-map) is de upstream Anthropic-repo, geen eigen project van Jop — alleen relevant als referentie, niet actief onderhouden vanuit hier.
- `Backup/formules-omschrijven` is een oude back-up, niet leidend voor de huidige staat van de tool.

## Bronnen van waarheid

- **`workflow.md`** — mapstructuur, ontwerpprincipes, paginapresentatie, header/thema-stijl, deployment. Nieuwe tools volgen deze conventies.
- **`ideeen.md`** — backlog van nieuwe tools/ideeën met status (afgerond / te ontwikkelen). Nieuwe ideeën die in Cowork besproken worden, horen hier terecht te komen.

## Git & bestanden

- Cowork bewerkt bestanden rechtstreeks op schijf via de gekoppelde map (device bridge) — geen git-acties.
- Jop bekijkt wijzigingen in zijn eigen git-tool en commit/pusht zelf, of doet dit via Claude Code in de terminal (daar is dit al ingericht, zie `.claude/settings.local.json`).
