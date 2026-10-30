      function tjTrPlanCtx(tj) {
        var mode = ttMode(tj.trace), c = tjTrCorrection(tj);
        var zMin = 0;
        if (mode === "CNC") tj.plan.forEach(function (r) { if (r.w && r.v < zMin) zMin = r.v; });
        var ck = c.cx + "," + c.cy;
        if (!tj.planCache || tj.planCache.k !== ck) {
          tj.planCache = {
            k: ck,
            pts: tj.plan.map(function (r) {
              var a = [];
              for (var i = 0; i < r.p.length; i += 2) a.push(+(r.p[i] - c.cx).toFixed(2) + "," + +(-(r.p[i + 1] - c.cy)).toFixed(2));
              return a;
            }),
          };
        }
        return { mode: mode, zMin: zMin };
      }

      // one run of the plan, as polylines (done strong, to do dim)
      function tjTrPlanRun(tj, node, k, x, fp) {
        var r = tj.plan[k];
        function line(pts, done) {
          if (pts.length < 2) return;
          var col = !r.w ? "#9e9e9e" : x.mode === "CNC" ? ttDepthColor(x.zMin < 0 ? r.v / x.zMin : 0) : ttPowerColor(Math.round(r.v * 10) / 10);
          node("polyline", {
            points: pts.join(" "),
            fill: "none",
            stroke: col,
            "vector-effect": "non-scaling-stroke", // screen pixels: zooming never rebuilds the layer
            "stroke-width": r.w ? (done ? TT_STROKE_PX.done : TT_STROKE_PX.todo) : TT_STROKE_PX.travel,
            "stroke-opacity": r.w ? (done ? 0.95 : 0.22) : 0.5,
            "stroke-dasharray": r.w ? "" : TT_STROKE_PX.dash,
            "stroke-linejoin": "round",
            "stroke-linecap": "round",
          });
        }
        var pts = tj.planCache.pts[k];
        var n = r.f.length;
        if (r.f[n - 1] <= fp) return line(pts, true); // todo hecho
        if (r.f[1] > fp) {
          if (r.w) line(pts, false); // missing: only the job, faint
          return;
        }
        var j = 1;
        while (j < n && r.f[j] <= fp) j++;
        line(pts.slice(0, j), true);
        if (r.w) line(pts.slice(j - 1), false);
      }

      function tjTrSvgNode(tj, g) {
        return function (tag, attrs) {
          var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
          Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
          g.appendChild(n);
          return n;
        };
      }

      function tjTrPlanLayerNew(tj, key) {
        var layer = { key: key, g: document.createElementNS("http://www.w3.org/2000/svg", "g"), x: tjTrPlanCtx(tj), chunks: [] };
        for (var k0 = 0; k0 < tj.plan.length; k0 += tj.TT_CHUNK) {
          var k1 = Math.min(tj.plan.length, k0 + tj.TT_CHUNK);
          var cg = document.createElementNS("http://www.w3.org/2000/svg", "g");
          layer.g.appendChild(cg);
          var last = tj.plan[k1 - 1].f;
          layer.chunks.push({ g: cg, k0: k0, k1: k1, f0: tj.plan[k0].f[0], f1: last[last.length - 1], sig: null });
        }
        return layer;
      }

      // brings the chunks to the progress fp: only the ones whose state changed are drawn again
      function tjTrPlanLayerProgress(tj, layer, fp) {
        layer.chunks.forEach(function (ch) {
          var sig = ch.f0 >= fp ? "p" : ch.f1 <= fp ? "d" : "x" + Math.floor(fp);
          if (sig === ch.sig) return;
          ch.sig = sig;
          while (ch.g.firstChild) ch.g.removeChild(ch.g.firstChild);
          var node = tjTrSvgNode(tj, ch.g);
          for (var k = ch.k0; k < ch.k1; k++) tjTrPlanRun(tj, node, k, layer.x, fp);
        });
      }

      function tjTrFposShown(tj) {
        var fp = tjTrFposCurrent(tj);
        var now = Date.now();
        if (!isFinite(fp) || now - tj.fpShownAt >= tj.TT_PROGRESS_MS || fp < tj.fpShown) {
          tj.fpShown = fp;
          tj.fpShownAt = now;
        }
        return tj.fpShown;
      }

      // The kept group of the job on the map for this redraw (null: nothing to draw). The map puts it among its fixed layers
      // (31-map-render-head.js), so a redraw while the job runs does not take it out and put it back (2026-10-24).
      function tjTrLayer(tj, w) {
        // a live job (no file): its trail, drawn while it runs (47-job-live-trail.js); the recorded trace replaces it when it ends
        var st = tj.ctx.machine.getSt && tj.ctx.machine.getSt();
        tzTrailSync(tj, !!(st && st.liveJob), true);
        if (!tj.viewId && tzTrailShown(tj)) return tzTrailGroup(tj);
        if (tjTrHidden(tj) || !tj.trace || !TZ_PROFILES[ttMode(tj.trace)]) return null; // a print of the history is shown by Printing
        if (tj.trace.active && !tj.plan && !tj.viewId) return null; // a live job whose trail has no points yet
        var mm = tj.trace.samples || [];
        if (!tj.plan && mm.length < 2) return null;
        var c = tjTrCorrection(tj);
        if (tj.plan) {
          var fp = tjTrFposShown(tj);
          var kp = [tjTrPlanKey(tj), tj.plan.length, c.cx, c.cy].join("|"); // not the zoom: the strokes do not scale
          if (!tj.jobCache || tj.jobCache.key !== kp || !tj.jobCache.chunks) tj.jobCache = tjTrPlanLayerNew(tj, kp);
          tjTrPlanLayerProgress(tj, tj.jobCache, fp);
          return tj.jobCache.g;
        }
        // the zoom only matters while the head marker (a circle, sized for the zoom) is drawn
        var key = [tj.trace.start, tj.viewId, mm.length, tj.trace.active ? Math.round(w * 10) : "", c.cx, c.cy].join("|");
        if (!tj.jobCache || tj.jobCache.key !== key || tj.jobCache.chunks) {
          var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          tjTrDrawSamples(tj, tjTrSvgNode(tj, g), w);
          tj.jobCache = { key: key, g: g };
        }
        return tj.jobCache.g;
      }

      // draw(node, w) of the interface of a tab module (the map uses layer(w) for the job)
      function tjTrDraw(tj, node, w) {
        var g = tjTrLayer(tj, w);
        if (g) node("g", {}).appendChild(g);
      }

      function tjTrDrawSamples(tj, node, w) {
        var mm = (tj.trace && tj.trace.samples) || [];
        if (mm.length < 2) return;
        var mode = ttMode(tj.trace);
        var F = ttFields(tj.trace);
        var c = tjTrCorrection(tj);
        var sw = w / 300;
        var run = null;
        var zMin = 0;
        if (mode === "CNC") mm.forEach(function (q) { if (q[3] < zMin) zMin = q[3]; });
        function flush() {
          if (!run || run.pts.length < 2) return;
          node("polyline", {
            points: run.pts.join(" "),
            fill: "none",
            stroke: run.col,
            "vector-effect": "non-scaling-stroke",
            "stroke-width": run.cut ? TT_STROKE_PX.done : TT_STROKE_PX.travel,
            "stroke-opacity": run.cut ? 0.95 : 0.5,
            "stroke-dasharray": run.cut ? "" : TT_STROKE_PX.dash,
            "stroke-linejoin": "round",
          });
        }
        for (var i = 1; i < mm.length; i++) {
          var a = mm[i - 1], b = mm[i];
          var cut = ttWork(mode, F, a, b);
          var col;
          if (!cut) col = "#9e9e9e";
          else if (mode === "CNC") col = ttDepthColor(zMin < 0 ? a[3] / zMin : 0);
          else col = ttPowerColor(Math.round(a[4] * 10) / 10);
          var pa = (a[1] - c.cx) + "," + -(a[2] - c.cy);
          var pb = (b[1] - c.cx) + "," + -(b[2] - c.cy);
          if (!run || run.cut !== cut || run.col !== col) {
            flush();
            run = { cut: cut, col: col, pts: [pa] };
          }
          run.pts.push(pb);
        }
        flush();
        var l = mm[mm.length - 1];
        var on = mode === "CNC" ? F.rpm >= 0 && l[F.rpm] > 0 : l[4] > 0;
        if (tj.trace.active)
          node("circle", { cx: l[1] - c.cx, cy: -(l[2] - c.cy), r: w / 90, fill: on ? "#ff1744" : "none", stroke: "#fff", "stroke-width": sw });
      }

      function tjTrTipLines(tj, p, tol) {
        if (tjTrHidden(tj)) return [];
        var mm = (tj.trace && tj.trace.samples) || [];
        var mode = ttMode(tj.trace);
        var F = ttFields(tj.trace);
        var c = tjTrCorrection(tj);
        for (var i = mm.length - 1; i >= 1; i--) {
          var q = mm[i];
          if (Math.hypot(p.x - (q[1] - c.cx), p.y - (q[2] - c.cy)) <= tol) {
            var work = ttWork(mode, F, mm[i - 1], q);
            var what =
              mode === "CNC"
                ? (work ? i18nT('job.milling_at_mm', { v: tj.fmt(-q[3]) }) : i18nT('job.travel')) + (F.rpm >= 0 && q[F.rpm] ? ", " + q[F.rpm] + " rpm" : "")
                : i18nT('job.air_2', { v: q[4] > 0 ? i18nT('job.cut', { v: Math.round(q[4] * 100) }) : i18nT('job.travel'), v2: q[6] ? "ON" : "OFF" });
            return [i18nT('job.job_at_mm_min', { dur: tjTrDur(tj, q[0]), what: what, v: tj.fmt(q[5] * 60) })];
          }
        }
        return [];
      }

      function tjTrHits(tj, rects) {
        var mm = (tj.trace && tj.trace.samples) || [];
        if (!rects || !rects.length || mm.length < 2 || tjTrHidden(tj)) return [];
        var key = mm.length + "|" + JSON.stringify(rects);
        if (key === tj.hitsKey) return tj.hitsVal;
        var mode = ttMode(tj.trace), F = ttFields(tj.trace), c = tjTrCorrection(tj), out = [];
        if (tj.plan) {
          var fp = tjTrFposCurrent(tj);
          key += "|p" + fp;
          if (key === tj.hitsKey) return tj.hitsVal;
          rects.forEach(function (rc, k) {
            var hit = tj.plan.some(function (r) {
              if (!r.w) return false;
              for (var i = 0; i < r.f.length; i++) {
                if (r.f[i] > fp) return false;
                var x = r.p[2 * i] - c.cx, y = r.p[2 * i + 1] - c.cy;
                if (x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h) return true;
              }
              return false;
            });
            if (hit) out.push(k);
          });
          tj.hitsKey = key;
          tj.hitsVal = out;
          return out;
        }
        rects.forEach(function (r, k) {
          for (var i = 1; i < mm.length; i++) {
            if (!ttWork(mode, F, mm[i - 1], mm[i])) continue;
            var x = mm[i][1] - c.cx, y = mm[i][2] - c.cy;
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { out.push(k); break; }
          }
        });
        tj.hitsKey = key;
        tj.hitsVal = out;
        return out;
      }

      function tjTrInfo(tj) {
        var mm = (tj.trace && tj.trace.samples) || [];
        if (mm.length < 2 || tjTrHidden(tj)) return null;
        var key = mm.length + "|" + (tj.trace && tj.trace.start) + "|" + !!tj.plan;
        if (key === tj.infoKey) return tj.infoVal;
        var c = tjTrCorrection(tj);
        var bb = tjTrReport(tj, mm, c, ttMode(tj.trace), ttFields(tj.trace)).bbox; // the box of the work, carried on as the trace grows
        if (tj.plan) bb = tjTrPlanStats(tj, c).bbox || bb;
        tj.infoKey = key;
        tj.infoVal = { elapsed: mm[mm.length - 1][0] - mm[0][0], bbox: bb, active: !!tj.trace.active };
        return tj.infoVal;
      }

