      // ---- Job in progress: the report of the samples, built INCREMENTALLY (2026-10-24, docs-internal/MESA-RENOVADA.md section 10) ----
      // The trace now grows in place every 10 s while a job runs (47-job-feed*.js), so the report goes on from the last sample it saw
      // instead of walking the whole job again. The cut speeds are counted per value (the service rounds them to 0.1 mm/s): the median is
      // the same element a sorted list gives, without keeping and sorting every speed.
      //   st = { c (laser correction), mode, F (field indices), i (next pair to count: samples i-1, i), inCut, gap, vCount ({speed: n}),
      //          vN, r (the sums: times, distances, pieces, powers, bbox, levels, depths) }
      function ttReportNew(correction, mode, F) {
        return {
          c: correction, mode: mode, F: F, i: 1, inCut: false, gap: 0, vCount: {}, vN: 0,
          r: { tCut: 0, tTravel: 0, dCut: 0, dTravel: 0, pieces: 0, pwmMax: 0, pwmSum: 0, pwmN: 0, vTravelMax: 0, tAir: 0, bbox: null, levels: {}, zMin: null, rpmMax: 0, zLevels: {} },
        };
      }

      function ttReportBox(r, q, c) {
        var x = q[1] - c.cx, y = q[2] - c.cy;
        if (!r.bbox) r.bbox = { xmin: x, xmax: x, ymin: y, ymax: y };
        r.bbox.xmin = Math.min(r.bbox.xmin, x); r.bbox.xmax = Math.max(r.bbox.xmax, x);
        r.bbox.ymin = Math.min(r.bbox.ymin, y); r.bbox.ymax = Math.max(r.bbox.ymax, y);
      }

      // one stretch of work (cut / mill) from sample a to b
      function ttReportCut(st, a, b, dt, d) {
        var r = st.r;
        r.tCut += dt;
        r.dCut += d;
        r.pwmMax = Math.max(r.pwmMax, a[4]);
        r.pwmSum += a[4] * dt;
        r.pwmN += dt;
        if (a[5] > 0) { st.vCount[a[5]] = (st.vCount[a[5]] || 0) + 1; st.vN++; }
        if (a[6]) r.tAir += dt;
        var lvl = Math.round(a[4] * 100);
        if (st.mode === "Laser") r.levels[lvl] = (r.levels[lvl] || 0) + dt;
        if (st.mode === "CNC") {
          r.zMin = r.zMin === null ? a[3] : Math.min(r.zMin, a[3]);
          var zl = (Math.round(a[3] * 10) / 10).toFixed(1);
          r.zLevels[zl] = (r.zLevels[zl] || 0) + dt;
        }
        if (!st.inCut && (st.gap > TT_PIECE_GAP_MM || r.pieces === 0)) r.pieces++;
        st.inCut = true;
        st.gap = 0;
        ttReportBox(r, a, st.c);
        ttReportBox(r, b, st.c);
      }

      // counts the samples of mm not seen yet (mm only grows: the same array, longer)
      function ttReportAdd(st, mm) {
        var r = st.r, F = st.F;
        for (var i = st.i; i < mm.length; i++) {
          var a = mm[i - 1], b = mm[i];
          var dt = Math.max(0, b[0] - a[0]);
          var d = Math.hypot(b[1] - a[1], b[2] - a[2]);
          if (F.rpm >= 0) r.rpmMax = Math.max(r.rpmMax, a[F.rpm] || 0);
          if (ttWork(st.mode, F, a, b)) {
            ttReportCut(st, a, b, dt, d);
          } else {
            r.tTravel += dt;
            r.dTravel += d;
            r.vTravelMax = Math.max(r.vTravelMax, a[5] || 0);
            if (st.inCut) st.gap = 0;
            st.gap += d;
            st.inCut = false;
          }
        }
        st.i = Math.max(st.i, mm.length);
      }

      // the report so far: a copy of the sums (the card may change its copy) plus the median cut speed and the average power
      function ttReportResult(st) {
        var r = Object.assign({}, st.r), half = Math.floor(st.vN / 2), seen = 0;
        r.vCutMed = 0;
        var vs = Object.keys(st.vCount).map(Number).sort(function (x, y) { return x - y; });
        for (var k = 0; k < vs.length; k++) {
          seen += st.vCount[vs[k]];
          if (seen > half) { r.vCutMed = vs[k]; break; }
        }
        r.pwmAvg = r.pwmN ? r.pwmSum / r.pwmN : 0;
        return r;
      }

      // The report of the trace shown, kept in tj.reportCache and carried on while its samples array only grows; built again for another
      // trace, another mode or correction, or a shorter array.
      function tjTrReport(tj, mm, c, mode, F) {
        var key = [mode, c.cx, c.cy, JSON.stringify(F)].join("|");
        var rc = tj.reportCache;
        if (!rc || rc.samples !== mm || rc.key !== key || mm.length < rc.n) rc = tj.reportCache = { samples: mm, key: key, st: ttReportNew(c, mode, F), n: -1, res: null };
        if (rc.n !== mm.length) {
          ttReportAdd(rc.st, mm);
          rc.n = mm.length;
          rc.res = ttReportResult(rc.st);
        }
        return Object.assign({}, rc.res); // the card writes the plan's figures over its copy
      }
