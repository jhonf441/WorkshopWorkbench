      // ---- The process of a layer: what a layer does to the material, by mode of the machine (single editor, stage 1) ----
      //
      // The editor was a laser editor: a layer was power / speed / passes, and only the laser had an editor. The single editor serves the laser AND
      // the spindle with the same drawing (shapes, layers, selection, arrays, SVG): what changes is the PROCESS of each layer. This file is that
      // process and nothing else: numbers in, numbers out, no DOM and no machine (tests/cuts-process.test.js). Nothing calls it yet: the layer panel,
      // the Cut button and the CNC job use it in the next stages (docs-internal/EDITOR-UNICO.md, reports 08 and 09).
      //
      //   Laser: power (%), speed (mm/min), passes. The same three numbers the layers always had: they stay in layer.power / speed / passes.
      //   CNC:   depth (mm below the surface of the material), side of the line (centre / inside / outside) and operation (contour / pocket).
      //          The tool (diameter, feed, rpm, step per pass) is NOT here: it comes from the material and the tool of the CNC card (51-cnc-pure.js).
      //
      // layer.process = { Laser: {...}, CNC: {...} } keeps a value for each mode, so a layer drawn for the laser keeps its power when the machine
      // goes to CNC and back. A layer without layer.process is a layer of the old editor: its Laser process is read from power / speed / passes.

      var TC_PROCESS = {
        Laser: {
          fields: [
            { key: "power", min: 1, max: 100, def: 30, int: false },
            { key: "speed", min: 1, max: 30000, def: 1000, int: false }, // the same limits as the layer panel (42-cuts-layers.js) and tcValidate (41-cuts-job.js)
            { key: "passes", min: 1, max: 20, def: 1, int: true },
          ],
        },
        CNC: {
          fields: [
            { key: "depth", min: 0.01, max: 100, def: null, int: false }, // empty: the layer cannot be cut yet (the user has to say how deep)
            { key: "side", values: ["center", "inside", "outside"], def: "center" },
            { key: "operation", values: ["contour", "pocket"], def: "contour" },
          ],
        },
      };

      // The mode of the machine as the process table knows it: "Laser", "CNC" or null (FFF and anything else has no editor).
      function tcProcMode(mode) {
        return mode === "Laser" || mode === "CNC" ? mode : null;
      }

      function tcProcNum(v) {
        var x = typeof v === "number" ? v : parseFloat(String(v === undefined || v === null ? "" : v).replace(",", "."));
        return isFinite(x) ? x : null;
      }

      // The values a mode starts with (a null is a value that has to be filled in).
      function tcProcDefaults(mode) {
        var m = tcProcMode(mode);
        var out = {};
        if (!m) return out;
        TC_PROCESS[m].fields.forEach(function (f) {
          out[f.key] = f.def;
        });
        return out;
      }

      // One value fitted to its field: a number inside its range (rounded for a whole number), a text from its list, or the default.
      function tcProcFit(field, v) {
        if (field.values) return field.values.indexOf(v) >= 0 ? v : field.def;
        var n = tcProcNum(v);
        if (n === null) return field.def;
        if (field.int) n = Math.round(n);
        return Math.min(Math.max(n, field.min), field.max);
      }

      // The process of a layer in a mode, every field present and fitted. A layer of the old editor has no layer.process: its laser numbers
      // are the layer's own power / speed / passes.
      function tcProcRead(layer, mode) {
        var m = tcProcMode(mode);
        var out = tcProcDefaults(m);
        if (!m || !layer) return out;
        var own = layer.process && layer.process[m] ? layer.process[m] : null;
        TC_PROCESS[m].fields.forEach(function (f) {
          var raw = own && own[f.key] !== undefined ? own[f.key] : m === "Laser" ? layer[f.key] : undefined;
          out[f.key] = tcProcFit(f, raw);
        });
        return out;
      }

      // What is wrong with a process of a mode: [{ field, c }] with c = "missing" (a value that has to be filled in is empty). A fitted value is
      // never out of range, so "missing" is the only thing a read process can lack.
      function tcProcProblems(mode, values) {
        var m = tcProcMode(mode);
        var out = [];
        if (!m) return out;
        TC_PROCESS[m].fields.forEach(function (f) {
          if (f.def === null && (!values || values[f.key] === null || values[f.key] === undefined)) out.push({ field: f.key, c: "missing" });
        });
        return out;
      }

      // Writes a change into the process of a mode (patch = { field: value }); what is not a field of the mode is ignored. The laser numbers are
      // also written where the rest of the editor reads them (layer.power / speed / passes: validate, estimate, G-code). Returns the new process.
      function tcProcWrite(layer, mode, patch) {
        var m = tcProcMode(mode);
        if (!m || !layer) return tcProcDefaults(m);
        var cur = tcProcRead(layer, m);
        TC_PROCESS[m].fields.forEach(function (f) {
          if (patch && patch[f.key] !== undefined) cur[f.key] = tcProcFit(f, patch[f.key]);
        });
        if (!layer.process) layer.process = {};
        layer.process[m] = cur;
        if (m === "Laser") {
          layer.power = cur.power;
          layer.speed = cur.speed;
          layer.passes = cur.passes;
        }
        return cur;
      }

      // A polyline of the editor for the CNC: { shape } when it can be cut along its own line, else { c: reason }.
      function tcProcPath(s, p, base) {
        if (p.operation === "pocket") return { c: "pocket_path" };
        if (p.side !== "center") return { c: "path_side" };
        var pts = Array.isArray(s.pts) ? s.pts : [];
        if (pts.length < (s.closed ? 3 : 2)) return { c: "path_points" };
        return { shape: Object.assign(base, { kind: "path", closed: !!s.closed, pts: pts.map(function (q) { return { x: (q || {}).x, y: (q || {}).y }; }) }) };
      }

      // The shapes of the editor as the shapes of the CNC calculation (51-cnc-pure.js), in the cut order of the layers. The editor draws more than
      // the CNC engine cuts, so what is left out is told with its reason and the drawing is never changed:
      //   a "path" (a polyline or an imported SVG, and ALSO any rectangle that was turned or a circle that was scaled: the editor turns those into
      //     a path, 39-cuts-geometry.js) is cut along its own line (side "center", a contour); it is left out with path_side (inside / outside
      //     would need an offset of the polyline, not done), pocket_path (a pocket is a rectangle) or path_points (too few points);
      //   rounded: a rectangle with rounded corners (rr): cutting it as a square would be another piece, so it is not cut by approximation;
      //   already_cut: the shape is marked as cut (s.cut) and the editor is not trimming;
      //   pocket_circle: a pocket is a rectangle;
      //   hidden: the layer is off (it is not cut);
      //   missing_depth: the layer has no depth.
      // layers = the editor's layers in order; shapes = the editor's shapes. Returns { shapes: [CNC shape], skipped: [{ id, c }] }.
      function tcProcToCnc(layers, shapes, trim) {
        var out = [];
        var skipped = [];
        (layers || []).forEach(function (L) {
          var p = tcProcRead(L, "CNC");
          (shapes || []).forEach(function (s) {
            if (s.layer !== L.id) return;
            if (L.hidden) {
              skipped.push({ id: s.id, c: "hidden" });
              return;
            }
            if (s.cut && !trim) {
              skipped.push({ id: s.id, c: "already_cut" });
              return;
            }
            if (p.depth === null) {
              skipped.push({ id: s.id, c: "missing_depth" });
              return;
            }
            var base = { id: s.id, name: s.name || "#" + s.id, depth: p.depth, side: p.side };
            if (s.type === "line") {
              out.push(Object.assign(base, { kind: "line", x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }));
            } else if (s.type === "rect") {
              if (s.rr > 0) {
                skipped.push({ id: s.id, c: "rounded" });
                return;
              }
              out.push(Object.assign(base, { kind: p.operation === "pocket" ? "pocket" : "rect", x: s.x, y: s.y, w: s.w, h: s.h }));
            } else if (s.type === "circle") {
              if (p.operation === "pocket") skipped.push({ id: s.id, c: "pocket_circle" });
              else out.push(Object.assign(base, { kind: "circle", cx: s.cx, cy: s.cy, r: s.r }));
            } else if (s.type === "path") {
              var pr = tcProcPath(s, p, base);
              if (pr.c) skipped.push({ id: s.id, c: pr.c });
              else out.push(pr.shape);
            }
          });
        });
        return { shapes: out, skipped: skipped };
      }
