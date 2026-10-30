      // ---- Workbench page, part 5: the dock is built and listened to where the page used to do it ----

      // The bar under the map, its buttons and its pop-up. layerBar = the zoom group of the map bar (its + / - go into the dock).
      function tzDockBuild(pdk, layerBar) {
        // A single work bar under the map (2026-10-10, chose "Bar below
        // the map"): tools | view | layers and screen. The map
        // gains the width of the two columns that were on the sides.
        pdk.barD = tzEl("div", "tzm-dock");
        pdk.shell.mapCard().insertBefore(pdk.barD, pdk.shell.mapStatus());
        pdk.shell.mapCard().insertBefore(pdk.tools.cameraStrip(), pdk.shell.mapStatus());
        var barL = pdk.barD;
        var barR = pdk.barD;
        // ---- Work bar v2 (2026-10-10: "the bar better and with more
        // functions"; chose: Go to point / quick jog, measure and references,
        // shortcuts of the active zone, photo / undo / views). What is used
        // little goes in small menus that open upward from their button and
        // close by themselves when tapping outside or with Esc. What moves the machine goes
        // in amber and asks for a double tap (DESIGN.md 5), except the quick
        // jog steps (one tap = one step, as in the Jog panel).
        pdk.magnetBtn = tzDockIconize(pdk, tzBtn(i18nT('zonesPage.snap'), null, function () {
          if (pdk.layers.hasLayer("refs")) pdk.layers.clickLayer("refs");
          tzDockDockPaint(pdk);
        }), "magnet", i18nT('zonesPage.snap'), i18nT('zonesPage.magnet_taps_and_measurements_snap_to'));
        tzDockPair(pdk, barL, [tzDockIconize(pdk, pdk.tools.toolButton("see"), "see", i18nT('common.view')), tzDockIconize(pdk, pdk.tools.toolButton("point"), "point", i18nT('common.point')), tzDockIconize(pdk, pdk.tools.toolButton("measure"), "measure", i18nT('common.measure')), pdk.magnetBtn]);
        barL.appendChild(tzDockIconize(pdk, pdk.tools.toolButton("camera"), "camera", i18nT('cuts.camera')));
        var moveBtn = tzDockIconize(pdk, tzBtn(i18nT('zonesPage.move'), null, function () { tzDockDockPopOpen(pdk, "move", moveBtn, tzBind(tzDockDockMove, pdk)); }), "move", i18nT('zonesPage.move'), i18nT('zonesPage.move_the_machine_from_here_steps'));
        pdk.zoneBtn = tzDockIconize(pdk, tzBtn(i18nT('common.zone'), null, function () { tzDockDockPopOpen(pdk, "zone", pdk.zoneBtn, tzBind(tzDockDockZone, pdk)); }), "zone", i18nT('common.zone'), i18nT('zonesPage.active_zone_change_zone_laser_offset'));
        tzActOnly(moveBtn); // a viewer only looks (20-role-view.js)
        tzActOnly(pdk.zoneBtn);
        tzDockPair(pdk, barL, [moveBtn, pdk.zoneBtn]);
        tzDockDockGap(pdk);
        var zb = layerBar.querySelectorAll("button");
        var zIn = tzDockIconize(pdk, zb[0], "more", "", i18nT('zonesPage.zoom_in_also_with_the_mouse'));
        var zOut = tzDockIconize(pdk, zb[1], "minus", "", i18nT('zonesPage.zoom_out'));
        zIn.classList.add("tzm-half");
        zOut.classList.add("tzm-half");
        zIn.querySelector(".tzm-cap").remove();
        zOut.querySelector(".tzm-cap").remove();
        var viewBtn = tzDockIconize(pdk, tzBtn(i18nT('zonesPage.view'), null, function () { tzDockDockPopOpen(pdk, "view", viewBtn, tzBind(tzDockDockView, pdk)); }), "view", i18nT('zonesPage.view'), i18nT('zonesPage.map_view_whole_bed_active_zone'));
        tzDockPair(pdk, barR, [zOut, zIn, viewBtn]);
        pdk.undoBtn = tzDockIconize(pdk, tzBtn(i18nT('cuts.undo'), null, function () { if (pdk.nav.module("cuts") && pdk.nav.module("cuts").undo) pdk.nav.module("cuts").undo(); tzDockDockPaint(pdk); }), "undo", i18nT('cuts.undo'), i18nT('zonesPage.undoes_the_last_change_to_the'));
        pdk.redoBtn = tzDockIconize(pdk, tzBtn(i18nT('cuts.redo'), null, function () { if (pdk.nav.module("cuts") && pdk.nav.module("cuts").redo) pdk.nav.module("cuts").redo(); tzDockDockPaint(pdk); }), "redo", i18nT('cuts.redo'), i18nT('zonesPage.redoes_what_was_undone'));
        [pdk.undoBtn, pdk.redoBtn].forEach(function (b) {
          b.classList.add("tzm-half");
          b.querySelector(".tzm-cap").remove();
        });
        pdk.undoPair = tzDockPair(pdk, barR, [pdk.undoBtn, pdk.redoBtn]);
        tzDockDockGap(pdk);
        var dockFin = tzEl("div", "tzm-pair");
        barR.appendChild(dockFin);
        dockFin.appendChild(tzDockIconize(pdk, pdk.view.layersButton(), "layers", i18nT('job.layers')));
        // (2026-10-10) the Camera is a single button, the one in the tools: the
        // second button that only turned on the layer was removed. The image alone, without
        // moving anything, remains in Layers.
        pdk.layers.paintLayerButtons();
        pdk.layers.paintCameraDesc();
        var settingsBtn = tzDockIconize(pdk, tzBtn(i18nT('zonesPage.settings'), null, function () { tzDockDockPopOpen(pdk, "settings", settingsBtn, tzBind(tzDockDockSettings, pdk)); }), "settings", i18nT('zonesPage.settings'), i18nT('zonesPage.map_settings_on_this_screen_view'));
        dockFin.appendChild(settingsBtn);
        dockFin.appendChild(tzDockIconize(pdk, pdk.view.fsButton(), "screen", i18nT('zonesPage.screen'), i18nT('zonesPage.full_screen_with_the_section_panel')));
        dockFin.appendChild(tzDockIconize(pdk, pdk.view.fsPanelButton(), "panel", i18nT('zonesPage.panel'), i18nT('zonesPage.show_or_hide_the_section_panel')));
        pdk.view.fsPanelButton().style.display = "none";
        dockFin.appendChild(tzDockIconize(pdk, pdk.view.mapSizeButton(), "size", pdk.view.mapSizeName(), i18nT('zonesPage.map_size_on_this_screen_small_2')));
        // -- menus de la barra --
        pdk.dockPop = tzEl("div", "tzm-dpop");
        pdk.dockPop.addEventListener("pointerdown", function (ev) { tzDockDockPopDrag(pdk, ev); });
        pdk.dockPop.style.cursor = "move";
        pdk.shell.mapCard().style.position = "relative";
        pdk.shell.mapCard().appendChild(pdk.dockPop);
        pdk.dockPopKey = null;
        pdk.dockPopBtn = null;
        pdk.dockPopBuild = null;
      }

      // Taps outside and Esc close its pop-ups; every second it repaints (and its open pop-up, but the settings)
      function tzDockListen(pdk) {
        document.addEventListener("pointerdown", tzBind(tzDockDockOutside, pdk), true);
        document.addEventListener("keydown", tzBind(tzDockDockEsc, pdk), true);
        pdk.shell.timers().push(
          setInterval(function () {
            if (!pdk.shell.alive()) return;
            tzDockDockPaint(pdk);
            if (pdk.dockPopKey && pdk.dockPopKey !== "settings") tzDockDockPopPaint(pdk);
          }, 1000)
        );
        tzDockDockPaint(pdk);
      }
