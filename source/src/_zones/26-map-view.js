      // ---- Workbench page, part 4: map matrix and view ----
      // Rotation / mirror / theme, zoom and pan, minimap, map size, follow-the-head and full screen.
      // Linear matrix of the map view (pure; stage 3.4): mirror first (x -> -x), then a clockwise turn of rot degrees (0, 90, 180, 270).
      // tests/view-map.test.js checks it against the inverse for the 8 combinations.
      function tzXfMat(rot, mirror) {
        var k = rot / 90, co = [1, 0, -1, 0][k], si = [0, 1, 0, -1][k], m = mirror ? -1 : 1;
        return { a: co * m, b: si * m, c: -si, d: co };
      }
      // Keeps a zoomed view inside the bed (pure; stage 3.4): v = {x,y,w,h} wanted, full = the whole bed, maxZoom / minZoom = limits of the zoom.
      // Returns null at zoom 1 (the full view) or when there is no view.
      function tzClampView(v, full, maxZoom, minZoom) {
        if (!v || !full) return null;
        var vw = Math.min(Math.max(v.w, full.w / maxZoom), full.w / minZoom);
        var vh = vw * (full.h / full.w);
        if (Math.abs(vw - full.w) < 0.001) return null; // zoom 1 = vista completa
        // zoomed in: the view does not leave the bed; zoomed out: the bed does not leave the view
        var vx = Math.min(Math.max(v.x, Math.min(full.x, full.x + full.w - vw)), Math.max(full.x, full.x + full.w - vw));
        var vy = Math.min(Math.max(v.y, Math.min(full.y, full.y + full.h - vh)), Math.max(full.y, full.y + full.h - vh));
        return { x: vx, y: vy, w: vw, h: vh };
      }

      // The view of the map (step 6 of the restructuring, docs-internal/INTERFACES.md): its state pvw is private to 26-map-view*.js.
      // deps: shell (svg, workspace, redraws), data (machine state and zones for the minimap and the redraws).
      // onViewSet(fn): fn runs when the rotation / mirror / theme / bed changed (the layers panel repaints its view settings).
      function tzViewCreate(deps) {
        var pvw = { shell: deps.shell, data: deps.data };
        tzViewStart(pvw);
        return {
          mapView: function () { return pvw.mapView; },
          setMapView: function (v) { pvw.mapView = v; },
          mapFull: function () { return pvw.mapFull; },
          setMapFull: function (v) { pvw.mapFull = v; },
          focusZoom: function () { return pvw.focusZoom; },
          setFocusZoom: function (on) { pvw.focusZoom = on; },
          mapRot: function () { return pvw.mapRot; },
          mapMirror: function () { return pvw.mapMirror; },
          mapTheme: function () { return pvw.mapTheme; },
          mapBed: function () { return pvw.mapBed; },
          mapFollow: function () { return pvw.mapFollow; },
          themes: function () { return pvw.TZ_THEMES; },
          beds: function () { return pvw.TZ_BEDS; },
          miniHidden: function () { return pvw.miniHidden; },
          setMiniHidden: tzBind(tzViewSetMiniHidden, pvw),
          miniSvg: function () { return pvw.miniSvg; },
          layersCol: function () { return pvw.layersCol; },
          layersOpen: function () { return pvw.layersOpen; },
          setLayersColumn: tzBind(tzViewSetLayersColumn, pvw),
          layersButton: function () { return pvw.layersBtn; },
          followButton: function () { return pvw.followBtn; },
          fsButton: function () { return pvw.fsBtn; },
          fsPanelButton: function () { return pvw.fsPanelBtn; },
          mapSizeButton: function () { return pvw.mapSizeBtn; },
          mapSizeName: function () { return tzViewMapSizeName(pvw, pvw.mapSize); },
          onViewSet: function (fn) { pvw.viewSetListeners.push(fn); },
          mountZoom: tzBind(tzViewMountZoom, pvw),
          mountFollow: tzBind(tzViewMountFollow, pvw),
          mountLayersButton: tzBind(tzViewMountLayersButton, pvw),
          listenLayersOutside: tzBind(tzViewListenLayersOutside, pvw),
          mountFullscreen: tzBind(tzViewMountFullscreen, pvw),
          listenFullscreen: tzBind(tzViewListenFullscreen, pvw),
          mountMinimap: tzBind(tzViewMountMinimap, pvw),
          mountMapSize: tzBind(tzViewMountMapSize, pvw),
          setNarrow: tzBind(tzViewSetNarrow, pvw),
          svgPoint: tzBind(tzViewSvgPoint, pvw),
          svgRaw: tzBind(tzViewSvgRaw, pvw),
          xfId: tzBind(tzViewXfId, pvw),
          xfMat: tzBind(tzViewXfMat, pvw),
          xfInvP: tzBind(tzViewXfInvP, pvw),
          xfBox: tzBind(tzViewXfBox, pvw),
          xfUpright: tzBind(tzViewXfUpright, pvw),
          mapThemeKey: tzBind(tzViewMapThemeKey, pvw),
          mapUnitsPerPx: tzBind(tzViewMapUnitsPerPx, pvw),
          mapClampView: tzBind(tzViewMapClampView, pvw),
          mapZoomAt: tzBind(tzViewMapZoomAt, pvw),
          setView: tzBind(tzViewSetView, pvw),
          restore: tzBind(tzViewRestore, pvw),
          setFollow: tzBind(tzViewSetFollow, pvw),
          paintZoomLbl: tzBind(tzViewPaintZoomLbl, pvw),
          paintLayersOpen: tzBind(tzViewPaintLayersOpen, pvw),
          paintMapSize: tzBind(tzViewPaintMapSize, pvw),
          drawMinimap: tzBind(tzViewDrawMinimap, pvw),
        };
      }
