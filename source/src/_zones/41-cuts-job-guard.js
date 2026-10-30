      // ---- What a cut needs before it can start (F0, 2026-10-21; pure except tcCutGuardInput) ----
      // Laser mode, an active zone with a material, and (when the material has a thickness) a focus applied to that zone.
      // The technical mode that skips the focus is F1 (roles): it does not exist yet.

      // The material of the active zone must be a laser one; with thickness the cut is focused by thickness (tmatH).
      function tcFocusRequired(material) {
        return !!(material && material.thickness > 0);
      }

      // inp = { st, zoneName (null when the zone does not exist), material, focus (the stored rec) } -> list of messages
      function tcCutGuard(inp) {
        var errs = [];
        var st = inp.st;
        if (!st || st.mode !== "Laser") return errs; // the mode has its own message in tcValidate
        if (inp.zoneName === null || inp.zoneName === undefined) {
          errs.push(i18nT('cuts.need_active_zone'));
          return errs;
        }
        var m = inp.material;
        if (!m || (m.mode && m.mode !== "Laser")) {
          errs.push(i18nT('cuts.need_material', { zone: inp.zoneName }));
          return errs;
        }
        if (tcFocusRequired(m) && !tzFocusAppliedOk(inp.focus, st)) errs.push(i18nT('cuts.need_focus', { zone: inp.zoneName, material: tmatLabel(m) }));
        return errs;
      }

      function tcCutGuardInput(tc) {
        var st = tc.ctx.machine.getSt();
        var zones = tc.ctx.data.zones ? tc.ctx.data.zones() : [];
        var z = st && zones ? zones[st.wn] : null;
        var mat = z ? tmatById(tc.ctx.data.material(st.wn)) : null;
        var name = st && z ? TZ_CODES[st.wn] + (z.name ? " " + z.name : "") : null;
        return { st: st, zoneName: name, material: mat, focus: tzFocusAppliedRead(st ? st.wn : undefined) };
      }
