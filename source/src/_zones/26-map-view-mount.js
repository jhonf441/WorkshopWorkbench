      // ---- Workbench page, part 4: the buttons and boxes of the view, made when the page builds the map ----
      // The page calls these in the same place where it used to make each element (the order of the DOM does not change).

      // Zoom buttons + / - / Fit and the zoom label, in the bar of the map
      function tzViewMountZoom(pvw, bar) {
        pvw.zoomLbl = tzEl("span", "tz-muted", "");
        pvw.zoomLbl.style.alignSelf = "center";
        bar.appendChild(tzBtn("+", null, function () { tzViewMapZoomAt(pvw, 1.5); }));
        bar.appendChild(tzBtn("-", null, function () { tzViewMapZoomAt(pvw, 1 / 1.5); }));
        bar.appendChild(tzBtn(i18nT('tzTips.l_fit'), null, function () { pvw.mapView = null; if (pvw.data.st()) pvw.shell.renderMap(); tzViewPaintZoomLbl(pvw); }));
        bar.appendChild(pvw.zoomLbl);
        tzViewPaintZoomLbl(pvw);
      }

      // Seguir cabezal / capas / pantalla completa
      function tzViewMountFollow(pvw, grp) {
        pvw.followBtn = tzBtn(i18nT('zonesPage.follow_head'), null, function () {
          tzViewSetFollow(pvw, !pvw.mapFollow);
        });
        tzTip(pvw.followBtn, i18nT('zonesPage.the_map_centres_itself_on_the'));
        grp.appendChild(pvw.followBtn);
      }

      // Layers (2026-10-10, "I have to close that bar manually"): it no longer
      // floats over the map; it is a fixed column on the side, open unless
      // hidden with the Layers button. On a narrow screen it still floats.
      function tzViewMountLayersButton(pvw, grp) {
        pvw.layersOpen = true;
        try {
          pvw.layersOpen = localStorage.getItem("workshopMapLayersCol") !== "0";
        } catch (e) {
          /* default abierto */
        }
        pvw.layersCol = false; // there is room for the column (decided by dockPaint)
        pvw.layersFloating = false; // no room: open floating until tapping outside
        pvw.layersBtn = tzBtn(i18nT('job.layers'), null, function () {
          if (!pvw.layersCol) {
            pvw.layersFloating = !pvw.layersFloating;
            tzViewPaintLayersOpen(pvw);
            return;
          }
          pvw.layersOpen = !pvw.layersOpen;
          try {
            localStorage.setItem("workshopMapLayersCol", pvw.layersOpen ? "1" : "0");
          } catch (e) {
            /* no critico */
          }
          tzViewPaintLayersOpen(pvw);
          if (pvw.data.st()) pvw.shell.renderMap();
        });
        tzTip(pvw.layersBtn, i18nT('zonesPage.what_shows_on_the_map_and'));
        grp.appendChild(pvw.layersBtn);
      }

      // floating: a tap outside the layers (and their button) closes them
      function tzViewListenLayersOutside(pvw) {
        document.addEventListener("pointerdown", function layersOutside(ev) {
          if (!pvw.shell.alive()) return document.removeEventListener("pointerdown", layersOutside, true);
          if (pvw.layersCol || !pvw.layersFloating) return;
          if (pvw.shell.layerPanel().contains(ev.target) || pvw.layersBtn.contains(ev.target)) return;
          pvw.layersFloating = false;
          tzViewPaintLayersOpen(pvw);
        }, true);
      }

      // the dock decided whether there is room for the layers column: a change closes the floating panel
      function tzViewSetLayersColumn(pvw, col) {
        pvw.layersCol = col;
        pvw.layersFloating = false;
      }

      // Full screen (map + the panel of the section) and, in full screen, the button that shows or hides that panel
      function tzViewMountFullscreen(pvw, grp) {
        pvw.fsBtn = tzBtn(i18nT('zonesPage.full_screen'), null, function () {
          var obj = pvw.shell.ws() || pvw.shell.mapCard(); // mapa + panel de la seccion
          if (document.fullscreenElement === obj) document.exitFullscreen();
          else if (obj.requestFullscreen) obj.requestFullscreen().catch(function () {
            pvw.shell.mapCard().classList.toggle("tzm-fs"); // without Fullscreen API: only enlarge
            if (pvw.data.st()) pvw.shell.renderMap();
          });
        });
        // Panel de la seccion en pantalla completa: mostrar u ocultar
        var fsPanelHidden = false;
        pvw.fsPanelBtn = tzBtn(i18nT('zonesPage.panel'), "primary", function () {
          fsPanelHidden = !fsPanelHidden;
          if (pvw.shell.ws()) pvw.shell.ws().classList.toggle("without-panel", fsPanelHidden);
          pvw.fsPanelBtn.classList.toggle("primary", !fsPanelHidden);
          if (pvw.data.st()) pvw.shell.renderMap();
          setTimeout(function () { if (pvw.shell.alive() && pvw.data.st()) pvw.shell.renderMap(); }, 200);
        });
        tzTip(pvw.fsPanelBtn, i18nT('zonesPage.in_full_screen_shows_or_hides'));
        tzTip(pvw.fsBtn, i18nT('zonesPage.the_map_and_the_section_panel'));
        grp.appendChild(pvw.fsBtn);
      }

      function tzViewListenFullscreen(pvw) {
        var onFsChange = tzBind(tzViewOnFsChange, pvw);
        document.addEventListener("fullscreenchange", onFsChange);
        pvw.shell.timers().push(
          setInterval(function () {
            if (!pvw.shell.alive()) document.removeEventListener("fullscreenchange", onFsChange);
          }, 2000)
        );
      }

      // Minimap (bottom right, only with zoom): where the view is.
      function tzViewMountMinimap(pvw) {
        pvw.miniBox = tzEl("div", "tzm-mini");
        pvw.shell.svgBox().appendChild(pvw.miniBox);
        pvw.miniSvg = document.createElementNS(TZ_SVG_NS, "svg");
        pvw.miniSvg.style.cssText = "width:100%;height:auto;display:block;cursor:pointer;";
        pvw.miniBox.appendChild(pvw.miniSvg);
        pvw.miniSvg.addEventListener("click", tzBind(tzViewMiniClick, pvw));
        pvw.miniHidden = false;
        try {
          pvw.miniHidden = localStorage.getItem("workshopMapMiniHidden") === "1";
        } catch (e) {
          /* visible */
        }
      }

      // Tamano del mapa en pantalla angosta: chico / medio / grande / oculto
      function tzViewMountMapSize(pvw, grp) {
        pvw.mapSizeBtn = tzBtn("", null, function () {
          var i = pvw.MAP_SIZES.map(function (s) { return s[0]; }).indexOf(pvw.mapSize);
          pvw.mapSize = pvw.MAP_SIZES[(i + 1) % pvw.MAP_SIZES.length][0];
          try {
            localStorage.setItem(pvw.TZ_MAPSIZE_KEY, pvw.mapSize);
          } catch (e) {
            /* no critico */
          }
          tzViewPaintMapSize(pvw);
          if (pvw.data.st()) pvw.shell.renderMap();
        });
        tzTip(pvw.mapSizeBtn, i18nT('zonesPage.map_size_on_this_screen_small'));
        grp.insertBefore(pvw.mapSizeBtn, grp.firstChild);
      }

      // narrow = one column (the real width of the content, not of the window:
      // DWC's menu and the Controls bar take up room)
      function tzViewSetNarrow(pvw, nw) {
        if (nw === pvw.wsNarrow) return;
        pvw.wsNarrow = nw;
        pvw.shell.ws().classList.toggle("narrow", nw);
        tzViewPaintMapSize(pvw);
        if (pvw.data.st()) pvw.shell.renderMap();
      }

      // Screen point of a pointer event -> bed coords (x, y up), or null
      function tzViewSvgPoint(pvw, ev) {
        var m = pvw.shell.svg().getScreenCTM();
        if (!m) return null;
        var pt = pvw.shell.svg().createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        var p = pt.matrixTransform(m.inverse());
        var u = tzViewXfInvP(pvw, p.x, p.y); // undoes the rotation/mirror of the view
        return { x: u.x, y: -u.y };
      }

      // Screen point of a pointer event -> map coords without rotation (like mapView), or null
      function tzViewSvgRaw(pvw, ev) {
        var m = pvw.shell.svg().getScreenCTM();
        if (!m) return null;
        var pt = pvw.shell.svg().createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        var p = pt.matrixTransform(m.inverse());
        return tzViewXfInvP(pvw, p.x, p.y); // map coords without rotation (like mapView)
      }
