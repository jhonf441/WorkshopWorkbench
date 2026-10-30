      // ---- Job in progress: the trail of a LIVE job on the map (2026-10-24, docs-internal/MESA-RENOVADA.md section 4) ----
      // Before, a live job drew nothing while it ran (rebuilding the samples of trace.json was what loaded the screen). Now, while a live job
      // runs and the page is in view, the head position and the laser power (spindle and Z in CNC) are read from DWC's own model (no request,
      // no file, no copy of the model: workshopOnModelLive) at most every TZ_TRAIL_READ_MS, decimated by 47-job-live-trail-pure.js, and drawn
      // INCREMENTALLY: a new point rewrites only the last polyline (at most TZ_TRAIL_CHUNK points), once per animation frame and only when
      // something new arrived. The strokes do not scale with the zoom (vector-effect), so zooming never rebuilds it. When the job ends the
      // recorded trace (read with trace.since, 47-job-feed*.js) takes its place, as before.
      // State: tj.trail = { tr (pure trail), g (svg group), els (one polyline per run), dirty (first run to redraw), pending (a point not drawn
      // yet), raf (a drawing is waiting), drawnAt (ms of the last one), unsub, ended, gap (the next point joins as a travel), t0 (first point, ms), mode, c (laser correction) }
      var TZ_TRAIL_READ_MS = 100;
      var TZ_TRAIL_DRAW_MS = 250; // at most 4 drawings a second: each one makes the browser repaint the map
      var TZ_TRAIL_NS = "http://www.w3.org/2000/svg";

      function tzTrailState(tj) {
        if (!tj.trail) tj.trail = { tr: tzTrailNew(), g: null, els: [], dirty: 0, pending: false, raf: 0, drawnAt: 0, unsub: null, ended: false, gap: false, t0: 0, mode: "Laser", c: { cx: 0, cy: 0 } };
        return tj.trail;
      }

      // a fresh trail (a new live job)
      function tzTrailReset(tj) {
        var t = tzTrailState(tj);
        t.tr = tzTrailNew();
        t.els = [];
        t.dirty = 0;
        t.ended = false;
        t.pending = false;
        t.t0 = 0;
        if (t.g) while (t.g.firstChild) t.g.removeChild(t.g.firstChild);
      }

      // Called by the job timer (47-job-load.js, every 1.5 s): listens while a live job runs and the page is in view, stops otherwise.
      // running = the page's state says a live job runs; shown = the page and the map are in view.
      function tzTrailSync(tj, running, shown) {
        var t = tzTrailState(tj);
        if (running && !t.unsub && t.ended) tzTrailReset(tj); // another live job started before the trace of the last one came
        if (running && shown && !t.unsub && typeof workshopOnModelLive === "function") {
          var st = tj.ctx.machine.getSt && tj.ctx.machine.getSt();
          t.mode = (st && st.mode) === "CNC" ? "CNC" : "Laser";
          var cc = t.mode === "Laser" && tj.ctx.cut.correction ? tj.ctx.cut.correction() : null;
          t.c = { cx: (cc && cc.cx) || 0, cy: (cc && cc.cy) || 0 };
          t.gap = t.tr.kept > 0; // listening again after a pause: the first point joins as a travel, never as a false cut
          t.unsub = workshopOnModelLive(function (m) { tzTrailRead(tj, m); }, TZ_TRAIL_READ_MS);
        }
        if ((!running || !shown) && t.unsub) {
          t.unsub();
          t.unsub = null;
        }
        if (!running && t.tr.kept) t.ended = true; // it stays on the map until the recorded trace arrives (tzTrailDone)
      }

      // A finished trace was read (end = its "end" time, local ISO of the Pi): the trail gives way to it, unless that trace is older than
      // the trail (nobody watched, so the service did not record this job: the trail is all there is). 2 min of margin for the clocks.
      function tzTrailDone(tj, end) {
        var t = tzTrailState(tj);
        if (!t.ended || t.unsub) return;
        var te = Date.parse(String(end || ""));
        if (isFinite(te) && t.t0 && te + 120000 < t.t0) return;
        tzTrailReset(tj);
      }

      // one model update of DWC (the live object: read, never kept or changed). The page out of the document (another page of DWC, or the
      // page closed) stops the listening; the next drawing of the map starts it again (tzTrailSync). A hidden browser tab keeps reading
      // (a few fields, no drawing: requestAnimationFrame waits) so the trail has no hole.
      function tzTrailRead(tj, m) {
        var t = tj.trail;
        if (tj.ctx.card && tj.ctx.card.isConnected === false) {
          if (t.unsub) t.unsub();
          t.unsub = null;
          return;
        }
        var mv = m && m.move;
        var ax = (mv && mv.axes) || [];
        var X = null, Y = null, Z = null;
        for (var i = 0; i < ax.length; i++) {
          var a = ax[i];
          if (!a) continue;
          if (a.letter === "X") X = a.machinePosition;
          else if (a.letter === "Y") Y = a.machinePosition;
          else if (a.letter === "Z") Z = a.machinePosition;
        }
        if (typeof X !== "number" || typeof Y !== "number") return;
        var sp = m.spindles && m.spindles[0];
        var k = tzTrailKind({ mode: t.mode, pwm: mv.currentMove ? Number(mv.currentMove.laserPwm) : 0, rpm: sp ? Number(sp.current) : 0, z: Z });
        var before = t.tr.runs.length;
        if (!t.t0) t.t0 = Date.now();
        if (t.gap) {
          t.gap = false;
          tzTrailAdd(t.tr, X - t.c.cx, Y - t.c.cy, "t");
        }
        var what = tzTrailAdd(t.tr, X - t.c.cx, Y - t.c.cy, k);
        if (what === "skip") return;
        t.dirty = Math.min(t.dirty, Math.max(0, before - 1));
        t.pending = true;
        tzTrailSchedule(tj);
      }

      // at most one drawing every TZ_TRAIL_DRAW_MS, in an animation frame (a hidden browser tab runs none: the drawing waits, the points do not)
      function tzTrailSchedule(tj) {
        var t = tj.trail;
        if (t.raf) return;
        var raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : function (fn) { return setTimeout(fn, 16); };
        var draw = function () { raf(function () { t.raf = 0; t.drawnAt = Date.now(); tzTrailFlush(tj); }); };
        var wait = (t.drawnAt || 0) + TZ_TRAIL_DRAW_MS - Date.now();
        t.raf = 1;
        if (wait > 0) setTimeout(draw, wait);
        else draw();
      }

      // draws again only the runs from t.dirty on (normally the last one); the others keep their polyline
      function tzTrailFlush(tj) {
        var t = tj.trail;
        if (!t.g) t.g = document.createElementNS(TZ_TRAIL_NS, "g");
        var runs = t.tr.runs;
        for (var i = t.dirty; i < runs.length; i++) {
          var el = t.els[i];
          if (!el) {
            el = document.createElementNS(TZ_TRAIL_NS, "polyline");
            tzTrailStyle(el, runs[i].k, t.mode);
            t.g.appendChild(el);
            t.els[i] = el;
          }
          el.setAttribute("points", tzTrailPoints(runs[i]));
        }
        t.dirty = Math.max(0, runs.length - 1);
        t.pending = false;
      }

      function tzTrailStyle(el, k, mode) {
        var work = k !== "t";
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", tzTrailColor(k, mode));
        el.setAttribute("vector-effect", "non-scaling-stroke"); // screen pixels: the zoom never redraws it
        el.setAttribute("stroke-width", work ? "2.5" : "1.2");
        el.setAttribute("stroke-opacity", work ? "0.95" : "0.5");
        el.setAttribute("stroke-linejoin", "round");
        el.setAttribute("stroke-linecap", "round");
        if (!work) el.setAttribute("stroke-dasharray", "4 4");
      }

      // true while the trail is what the map shows of the job (running, or ended and the recorded trace not read yet)
      function tzTrailShown(tj) {
        var t = tj.trail;
        return !!(t && t.tr.kept > 1 && (t.unsub || t.ended));
      }

      // the group of the trail for the map (re-appended on every redraw of the map, never rebuilt)
      function tzTrailGroup(tj) {
        var t = tzTrailState(tj);
        if (!t.g || t.pending) tzTrailFlush(tj);
        return t.g;
      }
