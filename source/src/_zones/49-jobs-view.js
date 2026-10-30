      // ---- Zones > Job: view, simulate and frame a file from 0:/gcodes (2026-10-15) ----
      //
      // Request: "from the jobs list be able to select a job, see it in the graphic and decide what to do
      // with it from there: frame it (box or outline, with the laser on or with the pointer), even simulate it and have it
      // give you charts and important data".
      //
      // The service reads the file WITHOUT executing it (op jobs.preview, dsf/handlers/trabajos_vista.py): path in
      // MACHINE coordinates of the active zone, estimated time from each move's feed, distances,
      // parts, range of power / depth / layers, box and outline (convex hull) of what it works.
      //
      // Where each thing lands (corr = laser correction, only in Laser mode):
      //   - the BEAM lands at machine - corr: that is how the path is drawn on the map;
      //   - frame with the LASER: the head follows the outline as is (the beam passes along the job's edge);
      //   - frame with the POINTER: the pointer lands on the head, so the head goes to (outline - corr).
      var TV_EXT = /\.(gcode|gco|gc|nc|g)$/i;
      var TV_SPEEDS = [1, 10, 50, 200];

      function tvFmtDur(s) {
        s = Math.max(0, Math.round(s));
        var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
        return (h ? h + ":" + (m < 10 ? "0" : "") + m : m) + ":" + (x < 10 ? "0" : "") + x;
      }

      function tvMount(ctx) {
        var tvs = { ctx: ctx };
        tvVisStartup(tvs);
        return tvVisApi(tvs);
      }
