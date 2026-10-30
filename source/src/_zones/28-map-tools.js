      // ---- Workbench page, part 6: tools of the map ----
      // Pointer, measure and camera tools, magnet (reference points), drag-edit of shapes and the map menu.
      // Tools of the map bar (stage 3.6): the four of the bar and what changing from one to another needs.
      //   conservaMedida: the measurement stays when this tool is chosen (every other tool clears it)
      //   necesitaCapaCamara: the tool needs the camera layer visible (it is switched on when the tool is chosen and back off when it is left)
      // The drawing and the taps of each tool are still in the handlers of this file (pointer / measure / camera);
      // tzChooseTool is the pure decision setTool applies (tests/tools-map.test.js).
      var TZ_TOOLS_MAP = [
        { id: "see" },
        { id: "point" },
        { id: "measure", keepsMeasure: true },
        { id: "camera", needsLayerCamera: true },
      ];
      // actual = tool in use, nueva = tool chosen; est = {capaCamara: camera layer is on, hayBotonCapa: the layer button exists,
      // capaPorHerramienta: the layer was switched on by the camera tool}.
      // Returns {id, limpiarMedida, capaCamara: "encender" | "restaurar" | null}.
      function tzChooseTool(table, current, nueva, est) {
        est = est || {};
        var de = table.filter(function (h) { return h.id === current; })[0] || null;
        var a = table.filter(function (h) { return h.id === nueva; })[0] || null;
        var layer = null;
        if (a && a.needsLayerCamera && !est.layerCamera && est.hasButtonLayer) layer = "turnon";
        else if (de && de.needsLayerCamera && !(a && a.needsLayerCamera) && est.layerByTool && est.layerCamera && est.hasButtonLayer) layer = "restore";
        return { id: nueva, cleanMeasure: !(a && a.keepsMeasure), layerCamera: layer };
      }

      // The state pmt is private to 28-map-tools*.js (step 6 of the restructuring, docs-internal/INTERFACES.md).
      // deps: shell, nav (open tab and its map module), layerState, data, camera (the camera layer), view, snap (magnet),
      // table (the zone editor), cutArea (picking the area on the map), layers (the camera layer row).
      function tzToolCreate(deps) {
        var pmt = {
          shell: deps.shell, nav: deps.nav, layerState: deps.layerState, data: deps.data, camera: deps.camera, view: deps.view,
          snap: deps.snap, table: deps.table, cutArea: deps.cutArea, layers: deps.layers,
        };
        tzToolStart(pmt);
        deps.layers.onToggle(tzBind(tzToolLayerToggled, pmt));
        return {
          mountPopup: tzBind(tzToolMountPopup, pmt),
          mountButtons: tzBind(tzToolMountButtons, pmt),
          mountCameraStrip: tzBind(tzToolMountCameraStrip, pmt),
          toolButton: function (id) { return pmt.toolButtons[id]; },
          cameraStrip: function () { return pmt.cameraZBox; },
          popupOpen: function () { return pmt.posPop.style.display === "block"; },
          mapTool: function () { return pmt.mapTool; },
          dragEdit: function () { return pmt.dragEdit; },
          lastTap: function () { return pmt.dockLast; },
          posPick: function () { return pmt.posPick; },
          ptPick: function () { return pmt.ptPick; },
          zonePick: function () { return pmt.zonePick; },
          setTool: tzBind(tzToolSetTool, pmt),
          paintTools: tzBind(tzToolPaintTools, pmt),
          paintStatus: tzBind(tzToolPaintStatus, pmt),
          placeMeasure: tzBind(tzToolPlaceMeasure, pmt),
          placeCameraTool: tzBind(tzToolPlaceCameraTool, pmt),
          openPointPop: tzBind(tzToolOpenPointPop, pmt),
          openPosPop: tzBind(tzToolOpenPosPop, pmt),
          openRectPop: tzBind(tzToolOpenRectPop, pmt),
          openZonePop: tzBind(tzToolOpenZonePop, pmt),
          openZonePickPop: tzBind(tzToolOpenZonePickPop, pmt),
          closePosPop: tzBind(tzToolClosePosPop, pmt),
          mapMenuEn: tzBind(tzToolMapMenuEn, pmt),
          svgMouseMove: tzBind(tzToolSvgMouseMove, pmt),
          svgPointerDown: tzBind(tzToolSvgPointerDown, pmt),
          svgPointerMove: tzBind(tzToolSvgPointerMove, pmt),
          mapPtrEnd: tzBind(tzToolMapPtrEnd, pmt),
          svgClickDrag: tzBind(tzToolSvgClickDrag, pmt),
          svgClickPick: tzBind(tzToolSvgClickPick, pmt),
          mapWheel: tzBind(tzToolMapWheel, pmt),
          lostDrag: tzBind(tzToolLostDrag, pmt),
          cameraPointerDown: tzBind(tzToolCameraPointerDown, pmt),
          cameraPointerMove: tzBind(tzToolCameraPointerMove, pmt),
          cameraPtrUp: tzBind(tzToolCameraPtrUp, pmt),
          cameraLostCapture: tzBind(tzToolCameraLostCapture, pmt),
          moduleDown: tzBind(tzToolModuleDown, pmt),
          moduleMove: tzBind(tzToolModuleMove, pmt),
          moduleUp: tzBind(tzToolModuleUp, pmt),
          moduleClick: tzBind(tzToolModuleClick, pmt),
          escape: tzBind(tzToolEscape, pmt),
        };
      }
