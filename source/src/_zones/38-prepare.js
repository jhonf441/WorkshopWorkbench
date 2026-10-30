      // ---- "Prepare" assistant (Zones tab) ----
      //
      // Request 2026-10-09 ("do them all"): the pieces already existed but spread over
      // several cards. This puts them in the real work order, each
      // step with its check:
      //   1 Machine (homing, free)  2 Zone  3 Material  4 Measure / focus
      //   5 Check with the pointer (frame the material)  6 Ready to cut
      // Checks 1-3 come from the real state; 4 and 5 are marked when done in
      // this session (per zone). Nothing moves the machine without a double tap.

      function tpMountPrepare(ctx) {
        var tp = { ctx: ctx };
        tpPrepareStart(tp);
        return tpPrepareApi(tp);
      }
