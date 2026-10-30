      // ---- "Work zones" page (Plugins -> Work zones) ----
      //
      // Advanced management of the zones (G54..G59.3), request 2026-10-08. The
      // jog's floating panel remains the quick control; this page is
      // to see and manage everything calmly:
      //   - bed map: travel (M208), cutting area (sys/workshop/zones/cutarea.g),
      //     each zone's point (material corner, bed coords) and the
      //     live head (pointer + where the laser lands).
      //   - table with point, correction, applied origin, focus macro and
      //     warnings; Use / Go / Edit / Copy / History / Delete.
      //   - editor and "New zone": writes sys/workshop/zones/p<N>.g in the SAME format
      //     as sys/workshop/macros/saveworkplace.g (read by the jog and workplaces.g) and creates or
      //     updates the material macro macros/laser/<file>.g that calls
      //     sys/workshop/macros/laserfocus.g (used by "Measure and focus" and live jobs).
      //   - history: each write first saves a copy in
      //     sys/workshop/zones/history/p<N>-<date>.g and it can be restored.
      //   - export / import all the zones as JSON.
      //
      // Format of sys/workshop/zones/p<N>.g (see sys/workshop/macros/saveworkplace.g):
      //   ; G55 <name> -- <info> (... machine X<point> Y<point>, correction X<cx> Y<cy> ...)
      // (only the name before " --" and the G10 line are read back)
      //   G10 L2 P2 X{<pointX> + (global.laserOffsetOn ? <cx> : 0)} Y{<pointY> + (global.laserOffsetOn ? <cy> : 0)} Z0
      // "point" = where the POINTER lands on the material's corner (bed
      // coords); the laser lands at (head position - correction).

      var TZ_CODES = ["G54", "G55", "G56", "G57", "G58", "G59", "G59.1", "G59.2", "G59.3"];
      var TZ_STATUS_POLL_MS = 1000; // moviendose
      var TZ_STATUS_IDLE_MS = 3000; // maquina quieta (idle): menos carga en el sistema
      var TZ_FILES_POLL_MS = 15000;
      var TZ_STYLE_ID = "workshop-zones-style";
      var TZ_NAME_MAX = 40;

      // (file access, tzStamp and tzLocalTime: src/_workbench_base/10-files.js, shared with the Jog)

      function tzCleanName(s) {
        return String(s || "")
          .replace(/["\r\n;]/g, "")
          .replace(/--+/g, "-")
          .trim()
          .slice(0, TZ_NAME_MAX);
      }
      function tzSlug(s) {
        var t = String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "");
        return t || "zone";
      }

      // Reads a zone from its file (null if it has none / it is not understood).
      function tzParseZoneFile(txt) {
        var lines = (txt || "").replace(/^﻿/, "").split("\n");
        var first = lines[0] || "";
        var nm = first.match(/^;\s*G5[4-9](?:\.\d)?\s+(?!--)(.+?)(?:\s+--.*)?\s*$/);
        var g10 = txt.match(
          /X\{\s*(-?[\d.]+)\s*\+\s*\(global\.laserOffsetOn \?\s*(-?[\d.]+)\s*:\s*0\)\s*\}\s*Y\{\s*(-?[\d.]+)\s*\+\s*\(global\.laserOffsetOn \?\s*(-?[\d.]+)\s*:\s*0\)\s*\}/
        );
        if (g10) {
          return {
            name: nm ? nm[1] : "",
            refX: parseFloat(g10[1]),
            correctionX: parseFloat(g10[2]),
            refY: parseFloat(g10[3]),
            correctionY: parseFloat(g10[4]),
          };
        }
        return null;
      }

      function tzZoneFileText(idx, z, info) {
        var code = TZ_CODES[idx];
        var head =
          "; " +
          code +
          (z.name ? " " + z.name : "") +
          " -- " +
          info +
          " (machine X" +
          tzNum(z.refX) +
          " Y" +
          tzNum(z.refY) +
          ", correction X" +
          tzNum(z.correctionX) +
          " Y" +
          tzNum(z.correctionY) +
          ")";
        var g10 =
          "G10 L2 P" +
          (idx + 1) +
          " X{" +
          tzNum(z.refX) +
          " + (global.laserOffsetOn ? " +
          tzNum(z.correctionX) +
          " : 0)} Y{" +
          tzNum(z.refY) +
          " + (global.laserOffsetOn ? " +
          tzNum(z.correctionY) +
          " : 0)} Z0";
        return head + "\n" + g10 + "\n";
      }

      // Zones export (Zones page > Export), format workshop-zones-v2.
      // Returns [{p, name, x, y, cx, cy, focus: {h, macro} | null}] or null.
      function tzZonesExport(zones, focusByZone) {
        var out = { format: "workshop-zones-v2", exported: new Date().toISOString(), zones: [] };
        zones.forEach(function (z, i) {
          if (!z) return;
          var f = focusByZone[i];
          out.zones.push({
            zone: TZ_CODES[i],
            p: i + 1,
            name: z.name,
            pointX: z.refX,
            pointY: z.refY,
            correctionX: z.correctionX,
            correctionY: z.correctionY,
            focus: f ? { height: f.h, macro: f.macro } : null,
          });
        });
        return out;
      }
      function tzZonesImportItems(data) {
        if (!data || typeof data !== "object") return null;
        if (data.format !== "workshop-zones-v2" || !Array.isArray(data.zones)) return null;
        return data.zones
          .map(function (z) {
            if (!z) return null;
            var fo = z.focus;
            return {
              p: z.p,
              name: z.name,
              x: z.pointX,
              y: z.pointY,
              cx: z.correctionX || 0,
              cy: z.correctionY || 0,
              focus: fo ? { h: fo.height, macro: fo.macro } : null,
            };
          })
          .filter(function (it) {
            return it && it.p >= 1 && it.p <= 9 && isFinite(it.x) && isFinite(it.y);
          });
      }

      // Same rules as sys/workshop/macros/saveworkplace.g: the point and the point+correction
      // inside the travel (the offset flag can be changed afterwards),
      // and the point inside the active mode's cutting area if it is measured.
      function tzValidate(z, st) {
        var errs = [];
        var ax = st && st.axes;
        if (!ax || !ax.X || !ax.Y) return errs;
        [
          ["X", z.refX, z.correctionX],
          ["Y", z.refY, z.correctionY],
        ].forEach(function (t) {
          var a = ax[t[0]];
          var vals = [t[1], t[1] + t[2]];
          if (
            vals.some(function (v) {
              return !isFinite(v) || v < a.min || v > a.max;
            })
          ) {
            errs.push(
              i18nT('zonesPage.outside_the_travel_to_point_with', { t: t[0], min: a.min, max: a.max, t2: tzFmt(t[1]), v: tzFmt(t[1] + t[2]) })
            );
          }
        });
        var area = st.cutArea;
        if (area && (z.refX < area[0] || z.refX > area[1] || z.refY < area[2] || z.refY > area[3])) {
          errs.push(
            i18nT('zonesPage.point_outside_the_cut_area_x', { area: area[0], area2: area[1], area3: area[2], area4: area[3] })
          );
        }
        return errs;
      }
