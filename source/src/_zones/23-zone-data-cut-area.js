      // ---- Workbench page, part 1: the geometry of the machine for the cut area ----
      // Laser <-> pointer correction (the "laser" settings store), travel limits and probe offset (the machine state).

      // Probe offset (G31) of the active mode: where it touches relative to the head.
      function tzDataAreaProbeOffset(pzd) {
        var pr = pzd.st && pzd.st.probes && pzd.st.probes[0];
        var o = pr && pr.offsets;
        return o && isFinite(o[0]) && isFinite(o[1]) && (o[0] || o[1]) ? { x: o[0], y: o[1] } : null;
      }

      // The laser <-> pointer correction: only the machine's, from the "laser" settings store (14-laser-cfg.js); null when it was never
      // measured (the correction written inside each zone file p<N>.g is that same value applied, never a source of its own).
      function tzDataCutCorrection() {
        var mc = tjLaserCorrection();
        return mc ? { cx: mc.x, cy: mc.y } : null;
      }

      function tzDataCutLimits(pzd) {
        var ax = pzd.st && pzd.st.axes;
        if (!ax || !ax.X || !ax.Y) return null;
        return { xmin: ax.X.min, xmax: ax.X.max, ymin: ax.Y.min, ymax: ax.Y.max };
      }

      // Where the head is now (machine coords), null without X / Y homing
      function tzDataHeadNow(pzd) {
        var ax = pzd.st && pzd.st.axes;
        if (!ax || !ax.X || !ax.Y || !ax.X.homed || !ax.Y.homed) return null;
        return { x: ax.X.machinePosition, y: ax.Y.machinePosition, z: ax.Z ? ax.Z.machinePosition : null };
      }
