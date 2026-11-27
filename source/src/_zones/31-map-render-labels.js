      // ---- Labels of the map that never write over each other (2026-11-22) ----
      // The geometry is pure (no DOM, no state): a label is a box in map units (y grows down, as in the SVG) estimated from its text and font size;
      // a label that would land on one already placed moves down (then up) in steps until it is free. The layers of the map are drawn apart and kept
      // (31-map-render-render-map.js), so what needs to know about another layer's labels gets them from the same pure functions of the same data
      // (tzMapAreaLabels below is read by the areas layer to draw and by the origin layer to dodge them).

      // The box of a text drawn at (x, y) (the baseline) with the given anchor; the width is estimated (0.56 em per character)
      function tzLblBox(x, y, text, fs, anchor) {
        var w = String(text).length * fs * 0.56;
        var x0 = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
        return { x0: x0, x1: x0 + w, y0: y - fs * 0.8, y1: y + fs * 0.25 };
      }

      function tzLblHit(a, b, gap) {
        var g = gap || 0;
        return a.x0 < b.x1 + g && b.x0 < a.x1 + g && a.y0 < b.y1 + g && b.y0 < a.y1 + g;
      }

      // The y where the label can be drawn without touching a box of `taken`: its own y if it is free, else shifted down by `step`, up by `step`,
      // down by 2 steps ... (up to `tries` shifts; if nothing is free it keeps its own place). The box it ends up in is added to `taken`.
      function tzLblPlace(taken, x, y, text, fs, anchor, step, tries) {
        var n = tries || 6;
        var best = y;
        for (var k = 0; k <= n; k++) {
          var dy = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step;
          if (!taken.some(function (t) { return tzLblHit(tzLblBox(x, y + dy, text, fs, anchor), t, fs * 0.1); })) { best = y + dy; break; }
        }
        taken.push(tzLblBox(x, best, text, fs, anchor));
        return best;
      }

      // The labels of the cut areas (name above the top left corner, coordinates at the other three corners): [{x, y, text, fs, anchor, color, opacity,
      // isAct, kind}] already dodging each other. In focus mode (a job runs) only the name, without coordinates.
      function tzMapAreaLabels(pmr, mp) {
        var out = [];
        var gl = pmr.data.st().globals || {};
        var taken = [];
        var eff = function (f) { return Math.max(f, mp.minFs || 0); }; // a text is never drawn under mp.minFs (mp.node): the boxes use the real size
        TZ_WORK_MODES.slice().reverse().forEach(function (m) {
          var a = gl["cutArea" + m];
          if (!pmr.layerState.layers()["area" + m] || !Array.isArray(a) || a.length !== 4) return;
          if (mp.focus && m !== pmr.data.st().mode) return;
          var isAct = m === pmr.data.st().mode;
          var col = TZ_AREA_COLORS[m];
          var fs = mp.fs * 0.85;
          var name = (i18nT('zonesPage.area', { m: m, v: isAct ? i18nT('zonesPage.active_2') : "" })) + (mp.focus ? "" : "  X" + tzFmt(a[0]) + " Y" + tzFmt(a[3]));
          // the top left corner goes with the name
          out.push({ kind: "name", m: m, x: a[0], y: tzLblPlace(taken, a[0], -a[3] - mp.fs * 0.35, name, eff(fs), "start", eff(fs) * 0.95), text: name, fs: fs, anchor: "start", color: col, isAct: isAct });
          if (mp.focus) return;
          var cfs = mp.fs * (isAct ? 0.75 : 0.6);
          [
            [a[0], a[2], "start", cfs * 1.05],
            [a[1], a[2], "end", cfs * 1.05],
            [a[1], a[3], "end", -mp.fs * 0.35],
          ].forEach(function (cc) {
            var text = "X" + tzFmt(cc[0]) + " Y" + tzFmt(cc[1]);
            out.push({ kind: "corner", m: m, x: cc[0], y: tzLblPlace(taken, cc[0], -cc[1] + cc[3], text, eff(cfs), cc[2], eff(cfs) * 0.95), text: text, fs: cfs, anchor: cc[2], color: col, isAct: isAct });
          });
        });
        return out;
      }

      // The boxes of those labels, for a layer that has to keep its own labels away from them
      function tzMapAreaLabelBoxes(pmr, mp) {
        return tzMapAreaLabels(pmr, mp).map(function (l) { return tzLblBox(l.x, l.y, l.text, Math.max(l.fs, mp.minFs || 0), l.anchor); });
      }
