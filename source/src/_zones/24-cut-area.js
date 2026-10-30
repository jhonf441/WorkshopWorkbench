      // ---- Workbench page, part 2: the cut area card (read only) ----
      // Cut area (sys/workshop/zones/cutarea.g): this card SHOWS the area of each mode; measuring, drawing and saving it is done in the Machine
      // plugin (Work area section, machine.workarea.* of the service). The map, the correction and the limits of the machine read the same
      // file (23-zone-data-cut-area.js). The state pca is private to this file (docs-internal/INTERFACES.md).
      // deps: data (machine state, geometry). The card is rebuilt only when what it shows changes.

      function tzAreaCreate(deps) {
        var pca = { data: deps.data, nav: deps.nav, cutLastKey: "" };
        return {
          buildCard: function () { pca.cutCard = tzEl("div", "tz-card wf-card"); return pca.cutCard; },
          card: function () { return pca.cutCard; },
          renderCard: tzBind(tzAreaRenderCutCard, pca),
        };
      }

      // Opens the Work area section of the Machine plugin (same hand-off as the modes gate: stored section, then the route, then the event for
      // a page that is already open).
      function tzAreaOpenInMachine(pca) {
        try { localStorage.setItem("workshopMachineSection", "workarea"); } catch (e) { /* not critical */ }
        pca.nav.goPath("/Plugins/Machine");
        try { window.dispatchEvent(new CustomEvent("workshop-machine-goto", { detail: { section: "workarea" } })); } catch (e) { /* not critical */ }
      }

      function tzAreaRenderCutCard(pca) {
        if (!pca.data.st()) return;
        var g = pca.data.st().globals || {};
        var inMachine = workshopPathExists("/Plugins/Machine");
        var key = JSON.stringify([pca.data.st().mode, g.cutAreaLaser, g.cutAreaCNC, g.cutAreaFFF, inMachine]);
        if (key === pca.cutLastKey) return;
        pca.cutLastKey = key;
        pca.cutCard.innerHTML = "";
        var head = tzEl("div", "tz-row");
        head.style.alignItems = "center";
        var h = tzEl("h3", null, i18nT('zonesPage.area_title_cut'));
        h.style.margin = "0 auto 0 0";
        head.appendChild(h);
        head.appendChild(tzEl("span", "wf-state tz-badge tz-modebadge", i18nT('zonesPage.mode_2', { mode: pca.data.st().mode })));
        pca.cutCard.appendChild(head);
        pca.cutCard.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.the_part_of_the_bed_you')));

        var lim = pca.data.cutLimits();
        var modesThe = tzEl("div", "tz-cutmodes");
        TZ_WORK_MODES.forEach(function (m) {
          var a = g["cutArea" + m];
          var ok = Array.isArray(a) && a.length === 4;
          var active = m === pca.data.st().mode;
          var tile = tzEl("div", "tz-cutmode" + (active ? " on" : "") + (ok ? "" : " empty"));
          var titleThe = tzEl("div", "tz-cutmode-h");
          titleThe.appendChild(tzEl("b", null, m));
          titleThe.appendChild(tzEl("span", "wf-state tz-badge " + (ok ? "ok" : "warn"), ok ? (active ? i18nT('zonesPage.active') : i18nT('zonesPage.measured')) : i18nT('common.not_measured')));
          tile.appendChild(titleThe);
          if (lim && ok) {
            var bw = lim.xmax - lim.xmin, bh = lim.ymax - lim.ymin;
            if (bw > 0 && bh > 0) {
              var NS = "http://www.w3.org/2000/svg";
              var sv = document.createElementNS(NS, "svg");
              sv.setAttribute("viewBox", "0 0 " + bw + " " + bh);
              sv.setAttribute("class", "tz-cutmini");
              var bg = document.createElementNS(NS, "rect");
              bg.setAttribute("x", 0); bg.setAttribute("y", 0); bg.setAttribute("width", bw); bg.setAttribute("height", bh);
              bg.setAttribute("fill", "rgba(255,255,255,0.04)"); bg.setAttribute("stroke", "rgba(255,255,255,0.35)"); bg.setAttribute("stroke-width", bw / 120);
              sv.appendChild(bg);
              var ar = document.createElementNS(NS, "rect");
              ar.setAttribute("x", a[0] - lim.xmin); ar.setAttribute("y", lim.ymax - a[3]);
              ar.setAttribute("width", Math.max(0, a[1] - a[0])); ar.setAttribute("height", Math.max(0, a[3] - a[2]));
              ar.setAttribute("fill", active ? "rgba(255,138,101,0.35)" : "rgba(144,164,174,0.25)");
              ar.setAttribute("stroke", active ? "#ff8a65" : "#90a4ae"); ar.setAttribute("stroke-width", bw / 90);
              sv.appendChild(ar);
              tile.appendChild(sv);
            }
          }
          tile.appendChild(tzEl("div", "tz-cutmode-v", ok ? tzFmt(a[1] - a[0]) + " x " + tzFmt(a[3] - a[2]) + " mm" : "--"));
          tile.appendChild(tzEl("div", "tz-muted", ok ? "X " + tzFmt(a[0]) + " a " + tzFmt(a[1]) + " · Y " + tzFmt(a[2]) + " a " + tzFmt(a[3]) : active ? i18nT('zonesPage.measure_it_in_machine') : ""));
          modesThe.appendChild(tile);
        });
        pca.cutCard.appendChild(modesThe);
        var actions = tzEl("div", "tz-row");
        actions.style.marginTop = "6px";
        if (inMachine) {
          actions.appendChild(tzBtn(i18nT('zonesPage.edit_in_machine'), "primary", function () { tzAreaOpenInMachine(pca); }));
        } else {
          actions.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.edit_needs_machine')));
        }
        pca.cutCard.appendChild(actions);
      }
