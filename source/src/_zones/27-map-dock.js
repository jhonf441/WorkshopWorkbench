      // ---- Workbench page, part 5: the icon toolbar of the map (job bar v2) ----
      // Icons, pop-ups of the dock, move / zone / view / names / settings sections and their painting.

      // The state pdk is private to 27-map-dock*.js (step 6 of the restructuring, docs-internal/INTERFACES.md).
      // deps: shell, nav (open tab, its modules, other pages), layerState, data, view, layers (the view settings box, the layer
      // rows the dock turns on), tools (the tool buttons it shows, the last tapped point, the camera strip).
      function tzDockCreate(deps) {
        var pdk = { shell: deps.shell, nav: deps.nav, layerState: deps.layerState, data: deps.data, view: deps.view, layers: deps.layers, tools: deps.tools };
        tzDockStart(pdk);
        return {
          build: tzBind(tzDockBuild, pdk),
          listen: tzBind(tzDockListen, pdk),
          paint: tzBind(tzDockDockPaint, pdk),
        };
      }
