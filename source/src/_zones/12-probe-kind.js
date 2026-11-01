      // ---- The probe the machine declares (pure, no DOM) ----
      //
      // The Workbench was written on a machine with a BLTouch and its steps assumed one: stow the pin, "measure with the BLTouch". Other machines
      // declare another probe (a switch, a piezo, a scanning probe) or none. The object model says which: sensors.probes[0].type is the P of
      // M558, and every step of the page asks THIS instead of assuming a BLTouch. The macros ask the same thing (var servo in laserfocus.g...,
      // zmeasure.g measures by the type).
      //
      //   kind       "bltouch" | "switch" | "piezo" | "analog" | "stall" | "scanning" | "other" (a type this list does not know) |
      //              "manual" (M558 P0: nothing to touch with) | "none" (the machine declares no probe)
      //   servo      it has a pin to deploy and stow (only the BLTouch, type 9): only then the page clears its alarm and stows the pin
      //   measures   G30 can touch the surface with it: every declared probe but the manual one. Without it the surface is found with a
      //              sheet of paper (tzProbePaperCode)
      var TZ_PROBE_KINDS = { 0: "manual", 1: "analog", 2: "analog", 3: "analog", 5: "switch", 8: "piezo", 9: "bltouch", 10: "stall", 11: "scanning" };

      // probes: the sensors.probes array of the object model (null entries are probes that are not configured)
      function tzProbeInfo(probes) {
        var p = probes && probes.length ? probes[0] : null;
        if (!p || typeof p !== "object") return { kind: "none", type: null, servo: false, measures: false };
        var type = typeof p.type === "number" && isFinite(p.type) ? p.type : null;
        var kind = type === null ? "other" : TZ_PROBE_KINDS[type] || "other";
        return { kind: kind, type: type, servo: kind === "bltouch", measures: kind !== "manual" };
      }

      // The name of the probe for a sentence ("BLTouch", "switch", ...): i18n probeKind.name_<kind>
      function tzProbeName(info) {
        return i18nT('probeKind.name_' + info.kind);
      }

      // Without a probe: the tool is over the point, the person lowers it until it just drags a sheet of paper P mm thick, and this sets that
      // surface as Z0 and rises to H mm above it (zcal-mark.g: it is what Machine > Height uses to calibrate the probe)
      function tzProbePaperCode(h, paper) {
        return 'M98 P"0:/sys/workshop/macros/zcal-mark.g" P' + paper + " H" + h;
      }

      // The tool (not the probe) over the point X Y at a safe height, to lower it there (zcal-goto.g)
      function tzProbeGoCode(x, y) {
        return 'M98 P"0:/sys/workshop/macros/zcal-goto.g" X' + x + " Y" + y;
      }

      // "Focus here": with a probe focushere.g measures the surface where the head is (T = thickness to compare, optional); without one the
      // paper sets Z0 here. h = focus height above the surface, paper = thickness of the sheet (mm)
      function tzProbeFocusHereCode(info, h, thickness, paper) {
        if (!info.measures) return tzProbePaperCode(h, paper);
        return 'M98 P"0:/sys/workshop/macros/focushere.g" H' + h + (thickness > 0 ? " T" + thickness : "");
      }
