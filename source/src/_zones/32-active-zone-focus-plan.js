      // ---- Active zone: the focus height and what the "Measure and focus" button will do (pure, no DOM) ----
      // One rule for the Active zone and for Prepare (step Measure): the same height, the same source, the same action.
      //   h       the height the laser is left at above the surface (mm)
      //   source  where it comes from: "typed" (the person wrote another one) | "rule" (the thickness rule of the lens box,
      //           57-focus-rule.js) | "material" (lens focus minus how deep the material focuses) | "lens" (the lens focus alone)
      //   action  "macro"  the macro of the zone (macros/laser/<name>.g) already carries this height
      //           "point"  measure at the Z point with this height (zprobepoint.g): the macro is missing or says another height
      //           "stale"  only the macro exists (no Z point) and it says another height: it would run with ITS height
      //           "none"   nothing can measure (no macro and no Z point)
      //   mismatch  the macro exists and its height differs from h (the person is offered to update it)
      // i: {matLaser, thickness, ruleH (number|null), inside, lens, typedH (number|null), macroH (number|null), hasPoint}
      var TZ_ACT_FOCUS_TOL = 0.01;

      function tzActFocusPlan(i) {
        var plan = { h: i.lens, source: "lens", inside: 0, action: "none", mismatch: false };
        if (i.matLaser && i.ruleH !== null && i.ruleH !== undefined && i.thickness > 0) {
          plan.h = i.ruleH;
          plan.source = "rule";
        } else if (i.matLaser) {
          plan.inside = i.inside > 0 ? i.inside : 0;
          plan.h = Math.round((i.lens - plan.inside) * 100) / 100;
          plan.source = plan.inside > 0 ? "material" : "lens";
        }
        if (i.typedH !== null && i.typedH !== undefined && isFinite(i.typedH) && Math.abs(i.typedH - plan.h) > TZ_ACT_FOCUS_TOL) {
          plan.h = i.typedH;
          plan.source = "typed";
        }
        var hasMacro = i.macroH !== null && i.macroH !== undefined;
        plan.mismatch = hasMacro && Math.abs(i.macroH - plan.h) > TZ_ACT_FOCUS_TOL;
        if (hasMacro && !plan.mismatch) plan.action = "macro";
        else if (i.hasPoint) plan.action = "point";
        else if (hasMacro) plan.action = "stale";
        return plan;
      }

      // Why a button that moves the machine is off: the key (zoneActive.*) of the reason, or "" when it can be used.
      // i: {signedOut, free, homedXY, homedAll, needAll (the action also moves Z, so Z must be homed), needPoint, hasPoint}
      function tzActBlockedWhy(i) {
        if (i.signedOut) return "why_signed_out";
        if (!i.free) return "why_busy";
        if (i.needAll && !i.homedAll) return "why_home_all";
        if (!i.needAll && !i.homedXY) return "why_home_xy";
        if (i.needPoint && !i.hasPoint) return "why_no_point";
        return "";
      }
