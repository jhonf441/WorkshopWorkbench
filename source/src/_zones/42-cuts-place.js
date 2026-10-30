      // ---- Everything inside the CUTTING AREA (request 2026-10-09: "it makes no
      // sense for the shapes to leave the cutting area") ----
      // Without a measured area nothing is limited (it cannot cut anyway).
      function tcAreaBox(tc) {
        return tc.ctx.cut.area();
      }

      // ---- Place in the active zone + clamps (map redesign, 2026-10-09:
      // "place the job by dragging it, with magnet and the measure from 0,0").
      // The shapes stay in BED coords; this only helps to put them
      // relative to the 0,0 (material corner) of the active zone.
      function tcZoneBox(tc) {
        return tc.ctx.data.active ? tc.ctx.data.active() : null; // {code, x, y, w, h}
      }

      function tcPlaceTargets(tc) {
        var ss = tcSelShapes(tc);
        return ss.length ? ss : tc.data.shapes;
      }

      function tcPlaceAt(tc, how) {
        var z = tcZoneBox(tc);
        var list = tcPlaceTargets(tc);
        if (!z || !list.length) return;
        var b = tcBBox(list);
        var dx, dy;
        if (how === "00") {
          dx = z.x - b.xmin;
          dy = z.y - b.ymin;
        } else {
          if (!(z.w > 0 && z.h > 0)) return tcSetMsg(tc, i18nT('cuts.has_no_material_size_cannot_centre', { code: z.code }), false);
          dx = z.x + z.w / 2 - (b.xmin + b.xmax) / 2;
          dy = z.y + z.h / 2 - (b.ymin + b.ymax) / 2;
        }
        if (!tcInArea(tc, { xmin: b.xmin + dx, xmax: b.xmax + dx, ymin: b.ymin + dy, ymax: b.ymax + dy })) return tcSetMsg(tc, i18nT('cuts.that_would_go_outside_the_cutting'), false);
        var ids = {};
        list.forEach(function (x) { ids[x.id] = true; });
        tc.data.shapes = tc.data.shapes.map(function (x) { return ids[x.id] ? tcTransformShape(x, tcMoveFn(dx, dy), { move: true }) : x; });
        tcSave(tc);
        tcSetMsg(tc, how === "00" ? i18nT('cuts.shapes_at_0_0_of', { code: z.code }) : i18nT('cuts.shapes_centred_in', { code: z.code }), true);
        tcGo(tc);
      }

      // First place (every 5 mm, with 2 mm margin) inside the part where
      // the bb box fits without touching clamps. Returns {dx, dy} or null.
      function tcFitIn(tc, pz, bb) {
        var bw = bb.xmax - bb.xmin, bh = bb.ymax - bb.ymin, m = 2;
        var pr = tc.ctx.data.clamps ? tc.ctx.data.clamps() : [];
        for (var y = pz.y + m; y + bh <= pz.y + pz.h - m + 1e-6; y += 5)
          for (var x = pz.x + m; x + bw <= pz.x + pz.w - m + 1e-6; x += 5) {
            var nb = { xmin: x, xmax: x + bw, ymin: y, ymax: y + bh };
            var collides = pr.some(function (r) { return r.x < nb.xmax && r.x + r.w > nb.xmin && r.y < nb.ymax && r.y + r.h > nb.ymin; });
            if (!collides && tcInArea(tc, nb)) return { dx: x - bb.xmin, dy: y - bb.ymin };
          }
        return null;
      }

      function tcMoveTargetsBy(tc, dx, dy) {
        var ids = {};
        tcPlaceTargets(tc).forEach(function (x) { ids[x.id] = true; });
        tc.data.shapes = tc.data.shapes.map(function (x) { return ids[x.id] ? tcTransformShape(x, tcMoveFn(dx, dy), { move: true }) : x; });
        tcSave(tc);
        tcGo(tc);
      }

      // Clamps that a shape's path touches (indices of ctx.data.clamps()).
      function tcClampHits(tc, sh) {
        var pr = tc.ctx.data.clamps ? tc.ctx.data.clamps() : [];
        if (!pr.length) return [];
        var p = tcShapePath(sh), out = [];
        pr.forEach(function (r, k) {
          var hit = false;
          for (var i = 0; i < p.length && !hit; i++) {
            var a = p[i], c = p[i + 1] || p[i];
            var n = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.y - a.y))); // cada ~1 mm
            for (var j = 0; j <= n && !hit; j++) {
              var x = a.x + ((c.x - a.x) * j) / n, y = a.and + ((c.and - a.and) * j) / n;
              if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) hit = true;
            }
          }
          if (hit) out.push(k);
        });
        return out;
      }

      function tcInArea(tc, bb) {
        var a = tcAreaBox(tc);
        return !a || !bb || (bb.xmin >= a.xmin - 1e-6 && bb.xmax <= a.xmax + 1e-6 && bb.ymin >= a.ymin - 1e-6 && bb.ymax <= a.ymax + 1e-6);
      }

      function tcFitsArea(tc, bb) {
        var a = tcAreaBox(tc);
        return !a || !bb || (bb.xmax - bb.xmin <= a.xmax - a.xmin + 1e-6 && bb.ymax - bb.ymin <= a.ymax - a.ymin + 1e-6);
      }

      // Corrimiento minimo para meter bb adentro (null si no entra).
      function tcShiftInto(tc, bb) {
        var a = tcAreaBox(tc);
        if (!a || !bb) return { dx: 0, dy: 0 };
        if (!tcFitsArea(tc, bb)) return null;
        var dx = 0, dy = 0;
        if (bb.xmin < a.xmin) dx = a.xmin - bb.xmin;
        else if (bb.xmax > a.xmax) dx = a.xmax - bb.xmax;
        if (bb.ymin < a.ymin) dy = a.ymin - bb.ymin;
        else if (bb.ymax > a.ymax) dy = a.ymax - bb.ymax;
        return { dx: dx, dy: dy };
      }

      function tcClampPt(tc, q) {
        var a = tcAreaBox(tc);
        if (!a || !q) return q;
        return { x: Math.min(a.xmax, Math.max(a.xmin, q.x)), y: Math.min(a.ymax, Math.max(a.ymin, q.y)) };
      }

