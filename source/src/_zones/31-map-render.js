      // ---- Workbench page, part 8: the drawing of the map ----
      // renderMap() draws the bed, zones, layers, job and the active tool; the shell calls it (shell.renderMap(), every part asks
      // for a redraw there). The state pmr is private to 31-map-render*.js (step 6 of the restructuring, docs-internal/INTERFACES.md).
      // pmr.layerCache keeps the fixed layers with their signatures (26-map-layer-cache.js, 31-map-render-sigs.js).

      // colors of the map: the cut area of each mode (the accents of 20-mode-profile.js) and the zones by index
      var TZ_AREA_COLORS = { Laser: TZ_PROFILES.Laser.accent, CNC: TZ_PROFILES.CNC.accent };
      var TZ_ZCOL = ["#90caf9", "#4fc3f7", "#81c784", "#ffb74d", "#ba68c8", "#f06292", "#4db6ac", "#dce775", "#a1887f"];

      // deps: every part it draws (shell, nav, layerState, data, camera, view, snap, jobFocus, cutArea, layers, tools)
      function tzMapCreate(deps) {
        var pmr = {
          shell: deps.shell, nav: deps.nav, layerState: deps.layerState, data: deps.data, camera: deps.camera, view: deps.view,
          snap: deps.snap, jobFocus: deps.jobFocus, cutArea: deps.cutArea, layers: deps.layers, tools: deps.tools,
          layerCache: tzLayerCacheCreate(),
        };
        deps.shell.onRenderMap(tzBind(tzMapRenderMap, pmr)); // nothing else reaches the drawing
      }
