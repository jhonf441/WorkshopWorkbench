      // ---- "Work zones" page (Plugins -> Work zones) ----
      //
      // Advanced management of the zones (G54..G59.3), request 2026-10-08. The
      // jog's floating panel remains the quick control; this page is
      // to see and manage everything calmly:
      //   - bed map: travel (M208), cutting area (sys/workshop/zones/cutarea.g),
      //     each zone's point (material corner, bed coords) and the
      //     live head (pointer + where the laser lands).
      //   - table with point, applied origin, focus macro and
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
      //   ; G55 <name> -- <info> (... machine X<point> Y<point> ...)
      // (only the name before " --" and the G10 line are read back)
      //   G10 L2 P2 X{<pointX> + (global.laserOffsetOn ? global.workshopLaserCorrX : 0)} Y{<pointY> + (global.laserOffsetOn ? global.workshopLaserCorrY : 0)} Z0
      // "point" = where the POINTER lands on the material's corner (bed
      // coords); the laser lands at (head position - correction).
      // One source for the laser <-> pointer correction: the "laser" settings store (Machine > Offsets). A zone keeps no copy of it:
      // the service mirrors the store into sys/workshop/macros/lasercorrection.g (the globals above), which workplaces.g / wpload.g
      // run before the zones, so a new correction needs no zone rewritten. The page reads it with tzDataCutCorrection.

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

      // The focus height H (mm above the surface) a material macro may carry: ONE range for the whole chain (focusrule.g, laserfocus.g, focushere.g,
      // the editor and the zones file). 0.3 and not 1 because the maker table gives 0.467 for 15 mm or more with the reference laser.
      var TZ_FOCUS_H_MIN = 0.3;
      var TZ_FOCUS_H_MAX = 60;
      function tzFocusHeightOk(h) {
        return typeof h === "number" && isFinite(h) && h >= TZ_FOCUS_H_MIN && h <= TZ_FOCUS_H_MAX;
      }
      // The file name of a material macro (macros/laser/<name>): letters, digits and _ . - only, always ending in .g, with a name of its own
      // (the zone's when there is none). What the normal save does; the zones file goes through it too.
      function tzFocusMacroFile(raw, zoneName) {
        var m = String(raw || "").trim().replace(/[^A-Za-z0-9_.-]/g, "");
        if (!m.replace(/\.g$/i, "").replace(/\./g, "")) m = tzSlug(zoneName);
        return /\.g$/i.test(m) ? m : m + ".g";
      }
      // Why a zone has no usable file: the p<N>.g is not there (or it is not understood)
      function tzNoZoneText(ctx, wn) {
        return i18nT("zoneActive.has_no_zone_file_create_it", { code: TZ_CODES[wn] });
      }

      // Reads a zone from its file (null if it has none / it is not understood).
      function tzParseZoneFile(txt) {
        var lines = (txt || "").replace(/^﻿/, "").split("\n");
        var first = lines[0] || "";
        var nm = first.match(/^;\s*G5[4-9](?:\.\d)?\s+(?!--)(.+?)(?:\s+--.*)?\s*$/);
        var g10 = txt.match(
          /X\{\s*(-?[\d.]+)\s*\+\s*\(global\.laserOffsetOn \?\s*global\.workshopLaserCorrX\s*:\s*0\)\s*\}\s*Y\{\s*(-?[\d.]+)\s*\+\s*\(global\.laserOffsetOn \?\s*global\.workshopLaserCorrY\s*:\s*0\)\s*\}/
        );
        if (g10) {
          return {
            name: nm ? nm[1] : "",
            refX: parseFloat(g10[1]),
            refY: parseFloat(g10[2]),
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
          ")";
        var g10 =
          "G10 L2 P" +
          (idx + 1) +
          " X{" +
          tzNum(z.refX) +
          " + (global.laserOffsetOn ? global.workshopLaserCorrX : 0)} Y{" +
          tzNum(z.refY) +
          " + (global.laserOffsetOn ? global.workshopLaserCorrY : 0)} Z0";
        return head + "\n" + g10 + "\n";
      }

      // The zones file (Zones page > Export / Import) is a file of the exchange standard (src/_shared/18-exchange.js,
      // docs-internal/DATA-EXCHANGE.md): the envelope and, as its data, the object tzZonesExport returns.
      function tzZonesFileSpec() {
        return { format: "workshop-zones", version: 1, plugin: "WorkshopWorkbench" };
      }
      function tzZonesImportSpec() {
        var f = tzZonesFileSpec();
        return { format: f.format, versions: [f.version], plugins: [f.plugin] };
      }

      // The data of the zones file: { zones: [{zone, p, name, pointX, pointY, focus: {height, macro} | null}] }
      function tzZonesExport(zones, focusByZone) {
        var out = { zones: [] };
        zones.forEach(function (z, i) {
          if (!z) return;
          var f = focusByZone[i];
          out.zones.push({
            zone: TZ_CODES[i],
            p: i + 1,
            name: z.name,
            pointX: z.refX,
            pointY: z.refY,
            focus: f ? { height: f.h, macro: f.macro } : null,
          });
        });
        return out;
      }
      // [{p, name, x, y, focus: {h, macro} | null}] of the data of a zones file, or null when it has no list of zones
      function tzZonesImportItems(data) {
        if (!data || typeof data !== "object" || !Array.isArray(data.zones)) return null;
        return data.zones
          .map(function (z) {
            if (!z) return null;
            var fo = z.focus;
            var it = { p: z.p, name: z.name, x: z.pointX, y: z.pointY, focus: null };
            // a focus that is not a number in the range of the macros is not taken and is reported (tzZonesImportProblems): never written
            if (fo && tzFocusHeightOk(fo.height)) it.focus = { h: fo.height, macro: tzFocusMacroFile(fo.macro, z.name) };
            else if (fo) it.focusBad = true;
            return it;
          })
          .filter(function (it) {
            return it && typeof it.p === "number" && Math.floor(it.p) === it.p && it.p >= 1 && it.p <= 9 && isFinite(it.x) && isFinite(it.y);
          });
      }

      // What is wrong with the zones of a file for this machine: ["G55: <errors>"] (the rules of saving a zone, tzValidate, with the correction of THIS machine: a file carries none)
      function tzZonesImportProblems(items, st, mc) {
        var problems = [];
        items.forEach(function (it) {
          var errs = tzValidate({ refX: it.x, refY: it.y }, st, mc);
          if (it.focusBad) errs.push(i18nT("zonesPage.focus_height_range", { min: TZ_FOCUS_H_MIN, max: TZ_FOCUS_H_MAX }));
          if (errs.length) problems.push(TZ_CODES[it.p - 1] + ": " + errs.join("; "));
        });
        return problems;
      }

      // The rows of the import preview: one per zone, saying whether it is new or replaces the one the machine has now (zones = those of the page)
      function tzZonesImportRows(items, zones) {
        return items.map(function (it) {
          var code = TZ_CODES[it.p - 1];
          var now = zones[it.p - 1];
          var focus = it.focus && isFinite(it.focus.h) ? i18nT("zonesPage.import_row_focus", { h: tzFmt(it.focus.h) }) : "";
          return {
            label: now ? i18nT("zonesPage.import_label_replaces", { code: code, old: now.name || code }) : i18nT("zonesPage.import_label_new", { code: code }),
            value: i18nT("zonesPage.import_row_value", { name: it.name || code, x: tzFmt(it.x), y: tzFmt(it.y), focus: focus }),
          };
        });
      }

      // Same rules as sys/workshop/macros/saveworkplace.g: the point and the point+correction
      // inside the travel (the offset flag can be changed afterwards),
      // and the point inside the active mode's cutting area if it is measured.
      // corr = the machine's correction {cx, cy} (tzDataCutCorrection) or null when it was never measured (the board adds 0).
      function tzValidate(z, st, corr) {
        var errs = [];
        var ax = st && st.axes;
        if (!ax || !ax.X || !ax.Y) return errs;
        [
          ["X", z.refX, (corr && corr.cx) || 0],
          ["Y", z.refY, (corr && corr.cy) || 0],
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
