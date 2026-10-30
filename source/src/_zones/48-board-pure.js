      // ---- Simulate job > Board: several job files on the area, checked and sent together (2026-10-15) ----
      // Pure functions (no DOM, no network) so that they can be tested with node (tests/board.test.js).

      // Moves a G-code text by (dx, dy) mm: the X and Y words of the absolute moves (G90) are shifted. Lines that
      // cannot be shifted safely are left alone and counted so the page can warn:
      //   rel   = lines in relative mode (G91): they follow whatever absolute move came before, nothing to shift
      //   g53   = moves in machine coordinates (parking...), left where they are
      //   g92 / g10 = lines that change the coordinate system by themselves (the shift cannot follow them)
      //   macros = M98 calls (what happens inside a macro is not seen)
      // Arcs keep working: I and J are relative to the start of the arc, so only the end point X Y moves.
      function tvShiftGcode(text, dx, dy) {
        var lines = String(text).split(/\r?\n/);
        var abs = true, inch = false, last = null;
        var av = { rel: 0, g53: 0, g92: 0, g10: 0, macros: 0, inch: 0, moved: 0 };
        var out = lines.map(function (line) {
          var iC = line.indexOf(";");
          var code = iC >= 0 ? line.slice(0, iC) : line;
          var coment = iC >= 0 ? line.slice(iC) : "";
          var parts = code.split(/(\([^)]*\))/); // parentheses are comments: never touched
          var clean = parts.filter(function (p, i) { return i % 2 === 0; }).join(" ").toUpperCase();
          var gs = [];
          clean.replace(/G\s*(\d+(?:\.\d+)?)/g, function (m, n) { gs.push(parseFloat(n)); return m; });
          gs.forEach(function (g) {
            if (g === 90) abs = true;
            else if (g === 91) abs = false;
            else if (g === 20) { inch = true; av.inch++; }
            else if (g === 21) inch = false;
            else if (g >= 0 && g <= 3 && Math.floor(g) === g) last = g;
          });
          if (/\bM\s*98\b/.test(clean)) av.macros++;
          if (gs.indexOf(92) >= 0) av.g92++;
          if (gs.indexOf(10) >= 0) av.g10++;
          var hasG = /G\s*\d/.test(clean);
          var esMov = gs.some(function (g) { return g >= 0 && g <= 3 && Math.floor(g) === g; }) ||
            (!hasG && last !== null && !/\bM\s*\d/.test(clean) && /[XY]\s*-?[\d.]/.test(clean));
          if (!esMov || !/[XY]\s*-?[\d.]/.test(clean) || !/^\s*(?:N\d+\s*)?[A-Z]\s*-?[\d.]/.test(clean)) return line; // only real G-code words (not an echo or a message)
          if (gs.indexOf(53) >= 0) { av.g53++; return line; }
          if (!abs) { av.rel++; return line; }
          var k = inch ? 1 / 25.4 : 1;
          var nuevo = parts.map(function (p, i) {
            if (i % 2 === 1) return p;
            return p.replace(/([XYxy])(\s*)(-?\d*\.?\d+)/g, function (m, L, sp, num) {
              var v = parseFloat(num) + (L.toUpperCase() === "X" ? dx : dy) * k;
              return L + sp + String(Math.round(v * 1000) / 1000);
            });
          }).join("");
          av.moved++;
          return nuevo + coment;
        });
        return { text: out.join("\n"), notices: av };
      }

      // "Send from here": the text of a job to start in the middle. head = the lines before the cut point, body = from the
      // line where it starts, start = [x, y] in MACHINE coordinates where the first move of the body begins.
      // The lines of the skipped part that only set things up (M98 macros, air, spindle, M-codes...) are replayed in order;
      // the ones that are not safe to replay (homing, pauses, G92...) are dropped and counted. Returns
      // {texto, avisos:{relativo, quitadas, recortadas}} or {error}.
      function tvSinceHere(head, body, start, fastMmMin) {
        var lines = String(head).split(/\r?\n/);
        var fd = null, s = null, husillo = false, rel = false, wcs = "G54", inch = false;
        var rep = [], quitadas = 0;
        lines.forEach(function (ln) {
          var iC = ln.indexOf(";");
          var code = (iC >= 0 ? ln.slice(0, iC) : ln).replace(/\([^)]*\)/g, " ").trim().toUpperCase();
          if (!code) return;
          var fm = code.match(/\bF\s*(-?\d*\.?\d+)/);
          if (fm) fd = parseFloat(fm[1]);
          var sm = code.match(/\bS\s*(-?\d*\.?\d+)/);
          if (sm && /\bG\s*[0-3]\b|^[XYZ]/.test(code)) s = parseFloat(sm[1]);
          var gs = [];
          code.replace(/G\s*(\d+(?:\.\d+)?)/g, function (m, n) { gs.push(parseFloat(n)); return m; });
          gs.forEach(function (g) {
            if (g === 90) rel = false;
            else if (g === 91) rel = true;
            else if (g === 20) inch = true;
            else if (g === 21) inch = false;
            else if (g >= 54 && g <= 59.3) wcs = "G" + String(g);
          });
          var mm = code.match(/\bM\s*(\d+)/);
          var m = mm ? parseInt(mm[1], 10) : null;
          if (m === 3 || m === 4) { husillo = true; if (sm) s = parseFloat(sm[1]); }
          if (m === 5) husillo = false;
          var mueve = gs.some(function (g) { return g >= 0 && g <= 3 && Math.floor(g) === g; }) || /^[XYZIJ]\s*-?[\d.]/.test(code);
          if (mueve) return; // the moves themselves are not replayed
          if (gs.some(function (g) { return g === 28 || g === 30 || g === 92 || g === 10 || g === 53 || g === 4; }) || (m !== null && [0, 1, 24, 25, 226, 112, 999, 291, 117, 118].indexOf(m) >= 0)) {
            if (gs.indexOf(4) < 0 && [117, 118, 291].indexOf(m) < 0) quitadas++;
            return;
          }
          if (/^[GM]\s*\d/.test(code) && !/^G\s*(?:9[01]|2[01]|5[4-9])/.test(code) && !(m === 3 || m === 4 || m === 5)) rep.push(ln.trim());
        });
        if (rel) return { error: "relative" };
        var recortadas = 0;
        if (rep.length > 200) { recortadas = rep.length - 200; rep = rep.slice(rep.length - 200); }
        var out = ["; Workshop - the job starts from the middle (generated by WorkshopJog)", "G21", "G90", wcs];
        if (inch) out[1] = "G20";
        out = out.concat(rep);
        out.push("G53 G0 X" + start[0].toFixed(3) + " Y" + start[1].toFixed(3) + " F" + Math.round(fastMmMin || 6000) + " S0   ; to where the cut continues, laser off");
        if (fd) out.push("G1 F" + fd);
        if (husillo) out.push("M3 S" + (s === null ? 0 : s));
        out.push("; ---- from here the file goes on as it was ----");
        return { text: out.join("\n") + "\n" + body, notices: { relative: false, removed: quitadas, trimmed: recortadas } };
      }

      // Shelf packing of boxes {w, h} inside a rectangle {xmin, xmax, ymin, ymax}: rows from the bottom left, the tallest
      // first. Returns for each box (same order) {x, y} of its lower left corner, or null if it does not fit.
      function tvArrangeBoxes(boxes, area, margin) {
        margin = margin === undefined ? 5 : margin;
        var order = boxes.map(function (c, i) { return { i: i, w: c.w, h: c.h }; }).sort(function (a, b) { return b.h - a.h; });
        var res = new Array(boxes.length);
        var x = area.xmin + margin, y = area.ymin + margin, row = 0;
        order.forEach(function (c) {
          if (x > area.xmin + margin + 0.001 && x + c.w > area.xmax - margin + 0.001) { // new row (only when this one has something)
            x = area.xmin + margin;
            y += row + margin;
            row = 0;
          }
          if (x + c.w > area.xmax - margin + 0.001 || y + c.h > area.ymax - margin + 0.001) {
            res[c.i] = null;
            return;
          }
          res[c.i] = { x: x, y: y };
          x += c.w + margin;
          row = Math.max(row, c.h);
        });
        return res;
      }

      // Checks boxes [{xmin, xmax, ymin, ymax}] (in the same coordinates as `area`): which ones leave the area and which
      // pairs overlap (with `margen` mm of air between them).
      function tvCheckBoxes(boxes, area, margin) {
        margin = margin === undefined ? 2 : margin;
        var outside = [], cruces = [];
        boxes.forEach(function (c, i) {
          if (area && (c.xmin < area.xmin - 0.01 || c.xmax > area.xmax + 0.01 || c.ymin < area.ymin - 0.01 || c.ymax > area.ymax + 0.01)) outside.push(i);
          for (var j = i + 1; j < boxes.length; j++) {
            var d = boxes[j];
            if (c.xmin < d.xmax + margin && d.xmin < c.xmax + margin && c.ymin < d.ymax + margin && d.ymin < c.ymax + margin) cruces.push([i, j]);
          }
        });
        return { outside: outside, crosses: cruces };
      }
