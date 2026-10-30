      // ---- "Simple cuts" layout (Work zones page) ----
      //
      // Request 2026-10-08: cut simple shapes (lines, rectangles,
      // circles) placing them directly inside the cutting area, and find
      // centers (the IDEA of BtnCmd's buttons, not a copy: here the
      // points are seen on the map and 3 or more can be captured to average).
      //
      // It shares the Zones page's map (zoom, ruler, layers, area): the
      // page calls tcMountCuts(ctx) and passes it its hooks; this module
      // draws on the map (draw), handles taps on the map (wantsClick /
      // onClick) and builds its own card.
      //
      // Coordinates: all in BED coords (= where the pointer lands). The
      // shapes are where the BEAM has to pass; when generating the job the
      // machine goes to point + laser correction (G53). 10 W diode laser
      // (M452 R255 -> S = % * 2.55).
      //
      // Cutting = generated JOB (0:/sys/workshop/gcodes/cuts.gcode + M32):
      // DWC's Pause/Cancel work and the jog stays blocked. 1st line:
      // sys/workshop/macros/cutguard.g (real Laser mode + homing + power 1..100 %).

      function tcMountCuts(ctx) {
        var tc = { ctx: ctx };
        tcCutsStart(tc);
        return tcCutsApi(tc);
      }
