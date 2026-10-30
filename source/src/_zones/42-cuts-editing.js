      // Active tab ("cuts" or "centro"): each uses only its own, so
      // a tap on the map is not captured by the other.
      function tcSetView(tc, v) {
        tc.view = v === "center" ? "center" : "cuts";
        tc.lastKey = "";
      }

      // Map magnet: vertices and centers of the shapes (not those being
      // dragged, they would "snap" to themselves).
      function tcSnapPoints(tc) {
        if (tc.view !== "cuts") return [];
        var out = [];
        tc.data.shapes.forEach(function (sh, i) {
          if (tc.drag && tcIsSelId(tc, sh.id)) return;
          var nm = i18nT('cuts.shape_4', { n: i + 1 });
          if (sh.type === "circle") out.push({ x: sh.cx, y: sh.cy, name: i18nT('cuts.centre_2', { nm: nm }) });
          var pts = tcShapePath(sh);
          var lim = Math.min(pts.length, 64);
          for (var k = 0; k < lim; k++) out.push({ x: pts[k].x, y: pts[k].y, name: i18nT('cuts.vertex_2', { nm: nm }) });
          var bb = tcBBox([sh]);
          if (bb && sh.type !== "circle") out.push({ x: (bb.xmin + bb.xmax) / 2, y: (bb.ymin + bb.ymax) / 2, name: i18nT('cuts.centre_2', { nm: nm }) });
        });
        return out;
      }

      // -- actions on the selection --
      function tcTransformSel(tc, fn, kind) {
        var fixed = tcSelShapes(tc).some(function (x) { return x.fixed; });
        if (fixed && kind.move) return tcSetMsg(tc, i18nT('cuts.fixed_on_the_measured_center_it'), false);
        var nws = tcSelShapes(tc).map(function (x) { return tcTransformShape(x, fn, kind); });
        nws.forEach(function (nw) { if (nw.fixed) tcMoveCenterTo(nw, nw.fixed.x, nw.fixed.y); });
        var sh = tcShiftInto(tc, tcBBox(nws));
        if (!sh) return tcSetMsg(tc, i18nT('cuts.it_does_not_fit_in_the'), false);
        if (sh.dx || sh.dy) nws = nws.map(function (x) { return tcTransformShape(x, tcMoveFn(sh.dx, sh.dy), { move: true }); });
        var byId = {};
        nws.forEach(function (x) { byId[x.id] = x; });
        tc.data.shapes = tc.data.shapes.map(function (x) { return byId[x.id] || x; });
        tcSave(tc);
        tcGo(tc);
      }

      function tcCopiesFit(tc, list) {
        if (tcInArea(tc, tcBBox(list))) return true;
        tcSetMsg(tc, i18nT('cuts.the_copies_do_not_fit_in', { n: list.length }), false);
        return false;
      }

      function tcDuplicateSel(tc, dx, dy) {
        var pre = tcSelShapes(tc).map(function (x) { return tcTransformShape(x, tcMoveFn(dx, dy), { move: true }); });
        if (!tcInArea(tc, tcBBox(pre))) {
          dx = -dx; dy = -dy; // probar hacia el otro lado
          pre = tcSelShapes(tc).map(function (x) { return tcTransformShape(x, tcMoveFn(dx, dy), { move: true }); });
          if (!tcCopiesFit(tc, pre)) return;
        }
        var nuevos = [];
        tcSelShapes(tc).forEach(function (x) {
          var c = tcTransformShape(x, tcMoveFn(dx, dy), { move: true });
          c.id = tc.data.nextId++;
          tc.data.shapes.push(c);
          nuevos.push(c.id);
        });
        tcSetSel(tc, nuevos);
        tcSave(tc);
        tcGo(tc);
      }

      function tcClipRead(tc) {
        try {
          var c = JSON.parse(localStorage.getItem(tc.TC_CLIP_KEY) || "null");
          return c && Array.isArray(c.shapes) && c.shapes.length ? c : null;
        } catch (e) {
          return null;
        }
      }

      function tcCopySel(tc) {
        var ss = tcSelShapes(tc);
        if (!ss.length) return;
        try {
          localStorage.setItem(tc.TC_CLIP_KEY, JSON.stringify({ shapes: JSON.parse(JSON.stringify(ss)), t: Date.now() }));
        } catch (e) {
          return tcSetMsg(tc, i18nT('cuts.copy_failed'), false);
        }
        tc.tcPasteN = 0;
        tcSetMsg(tc, i18nT('cuts.copied_n', { n: ss.length }), true);
        tc.lastKey = "";
        tcGo(tc);
      }

      function tcPasteSel(tc) {
        var c = tcClipRead(tc);
        if (!c) return tcSetMsg(tc, i18nT('cuts.nothing_to_paste'), false);
        tc.tcPasteNteN++;
        var d = 10 * tc.tcPasteN;
        var hacer = function (dx, dy) {
          return c.shapes.map(function (x) { return tcTransformShape(JSON.parse(JSON.stringify(x)), tcMoveFn(dx, dy), { move: true }); });
        };
        var nuevas = hacer(d, d);
        if (!tcInArea(tc, tcBBox(nuevas))) {
          nuevas = hacer(-d, -d); // try the other side
          if (!tcCopiesFit(tc, nuevas)) return;
        }
        var ids = [];
        nuevas.forEach(function (x) {
          delete x.cut;
          if (!tcLayerById(tc, x.layer)) x.layer = tc.data.layers[0] && tc.data.layers[0].id;
          x.id = tc.data.nextId++;
          tc.data.shapes.push(x);
          ids.push(x.id);
        });
        tcSetSel(tc, ids);
        tcSave(tc);
        tcGo(tc);
      }

      function tcDeleteSel(tc) {
        tc.data.shapes = tc.data.shapes.filter(function (x) { return !tcIsSelId(tc, x.id); });
        tcSetSel(tc, []);
        tcSave(tc);
        tcGo(tc);
      }

      function tcAlignSel(tc, how) {
        var b = tcSelBox(tc);
        if (!b) return;
        tc.data.shapes = tc.data.shapes.map(function (x) {
          if (!tcIsSelId(tc, x.id)) return x;
          var bx = tcBBox([x]);
          var dx = 0, dy = 0;
          if (how === "l") dx = b.xmin - bx.xmin;
          if (how === "r") dx = b.xmax - bx.xmax;
          if (how === "cx") dx = (b.xmin + b.xmax) / 2 - (bx.xmin + bx.xmax) / 2;
          if (how === "b") dy = b.ymin - bx.ymin;
          if (how === "t") dy = b.ymax - bx.ymax;
          if (how === "cy") dy = (b.ymin + b.ymax) / 2 - (bx.ymin + bx.ymax) / 2;
          return tcTransformShape(x, tcMoveFn(dx, dy), { move: true });
        });
        tcSave(tc);
        tcGo(tc);
      }

      // Distribute: equal spacing between the shapes (by their centers).
      function tcDistributeSel(tc, axis) {
        var ss = tcSelShapes(tc);
        if (ss.length < 3) return;
        var cs = ss.map(function (x) {
          var bx = tcBBox([x]);
          return { id: x.id, c: axis === "x" ? (bx.xmin + bx.xmax) / 2 : (bx.ymin + bx.ymax) / 2 };
        }).sort(function (a, b) { return a.c - b.c; });
        var first = cs[0].c, step = (cs[cs.length - 1].c - first) / (cs.length - 1);
        var want = {};
        cs.forEach(function (e, i) { want[e.id] = first + i * step - e.c; });
        tc.data.shapes = tc.data.shapes.map(function (x) {
          if (want[x.id] === undefined) return x;
          return tcTransformShape(x, axis === "x" ? tcMoveFn(want[x.id], 0) : tcMoveFn(0, want[x.id]), { move: true });
        });
        tcSave(tc);
        tcGo(tc);
      }

      // Move the selection by dx, dy mm (copy = false) or leave it and put a shifted copy (copy = true)
      function tcMoveBy(tc, dx, dy, copy) {
        var base = tcSelShapes(tc);
        if (!base.length) return;
        var moved = base.map(function (x) { return tcTransformShape(x, tcMoveFn(dx, dy), { move: true }); });
        if (!tcCopiesFit(tc, moved)) return;
        if (!copy) {
          var ids = {};
          base.forEach(function (x, i) { ids[x.id] = moved[i]; });
          tc.data.shapes = tc.data.shapes.map(function (x) {
            var m = ids[x.id];
            if (!m) return x;
            m.id = x.id;
            return m;
          });
        } else {
          var nuevos = [];
          moved.forEach(function (c) {
            c.id = tc.data.nextId++;
            tc.data.shapes.push(c);
            nuevos.push(c.id);
          });
          tcSetSel(tc, nuevos);
        }
        tcSave(tc);
        tcGo(tc);
      }

      // Linear array: n copies in all (the first is the one that is there), each one shifted dx, dy from the one before
      function tcArrayLin(tc, n, dx, dy) {
        var base = tcSelShapes(tc);
        var all = [];
        for (var i = 1; i < n; i++) base.forEach(function (x) { all.push(tcTransformShape(x, tcMoveFn(dx * i, dy * i), { move: true })); });
        if (!tcCopiesFit(tc, base.concat(all))) return;
        var nuevos = base.map(function (x) { return x.id; });
        all.forEach(function (c) {
          c.id = tc.data.nextId++;
          tc.data.shapes.push(c);
          nuevos.push(c.id);
        });
        tcSetSel(tc, nuevos);
        tcSave(tc);
        tcGo(tc);
      }

      function tcArrayGrid(tc, cols, rows, gx, gy) {
        var base = tcSelShapes(tc);
        var bb0 = tcBBox(base);
        if (!tcCopiesFit(tc, [{ type: "rect", x: bb0.xmin + Math.min(0, (cols - 1) * gx), y: bb0.ymin + Math.min(0, (rows - 1) * gy), w: bb0.xmax - bb0.xmin + Math.abs((cols - 1) * gx), h: bb0.ymax - bb0.ymin + Math.abs((rows - 1) * gy) }])) return;
        var nuevos = base.map(function (x) { return x.id; });
        for (var r = 0; r < rows; r++)
          for (var c = 0; c < cols; c++) {
            if (!r && !c) continue;
            base.forEach(function (x) {
              var cp = tcTransformShape(x, tcMoveFn(c * gx, r * gy), { move: true });
              cp.id = tc.data.nextId++;
              tc.data.shapes.push(cp);
              nuevos.push(cp.id);
            });
          }
        tcSetSel(tc, nuevos);
        tcSave(tc);
        tcGo(tc);
      }

      function tcArrayCircle(tc, n, cx, cy, total, rotateCopies) {
        var base = tcSelShapes(tc);
        var stepC = Math.abs(total - 360) < 1e-6 ? total / n : total / Math.max(1, n - 1);
        var probe = [];
        for (var pi = 1; pi < n; pi++) base.forEach(function (x) { probe.push(tcTransformShape(x, tcRotateFn(stepC * pi, cx, cy), { rotate: true })); });
        if (!tcCopiesFit(tc, base.concat(probe))) return;
        var nuevos = base.map(function (x) { return x.id; });
        var step = Math.abs(total - 360) < 1e-6 ? total / n : total / Math.max(1, n - 1);
        for (var i = 1; i < n; i++) {
          var ang = step * i;
          base.forEach(function (x) {
            var cp;
            if (rotateCopies) cp = tcTransformShape(x, tcRotateFn(ang, cx, cy), { rotate: true });
            else {
              var bx = tcBBox([x]);
              var c0 = { x: (bx.xmin + bx.xmax) / 2, y: (bx.ymin + bx.ymax) / 2 };
              var c1 = tcRotateFn(ang, cx, cy)(c0);
              cp = tcTransformShape(x, tcMoveFn(c1.x - c0.x, c1.y - c0.y), { move: true });
            }
            cp.id = tc.data.nextId++;
            tc.data.shapes.push(cp);
            nuevos.push(cp.id);
          });
        }
        tcSetSel(tc, nuevos);
        tcSave(tc);
        tcGo(tc);
      }

      function tcLayerSelect(tc, cur, onPick) {
        var sl = document.createElement("select");
        sl.className = "tz-input";
        tc.data.layers.forEach(function (L) {
          var op = document.createElement("option");
          op.value = String(L.id);
          op.textContent = L.name + " (" + L.power + " %, " + L.speed + ")";
          op.style.color = L.color;
          if (L.id === cur) op.selected = true;
          sl.appendChild(op);
        });
        sl.style.borderLeft = "6px solid " + tcLayerById(tc, cur).color;
        sl.addEventListener("change", function () { onPick(parseInt(sl.value, 10)); });
        return sl;
      }

