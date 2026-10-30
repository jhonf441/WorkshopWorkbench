      // -- touches and drags on the map --
      // Request 2026-10-08: "the shape should always be drawable over
      // the area and at least draggable". With a tool chosen:
      // press-drag-release draws (or tap two points, as before).
      // Without a tool: grabbing a shape and dragging it moves it. If nothing
      // is grabbed, the drag still belongs to the map (pan).
      // Angle help for lines (request: "even if it is 180, 90 and 45
      // degrees"): the end snaps to the nearest multiple of data.snap degrees,
      // keeping the length. 0 = free.
      function tcSnapLine(tc, a, p) {
        var step = tc.data.snap;
        if (!step) return p;
        var L = Math.hypot(p.x - a.x, p.y - a.y);
        if (L < 1e-6) return p;
        var ang = Math.round(Math.atan2(p.y - a.y, p.x - a.x) * 180 / Math.PI / step) * step;
        var r = ang * Math.PI / 180;
        return { x: Math.round((a.x + L * Math.cos(r)) * 10) / 10, y: Math.round((a.y + L * Math.sin(r)) * 10) / 10 };
      }

      // Magnet for the polyline: a tap close to a point already placed (the first one closes the outline) or to a vertex of
      // another shape lands exactly on it, so two points can be joined. The reach is the same as the move magnet (1/60 of the view).
      function tcSnapVertex(tc, p) {
        var tol = tc.lastW / 60, best = null, bd = tol;
        function test(q, first) {
          var d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d <= bd) { bd = d; best = { pt: q, first: first }; }
        }
        var mine = (tc.tool && tc.tool.pts) || [];
        mine.forEach(function (q, i) { test(q, i === 0); });
        tc.data.shapes.forEach(function (sh) {
          if (sh.type === "circle" || sh.type === "ellipse" || tcLayerById(tc, sh.layer).locked) return;
          tcShapePath(sh).forEach(function (q) { test(q, false); });
        });
        return best;
      }

      function tcShapeFrom(tc, type, a, p) {
        if (type === "line") {
          p = tcSnapLine(tc, a, p);
          return { type: "line", x1: a.x, y1: a.y, x2: p.x, y2: p.y };
        }
        if (type === "rect") return { type: "rect", x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) };
        return { type: "circle", cx: a.x, cy: a.y, r: Math.max(0.5, Math.hypot(p.x - a.x, p.y - a.y)) };
      }

      function tcFinishPoly(tc, closed) {
        var pts = (tc.tool && tc.tool.pts) || [];
        if (pts.length < (closed ? 3 : 2)) return;
        tcAddShape(tc, { type: "path", pts: pts.map(function (q) { return { x: q.x, y: q.y }; }), closed: !!closed });
        tc.tool = null;
        tcGo(tc);
      }

      function tcFinishTool(tc, p) {
        var s = tcShapeFrom(tc, tc.tool.type, tc.tool.p1, p);
        if ((s.type === "rect" && (s.w < 0.5 || s.h < 0.5)) || (s.type === "line" && Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 0.5)) {
          tc.tool = { type: tc.tool.type, p1: null };
          return tcSetMsg(tc, i18nT('cuts.the_shape_ended_up_too_small'), false);
        }
        tcAddShape(tc, s);
        tc.tool = null;
        tcGo(tc);
      }

      function tcHitShape(tc, p, tol) {
        for (var i = tc.data.shapes.length - 1; i >= 0; i--) {
          if (tcLayerById(tc, tc.data.shapes[i].layer).locked) continue; // capa bloqueada
          var pts = tcShapePath(tc.data.shapes[i]);
          for (var k = 1; k < pts.length; k++) if (tcSecDist(p, pts[k - 1], pts[k]) <= tol) return tc.data.shapes[i];
          // inside a circle/rectangle also counts as "grabbing it"
          var s = tc.data.shapes[i];
          if (s.type === "circle" && Math.hypot(p.x - s.cx, p.y - s.cy) <= s.r) return s;
          if (s.type === "rect" && p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) return s;
          if (s.type === "path" && s.closed && tcPointInPoly(p, s.pts)) return s;
        }
        return null;
      }

      // Handles of the selection: 4 corners (scale) + 1 above (rotate, around the pivot of 41-cuts-rotate.js). Bigger on a touch screen.
      function tcSelBox(tc) {
        var ss = tcSelShapes(tc);
        return ss.length ? tcBBox(ss) : null;
      }

      function tcHandles(tc) {
        var b = tcSelBox(tc);
        if (!b) return [];
        var hs = (tc.lastW / 70) * (tcCoarsePointer() ? 1.5 : 1);
        return [
          { k: "s", x: b.xmin, y: b.ymin, ax: b.xmax, ay: b.ymax },
          { k: "s", x: b.xmax, y: b.ymin, ax: b.xmin, ay: b.ymax },
          { k: "s", x: b.xmax, y: b.ymax, ax: b.xmin, ay: b.ymin },
          { k: "s", x: b.xmin, y: b.ymax, ax: b.xmax, ay: b.ymin },
          { k: "r", x: (b.xmin + b.xmax) / 2, y: b.ymax + hs * 3.5 },
        ];
      }

      function tcHitHandle(tc, p, tol) {
        var r = Math.max(tol, tc.lastW / 70) * (tcCoarsePointer() ? 1.6 : 1);
        var hh = tcHandles(tc);
        for (var i = 0; i < hh.length; i++) if (Math.hypot(p.x - hh[i].x, p.y - hh[i].y) <= r) return hh[i];
        return null;
      }

      function tcPointerDown(tc, p, tol) {
        if (tc.view === "center") return false;
        if (!tc.tool) {
          var h = tcHitHandle(tc, p, tol);
          if (h) {
            var orig = tcSelShapes(tc).map(function (x) { return JSON.parse(JSON.stringify(x)); });
            if (h.k === "s") tc.drag = { kind: "scale", start: p, moved: false, h: h, orig: orig };
            else tc.drag = tcRotDragStart(tc, p, orig);
            return true;
          }
        }
        if (tc.tool) p = tcClampPt(tc, p);
        if (tc.tool && tc.tool.type === "poly") {
          tc.drag = { kind: "poly", start: p, moved: false };
          return true;
        }
        if (tc.tool) {
          var had = !!tc.tool.p1;
          if (!tc.tool.p1) tc.tool.p1 = p;
          tc.tool.p2 = p;
          tc.drag = { kind: "create", start: p, moved: false, downHadP1: had };
          tc.ctx.map.redraw();
          return true;
        }
        var s = tcHitShape(tc, p, tol);
        if (!s && (tc.multiMode || tcShiftDown)) {
          // Marquee (request 2026-10-09: "select many shapes and
          // delete them at once, one by one is tiring"): dragging on empty space
          // with Multiple (or Shift) adds everything the marquee touches.
          tc.drag = { kind: "marquee", start: p, cur: p, moved: false };
          return true;
        }
        if (!s) {
          if (tc.selIds.length && !tc.multiMode && !tcShiftDown) {
            tcSetSel(tc, []); // tap outside: release the selection (the drag still belongs to the map)
            tc.lastKey = "";
            tcRender(tc);
            tc.ctx.map.redraw();
          }
          return false;
        }
        if (tc.multiMode || tcShiftDown) tcToggleSel(tc, s.id);
        else if (!tcIsSelId(tc, s.id)) tcSetSel(tc, [s.id]);
        else tc.sel = s.id;
        tc.drag = { kind: "move", start: p, moved: false, orig: tcSelShapes(tc).map(function (x) { return JSON.parse(JSON.stringify(x)); }) };
        if (tcSelShapes(tc).some(function (x) { return x.fixed; })) {
          tc.drag.fixed = true; // fija en un centro medido: no se arrastra
          tcSetMsg(tc, i18nT('cuts.this_shape_is_fixed_on_the'), true);
        }
        tc.lastKey = "";
        tcRender(tc);
        tc.ctx.map.redraw();
        return true;
      }

      function tcPointerMove(tc, p) {
        if (!tc.drag) return false;
        var dx = p.x - tc.drag.start.x, dy = p.y - tc.drag.start.y;
        if (!tc.drag.moved && Math.hypot(dx, dy) < 0.8) return true;
        tc.drag.moved = true;
        if (tc.drag.kind === "marquee") {
          tc.drag.cur = p;
          tc.ctx.map.redraw();
          return true;
        }
        if (tc.drag.kind === "poly") {
          return false; // dragging with the polyline = move the map
        } else if (tc.drag.kind === "create") {
          tc.tool.p2 = tcClampPt(tc, p);
        } else {
          var fn, kind;
          if (tc.drag.kind === "move" && tc.drag.fixed) {
            dx = 0;
            dy = 0;
          }
          if (tc.drag.kind === "move") {
            var a0 = tcAreaBox(tc);
            if (a0) {
              var ob = tcBBox(tc.drag.orig);
              dx = Math.min(Math.max(dx, a0.xmin - ob.xmin), a0.xmax - ob.xmax);
              dy = Math.min(Math.max(dy, a0.ymin - ob.ymin), a0.ymax - ob.ymax);
            }
            // magnet: the shapes' box snaps to 0,0, to the center or to the
            // opposite edge of the active zone (each axis separately)
            tc.drag.info = "";
            var zb = tcZoneBox(tc);
            if (zb) {
              var ob2 = tcBBox(tc.drag.orig), tolS = tc.lastW / 60, lbl = [];
              var cx = [[zb.x, ob2.xmin, "0,0"]], cy = [[zb.y, ob2.ymin, "0,0"]];
              if (zb.w > 0 && zb.h > 0) {
                cx.push([zb.x + zb.w / 2, (ob2.xmin + ob2.xmax) / 2, i18nT('cuts.center_3')], [zb.x + zb.w, ob2.xmax, i18nT('cuts.edge')]);
                cy.push([zb.y + zb.h / 2, (ob2.ymin + ob2.ymax) / 2, i18nT('cuts.center_3')], [zb.y + zb.h, ob2.ymax, i18nT('cuts.edge')]);
              }
              cx.some(function (c) { if (Math.abs(c[1] + dx - c[0]) < tolS) { dx = c[0] - c[1]; lbl.push("X " + c[2]); return true; } return false; });
              cy.some(function (c) { if (Math.abs(c[1] + dy - c[0]) < tolS) { dy = c[0] - c[1]; lbl.push("Y " + c[2]); return true; } return false; });
              if (lbl.length) tc.drag.info = i18nT('cuts.snap', { list: lbl.join(", "), code: zb.code });
            }
            fn = tcMoveFn(dx, dy);
            kind = { move: true };
          } else if (tc.drag.kind === "scale") {
            var h = tc.drag.h;
            var sx = (p.x - h.ax) / ((h.x - h.ax) || 1e-9), sy = (p.y - h.ay) / ((h.y - h.ay) || 1e-9);
            if (tc.data.keepRatio !== false) {
              var m = (Math.abs(sx) + Math.abs(sy)) / 2;
              sx = m * (sx < 0 ? -1 : 1);
              sy = m * (sy < 0 ? -1 : 1);
            }
            if (Math.abs(sx) < 0.01) sx = sx < 0 ? -0.01 : 0.01;
            if (Math.abs(sy) < 0.01) sy = sy < 0 ? -0.01 : 0.01;
            fn = tcScaleFn(sx, sy, h.ax, h.ay);
            kind = { scale: [sx, sy] };
            tc.drag.info = i18nT('cuts.scale', { v: tc.fmt(Math.abs(sx) * 100), v2: tc.data.keepRatio !== false ? "" : " x " + tc.fmt(Math.abs(sy) * 100) + " %" });
          } else {
            var rs = tcRotDragStep(tc, p, tcShiftDown); // the magnet of the chosen step; Shift: free
            fn = rs.fn;
            kind = rs.kind;
          }
          var nws = tc.drag.orig.map(function (o) { return tcTransformShape(o, fn, kind); });
          nws.forEach(function (nw) { if (nw.fixed) tcMoveCenterTo(nw, nw.fixed.x, nw.fixed.y); });
          if (!tcInArea(tc, tcBBox(nws))) {
            tc.drag.info = i18nT('cuts.reaches_the_edge_of_the_cut', { v: tc.drag.info || "" });
            tc.ctx.map.redraw();
            return true;
          }
          nws.forEach(function (nw) {
            var i = tc.data.shapes.findIndex(function (x) { return x.id === nw.id; });
            if (i >= 0) tc.data.shapes[i] = nw;
          });
        }
        tc.ctx.map.redraw();
        return true;
      }

      function tcPointerUp(tc, p) {
        if (!tc.drag) return false;
        var d = tc.drag;
        tc.drag = null;
        p = tcClampPt(tc, p);
        if (d.kind === "marquee") {
          if (d.moved) {
            var mx0 = Math.min(d.start.x, d.cur.x), mx1 = Math.max(d.start.x, d.cur.x);
            var my0 = Math.min(d.start.y, d.cur.y), my1 = Math.max(d.start.y, d.cur.y);
            var add = tc.data.shapes.filter(function (x) {
              if (tcLayerById(tc, x.layer).locked) return false; // capa bloqueada
              var b = tcBBox([x]);
              return b && b.xmin <= mx1 && b.xmax >= mx0 && b.ymin <= my1 && b.ymax >= my0;
            }).map(function (x) { return x.id; });
            var all = tc.selIds.slice();
            add.forEach(function (id) { if (all.indexOf(id) === -1) all.push(id); });
            tcSetSel(tc, all);
            tcSetMsg(tc, i18nT('cuts.shape_s_in_the_box_selected', { n: add.length, total: all.length }), true);
          }
          tc.lastKey = "";
          tcGo(tc);
          return true;
        }
        if (d.kind === "poly") {
          if (!d.moved) {
            tc.tool.pts = tc.tool.pts || [];
            var hit = tcSnapVertex(tc, p);
            if (hit && hit.first && tc.tool.pts.length >= 3) {
              tcFinishPoly(tc, true); // magnet on the first point = close the outline
              return true;
            }
            var q = hit ? hit.pt : tc.tool.pts.length ? tcSnapLine(tc, tc.tool.pts[tc.tool.pts.length - 1], p) : p;
            tc.tool.pts.push({ x: q.x, y: q.y });
          }
          tcGo(tc);
          return true;
        }
        if (d.kind === "create") {
          if (d.moved || d.downHadP1) tcFinishTool(tc, d.moved ? tc.tool.p2 : p);
          else tcGo(tc); // primer toque: queda marcada la 1a esquina/punto
        } else {
          if (d.moved) tcSave(tc);
          tc.lastKey = "";
          tcGo(tc);
        }
        return true;
      }

      // The arrow of a corner follows the diagonal it has ON SCREEN: bed y goes up and the map is drawn with y down, and the view can be
      // rotated or mirrored (ctx.map.matrix), so two opposite corners share one arrow and the other two corners the crossing one.
      function tcCornerCursor(tc, h) {
        var vx = h.x - h.ax, vy = -(h.y - h.ay);
        var M = tc.ctx.map.matrix ? tc.ctx.map.matrix() : null;
        var sx = M ? M.a * vx + M.c * vy : vx, sy = M ? M.b * vx + M.d * vy : vy;
        return sx * sy > 0 ? "nwse-resize" : "nesw-resize";
      }

      function tcCursorAt(tc, p, tol) {
        if (tc.view === "center") return tc.centerMode ? "crosshair" : "";
        if (tc.tool) return "crosshair";
        var h = tcHitHandle(tc, p, tol);
        if (h) return h.k === "r" ? "grab" : tcCornerCursor(tc, h);
        if (tc.multiMode || tcShiftDown) return tcHitShape(tc, p, tol) ? "copy" : "crosshair";
        return tcHitShape(tc, p, tol) ? "move" : "";
      }

      function tcWantsClick(tc) {
        return tc.view === "center" ? !!tc.centerMode || !!tcCenterResult(tc) : !!tc.tool;
      }

      function tcOnClick(tc, p) {
        // tapping the found center: copy its G-code / save it as a position (instead of adding a point)
        if (tc.view === "center") {
          var cr0 = tcCenterResult(tc);
          if (cr0 && Math.hypot(p.x - cr0.cx, p.y - cr0.cy) <= Math.max(4, (tc.lastW || 400) / 40)) return tcCenterResultDlg(tc, cr0);
          if (!tc.centerMode) return;
        }
        if (tc.tool && tc.tool.type === "poly") return; // the points are added by pointerUp
        if (tc.tool && tc.view === "cuts") {
          if (!tc.tool.p1) {
            tc.tool.p1 = p;
            return tcGo(tc);
          }
          return tcFinishTool(tc, p);
        }
        // with the camera as the source: the tap on the image IS the point
        if (tc.centerMode && tc.view === "center" && tc.centerMode !== "camera" && tcCenterUsesCamera(tc) && tc.ctx.map.camera.shown && tc.ctx.map.camera.shown()) {
          var cand = tcCenterCandNear(tc, p);
          if (cand) {
            var iC = tcCenterPush(tc, { x: cand.x, y: cand.y, camera: true });
            tc.centerAim = null;
            tcSetMsg(tc, i18nT('cuts.point_taken_from_the_camera_suggestion', { n: iC + 1 }), true);
            return tcGo(tc);
          }
          var iT = tcCenterPush(tc, { x: p.x, y: p.y, camera: true });
          tc.centerAim = null;
          tcSetMsg(tc, i18nT('cuts.point_taken_from_the_camera_if', { n: iT + 1 }), true);
          return tcGo(tc);
        }
        if (tc.centerMode && tc.view === "center") {
          // Request: "select in the cutting area, have the head go,
          // adjust it and when it is right capture it". Tapping the map sets the
          // TARGET; "Go there" takes the pointer, it is adjusted with the jog and
          // "Capture point" takes the real position. ("Add approximate"
          // uses the map's point without moving anything.)
          if (tc.centerMode === "camera") {
            var best = null, dm = Infinity;
            tc.centerCamera.items.forEach(function (it) {
              var d = Math.hypot(p.x - it.mm.c[0], p.y - it.mm.c[1]) - (it.kind === "circle" ? it.mm.d / 2 : Math.max(it.mm.w || 0, it.mm.h || 0) / 2);
              if (d < dm) { dm = d; best = it; }
            });
            if (best && dm < Math.max(5, tc.lastW / 25)) tc.centerCamera.sel = best.id;
            return tcGo(tc);
          }
          tc.centerAim = p;
          tc.centerDlgSeen = false; // abre el cuadro junto al toque
          return tcGo(tc);
        }
      }

