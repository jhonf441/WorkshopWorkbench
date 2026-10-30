      // ---- Workbench page, part 6a: the magnet of the map (step 6 of the restructuring, docs-internal/INTERFACES.md) ----
      // Reference points, the point a tap snaps to (references, saved positions, the points of Simulate and of the open tool's
      // module) and the yellow ring under the cursor. The state psn is private to this file.
      // deps: shell (svg, drawn map), nav (open tab, its modules), layerState (references and positions shown), data, view.

      function tzSnapCreate(deps) {
        var psn = { shell: deps.shell, nav: deps.nav, layerState: deps.layerState, data: deps.data, view: deps.view };
        // Snap mark under the cursor (yellow ring). It is put back after
        // each renderMap (which redoes the SVG).
        psn.hoverSnap = null;
        return {
          refPoints: tzBind(tzSnapRefPoints, psn),
          snapNear: tzBind(tzSnapNear, psn),
          snapTol: tzBind(tzSnapTol, psn),
          mapPick: tzBind(tzSnapMapPick, psn),
          hover: function () { return psn.hoverSnap; },
          setHover: function (p) { psn.hoverSnap = p; },
          placeSnapMarker: tzBind(tzSnapPlaceMarker, psn),
        };
      }

      // REFERENCE points that always exist (request: "points that
      // always exist on the map and serve as a reference, e.g. center of the
      // cutting area, center of the bed, with its button to see them or not").
      // They come from the travel (M208) and the active mode's cutting area.
      // With the layer visible, tapping the map near one (~12 px) snaps to
      // that exact point (magnet), to choose destinations / draw from there.
      function tzSnapRefPoints(psn) {
        var out = [];
        var lim = psn.data.st() && psn.data.cutLimits();
        if (!lim) return out;
        var r2 = function (v) { return Math.round(v * 100) / 100; };
        out.push({ name: i18nT('zonesPage.bed_centre'), short: i18nT('zonesPage.bed_center'), x: r2((lim.xmin + lim.xmax) / 2), y: r2((lim.ymin + lim.ymax) / 2) });
        if (0 >= lim.xmin && 0 <= lim.xmax && 0 >= lim.ymin && 0 <= lim.ymax) out.push({ name: i18nT('zonesPage.machine_origin_x0_y0'), short: "X0 Y0", x: 0, y: 0 });
        psn.data.zones().forEach(function (z, i) {
          var sz = z && psn.data.zoneSizes()[i];
          if (!sz || !(sz.w > 0) || !(sz.h > 0)) return;
          out.push({
            name: i18nT('zonesPage.centre_of_material_x_mm', { code: TZ_CODES[i], v: z.name ? " " + z.name : "", w: tzFmt(sz.w), h: tzFmt(sz.h) }),
            short: i18nT('zonesPage.centre', { code: TZ_CODES[i] }),
            x: r2(z.refX + sz.w / 2),
            y: r2(z.refY + sz.h / 2),
            zone: i,
          });
        });
        var a = psn.data.st().cutArea;
        if (a) {
          var m = psn.data.st().mode;
          out.push({ name: i18nT('zonesPage.centre_of_the_cut_area', { m: m }), short: i18nT('zonesPage.area_center'), x: r2((a[0] + a[1]) / 2), y: r2((a[2] + a[3]) / 2) });
          out.push({ name: i18nT('zonesPage.cut_area_bottom_left_corner'), short: "", x: a[0], y: a[2] });
          out.push({ name: i18nT('zonesPage.cut_area_bottom_right_corner'), short: "", x: a[1], y: a[2] });
          out.push({ name: i18nT('zonesPage.cut_area_top_left_corner'), short: "", x: a[0], y: a[3] });
          out.push({ name: i18nT('zonesPage.cut_area_top_right_corner'), short: "", x: a[1], y: a[3] });
          out.push({ name: i18nT('zonesPage.cut_area_middle_of_the_left'), short: "", x: a[0], y: r2((a[2] + a[3]) / 2) });
          out.push({ name: i18nT('zonesPage.cut_area_middle_of_the_right'), short: "", x: a[1], y: r2((a[2] + a[3]) / 2) });
          out.push({ name: i18nT('zonesPage.cut_area_middle_of_the_bottom'), short: "", x: r2((a[0] + a[1]) / 2), y: a[2] });
          out.push({ name: i18nT('zonesPage.cut_area_middle_of_the_top'), short: "", x: r2((a[0] + a[1]) / 2), y: a[3] });
        }
        return out;
      }

      function tzSnapRefNear(psn, p, tolMap) {
        if (!psn.layerState.layers().refs || !p) return null;
        var best = null, bd = tolMap;
        tzSnapRefPoints(psn).forEach(function (q) {
          var d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d <= bd) { bd = d; best = q; }
        });
        return best;
      }

      // Magnet: reference or point of the active layout (e.g. mesh points in
      // Mesh, request 2026-10-08: "stand on a mesh point and have
      // magnetism") closest to p, within tolMap.
      function tzSnapNear(psn, p, tolMap) {
        if (!p) return null;
        var best = tzSnapRefNear(psn, p, tolMap);
        var bd = best ? Math.hypot(best.x - p.x, best.y - p.y) : tolMap;
        // Saved positions (orange diamonds) also with magnet (request 2026-10-09)
        if (psn.layerState.layers().positions)
          psn.data.savedPos().forEach(function (q) {
            var d = Math.hypot(q.x - p.x, q.y - p.y);
            if (d <= bd) { bd = d; best = { x: q.x, y: q.y, name: q.name || i18nT('zonesPage.position') }; }
          });
        // what is on the map in "Simulate job" (the file in view and the jobs of the board): corners, middles, centre and outline
        if (psn.nav.layout() === "simulate" && psn.nav.module("tvista"))
          psn.nav.module("tvista").snapPoints().forEach(function (q) {
            var d = Math.hypot(q.x - p.x, q.y - p.y);
            if (d <= bd) { bd = d; best = q; }
          });
        var mod = psn.nav.layMod();
        if (mod && mod.snapPoints) {
          mod.snapPoints().forEach(function (q) {
            var d = Math.hypot(q.x - p.x, q.y - p.y);
            if (d <= bd) { bd = d; best = q; }
          });
        }
        return best;
      }

      function tzSnapTol(psn) {
        return 12 * ((psn.view.mapView() || psn.view.mapFull() || { w: 1 }).w / (psn.shell.svg().clientWidth || 1));
      }

      // Touch point, rounded to 0.1 mm or snapped to the magnet point.
      function tzSnapMapPick(psn, p) {
        if (!p) return null;
        var q = tzSnapNear(psn, p, tzSnapTol(psn));
        var r = q ? { x: q.x, y: q.y } : { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
        // the bed is the travel of the axes (M208): no tool may place a point outside it
        var ax = psn.data.st() && psn.data.st().axes;
        if (ax && ax.X && ax.Y && typeof ax.X.min === "number" && typeof ax.X.max === "number" && typeof ax.Y.min === "number" && typeof ax.Y.max === "number") {
          r.x = Math.min(Math.max(r.x, ax.X.min), ax.X.max);
          r.y = Math.min(Math.max(r.y, ax.Y.min), ax.Y.max);
        }
        return r;
      }

      function tzSnapPlaceMarker(psn) {
        var old = psn.shell.svg().querySelector("#tz-snapmk");
        if (old) old.parentNode.removeChild(old);
        if (!psn.hoverSnap) return;
        var r = 9 * ((psn.view.mapView() || psn.view.mapFull() || { w: 1 }).w / (psn.shell.svg().clientWidth || 1));
        var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("id", "tz-snapmk");
        c.setAttribute("cx", psn.hoverSnap.x);
        c.setAttribute("cy", -psn.hoverSnap.y);
        c.setAttribute("r", r);
        c.setAttribute("fill", "none");
        c.setAttribute("stroke", "#ffeb3b");
        c.setAttribute("stroke-width", r / 4);
        c.setAttribute("pointer-events", "none");
        (psn.shell.mapRoot() || psn.shell.svg()).appendChild(c);
      }

