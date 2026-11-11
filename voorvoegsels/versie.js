// Versienummer van voorvoegsels. Alleen hier aanpassen: ophogen bij elke update
// (bugfix 1.0.1, nieuwe functie 1.1.0, zie WORKFLOW.md > Versienummers).
// Zet het nummer in elk element met data-versie, bv. in de footer.
(function () {
  var VERSIE = "1.0.0";
  function zet() {
    var els = document.querySelectorAll("[data-versie]");
    for (var i = 0; i < els.length; i++) els[i].textContent = " · versie " + VERSIE;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", zet);
  else zet();
})();
