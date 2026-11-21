// Menu rechtsboven in de header. Gedeeld door de statische tools (opmaak: toolmenu.css).
//
// Opbouw in de HTML:
//   <div class="toolmenu">
//     <button class="toolmenu-knop" type="button" aria-expanded="false" aria-controls="toolmenu" aria-label="Menu">…</button>
//     <div class="toolmenu-lijst" id="toolmenu" role="menu" hidden>
//       <button class="toolmenu-item" role="menuitem" type="button" data-actie="uitleg">Uitleg</button>
//       <a class="toolmenu-item" role="menuitem" href="#over">Over deze tool</a>
//       <div class="toolmenu-scheid"></div>
//       <div class="toolmenu-maker">Gemaakt door <b>Naam</b></div>
//     </div>
//   </div>
//
// Een knop met data-actie="x" stuurt het event "toolmenu:x" naar document; de tool vangt dat op.
// Het menu gaat dicht na een keuze, bij Escape en bij een klik ernaast.
(function () {
  function init(menu) {
    var knop = menu.querySelector(".toolmenu-knop");
    var lijst = menu.querySelector(".toolmenu-lijst");
    if (!knop || !lijst) return;

    function open() {
      lijst.hidden = false;
      knop.setAttribute("aria-expanded", "true");
      var eerste = lijst.querySelector(".toolmenu-item");
      if (eerste) eerste.focus();
    }
    function dicht(focusTerug) {
      if (lijst.hidden) return;
      lijst.hidden = true;
      knop.setAttribute("aria-expanded", "false");
      if (focusTerug) knop.focus();
    }

    knop.addEventListener("click", function () {
      if (lijst.hidden) open(); else dicht(false);
    });
    lijst.addEventListener("click", function (e) {
      var item = e.target.closest(".toolmenu-item");
      if (!item) return;
      var actie = item.getAttribute("data-actie");
      dicht(false);
      if (actie) document.dispatchEvent(new CustomEvent("toolmenu:" + actie));
    });
    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target)) dicht(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") dicht(true);
      if (lijst.hidden) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        var items = Array.prototype.slice.call(lijst.querySelectorAll(".toolmenu-item"));
        var i = items.indexOf(document.activeElement);
        var n = e.key === "ArrowDown" ? i + 1 : i - 1;
        items[(n + items.length) % items.length].focus();
        e.preventDefault();
      }
    });
  }
  function start() {
    var menus = document.querySelectorAll(".toolmenu");
    for (var i = 0; i < menus.length; i++) init(menus[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
