      function tzDockDockSettings(pdk, box) {
        box.appendChild(tzEl("h4", null, i18nT('zonesPage.map_settings')));
        pdk.layers.paintView();
        box.appendChild(pdk.layers.viewBox());
        var sb = tzDockDSec(pdk, box, i18nT('zonesPage.names_on_the_buttons'));
        var rb = tzDockDRow(pdk, sb);
        [["auto", i18nT('cuts.automatic')], ["si", i18nT('zonesPage.always')], ["no", i18nT('zonesPage.icons_only')]].forEach(function (o) {
          rb.appendChild(tzBtn(o[1], pdk.dockNamesMode === o[0] ? "tzm-chip on" : "tzm-chip", function () {
            pdk.dockNamesMode = o[0];
            try {
              localStorage.setItem(pdk.TZ_NAMES_KEY, o[0]);
            } catch (e) {
              /* no critico */
            }
            tzDockDockNames(pdk, true);
            tzDockDockPopPaint(pdk);
          }));
        });
        sb.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.automatic_if_the_bar_doesn_t')));
        box.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.only_on_this_screen_what_shows')));
      }

      // Bar state: active zone on the button, magnet, Editor undo
      function tzDockDockPaint(pdk) {
        var wn = pdk.data.st() ? pdk.data.st().wn : 0;
        var cap = pdk.zoneBtn.querySelector(".tzm-cap");
        if (cap) cap.textContent = TZ_CODES[wn];
        pdk.magnetBtn.classList.toggle("primary", !!pdk.layerState.layers().refs);
        var hist = pdk.nav.layout() === "cuts" && pdk.nav.module("cuts") && pdk.nav.module("cuts").history ? pdk.nav.module("cuts").history() : null;
        pdk.undoPair.style.display = hist ? "" : "none";
        if (hist) {
          pdk.undoBtn.disabled = !hist.u;
          pdk.redoBtn.disabled = !hist.r;
        }
        // Layers always floats over the map and closes by itself when tapping outside (2026-10-11:
        // "the bar that appears when layers is opened does not collapse by itself"); before it was
        // a fixed column when there was room.
        var col = false;
        tzDockDockNames(pdk);
        if (col !== pdk.view.layersCol()) {
          pdk.view.setLayersColumn(col);
          pdk.shell.mapCard().classList.toggle("tzm-capcol", col);
          pdk.view.paintLayersOpen();
          if (pdk.data.st()) setTimeout(function () { if (pdk.shell.alive() && pdk.data.st()) pdk.shell.renderMap(); }, 0);
        }
        // the layers column as tall as the map
        if (pdk.view.layersCol() && pdk.view.layersOpen()) {
          var sh = pdk.shell.svg().getBoundingClientRect().height;
          if (sh > 50) pdk.shell.layerPanel().style.height = Math.round(sh) + "px";
        } else pdk.shell.layerPanel().style.height = "";
      }

