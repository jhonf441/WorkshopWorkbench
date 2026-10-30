      // ---- CNC toolpaths: pure calculation (stage 7 of the redesign) ----
      //
      // No DOM, no machine, no globals of the page: everything here is data in, data out so that
      // tests/cnc-passes.test.js and tests/cnc-gcode.test.js can run it with plain node.
      //
      // Coordinates: millimetres, bed coordinates (the same frame as the cut area), Y up. Z0 is the SURFACE of the material:
      // depths are positive numbers in the design and become negative Z in the G-code. The user sets the Z0 of the
      // active work coordinate system on the material before running the file (the file says so in its header).
      //
      // Nothing here sends anything to the machine. The G-code is text; the card writes it to a file and the user starts it.
      //
      //   shape  = { id, nombre, tipo: "linea"|"rect"|"circulo"|"bolsillo", profundidad, lado: "centro"|"dentro"|"fuera",
      //              linea: x1 y1 x2 y2 | rect and bolsillo: x y w h (corner with the smallest X and Y) | circulo: cx cy r }
      //   tool   = { nombre, diametro, avance, avancePen, rpm, altSegura, altAprox, profPasada, solape, husilloManual }
      //            (a value that is empty or 0 in the tool is taken from the material: avance, rpm, altSegura, profPasada)
      //   material = an item of materials.json with modo "CNC": { nombre, grosor, fresa, rpm, avance, altSegura, profPasada }

      var TZ_CNC_FORMAT = 1; // v of cnc-designs.json
      var TZ_CNC_KINDS = ["line", "rect", "circle", "pocket"];
      // defaults that need no value of the owner: only used when neither the tool nor the material says anything
      var TZ_CNC_DEFAULTS = { altApprox: 1, overlap: 0.4, marginBackground: 0.2, waitSpindle: 0 };

      function tzCncNum(v) {
        var x = typeof v === "number" ? v : parseFloat(String(v === undefined || v === null ? "" : v).replace(",", "."));
        return isFinite(x) ? x : null;
      }
      function tzCncPos(v) {
        var x = tzCncNum(v);
        return x !== null && x > 0 ? x : null;
      }

      // Effective settings of a job: the tool wins over the material; nothing is invented except the documented defaults.
      function tzCncSettings(material, tool) {
        var h = tool || {};
        var m = material || {};
        var avance = tzCncPos(h.feed) || tzCncPos(m.feed);
        var altSegura = tzCncPos(h.altSafe) || tzCncPos(m.altSafe);
        var altApprox = tzCncPos(h.altApprox) || TZ_CNC_DEFAULTS.altApprox;
        if (altSegura && altApprox > altSegura) altApprox = altSegura;
        var overlap = tzCncNum(h.overlap);
        if (!(overlap > 0 && overlap <= 1)) overlap = TZ_CNC_DEFAULTS.overlap;
        return {
          diameter: tzCncPos(h.diameter) || tzCncPos(m.diameter),
          feed: avance,
          feedPen: tzCncPos(h.feedPen) || (avance ? Math.max(1, Math.round(avance / 2)) : null),
          rpm: tzCncPos(h.rpm) || tzCncPos(m.rpm),
          altSafe: altSegura,
          altApprox: altApprox,
          step: tzCncPos(h.profPass) || tzCncPos(m.profPass),
          overlap: overlap,
          spindleManual: !!h.spindleManual,
        };
      }

      // Depth levels (negative Z, from the first to the last) of a total depth in steps of at most `paso`:
      // n = ceil(depth / step); the last pass only takes what is left. null when depth or step are not valid.
      function tzCncLevels(profundidad, step) {
        var p = tzCncPos(profundidad), s = tzCncPos(step);
        if (!p || !s) return null;
        var n = Math.ceil(p / s - 1e-9);
        var out = [];
        for (var k = 1; k <= n; k++) out.push(-Math.round(Math.min(p, s * k) * 10000) / 10000);
        return out;
      }

      // Passes of one shape: levels, feed, spindle speed and heights from the material and the tool, plus the codes of what is
      // missing. errores block the file; avisos only warn.
      //   { ok, errores: [{c, ...}], avisos: [{c, ...}], niveles: [z...], avance, avancePen, rpm, altSegura, altAprox, paso, profundidad }
      function tzCncPasses(shape, material, tool) {
        var a = tzCncSettings(material, tool);
        var errors = [], notices = [];
        var prof = shape ? tzCncPos(shape.depth) : null;
        if (!prof) errors.push({ c: "depth" });
        if (!a.step) errors.push({ c: "step" });
        if (!a.feed) errors.push({ c: "feed" });
        if (!a.altSafe) errors.push({ c: "height_safe" });
        if (!a.diameter) errors.push({ c: "tool" });
        if (!a.rpm && !a.spindleManual) errors.push({ c: "spindle" });
        if (a.step && a.diameter && a.step > a.diameter * 2) notices.push({ c: "step_large", step: a.step, diameter: a.diameter });
        var gr = material ? tzCncPos(material.thickness) : null;
        if (prof && gr && prof > gr + TZ_CNC_DEFAULTS.marginBackground + 1e-9) errors.push({ c: "more_that_thickness", depth: prof, thickness: gr });
        if (prof && gr && prof > gr && prof <= gr + TZ_CNC_DEFAULTS.marginBackground + 1e-9) notices.push({ c: "crosses", depth: prof, thickness: gr });
        var niveles = errors.some(function (e) { return e.c === "depth" || e.c === "step"; }) ? [] : tzCncLevels(prof, a.step) || [];
        return {
          ok: errors.length === 0,
          errors: errors,
          notices: notices,
          levels: niveles,
          feed: a.feed,
          feedPen: a.feedPen,
          rpm: a.rpm,
          altSafe: a.altSafe,
          altApprox: a.altApprox,
          step: a.step,
          depth: prof,
        };
      }

      // ---- geometry: contours of the TOOL CENTER ----
      // contour = { k: "poly", pts: [[x, y]...], cerrado } | { k: "circ", cx, cy, r }
      function tzCncRect(x0, y0, x1, y1) {
        return { k: "poly", pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], closed: true };
      }
      // Tool center path of a shape: { ok, contornos, continuo, error }. continuo: the contours are chained at depth (pocket rings).
      function tzCncOutlines(shape, tool, material) {
        var a = tzCncSettings(material, tool);
        var r = a.diameter ? a.diameter / 2 : 0;
        var f = shape || {};
        var side = f.side === "inside" ? -1 : f.side === "outside" ? 1 : 0;
        function failure(c) { return { ok: false, outlines: [], continuous: false, error: c }; }
        if (f.kind === "line") {
          var p = [tzCncNum(f.x1), tzCncNum(f.y1), tzCncNum(f.x2), tzCncNum(f.y2)];
          if (p.some(function (v) { return v === null; })) return failure("geometry");
          if (Math.hypot(p[2] - p[0], p[3] - p[1]) < 1e-6) return failure("geometry");
          return { ok: true, outlines: [{ k: "poly", pts: [[p[0], p[1]], [p[2], p[3]]], closed: false }], continuous: false };
        }
        if (f.kind === "rect" || f.kind === "pocket") {
          var x = tzCncNum(f.x), y = tzCncNum(f.y), w = tzCncPos(f.w), h = tzCncPos(f.h);
          if (x === null || y === null || !w || !h) return failure("geometry");
          if (f.kind === "rect") {
            var d = side * r;
            var x0 = x - d, x1 = x + w + d, y0 = y - d, y1 = y + h + d;
            if (x1 - x0 <= 1e-6 || y1 - y0 <= 1e-6) return failure("tool_large");
            return { ok: true, outlines: [tzCncRect(x0, y0, x1, y1)], continuous: false };
          }
          // pocket: rings from the wall to the middle; the last ring closes on the middle line if the pocket is narrow
          if (!r) return failure("tool_large");
          if (Math.min(w, h) < a.diameter - 1e-9) return failure("tool_large");
          var step = a.diameter * a.overlap;
          var maxInset = Math.min(w, h) / 2;
          var rings = [];
          var prevInset = null;
          for (var inset = r; ; inset += step) {
            if (inset >= maxInset - 1e-9) {
              inset = maxInset; // the last ring: a line or a point in the middle
              // the previous ring already reaches the middle with the radius of the tool: nothing left to cut
              if (prevInset === null || prevInset + r < maxInset - 1e-9) rings.push(tzCncRect(x + inset, y + inset, x + w - inset, y + h - inset));
              break;
            }
            rings.push(tzCncRect(x + inset, y + inset, x + w - inset, y + h - inset));
            prevInset = inset;
            if (rings.length > 2000) return failure("geometry");
          }
          return { ok: true, outlines: rings, continuous: true };
        }
        if (f.kind === "circle") {
          var cx = tzCncNum(f.cx), cy = tzCncNum(f.cy), rr = tzCncPos(f.r);
          if (cx === null || cy === null || !rr) return failure("geometry");
          var re = rr + side * r;
          if (re <= 1e-6) return failure("tool_large");
          return { ok: true, outlines: [{ k: "circular", cx: cx, cy: cy, r: re }], continuous: false };
        }
        return failure("geometry");
      }

      // Whole plan of a design: one entry per shape with its levels and contours. `opts`: { unidades, sentido, sistema,
      // esperaHusillo, nombre, fecha }. Plain data: tzCncGcode and the map preview read it.
      function tzCncPlan(shapes, material, tool, opts) {
        opts = opts || {};
        var a = tzCncSettings(material, tool);
        var errors = [], notices = [], out = [];
        (shapes || []).forEach(function (f, i) {
          var ps = tzCncPasses(f, material, tool);
          var cn = tzCncOutlines(f, tool, material);
          var nm = f.name || f.id || "#" + (i + 1);
          ps.errors.forEach(function (e) { errors.push(Object.assign({ shape: nm }, e)); });
          ps.notices.forEach(function (e) { notices.push(Object.assign({ shape: nm }, e)); });
          if (!cn.ok) errors.push({ shape: nm, c: cn.error });
          out.push({ id: f.id, name: nm, kind: f.kind, levels: ps.levels, outlines: cn.outlines, continuous: cn.continuous });
        });
        if (!out.length) errors.push({ c: "without_shapes" });
        // the same error of every shape (a missing tool, feed...) is reported once
        var seen = {};
        errors = errors.filter(function (e) {
          if (["tool", "feed", "spindle", "height_safe", "step"].indexOf(e.c) < 0) return true;
          if (seen[e.c]) return false;
          seen[e.c] = true;
          return true;
        });
        return {
          v: TZ_CNC_FORMAT,
          ok: errors.length === 0,
          errors: errors,
          notices: notices,
          units: opts.units === "in" ? "in" : "mm",
          direction: opts.direction === "cw" ? "cw" : "ccw",
          system: /^G5[4-9](\.[1-3])?$/.test(String(opts.system || "")) ? opts.system : "",
          waitSpindle: tzCncPos(opts.waitSpindle) || TZ_CNC_DEFAULTS.waitSpindle,
          name: opts.name || "",
          date: opts.date || "",
          tool: a,
          shapes: out,
        };
      }

      // The deepest pass of the plan (mm below Z0, positive; 0 without levels).
      function tzCncDeepest(plan) {
        var d = 0;
        plan.shapes.forEach(function (f) { f.levels.forEach(function (z) { d = Math.max(d, -z); }); });
        return d;
      }

      // Does the toolpath stay inside the area and within the Z the machine has at this Z0, away from the clamps?
      //   area  = { xmin, xmax, ymin, ymax } (cut area; null = no check)
      //   z     = { min, max, z0 } in machine mm: travel of the Z axis and the Z0 of the active work system (its offset); a field that is
      //           not known is null. z0 = 0 means the zero was never set on the material (the file is still made; the start is not).
      //   clamps = [{ name, x, y, w, h, height }] of the map (bed coordinates; height = mm above the material, missing = unknown)
      // Returns the codes of what is wrong; the card shows them and blocks the file.
      function tzCncValidate(plan, area, z, clamps) {
        var errors = [], notices = [];
        if (!area) notices.push({ c: "without_area" });
        var r = plan.tool && plan.tool.diameter ? plan.tool.diameter / 2 : 0;
        var outside = [], overClamp = [], hitClamps = {};
        var cl = clamps || [];
        plan.shapes.forEach(function (f) {
          if (area) {
            var bb = tzCncBox(f.outlines);
            // the tool body reaches r beyond its center: the whole cutter must stay inside the area
            if (bb && (bb.xmin - r < area.xmin - 1e-6 || bb.xmax + r > area.xmax + 1e-6 || bb.ymin - r < area.ymin - 1e-6 || bb.ymax + r > area.ymax + 1e-6)) outside.push(f.name);
          }
          // the cutter at depth may not pass over a clamp (the body counts: the rectangle grows by r)
          var hits = cl.filter(function (q) { return f.levels.length && tzCncOverRect(f.outlines, q, r); });
          if (hits.length) {
            overClamp.push(f.name);
            hits.forEach(function (q) { hitClamps[q.name || "#" + (cl.indexOf(q) + 1)] = true; });
          }
        });
        if (outside.length) errors.push({ c: "outside_area", shapes: outside.join(", ") });
        if (overClamp.length) errors.push({ c: "over_clamp", shapes: overClamp.join(", "), clamps: Object.keys(hitClamps).join(", ") });
        // Z: the depth against the travel, and against the room left below / above the real Z0
        var zi = z || {};
        var zMax = tzCncDeepest(plan);
        var route = zi.min !== null && zi.min !== undefined && zi.max !== null && zi.max !== undefined && isFinite(zi.min) && isFinite(zi.max) ? zi.max - zi.min : null;
        if (route !== null && zMax > route + 1e-6) errors.push({ c: "outside_z", depth: zMax, route: route });
        var z0 = typeof zi.z0 === "number" && isFinite(zi.z0) ? zi.z0 : null;
        var safe = plan.tool && plan.tool.altSafe ? plan.tool.altSafe : 0;
        if (z0 === null) notices.push({ c: "z0_unknown" });
        else if (z0 === 0) notices.push({ c: "z0_not_set" });
        else {
          if (route !== null && z0 - zMax < zi.min - 1e-6) errors.push({ c: "below_z_min", depth: zMax, room: Math.round((z0 - zi.min) * 100) / 100 });
          if (route !== null && safe && z0 + safe > zi.max + 1e-6) errors.push({ c: "safe_above_z_max", safe: safe, room: Math.round((zi.max - z0) * 100) / 100 });
        }
        // the safe height must clear every clamp of the map; a clamp without height cannot be checked
        var low = [], unknown = [];
        cl.forEach(function (q, i) {
          var nm = q.name || "#" + (i + 1);
          var h = tzCncNum(q.height);
          if (h === null) unknown.push(nm);
          else if (safe && safe <= h + 1e-6) low.push(nm + " (" + h + " mm)");
        });
        if (low.length) errors.push({ c: "safe_below_clamp", safe: safe, clamps: low.join(", ") });
        if (unknown.length) notices.push({ c: "clamp_no_height", clamps: unknown.join(", ") });
        return { ok: errors.length === 0, errors: errors, notices: notices };
      }

      // segments [[x1, y1, x2, y2]...] of one tool center contour (a circle as a 48-gon)
      function tzCncOutlineSegs(c) {
        var out = [];
        if (c.k === "circular") {
          var prev = null;
          for (var i = 0; i <= 48; i++) {
            var an = (i / 48) * Math.PI * 2;
            var q = [c.cx + c.r * Math.cos(an), c.cy + c.r * Math.sin(an)];
            if (prev) out.push([prev[0], prev[1], q[0], q[1]]);
            prev = q;
          }
        } else for (var j = 1; j < c.pts.length; j++) out.push([c.pts[j - 1][0], c.pts[j - 1][1], c.pts[j][0], c.pts[j][1]]);
        return out;
      }

      // Does a segment touch the rectangle { x, y, w, h } grown by r on every side? (Liang-Barsky clip: a non empty part inside)
      function tzCncSegHitsRect(s, q, r) {
        var x0 = q.x - r, x1 = q.x + q.w + r, y0 = q.y - r, y1 = q.y + q.h + r;
        var dx = s[2] - s[0], dy = s[3] - s[1];
        var t0 = 0, t1 = 1;
        var p = [-dx, dx, -dy, dy], qq = [s[0] - x0, x1 - s[0], s[1] - y0, y1 - s[1]];
        for (var i = 0; i < 4; i++) {
          if (p[i] === 0) { if (qq[i] < 0) return false; continue; }
          var t = qq[i] / p[i];
          if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
          else { if (t < t0) return false; if (t < t1) t1 = t; }
        }
        return t0 <= t1;
      }
      function tzCncOverRect(outlines, q, r) {
        return (outlines || []).some(function (c) { return tzCncOutlineSegs(c).some(function (s) { return tzCncSegHitsRect(s, q, r); }); });
      }

      // bounding box of the tool center path
      function tzCncBox(contornos) {
        var bb = null;
        function add(x, y) {
          if (!bb) bb = { xmin: x, xmax: x, ymin: y, ymax: y };
          bb.xmin = Math.min(bb.xmin, x); bb.xmax = Math.max(bb.xmax, x);
          bb.ymin = Math.min(bb.ymin, y); bb.ymax = Math.max(bb.ymax, y);
        }
        (contornos || []).forEach(function (c) {
          if (c.k === "circular") { add(c.cx - c.r, c.cy - c.r); add(c.cx + c.r, c.cy + c.r); }
          else c.pts.forEach(function (p) { add(p[0], p[1]); });
        });
        return bb;
      }

      // ---- G-code ----
      // Number in the unit of the file (mm, or inches divided by 25.4) without trailing zeros and without "-0".
      function tzCncN(v, units) {
        var x = units === "in" ? v / 25.4 : v;
        var s = x.toFixed(units === "in" ? 4 : 3);
        if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
        return s === "-0" ? "0" : s;
      }

      // Reversed copy of a contour (the direction of the cut: ccw / cw). Polygons are generated counter clockwise (Y up).
      function tzCncOrient(c, sentido) {
        if (c.k === "circular" || sentido !== "cw") return c;
        return { k: "poly", pts: c.pts.slice().reverse(), closed: c.closed };
      }

      // The guard of the file: the first code line of every CNC job (the same pattern as cutguard.g of the laser cuts). The macro aborts,
      // and that cancels the whole job before the spindle starts, unless the machine is in CNC mode, X Y Z are homed and the Z0 of the
      // active work system is set; with the depth (D) and the safe height (H), both in mm below / above Z0, it also checks that they fit
      // in the Z travel at the real Z0. The copy of the macro lives in src/_workbench_cut/sd/sys/workshop/macros/cncguard.g.
      var TZ_CNC_GUARD = "0:/sys/workshop/macros/cncguard.g";
      function tzCncGuardLine(plan) {
        var safe = plan.tool && plan.tool.altSafe ? plan.tool.altSafe : 0;
        return 'M98 P"' + TZ_CNC_GUARD + '" D' + tzCncN(tzCncDeepest(plan), "mm") + " H" + tzCncN(safe, "mm") + "   ; aborts and cancels the job unless the machine is ready (CNC mode, homed, Z0 set, Z travel)";
      }

      // The file. Never uses G53, homing or the laser words (M4, M106); the only macro is the guard of the first line: after it, only
      // G-code a plain CNC understands. Safe moves: Z up to the safe height before every rapid in XY; the cutter goes down only at the
      // start of each shape.
      function tzCncGcode(plan) {
        var u = plan.units;
        var h = plan.tool;
        var N = function (v) { return tzCncN(v, u); };
        var L = [];
        L.push("; Workshop CNC toolpaths (format " + plan.v + ")" + (plan.name ? " - " + plan.name : "") + (plan.date ? " - " + plan.date : ""));
        L.push("; Machine must be in CNC mode. Z0 = top surface of the material, X Y in bed coordinates.");
        L.push("; Tool diameter " + N(h.diameter) + (u === "in" ? " in" : " mm") + ", safe Z " + N(h.altSafe) + ", feed " + N(h.feed) + "/min, plunge " + N(h.feedPen) + "/min" + (h.rpm ? ", " + h.rpm + " rpm" : ", spindle started by hand"));
        L.push("; Check the cut area and the Z zero before starting. The file does not home and does not move the machine to any park position.");
        L.push(tzCncGuardLine(plan));
        L.push(u === "in" ? "G20" : "G21");
        L.push("G90");
        L.push("G17");
        if (plan.system) L.push(plan.system);
        L.push("G0 Z" + N(h.altSafe));
        if (h.rpm && !h.spindleManual) {
          L.push("M3 S" + Math.round(h.rpm));
          if (plan.waitSpindle > 0) L.push("G4 S" + Math.round(plan.waitSpindle));
        }
        var F = "F" + N(h.feed), FP = "F" + N(h.feedPen);
        plan.shapes.forEach(function (f, fi) {
          if (!f.outlines.length || !f.levels.length) return;
          L.push("; shape " + (fi + 1) + ": " + f.name + " (" + f.kind + "), " + f.levels.length + " pass(es), depth " + N(-f.levels[f.levels.length - 1]));
          var cs = f.outlines.map(function (c) { return tzCncOrient(c, plan.direction); });
          function start(c) { return c.k === "circular" ? [c.cx + c.r, c.cy] : c.pts[0]; }
          function end(c) { return c.k === "circular" ? [c.cx + c.r, c.cy] : c.pts[c.pts.length - 1]; }
          function fastA(p) {
            L.push("G0 X" + N(p[0]) + " Y" + N(p[1]));
            L.push("G0 Z" + N(h.altApprox));
          }
          function short(c, invertir) {
            if (c.k === "circular") {
              var g = plan.direction === "cw" ? "G2" : "G3";
              L.push(g + " X" + N(c.cx - c.r) + " Y" + N(c.cy) + " I" + N(-c.r) + " J0 " + F);
              L.push(g + " X" + N(c.cx + c.r) + " Y" + N(c.cy) + " I" + N(c.r) + " J0");
              return;
            }
            var pts = invertir ? c.pts.slice().reverse() : c.pts;
            for (var i = 1; i < pts.length; i++) L.push("G1 X" + N(pts[i][0]) + " Y" + N(pts[i][1]) + (i === 1 ? " " + F : ""));
          }
          fastA(start(cs[0]));
          f.levels.forEach(function (z, k) {
            L.push("; depth " + N(-z));
            if (f.continuous) {
              if (k > 0) { L.push("G0 Z" + N(h.altApprox)); L.push("G0 X" + N(start(cs[0])[0]) + " Y" + N(start(cs[0])[1])); }
              L.push("G1 Z" + N(z) + " " + FP);
              cs.forEach(function (c, ci) {
                if (ci > 0) L.push("G1 X" + N(start(c)[0]) + " Y" + N(start(c)[1]) + " " + F);
                short(c, false);
              });
            } else {
              var c0 = cs[0];
              // an open line is cut back and forth: odd passes start where the previous one ended
              var inv = c0.k !== "circular" && !c0.closed && k % 2 === 1;
              L.push("G1 Z" + N(z) + " " + FP);
              short(c0, inv);
            }
          });
          L.push("G0 Z" + N(h.altSafe));
        });
        if (h.rpm && !h.spindleManual) L.push("M5");
        L.push("; end");
        return L.join("\n") + "\n";
      }

      // ---- preview: segments by depth level (for the map and for Simulate) ----
      // [{ z, n, segs: [[x1, y1, x2, y2]...] }] with one entry per level of the plan (the deepest of every shape counts as its last).
      function tzCncSegments(plan) {
        var byZ = {};
        plan.shapes.forEach(function (f) {
          f.levels.forEach(function (z, k) {
            var key = String(z);
            var e = byZ[key] || (byZ[key] = { z: z, secs: [] });
            var cs = f.outlines.map(function (c) { return tzCncOrient(c, plan.direction); });
            cs.forEach(function (c) {
              if (c.k === "circular") {
                var prev = null;
                for (var i = 0; i <= 48; i++) {
                  var an = (i / 48) * Math.PI * 2 * (plan.direction === "cw" ? -1 : 1);
                  var q = [c.cx + c.r * Math.cos(an), c.cy + c.r * Math.sin(an)];
                  if (prev) e.secs.push([prev[0], prev[1], q[0], q[1]]);
                  prev = q;
                }
              } else {
                var pts = !c.closed && k % 2 === 1 ? c.pts.slice().reverse() : c.pts;
                for (var j = 1; j < pts.length; j++) e.secs.push([pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1]]);
              }
            });
          });
        });
        return Object.keys(byZ).map(function (k) { return byZ[k]; }).sort(function (a, b) { return b.z - a.z; }).map(function (e, i) {
          e.n = i + 1;
          return e;
        });
      }

      // Length of the cutting moves (mm) and a rough time (minutes): cutting at the feed, plunges at the plunge feed.
      function tzCncEstimate(plan) {
        var h = plan.tool;
        var largo = 0, time = 0, passes = 0;
        plan.shapes.forEach(function (f) {
          var prevZ = 0;
          f.levels.forEach(function (z) {
            passes++;
            var l = 0;
            f.outlines.forEach(function (c) {
              if (c.k === "circular") l += 2 * Math.PI * c.r;
              else for (var i = 1; i < c.pts.length; i++) l += Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]);
            });
            largo += l;
            if (h.feed) time += l / h.feed;
            if (h.feedPen) time += Math.abs(z - prevZ) / h.feedPen;
            prevZ = z;
          });
        });
        return { length: largo, minutes: time, passes: passes };
      }

      // ---- cnc-designs.json (own format, versioned; laser-designs.json is never touched) ----
      // { v: 1, activo: id, disenos: [{ id, nombre, materialId, unidades, sentido, herramienta: {...}, formas: [...] }] }
      // Reading is tolerant: a missing file, bad JSON or unknown fields give an empty or partial document and never throw.
      // A file written by a NEWER version (v > 1) is read but marked soloLectura so the card does not overwrite it.
      function tzCncDesignsRead(text) {
        var empty = { v: TZ_CNC_FORMAT, active: "", designs: [], readOnly: false };
        var o;
        try { o = JSON.parse(text); } catch (e) { return empty; }
        if (!o || typeof o !== "object" || !Array.isArray(o.designs)) return empty;
        var disenos = o.designs.filter(function (d) { return d && typeof d === "object" && d.id; }).map(function (d) {
          return {
            id: String(d.id),
            name: String(d.name || d.id),
            materialId: d.materialId ? String(d.materialId) : "",
            units: d.units === "in" ? "in" : "mm",
            direction: d.direction === "cw" ? "cw" : "ccw",
            tool: d.tool && typeof d.tool === "object" ? d.tool : {},
            shapes: (Array.isArray(d.shapes) ? d.shapes : []).filter(function (f) { return f && TZ_CNC_KINDS.indexOf(f.kind) >= 0; }),
          };
        });
        return { v: TZ_CNC_FORMAT, active: o.active ? String(o.active) : "", designs: disenos, readOnly: Number(o.v) > TZ_CNC_FORMAT };
      }
      function tzCncDesignsText(doc) {
        return JSON.stringify({ v: TZ_CNC_FORMAT, active: doc.active || "", designs: doc.designs }, null, 1);
      }
