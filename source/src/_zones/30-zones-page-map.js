      function tzPagMap(pz, root, opts) {
        pz.shell.mapTip().style.cssText =
          "position:fixed;z-index:9999;pointer-events:none;display:none;background:rgba(0,0,0,0.88);color:#fff;font-size:12px;line-height:1.4;padding:4px 7px;border-radius:4px;border:1px solid rgba(255,255,255,0.3);white-space:pre;";
        document.body.appendChild(pz.shell.mapTip());
        pz.timers.push(
          setInterval(function () {
            if (!pz.shell.alive()) pz.shell.mapTip().remove();
          }, 2000)
        );
        pz.shell.svg().addEventListener("mousemove", pz.tools.svgMouseMove);
        pz.shell.svg().addEventListener("mouseleave", function () {
          pz.shell.mapTip().style.display = "none";
          if (pz.snap.hover()) {
            pz.snap.setHover(null);
            pz.snap.placeSnapMarker();
          }
        });
        pz.shell.setMapRoot(null);
        pz.shell.svg().style.touchAction = "none";
        pz.shell.svg().addEventListener(
          "wheel",
          pz.tools.mapWheel,
          { passive: false }
        );
      }

      function tzPagMapEvents(pz, root, opts) {
        pz.shell.svg().addEventListener("contextmenu", function (ev) {
          ev.preventDefault();
          // stage 5: Shift + right click always opens the command menu; without Shift it opens when the point assistant has nothing to show
          var agility = pz.moduleApis.agility;
          if (ev.shiftKey && agility) return agility.menuContextual(ev);
          if (!pz.tools.mapMenuEn(ev) && agility) agility.menuContextual(ev);
        });
        // dragging a shape must not select text: on the touch screen the browser answers that with its own
        // "copy / search" bubble over the map (2026-10-19)
        pz.shell.svg().style.userSelect = pz.shell.svg().style.webkitUserSelect = pz.shell.svg().style.webkitTouchCallout = "none";
        ["selectstart", "dragstart"].forEach(function (n) { pz.shell.svg().addEventListener(n, function (ev) { ev.preventDefault(); }); });
        pz.shell.svg().addEventListener("pointerup", function () { var sel = window.getSelection && window.getSelection(); if (sel && sel.rangeCount) sel.removeAllRanges(); });
        pz.shell.svg().addEventListener("pointerdown", pz.tools.svgPointerDown);
        pz.shell.svg().addEventListener("pointermove", pz.tools.svgPointerMove);
        pz.shell.svg().addEventListener("pointerup", pz.tools.mapPtrEnd);
        pz.shell.svg().addEventListener("pointercancel", pz.tools.mapPtrEnd);
        // if the capture is lost without a pointerup (button released outside, another
        // window), the drag is cancelled: it never stays stuck (see 4e6c714)
        pz.shell.svg().addEventListener("lostpointercapture", pz.tools.lostDrag);
        pz.shell.svg().addEventListener(
          "click",
          pz.tools.svgClickDrag,
          true
        );
        pz.shell.svg().addEventListener("click", pz.tools.svgClickPick);
        pz.view.mountZoom(pz.layerBar);
        pz.tools.mountButtons();
      }

      function tzPagCamera(pz, root, opts) {
        pz.tools.mountCameraStrip();
        pz.shell.svg().addEventListener(
          "pointerdown",
          pz.tools.cameraPointerDown,
          true
        );
        pz.shell.svg().addEventListener(
          "pointermove",
          pz.tools.cameraPointerMove,
          true
        );
        pz.shell.svg().addEventListener("pointerup", pz.tools.cameraPtrUp, true);
        pz.shell.svg().addEventListener("pointercancel", pz.tools.cameraPtrUp, true);
        pz.shell.svg().addEventListener("lostpointercapture", pz.tools.cameraLostCapture, true);
        // Seguir cabezal / capas / pantalla completa
        pz.view.mountFollow(pz.viewGrp);
        pz.view.mountLayersButton(pz.viewGrp);
        pz.layers.mountViewButtons(pz.viewGrp, pz.view.layersButton());
        pz.view.listenLayersOutside();
        pz.view.paintLayersOpen();
      }

      function tzPagButtonsMap(pz, root, opts) {
        pz.view.mountFullscreen(pz.viewGrp);
        pz.dock.build(pz.layerBar);
      }

      function tzPagDock(pz, root, opts) {
        pz.dock.listen();
        pz.mapBar.style.display = "none"; // la barra de arriba quedo vacia
        pz.layers.paintView();
        pz.view.paintMapSize();
        pz.view.listenFullscreen();
        window.addEventListener("keydown", pz.tools.escape);
        // Minimap (bottom right, only with zoom): where the view is.
        pz.view.mountMinimap();
        // Data and actions of a zone (tap it on the map).
        pz.shell.svg().addEventListener(
          "pointerdown",
          pz.tools.moduleDown,
          true
        );
        pz.shell.svg().addEventListener(
          "pointermove",
          pz.tools.moduleMove,
          true
        );
        pz.shell.svg().addEventListener("pointerup", pz.tools.moduleUp, true);
        pz.shell.svg().addEventListener("pointercancel", pz.tools.moduleUp, true);
        pz.shell.svg().addEventListener(
          "click",
          pz.tools.moduleClick,
          true
        );
      }

      function tzPagPointers(pz, root, opts) {
        pz.jobFocus.mountBanner();
        pz.jobFocus.mountOtherZones();
        // -------- life cycle of the page --------
        var lastStatusTick = 0;
        window.addEventListener("workshop-vision", pz.onVision);
        pz.data.refreshAll().then(function () {
          pz.space.paint();
          var t = window.__workshop;
          var pick = t && t.visionPick;
          // a point Vision sent for the zone editor is taken only by the page that has Zones (not the Machine page)
          if (pick && Date.now() - pick.ts < 120000 && pz.pag.layouts.indexOf("zones") !== -1) {
            t.visionPick = null;
            pz.table.visionOrigin(pick);
          }
        });
        pz.timers.push(
          setInterval(function () {
            pz.camera.map().sync(); // closes the video of the camera layer as soon as the page is hidden, opens it when it is back
            // hidden tab, or on another DWC page (kept alive with keep-alive)
            if (!workshopPageVisible(root)) return;
            // Adaptive frequency (request 2026-10-09, the loaded system made the jog
            // hesitate): with the machine STILL (idle) it is read every
            // TZ_STATUS_IDLE_MS; moving (busy / job) every second. The
            // read reuses the jog's shared cache if it is recent.
            var moving = pz.data.st() && pz.data.st().status && pz.data.st().status !== "idle";
            var now = Date.now();
            if (!moving && now - lastStatusTick < TZ_STATUS_IDLE_MS - 100) return;
            lastStatusTick = now;
            pz.data.readStatus(moving ? 900 : 2500).then(function () {
              pz.shell.renderMap();
              pz.space.paint(); // status bar
              pz.data.st() && pz.shell.render();
              if (pz.nav.layout() === "zones") pz.table.renderPositions(true); // habilitar Ir/Guardar segun homing/estado
            });
          }, TZ_STATUS_POLL_MS)
        );
        pz.data.photoBedRead();
      }

      function tzPagTimers(pz, root, opts) {
        pz.timers.push(
          setInterval(function () {
            // SD files: only with the page in view (DWC keeps it alive
            // with keep-alive when going to another page, and each read is served by DWS)
            if (!workshopPageVisible(root)) return;
            if (pz.layerState.layers().photoBed) pz.data.photoBedRead();
            if (pz.nav.selected() === null) pz.data.refreshAll().then(function () { pz.toolsRefresh(); }); // the open registered tool rereads its files (Mesh: the meshes)
            if (pz.layerState.layers().camera) pz.camera.map().reload(); // cambios guardados en Vision
          }, TZ_FILES_POLL_MS)
        );
        // Workbench sidebar: the row of tabs becomes a
        // column on the left and everything else of the page goes to its right.
        (function () {
          var main = tzEl("div", "tz-workbench-main");
          var sig = pz.tabBar.nextSibling;
          while (sig) {
            var n = sig.nextSibling;
            main.appendChild(sig);
            sig = n;
          }
          var workbench = tzEl("div", "tz-workbench");
          pz.tabBar.parentNode.insertBefore(workbench, pz.tabBar);
          workbench.appendChild(pz.tabBar);
          workbench.appendChild(main);
          main.appendChild(pz.space.createState()); // status bar, always visible at the bottom (33-space.js)
          tzNavBarMount(pz); // the side bar: pin and fold buttons, remembered per browser (22-page-nav-bar.js)
        })();
        // HOOK etapa 5/6/7: modules registered by later stages (tzRegisterModule, 20-mode-profile.js) are mounted once the page is complete,
        // the ones the view of the person gets (tzRoleSyncModules, 30-zones-page-role.js; it mounts again when the role changes)
        tzRoleSyncModules(pz, tzViewNow());
        pz.space.paint();
      }
