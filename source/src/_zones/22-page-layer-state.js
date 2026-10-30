      // ---- Workbench page, base part: which layers of the map are seen (step 6 of the restructuring, docs-internal/INTERFACES.md) ----
      // The eye of every layer (remembered per screen in localStorage) and whether clamps are used at all. The layers panel
      // (28-map-layers.js) paints the buttons; show(k) is for the parts that turn a layer on by themselves (a clamp or an offcut was
      // just saved): it tells the panel through onShow.

      // Clean map by default (redesign 2026-10-10: "too loaded ... I don't want
      // you to saturate my area"): bed, path, zones, head, probe, Z
      // point and the cutting areas; ruler, references, positions and scraps are
      // turned on in Layers or with a preset. Each screen is moved to this set
      // only once (workshopMapClean1); afterwards what each one chooses rules.
      var TZ_LAYERS_CLEAN = { ruler: false, travel: true, areaLaser: true, areaCNC: true, zones: true, clamps: true, offcuts: false, positions: false, refs: false, zpoint: true, head: true, probe: true, photoBed: true, camera: false, vision: true };

      function tzLayerStateCreate() {
        var pls = {
          // Map layers with an eye button (show/hide), remembered per
          // browser in localStorage. Request 2026-10-08: "an eye button
          // to see or not see something, for example hide the cutting area".
          key: "workshopZonesLayers",
          layers: JSON.parse(JSON.stringify(TZ_LAYERS_CLEAN)),
          // 2026-10-09: the user does not use them (laser; CNC hardly): OFF by
          // default, the code stays. They are turned on in Layers > "Use presses" (per
          // screen). Off = as if there were none (no notices nor drawing).
          clampsKey: "workshopClampsOn",
          clampsOn: false,
          showListeners: [],
        };
        try {
          pls.clampsOn = localStorage.getItem(pls.clampsKey) === "1";
        } catch (e) {
          /* default apagadas */
        }
        try {
          if (localStorage.getItem("workshopMapClean1") !== "1") {
            localStorage.setItem(pls.key, JSON.stringify(TZ_LAYERS_CLEAN));
            localStorage.setItem("workshopMapClean1", "1");
          }
        } catch (e) {
          /*  no storage: the clean set */
        }
        try {
          var savedLayers = JSON.parse(localStorage.getItem(pls.key) || "{}");
          Object.keys(pls.layers).forEach(function (k) {
            if (typeof savedLayers[k] === "boolean") pls.layers[k] = savedLayers[k];
          });
        } catch (e) {
          /* defaults */
        }
        return {
          layers: function () { return pls.layers; }, // read only: set(k, v) changes a layer
          set: function (k, on) { pls.layers[k] = on; },
          save: tzBind(tzLayerStateSave, pls),
          show: tzBind(tzLayerStateShow, pls),
          onShow: function (fn) { pls.showListeners.push(fn); },
          clampsOn: function () { return pls.clampsOn; },
          setClampsOn: tzBind(tzLayerStateSetClampsOn, pls),
        };
      }

      function tzLayerStateSave(pls) {
        try {
          localStorage.setItem(pls.key, JSON.stringify(pls.layers));
        } catch (e) {
          /* no critico */
        }
      }

      // Turns layer k on (if it was off), remembers it and tells the layers panel
      function tzLayerStateShow(pls, k) {
        if (pls.layers[k]) return;
        pls.layers[k] = true;
        tzLayerStateSave(pls);
        pls.showListeners.forEach(function (fn) { fn(); });
      }

      function tzLayerStateSetClampsOn(pls, on) {
        pls.clampsOn = on;
        try {
          localStorage.setItem(pls.clampsKey, pls.clampsOn ? "1" : "0");
        } catch (e) {
          /* no critico */
        }
      }
