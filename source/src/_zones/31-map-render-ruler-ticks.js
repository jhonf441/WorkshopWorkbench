      // The marks of one edge of the ruler (31-map-render-ruler.js). The edge group is translated to the edge of the view (top: its y,
      // left: its x), so a mark keeps its place along the edge while the view pans: a pan writes the translate and only the marks that
      // enter the view are created, the ones that leave it are removed. A mark is a grid line (major marks only), the tick and its label
      // (major marks only), drawn in that order, the marks in ascending value, as the ruler was always drawn.

      function tzMapRulerEdgeUpdate(pmr, R, e, vr) {
        var minor = R.minor;
        var u = pmr.view.xfInvP(vr.x, vr.y); // the machine value at the corner of the view
        var v0 = e.ax === "X" ? u.x : -u.y;
        var p0 = e.horiz ? vr.x : vr.y, len = e.horiz ? vr.w : vr.h;
        var v1 = v0 + e.s * len;
        var lo = Math.min(v0, v1), hi = Math.max(v0, v1);
        var ixLo = Math.ceil(lo / minor), ixHi = Math.floor((hi + 1e-9) / minor);
        while (ixHi * minor > hi + 1e-9) ixHi--;
        while ((ixHi + 1) * minor <= hi + 1e-9) ixHi++;
        var posOf = function (ix) { return p0 + (ix * minor - v0) / e.s; }; // position in the view
        tzSvgSetChanged(e.g, { transform: e.horiz ? "translate(0 " + vr.y + ")" : "translate(" + vr.x + " 0)" });
        var kept = [];
        e.ticks.forEach(function (t) {
          if (t.ix >= ixLo && t.ix <= ixHi) kept.push(t);
          else t.els.forEach(function (el) { e.g.removeChild(el); });
        });
        kept.forEach(function (t) {
          var pos = posOf(t.ix);
          if (Math.abs(pos - t.pos) > 1e-9 * Math.max(1, Math.abs(pos))) tzMapRulerTickMove(R, e, t, pos);
        });
        var first = kept.length ? kept[0].ix : ixHi + 1, last = kept.length ? kept[kept.length - 1].ix : ixHi;
        var ref = kept.length ? kept[0].els[0] : null;
        var before = [], after = [];
        for (var a = ixLo; a < first; a++) before.push(tzMapRulerTickCreate(R, e, a, posOf(a), ref));
        for (var b = last + 1; b <= ixHi; b++) after.push(tzMapRulerTickCreate(R, e, b, posOf(b), null));
        e.ticks = before.concat(kept, after);
      }

      // The attributes of a mark at `pos`, relative to its edge group: [grid line or null, tick, label or null].
      function tzMapRulerTickAttrs(R, e, ix, pos) {
        var isMaj = ix % 5 === 0, tl = isMaj ? R.tickL : R.tickL * 0.45;
        var grid = { stroke: "rgba(255,255,255,0.07)", "stroke-width": R.rStroke };
        var tick = { stroke: "#bdbdbd", "stroke-width": R.rStroke * 1.5 };
        var label = { fill: "#bdbdbd", "font-size": R.rfs };
        if (e.horiz) {
          return [isMaj ? Object.assign({ x1: pos, y1: 0, x2: pos, y2: R.h }, grid) : null,
            Object.assign({ x1: pos, y1: 0, x2: pos, y2: tl }, tick),
            isMaj ? Object.assign({ x: pos + R.rfs * 0.2, y: R.tickL + R.rfs }, label) : null];
        }
        return [isMaj ? Object.assign({ x1: 0, y1: pos, x2: R.w, y2: pos }, grid) : null,
          Object.assign({ x1: 0, y1: pos, x2: tl, y2: pos }, tick),
          isMaj ? Object.assign({ x: R.tickL + R.rfs * 0.2, y: pos + R.rfs * 0.35 }, label) : null];
      }

      // A new mark, put in the edge group before `ref` (null: at the end).
      function tzMapRulerTickCreate(R, e, ix, pos, ref) {
        var t = { ix: ix, pos: pos, els: [] };
        tzMapRulerTickAttrs(R, e, ix, pos).forEach(function (attrs, k) {
          if (!attrs) return;
          var el = document.createElementNS(TZ_SVG_NS, k === 2 ? "text" : "line");
          Object.keys(attrs).forEach(function (n) { el.setAttribute(n, attrs[n]); });
          if (k === 2) el.textContent = String(Math.round(ix * R.minor * 1000) / 1000);
          e.g.insertBefore(el, ref);
          t.els.push(el);
        });
        return t;
      }

      // A kept mark whose place along the edge changed (the region moved in a way a translate does not cover): only its position.
      function tzMapRulerTickMove(R, e, t, pos) {
        t.pos = pos;
        var k = 0;
        tzMapRulerTickAttrs(R, e, t.ix, pos).forEach(function (attrs) {
          if (!attrs) return;
          var el = t.els[k++];
          var at = {};
          ["x1", "x2", "y1", "y2", "x", "y"].forEach(function (n) { if (n in attrs) at[n] = attrs[n]; });
          tzSvgSetChanged(el, at);
        });
      }
