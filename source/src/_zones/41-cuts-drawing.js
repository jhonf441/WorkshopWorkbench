      // -- dibujo en el mapa --
      function tcDraw(tc, node, w) {
        var dv = {};
        tc.lastW = w;
        dv.sw = w / 300;
        tcDrawShapes(tc, dv, node, w);
        tcDrawSelection(tc, dv, node, w);
        tcDrawCenter(tc, dv, node, w);
      }


      // Data for the map tooltip (shape under the cursor).
      function tcTipLines(tc, p, tol) {
        var out = [];
        tc.data.shapes.forEach(function (s, i) {
          var pts = tcShapePath(s);
          for (var k = 1; k < pts.length; k++) {
            if (tcSecDist(p, pts[k - 1], pts[k]) <= tol) {
              out.push(i18nT('cuts.shape_mm_min_x', { n: i + 1, name: tcLayerById(tc, s.layer).name, desc: tcDescribe(s), power: s.power, speed: s.speed, passes: s.passes }));
              break;
            }
          }
        });
        if (tc.drag && tc.drag.info) out.push(tc.drag.info);
        var hh = tc.view === "cuts" && !tc.tool ? tcHitHandle(tc, p, tol) : null;
        if (hh) out.push(hh.k === "r" ? i18nT('cuts.drag_to_rotate_the_selection_snaps') : i18nT('cuts.drag_to_scale_the_selection_2', { v: tc.data.keepRatio !== false ? i18nT('cuts.proportional_2') : "" }));
        if (tc.tool && tc.tool.type === "line" && tc.tool.p1) {
          var q = tcSnapLine(tc, tc.tool.p1, tc.drag && tc.tool.p2 ? tc.tool.p2 : p);
          out.push(i18nT('cuts.line_mm_at_degrees', { len: tc.fmt(Math.hypot(q.x - tc.tool.p1.x, q.y - tc.tool.p1.y)), a: tc.fmt(Math.atan2(q.y - tc.tool.p1.y, q.x - tc.tool.p1.x) * 180 / Math.PI), v2: tc.data.snap ? i18nT('cuts.snap_2', { snap: tc.data.snap }) : i18nT('cuts.free_3') }));
        }
        if (tc.centerMode && tc.view === "center")
          out.push(tc.centerAim && Math.hypot(p.x - tc.centerAim.x, p.y - tc.centerAim.y) <= tol ? i18nT('cuts.target_x_y', { x: tc.fmt(tc.centerAim.x), y: tc.fmt(tc.centerAim.y) }) : i18nT('cuts.click_set_target_for_the_pointer'));
        var cr = tcCenterResult(tc);
        if (cr && Math.hypot(p.x - cr.cx, p.y - cr.cy) <= tol * 1.5)
          out.push(i18nT('cuts.centre_found_x_y', { cx: tc.fmt(cr.cx), cy: tc.fmt(cr.cy), v: cr.r ? i18nT('cuts.diam_sep', { d: tc.fmt(cr.r * 2) }) : " · " + tc.fmt(cr.w) + " x " + tc.fmt(cr.h) }));
        if (cr && Math.hypot(p.x - cr.cx, p.y - cr.cy) <= tol * 1.5) out.push(i18nT('cuts.tap_centre_actions'));
        return out;
      }

      // -- tarjeta --
      function tcNum(tc, v) {
        return tzEval(v); // a number or a small account: 120/3, (40+25)*2 ...
      }

      // The cut job started from here finished: the shapes it took are marked as cut (a cancelled or aborted job marks nothing)
      function tcCheckCut(tc) {
        var ce = tc.data.cutInProgress, s = tc.ctx.machine.getSt();
        if (!ce || !s || !s.job) return;
        var jb = s.job;
        if (jb.file && jb.file.fileName === TC_JOB_FILE) return; // still running
        if (Date.now() - ce.t < 20000) return; // it may not have started yet
        var ended = jb.lastFileName === TC_JOB_FILE && (jb.lastDuration || 0) !== (ce.prevDur || 0);
        if (!ended && Date.now() - ce.t < 6 * 3600 * 1000) return;
        tc.data.cutInProgress = null;
        if (ended && !jb.lastFileCancelled && !jb.lastFileAborted) {
          var n = 0, ahora = Date.now();
          tc.data.shapes.forEach(function (x) { if (ce.ids.indexOf(x.id) >= 0) { x.cut = ahora; n++; } });
          tc.lastKey = "";
          tcSave(tc, true);
          tcSetMsg(tc, i18nT('cuts.marked_as_cut', { n: n }), true);
        } else {
          tcSave(tc, true);
          tcSetMsg(tc, i18nT('cuts.cut_not_finished'), false);
        }
      }

      function tcDrawShapes(tc, dv, node, w) {
        tc.data.shapes.forEach(function (s) {
          var isSel = tcIsSelId(tc, s.id);
          var p = tcShapePath(s);
          if (!p.length) return;
          var Lc = tcLayerById(tc, s.layer);
          if (tc.view === "cuts" && tcClampHits(tc, s).length)
            node("polyline", { points: p.map(function (q) { return q.x + "," + -q.y; }).join(" "), fill: "none", stroke: "#ff1744", "stroke-width": dv.sw * 5, "stroke-opacity": 0.45, "stroke-linejoin": "round" });
          node("polyline", {
            points: p.map(function (q) { return q.x + "," + -q.y; }).join(" "),
            fill: "none",
            stroke: s.cut && !tc.data.trim ? "#66bb6a" : Lc.color || TC_SHAPE_COLOR,
            "stroke-width": isSel ? dv.sw * 2.2 : dv.sw,
            "stroke-opacity": Lc.hidden ? 0.3 : s.cut && !tc.data.trim ? 0.55 : isSel ? 1 : 0.85,
            "stroke-dasharray": Lc.hidden || (s.cut && !tc.data.trim) ? w / 100 + " " + w / 100 : "",
          });
        });
        // fixed center of the fixed shapes (Find center -> Fix at center)
        tc.data.shapes.forEach(function (s) {
          if (!s.fixed) return;
          var k = w / 70;
          node("line", { x1: s.fixed.x - k, y1: -s.fixed.y, x2: s.fixed.x + k, y2: -s.fixed.y, stroke: "#ffd54f", "stroke-width": dv.sw * 1.2 });
          node("line", { x1: s.fixed.x, y1: -s.fixed.y - k, x2: s.fixed.x, y2: -s.fixed.y + k, stroke: "#ffd54f", "stroke-width": dv.sw * 1.2 });
          node("circle", { cx: s.fixed.x, cy: -s.fixed.y, r: k / 2.5, fill: "none", stroke: "#ffd54f", "stroke-width": dv.sw });
        });
        // cutting order (Layers' "Show cutting order" button): number at the
        // start of each shape and the travels with the laser off
        if (tc.view === "cuts" && tc.data.viewOrder) {
          var prev = null;
          tcShapesInCutOrder(tc).forEach(function (s, k) {
            var pp = tcShapePath(s);
            if (!pp.length) return;
            var a = pp[0];
            if (prev) node("line", { x1: prev.x, y1: -prev.y, x2: a.x, y2: -a.y, stroke: "#b0bec5", "stroke-width": dv.sw * 0.7, "stroke-dasharray": w / 150 + " " + w / 150, "stroke-opacity": 0.8 });
            node("circle", { cx: a.x, cy: -a.y, r: w / 90, fill: tcLayerById(tc, s.layer).color || TC_SHAPE_COLOR, stroke: "#000", "stroke-width": dv.sw * 0.5 });
            var nt = node("text", { x: a.x, y: -a.y + w / 260, fill: "#fff", "font-size": w / 75, "font-weight": "bold", "text-anchor": "middle", stroke: "#000", "stroke-width": w / 700, "paint-order": "stroke" });
            nt.textContent = String(k + 1);
            prev = pp[pp.length - 1];
          });
        }
      }

      function tcDrawSelection(tc, dv, node, w) {
        // dimension: from the active zone's 0,0 to the corner of the shapes
        var zb = tc.view === "cuts" && !tc.tool ? tcZoneBox(tc) : null;
        var pt0 = zb && tcPlaceTargets(tc).length ? tcBBox(tcPlaceTargets(tc)) : null;
        if (pt0) {
          var ddx = pt0.xmin - zb.x, ddy = pt0.ymin - zb.y;
          node("line", { x1: zb.x, y1: -zb.y, x2: pt0.xmin, y2: -pt0.ymin, stroke: "#fff", "stroke-width": dv.sw * 0.8, "stroke-dasharray": w / 200 + " " + w / 150, "stroke-opacity": 0.8 });
          node("circle", { cx: pt0.xmin, cy: -pt0.ymin, r: w / 160, fill: "#2979ff", stroke: "#fff", "stroke-width": dv.sw * 0.6 });
          if (Math.abs(ddx) + Math.abs(ddy) > 0.05) {
            var ct = node("text", { x: (zb.x + pt0.xmin) / 2 + w / 120, y: -(zb.y + pt0.ymin) / 2, fill: "#fff", "font-size": w / 55, "font-weight": "bold", stroke: "#000", "stroke-width": w / 600, "paint-order": "stroke" });
            ct.textContent = (ddx >= 0 ? "+" : "") + tc.fmt(ddx) + ", " + (ddy >= 0 ? "+" : "") + tc.fmt(ddy);
          }
        }
        tcRotDrawDrag(tc, dv, node, w);
        if (tc.drag && (tc.drag.kind === "move" || tc.drag.kind === "scale") && tc.drag.info && pt0) {
          var it = node("text", { x: pt0.xmax + w / 100, y: -pt0.ymax - w / 100, fill: "#ffe082", "font-size": w / 60, "font-weight": "bold", stroke: "#000", "stroke-width": w / 600, "paint-order": "stroke" });
          it.textContent = tc.drag.info;
        }
        // recuadro de seleccion en curso
        if (tc.drag && tc.drag.kind === "marquee" && tc.drag.moved) {
          var mq0 = tc.drag.start, mq1 = tc.drag.cur;
          node("rect", { x: Math.min(mq0.x, mq1.x), y: -Math.max(mq0.y, mq1.y), width: Math.abs(mq1.x - mq0.x), height: Math.abs(mq1.y - mq0.y), fill: "rgba(255,213,79,0.08)", stroke: "#ffd54f", "stroke-width": dv.sw, "stroke-dasharray": w / 120 + " " + w / 160 });
        }
        // selection: dashed box + handles (corners = scale, above = rotate) and the rotation pivot when it is not the centre
        var sb = tc.view === "cuts" && !tc.tool ? tcSelBox(tc) : null;
        if (sb) {
          node("rect", { x: sb.xmin, y: -sb.ymax, width: Math.max(sb.xmax - sb.xmin, 0.01), height: Math.max(sb.ymax - sb.ymin, 0.01), fill: "none", stroke: "#fff", "stroke-width": dv.sw * 0.8, "stroke-dasharray": w / 120 + " " + w / 160 });
          var hs = (w / 110) * (tcCoarsePointer() ? 1.5 : 1);
          tcHandles(tc).forEach(function (h) {
            if (h.k === "s") node("rect", { x: h.x - hs, y: -h.y - hs, width: hs * 2, height: hs * 2, fill: "#1e88e5", stroke: "#fff", "stroke-width": dv.sw * 0.8 });
            else tcDrawRotateHandle(dv, node, h, sb, hs);
          });
          if (tcRot(tc).pivot !== "center" && !(tc.drag && tc.drag.kind === "rotate")) tcRotDrawPivot(dv, node, w, tcRotPivotOf(tc));
        }
        if (tc.tool && tc.tool.type === "poly" && tc.tool.pts && tc.tool.pts.length) {
          var acol = tcLayerById(tc, tc.data.activeLayer).color;
          node("polyline", { points: tc.tool.pts.map(function (q) { return q.x + "," + -q.y; }).join(" "), fill: "none", stroke: acol, "stroke-width": dv.sw * 1.5, "stroke-dasharray": w / 80 + " " + w / 120 });
          tc.tool.pts.forEach(function (q) { node("circle", { cx: q.x, cy: -q.y, r: w / 160, fill: acol }); });
        }
        if (tc.tool && tc.tool.p1) node("circle", { cx: tc.tool.p1.x, cy: -tc.tool.p1.y, r: w / 120, fill: TC_SHAPE_COLOR });
        if (tc.tool && tc.tool.p1 && tc.tool.p2 && (tc.tool.p2.x !== tc.tool.p1.x || tc.tool.p2.y !== tc.tool.p1.y)) {
          var pv = tcShapePath(tcShapeFrom(tc, tc.tool.type, tc.tool.p1, tc.tool.p2));
          node("polyline", {
            points: pv.map(function (q) { return q.x + "," + -q.y; }).join(" "),
            fill: "none",
            stroke: TC_SHAPE_COLOR,
            "stroke-width": dv.sw * 1.5,
            "stroke-dasharray": w / 80 + " " + w / 120,
          });
        }
      }

      // the rotate handle: a stem from the box and a green disc with a curved arrow (it reads as "turn", not as one more dot)
      function tcDrawRotateHandle(dv, node, h, sb, hs) {
        var r = hs * 1.4;
        node("line", { x1: h.x, y1: -sb.ymax, x2: h.x, y2: -h.y + r, stroke: "#fff", "stroke-width": dv.sw * 0.6 });
        node("circle", { cx: h.x, cy: -h.y, r: r, fill: "#43a047", stroke: "#fff", "stroke-width": dv.sw * 0.8 });
        var a = r * 0.55;
        node("path", { d: "M " + (h.x - a) + " " + (-h.y) + " A " + a + " " + a + " 0 1 1 " + h.x + " " + (-h.y + a), fill: "none", stroke: "#fff", "stroke-width": dv.sw * 0.7 });
        node("polygon", { points: [h.x, -h.y + a - a * 0.45, h.x, -h.y + a + a * 0.45, h.x - a * 0.5, -h.y + a].join(" "), fill: "#fff" });
      }

      function tcDrawCenter(tc, dv, node, w) {
        if (tc.view !== "center") return; // leaving Find center leaves the map clean (its drawing is only for its own tab)
        // captured points: cross + "P1", "P2"... (the numbers of the card list);
        // with a result, a thin dashed line from its centre to every point it
        // used, and the residual of the circle fit next to each point.
        var crP = tc.view === "center" && tc.centerMode && tc.centerMode !== "camera" ? tcCenterResult(tc) : null;
        var errsP = crP && crP.errs ? crP.errs : null;
        var kErr = 0;
        tc.centerPts.forEach(function (q, i) {
          if (!q) return;
          var c = w / 90;
          if (crP && tc.centerMode !== "mid") node("line", { x1: crP.cx, y1: -crP.cy, x2: q.x, y2: -q.y, stroke: TC_CENTER_COLOR, "stroke-width": dv.sw * 0.6, "stroke-opacity": 0.55, "stroke-dasharray": w / 200 + " " + w / 150 });
          node("line", { x1: q.x - c, y1: -q.y, x2: q.x + c, y2: -q.y, stroke: TC_CENTER_COLOR, "stroke-width": dv.sw });
          node("line", { x1: q.x, y1: -q.y - c, x2: q.x, y2: -q.y + c, stroke: TC_CENTER_COLOR, "stroke-width": dv.sw });
          var lb = "P" + (i + 1);
          if (errsP) {
            var e = errsP[kErr++];
            if (isFinite(e) && Math.abs(e) >= 0.005) lb += " " + (e > 0 ? "+" : "") + tc.fmt(e);
          }
          var tq = node("text", { x: q.x + c * 0.9, y: -q.y - c * 0.9, fill: TC_CENTER_COLOR, "font-size": w / 55, "font-weight": "bold", stroke: "#000", "stroke-width": w / 700, "paint-order": "stroke" });
          tq.textContent = lb;
        });
        if (crP && tc.centerMode === "mid") {
          var mp = tcCenterFilled(tc);
          if (mp.length === 2) node("line", { x1: mp[0].x, y1: -mp[0].y, x2: mp[1].x, y2: -mp[1].y, stroke: TC_CENTER_COLOR, "stroke-width": dv.sw * 0.6, "stroke-opacity": 0.55, "stroke-dasharray": w / 200 + " " + w / 150 });
        }
        if (tc.centerMode && tc.centerAim) {
          var ca = w / 70;
          node("circle", { cx: tc.centerAim.x, cy: -tc.centerAim.y, r: ca, fill: "none", stroke: "#ffd54f", "stroke-width": dv.sw * 1.5 });
          node("line", { x1: tc.centerAim.x - ca * 1.6, y1: -tc.centerAim.y, x2: tc.centerAim.x + ca * 1.6, y2: -tc.centerAim.y, stroke: "#ffd54f", "stroke-width": dv.sw });
          node("line", { x1: tc.centerAim.x, y1: -tc.centerAim.y - ca * 1.6, x2: tc.centerAim.x, y2: -tc.centerAim.y + ca * 1.6, stroke: "#ffd54f", "stroke-width": dv.sw });
        }
        if (tc.view === "center") {
          tcCenterAutoTick(tc);
          tcCenterCands(tc).forEach(function (c, i) {
            var rr = w / 110;
            // suggestions carry no number: P1, P2... are only the captured points
            node("circle", { cx: c.x, cy: -c.y, r: rr, fill: "#ff9100", "fill-opacity": 0.85, stroke: "#fff", "stroke-width": dv.sw * 0.8 });
          });
        }
        if (tc.centerMode === "camera" && tc.view === "center") {
          tc.centerCamera.items.forEach(function (it) {
            var r0 = tcCenterCameraResult(tc, it);
            if (!r0) return;
            var op = it.id === tc.centerCamera.sel ? 0 : 0.55;
            if (!op) return;
            if (r0.r) node("circle", { cx: r0.cx, cy: -r0.cy, r: r0.r, fill: "rgba(255,213,79,0.08)", stroke: "#ffd54f", "stroke-width": dv.sw, "stroke-opacity": op });
            else if (r0.poly) node("polygon", { points: r0.poly.map(function (q) { return q[0] + "," + -q[1]; }).join(" "), fill: "rgba(255,213,79,0.08)", stroke: "#ffd54f", "stroke-width": dv.sw, "stroke-opacity": op });
          });
        }
        var cr = tcCenterResult(tc);
        if (cr) {
          var c2 = w / 50;
          if (cr.poly) node("polygon", { points: cr.poly.map(function (q) { return q[0] + "," + -q[1]; }).join(" "), fill: "none", stroke: TC_CENTER_COLOR, "stroke-width": dv.sw, "stroke-dasharray": w / 80 + " " + w / 120 });
          node("line", { x1: cr.cx - c2, y1: -cr.cy, x2: cr.cx + c2, y2: -cr.cy, stroke: TC_CENTER_COLOR, "stroke-width": dv.sw * 2 });
          node("line", { x1: cr.cx, y1: -cr.cy - c2, x2: cr.cx, y2: -cr.cy + c2, stroke: TC_CENTER_COLOR, "stroke-width": dv.sw * 2 });
          if (cr.r) node("circle", { cx: cr.cx, cy: -cr.cy, r: cr.r, fill: "none", stroke: TC_CENTER_COLOR, "stroke-width": dv.sw, "stroke-dasharray": w / 80 + " " + w / 120 });
          if (cr.alt && cr.r) node("circle", { cx: cr.alt.cx, cy: -cr.alt.cy, r: cr.r, fill: "none", stroke: TC_CENTER_COLOR, "stroke-width": dv.sw * 0.6, "stroke-opacity": 0.35, "stroke-dasharray": w / 200 + " " + w / 100 });
          if (cr.w && cr.h && !cr.angle && !cr.poly) node("rect", { x: cr.cx - cr.w / 2, y: -(cr.cy + cr.h / 2), width: cr.w, height: cr.h, fill: "none", stroke: TC_CENTER_COLOR, "stroke-width": dv.sw, "stroke-dasharray": w / 80 + " " + w / 120 });
          if (tc.view === "center" && tc.centerMode && tc.centerMode !== "camera") {
            var used = [];
            tc.centerPts.forEach(function (q, i) { if (q) used.push("P" + (i + 1)); });
            var lbl = node("text", { x: cr.cx + c2 * 0.6, y: -cr.cy + c2 * 1.4, fill: TC_CENTER_COLOR, "font-size": w / 55, stroke: "#000", "stroke-width": w / 700, "paint-order": "stroke" });
            lbl.textContent = i18nT('cuts.map_centre_of', { list: used.join(" ") });
          }
        }
      }
