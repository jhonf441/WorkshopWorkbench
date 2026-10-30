      // ---- Workbench page, part 1: the geometry of the machine for the cut area ----
      // Laser <-> pointer correction, travel limits and probe offset, from the machine state and the zones.

      // Probe offset (G31) of the active mode: where it touches relative to the head.
      function tzDataAreaProbeOffset(pzd) {
        var pr = pzd.st && pzd.st.probes && pzd.st.probes[0];
        var o = pr && pr.offsets;
        return o && isFinite(o[0]) && isFinite(o[1]) && (o[0] || o[1]) ? { x: o[0], y: o[1] } : null;
      }

      function tzDataCutCorrection(pzd) {
        var mc = tjLaserCorrection(); // a single one for the machine (2026-10-10)
        if (mc) return { cx: mc.x, cy: mc.y };
        var z = pzd.zones[pzd.st.wn];
        if (z && (z.correctionX || z.correctionY)) return { cx: z.correctionX || 0, cy: z.correctionY || 0 };
        for (var i = 0; i < pzd.zones.length; i++) {
          if (pzd.zones[i] && (pzd.zones[i].correctionX || pzd.zones[i].correctionY)) return { cx: pzd.zones[i].correctionX || 0, cy: pzd.zones[i].correctionY || 0 };
        }
        return null;
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
