      // -- mapa --
      function tgGrDraw(tg, node, w) {
        var A = tgGrArea(tg);
        if (!tg.preview || !tg.data.T || !A) return;
        if (tg.drag) {
          var b = tg.preview.bbox;
          var esq = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]].map(function (q) {
            var r = tgApply(tg.data.T, q[0], q[1]);
            return r[0].toFixed(2) + "," + (-r[1]).toFixed(2);
          });
          node("polyline", { points: esq.join(" "), fill: "rgba(102,187,106,0.15)", stroke: "#66bb6a", "stroke-width": w / 200, "stroke-dasharray": w / 120 + " " + w / 160 });
          return;
        }
        if (!tg.drawing) tg.drawing = tgGrArmDrawing(tg, A);
        var sw = w / 300;
        tg.drawing.forEach(function (d) {
          node("polyline", {
            points: d.pts.join(" "),
            fill: "none",
            stroke: d.col,
            "stroke-width": sw * (d.kind === "now" ? 1.6 : 1),
            "stroke-opacity": d.kind === "missing" ? 0.45 : 0.9,
            "stroke-dasharray": d.kind === "missing" ? w / 160 + " " + w / 160 : "",
            "stroke-linejoin": "round",
          });
        });
        function cross(x, y, col, r) {
          node("line", { x1: x - r, y1: -y, x2: x + r, y2: -y, stroke: col, "stroke-width": sw * 1.4 });
          node("line", { x1: x, y1: -y - r, x2: x, y2: -y + r, stroke: col, "stroke-width": sw * 1.4 });
        }
        if (tg.data.marks && tg.data.step !== "move") tg.data.marks.design.forEach(function (m) {
          var p = tgApply(tg.data.T, m[0], m[1]);
          cross(p[0], p[1], "#ffeb3b", w / 120);
        });
        if (tg.data.step === "move") {
          var esp = tgGrExpected(tg);
          if (esp) esp.forEach(function (p) {
            node("circle", { cx: p[0], cy: -p[1], r: w / 60, fill: "none", stroke: "#ffeb3b", "stroke-width": sw, "stroke-dasharray": w / 200 + " " + w / 200 });
          });
          (tg.data.measures || []).forEach(function (m) {
            if (m) cross(m[0], m[1], "#66bb6a", w / 120);
          });
        }
        if (tg.choosingOrigin || tg.data.step === "place") cross(tg.data.T.tx, tg.data.T.ty, "#42a5f5", w / 80);
        if (tg.data.step === "place" && tg.data.pts) {
          var pe = tg.data.pts.corner, pb = tg.data.pts.edge;
          if (pe) node("circle", { cx: pe[0], cy: -pe[1], r: w / 90, fill: "#26c6da", stroke: "none" });
          if (pb) node("circle", { cx: pb[0], cy: -pb[1], r: w / 110, fill: "none", stroke: "#26c6da", "stroke-width": sw * 1.4 });
          if (pe && pb) node("line", { x1: pe[0], y1: -pe[1], x2: pb[0], y2: -pb[1], stroke: "#26c6da", "stroke-width": sw, "stroke-dasharray": w / 200 + " " + w / 200 });
        }
      }

      // each line of the design (with the current T) split into: already cut (gray),
      // this part (green) and what is missing (dotted orange)
      function tgGrArmDrawing(tg, A) {
        var T = tg.data.step === "move" && tgGrSuggested(tg) ? tgGrSuggested(tg) : tg.data.T;
        var act = tgRegion(tg.data.T, A);
        var prev = tg.data.done.map(function (h) { return tgRegion(h, A); });
        var out = [];
        var cur = null;
        function add(kind, x0, y0, x1, y1) {
          var a = tgApply(T, x0, y0), b = tgApply(T, x1, y1);
          var col = kind === "done" ? "#90a4ae" : kind === "now" ? "#66bb6a" : "#ffb74d";
          if (cur && cur.kind === kind && Math.abs(cur.ux - a[0]) < 1e-6 && Math.abs(cur.uy - a[1]) < 1e-6) {
            cur.pts.push(b[0].toFixed(2) + "," + (-b[1]).toFixed(2));
          } else {
            // the map draws with y = -Y of the bed (like the rest of Zones)
            cur = { kind: kind, col: col, pts: [a[0].toFixed(2) + "," + (-a[1]).toFixed(2), b[0].toFixed(2) + "," + (-b[1]).toFixed(2)] };
            out.push(cur);
          }
          cur.ux = b[0];
          cur.uy = b[1];
        }
        tg.preview.lines.forEach(function (L) {
          for (var i = 0; i + 3 < L.length; i += 2) {
            var x0 = L[i], y0 = L[i + 1], x1 = L[i + 2], y1 = L[i + 3];
            var done = prev.map(function (p) { return tgInside(p, x0, y0, x1, y1); }).filter(Boolean);
            var now = tg.data.step === "move" || tg.data.step === "end" ? [] : tgSubtract(tgInside(act, x0, y0, x1, y1) || [0, 0], done);
            var marks = [];
            done.forEach(function (q) { marks.push([q[0], q[1], "done"]); });
            now.forEach(function (q) { marks.push([q[0], q[1], "now"]); });
            tgSubtract([0, 1], done.concat(now)).forEach(function (q) { marks.push([q[0], q[1], "missing"]); });
            marks.sort(function (a, b) { return a[0] - b[0]; });
            marks.forEach(function (q) {
              if (q[1] - q[0] < 1e-6) return;
              add(q[2], x0 + (x1 - x0) * q[0], y0 + (y1 - y0) * q[0], x0 + (x1 - x0) * q[1], y0 + (y1 - y0) * q[1]);
            });
          }
        });
        return out;
      }

      function tgGrTipLines(tg, p) {
        if (!tg.data.file) return [];
        var out = [];
        if (tg.touching === "corner") out.push(i18nT('large.tap_the_front_left_corner_of'));
        else if (tg.touching === "edge") out.push(i18nT('large.tap_another_point_of_the_front'));
        else if (tg.choosingOrigin) out.push(i18nT('large.tap_the_0_0_of_your'));
        else if (tgGrCanMove(tg) && tgGrOverDesign(tg, p)) out.push(i18nT('large.drag_to_move_the_design'));
        return out;
      }

