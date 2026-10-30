      // ---- Workbench page, part 9: layers panel of the map ----
      // Layer buttons, camera layer (description, opacity, mount), presets and the view panel (rotate / theme / bed).

      // The state ply is private to 28-map-layers*.js (step 6 of the restructuring, docs-internal/INTERFACES.md).
      // deps: shell (the layers column, redraws), layerState (the eyes), data, camera (the camera layer), view (the view settings).
      // onToggle(fn): fn(k) runs when the person turns layer k on or off (the tools let go of the Camera tool without its image).
      function tzLayersCreate(deps) {
        var ply = { shell: deps.shell, layerState: deps.layerState, data: deps.data, camera: deps.camera, view: deps.view };
        tzLayersStart(ply);
        deps.layerState.onShow(tzBind(tzLayersPaintLayerButtons, ply)); // a part turned a layer on by itself
        deps.view.onViewSet(tzBind(tzLayersPaintView, ply));
        return {
          mountList: tzBind(tzLayersMountList, ply),
          mountBoxes: tzBind(tzLayersMountBoxes, ply),
          mountViewButtons: tzBind(tzLayersMountViewButtons, ply),
          onToggle: function (fn) { ply.toggleListeners.push(fn); },
          hasLayer: function (k) { return !!ply.layerButtons[k]; },
          clickLayer: function (k) { ply.layerButtons[k].el.click(); },
          viewBox: function () { return ply.viewBox; },
          hasVisionNow: tzBind(tzLayersTzHasVisionNow, ply),
          paintLayerButtons: tzBind(tzLayersPaintLayerButtons, ply),
          paintCameraDesc: tzBind(tzLayersPaintCameraDesc, ply),
          paintView: tzBind(tzLayersPaintView, ply),
        };
      }
