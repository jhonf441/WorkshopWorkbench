      // Full screen shows only the map and the panel of one section: the bar of sections stays outside. This picker (a chip at the top
      // left of the map, visible only in full screen) changes section without leaving it. It lists the tabs the bar shows now.
      function tzFsSectionSync(pz, lay) {
        var ws = pz.shell && pz.shell.ws && pz.shell.ws();
        if (!ws) return;
        if (!pz.fsSection) {
          pz.fsSection = tzEl("label", "tz-fsnav");
          pz.fsSection.appendChild(tzEl("span", "tz-fsnav-lbl", i18nT('zonesPage.fs_section_label')));
          pz.fsSectionSel = document.createElement("select");
          pz.fsSectionSel.className = "tz-input";
          pz.fsSectionSel.setAttribute("aria-label", i18nT('zonesPage.fs_section_label'));
          pz.fsSectionSel.addEventListener("change", function () {
            var b = pz.layoutButtons[pz.fsSectionSel.value];
            if (b) b.click(); // the same path as the bar: remembers the tab, applies it, folds the bar if it is not pinned
          });
          pz.fsSection.appendChild(pz.fsSectionSel);
        }
        if (pz.fsSection.parentNode !== ws) ws.appendChild(pz.fsSection);
        var sel = pz.fsSectionSel;
        var keys = Object.keys(pz.layoutButtons).filter(function (k) { return pz.layoutButtons[k].style.display !== "none" && !pz.layoutButtons[k].hidden; });
        var sig = keys.join(",");
        if (sel.getAttribute("data-sig") !== sig) {
          sel.innerHTML = "";
          keys.forEach(function (k) {
            var o = document.createElement("option");
            o.value = k;
            o.textContent = pz.TZ_TABS[k] ? pz.TZ_TABS[k][1] : k;
            sel.appendChild(o);
          });
          sel.setAttribute("data-sig", sig);
        }
        sel.value = lay;
      }

      function tzApplyLayout(pz) {
        // in a mode another plugin serves no card of a tab is shown, only the card that sends there (30-zones-page-other-mode.js)
        var lay = tzOtherModePaint(pz) ? "" : pz.nav.layout();
        var c = lay === "cuts";
        var ce = lay === "center";
        var tr = lay === "job";
        var mt = lay === "materials";
        var pr = lay === "prepare";
        var gr = lay === "large";
        var ar = lay === "area"; // cut area of each mode
        var z = lay === "zones";
        Object.keys(pz.extraCards).forEach(function (k) { pz.extraCards[k].style.display = lay === k ? "" : "none"; }); // HOOK etapa 6/7
        Object.keys(pz.extraBars).forEach(function (k) { pz.extraBars[k].style.display = lay === k ? "" : "none"; }); // the bar above the card of a tool
        pz.materialsCard.style.display = mt ? "" : "none";
        pz.largeCard.style.display = gr ? "" : "none";
        pz.prepareCard.style.display = pr ? "" : "none";
        // Zones: one card at a time, chosen in the inner tabs (zSub)
        if (z && pz.nav.zSub() === "editor" && pz.nav.selected() === null) pz.nav.setZSub("active");
        pz.table.editorCard().style.display = z && pz.nav.zSub() === "editor" ? "" : "none";
        pz.activeCard.style.display = z && pz.nav.zSub() === "active" ? "" : "none";
        if (pz.zSubBar) {
          pz.zSubBar.style.display = z ? "" : "none";
          if (z) tzPaintZSub(pz);
          tzPaintHelp(pz);
        }
        pz.sideCol.style.display = z ? "flex" : "none";
        pz.tableCard.style.display = z && pz.nav.zSub() === "zones" ? "" : "none";
        pz.table.positionsCard().style.display = z && pz.nav.zSub() === "positions" ? "" : "none";
        pz.cutArea.card().style.display = ar ? "" : "none"; // the cut area goes in 2D Work
        pz.cutsCard.style.display = c ? "" : "none";
        pz.centerCard.style.display = ce ? "" : "none";
        pz.jobCard.style.display = tr ? "" : "none";
        pz.readyCard.style.display = tr ? "" : "none";
        pz.tvCard.style.display = lay === "simulate" ? "" : "none";
        if (lay === "simulate") pz.nav.module("tvista").enable();
        Object.keys(pz.layoutButtons).forEach(function (k) {
          pz.layoutButtons[k].classList.toggle("on", k === lay);
        });
        tzFsSectionSync(pz, lay);
        if (pz.nav.layout() !== "zones" && pz.tools.posPick() !== null) pz.tools.closePosPop();
        pz.nav.module("cuts").floating(c); // the drawing tools over the map exist only in the laser editor tab
        if (c || ce) pz.nav.module("cuts").setView(pz.nav.layout());
        pz.nav.module("prepare").startupRefresh();
        if (pz.data.st()) {
          if (c || ce) pz.nav.module("cuts").render();
          if (tr) { pz.nav.module("ready").render(); pz.nav.module("job").render(); }
          if (z) pz.nav.module("active").render(); // when returning to Zones (without waiting for the state to change)
          if (mt) pz.materials.render();
          if (pr) pz.nav.module("prepare").render();
          if (gr) pz.nav.module("large").render();
          if (pz.extraApi[lay] && pz.extraApi[lay].render) pz.extraApi[lay].render(); // HOOK etapa 6/7
          pz.shell.renderMap();
        }
        if (pz.extraActive !== pz.nav.layout()) {
          pz.extraActive = pz.nav.layout();
          if (pz.extraApi[pz.extraActive] && pz.extraApi[pz.extraActive].enable) pz.extraApi[pz.extraActive].enable(); // HOOK etapa 6/7: the tool was just opened
        }
        pz.space.paint(); // step bar, status bar and inspector header (33-space.js)
      }

      function tzPagApplyLayout(pz, root, opts) {
        // ---- Map in the center (redesign 2026-10-09) ----
        // "The graphic is in all the sections: I want it to revolve around
        // that". The map stays fixed (sticky) and the cards of the active tab
        // go to the side (wide screen) or below, passing under the
        // map when scrolling down (narrow screen: phone, vertical kiosk). The
        // cards do not change: they just move place. Previous version: tag
        // WorkshopJog-zonas-clasico (1.56.4).
        pz.shell.buildWorkspace(pz.topRow);
        pz.wsMap = pz.shell.wsMap();
        pz.wsSide = pz.shell.wsSide(); // the side panel is the inspector: the card of the open tool
        pz.activeCard.style.flex = "none";
        pz.activeCard.style.minWidth = "0";
        [pz.prepareCard, pz.largeCard, pz.materialsCard, pz.readyCard, pz.jobCard, pz.tvCard, pz.centerCard, pz.cutsCard, pz.activeCard, pz.table.editorCard(), pz.cutArea.card(), pz.table.positionsCard(), pz.tableCard].forEach(function (c) {
          pz.wsSide.appendChild(c);
        });
        Object.keys(pz.extraCards).forEach(function (k) { // HOOK etapa 6/7
          // the bar of a tool (e.g. the Mesh steps) goes right above its card, at the side and not over the map (request 2026-10-09)
          if (pz.extraBars[k]) pz.wsSide.appendChild(pz.extraBars[k]);
          pz.wsSide.appendChild(pz.extraCards[k]);
        });
      }

      function tzPagPanelZones(pz, root, opts) {
        // Panel of the Zones section (redesign 2026-10-10, "I do not know how to handle what is after
        // the graphic"): instead of four long cards one
        // below the other, inner tabs and a single card at a time. "Edit"
        // appears only while a zone is being edited and opens by itself.
        pz.zSubBar = tzEl("div", "wf-tabs tz-tabs sub");
        pz.zSubBar.style.marginTop = "0";
        pz.wsSide.insertBefore(pz.zSubBar, pz.wsSide.firstChild);
        pz.wsSide.insertBefore(pz.helpBox, pz.wsSide.firstChild);
        pz.wsSide.insertBefore(pz.space.createInspector(), pz.wsSide.firstChild); // inspector header (33-space.js)
        pz.applyLayout();
        pz.topRow.style.display = "none";
        pz.view.mountMapSize(pz.viewGrp);
        if (window.ResizeObserver) {
          var wsRo = new ResizeObserver(function () { if (pz.shell.alive()) pz.wsLayout(); });
          wsRo.observe(pz.page);
          pz.timers.push(setInterval(function () { if (!pz.shell.alive()) wsRo.disconnect(); }, 2000));
        }
        window.addEventListener("resize", function () { if (pz.shell.alive()) pz.wsTop(); });
        pz.wsLayout();
        pz.applyLayout();
        // Floating tooltip with the BED coordinate under the cursor (mouse),
        // and if it falls inside the active mode's area, the distance to its edges.
        pz.shell.buildTip();
      }

      function tzWsLayout(pz) {
        pz.view.setNarrow(pz.page.clientWidth < 760);
        pz.wsTop();
      }

      function tzPaintHelp(pz) {
        var tc = typeof TC_HELP !== "undefined" ? TC_HELP : {};
        var a = pz.otherModeOn ? null : tc[pz.nav.layout()] || pz.TZ_HELP[pz.nav.layout()]; // a mode served elsewhere has no tab open
        pz.helpBox.innerHTML = "";
        pz.helpBox.style.display = a ? "" : "none";
        if (!a) return;
        var cab = tzEl("button", "tz-help-cab");
        cab.type = "button";
        cab.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;background:transparent;border:none;color:inherit;cursor:pointer;padding:2px 0;font-size:13px;text-align:left;";
        var ic = tzEl("span", "mdi mdi-help-circle-outline");
        ic.style.cssText = "font-size:18px;color:#90caf9;";
        cab.appendChild(ic);
        cab.appendChild(tzEl("span", null, i18nT('zonesPage.how_to_use_2', { title: a.title })));
        var fl = tzEl("span", "mdi mdi-chevron-" + (pz.helpOpen ? "up" : "down"));
        fl.style.marginLeft = "auto";
        cab.appendChild(fl);
        cab.addEventListener("click", function () {
          pz.helpOpen = !pz.helpOpen;
          try {
            localStorage.setItem(pz.TZ_HELP_KEY, pz.helpOpen ? "1" : "0");
          } catch (e) {
            /* no critico */
          }
          tzPaintHelp(pz);
        });
        pz.helpBox.appendChild(cab);
        if (!pz.helpOpen) return;
        var ol = document.createElement("ol");
        ol.style.cssText = "margin:6px 0 2px 20px;padding:0;font-size:13px;line-height:1.45;";
        (a.steps || []).forEach(function (s) {
          var li = document.createElement("li");
          li.textContent = s;
          ol.appendChild(li);
        });
        pz.helpBox.appendChild(ol);
        (a.notes || []).forEach(function (s) {
          var n = tzEl("div", "tz-muted", s);
          n.style.cssText = "font-size:12px;margin-top:4px;";
          pz.helpBox.appendChild(n);
        });
      }

      function tzPaintZSub(pz) {
        pz.zSubBar.innerHTML = "";
        var items = [["active", i18nT('zoneActive.active_zone'), "crosshairs-gps"], ["zones", i18nT('zonesPage.all_zones'), "table"]];
        if (pz.nav.selected() !== null) items.push(["editor", pz.nav.selected() === "new" ? i18nT('tzTips.l_new_zone') : i18nT('zonesPage.edit', { code: TZ_CODES[pz.nav.selected()] }), "pencil"]);
        items.push(["positions", i18nT('zonesPage.positions'), "map-marker-multiple"]);
        items.forEach(function (it) {
          var b = tzEl("button", "wf-tab tz-tab" + (pz.nav.zSub() === it[0] ? " on" : ""));
          b.type = "button";
          var ic = tzEl("span", "mdi mdi-" + it[2]);
          ic.setAttribute("aria-hidden", "true");
          b.appendChild(ic);
          b.appendChild(tzEl("span", null, it[1]));
          b.addEventListener("click", function () { pz.nav.chooseZSub(it[0]); });
          pz.zSubBar.appendChild(b);
        });
      }
