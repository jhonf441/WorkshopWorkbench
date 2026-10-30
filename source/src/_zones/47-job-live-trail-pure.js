      // ---- Job in progress: the trail of a LIVE job, pure part (2026-10-24, docs-internal/MESA-RENOVADA.md section 4) ----
      // A live job (a program streaming over the network or USB, no file) has no planned path: the page draws where the head goes while it
      // runs. This file only decides which points are kept and how they are grouped; no DOM. The state and the drawing are in
      // 47-job-live-trail.js.
      //   trail = { runs: [{k, pts: [x0, y0, x1, y1, ...]}], kept, seen }   k = what the run is ("t" travel, "c<n>" work of colour bucket n)
      // Rules (tests/live-trail.test.js):
      //   - a point closer than TZ_TRAIL_MIN_MM to the last kept one, with the same k, is dropped (the head stood still or crawled);
      //   - a point in line with the last two of its run (the middle one is less than TZ_TRAIL_LINE_MM off the line) moves the last one
      //     instead of adding one: a straight move of any length is two points;
      //   - a run holds at most TZ_TRAIL_CHUNK points: a full run, or a change of k, starts a new run at the last point (no gap), so a new
      //     point only ever touches the LAST run (the drawing rewrites one polyline of at most TZ_TRAIL_CHUNK points).
      var TZ_TRAIL_MIN_MM = 0.15;
      var TZ_TRAIL_LINE_MM = 0.05;
      var TZ_TRAIL_CHUNK = 200;

      function tzTrailNew() {
        return { runs: [], kept: 0, seen: 0 };
      }

      // distance of point m from the line a-b (a, b, m = [x, y]); the length of a-b when it is a point
      function tzTrailOffLine(ax, ay, bx, by, mx, my) {
        var dx = bx - ax, dy = by - ay;
        var L = Math.hypot(dx, dy);
        if (L < 1e-9) return Math.hypot(mx - ax, my - ay);
        return Math.abs(dx * (ay - my) - dy * (ax - mx)) / L;
      }

      // Adds one position. Returns what happened: "skip" | "move" (the last point moved) | "add" | "run" (a new run started).
      function tzTrailAdd(trail, x, y, k) {
        trail.seen++;
        if (!isFinite(x) || !isFinite(y)) return "skip";
        var run = trail.runs[trail.runs.length - 1];
        if (!run) {
          trail.runs.push({ k: k, pts: [x, y] });
          trail.kept++;
          return "run";
        }
        var p = run.pts, n = p.length;
        var lx = p[n - 2], ly = p[n - 1];
        if (run.k === k) {
          if (Math.hypot(x - lx, y - ly) < TZ_TRAIL_MIN_MM) return "skip";
          // in line with the two before (and going on forward): the last point moves
          if (n >= 4) {
            var px = p[n - 4], py = p[n - 3];
            var forward = (lx - px) * (x - lx) + (ly - py) * (y - ly) > 0;
            if (forward && tzTrailOffLine(px, py, x, y, lx, ly) < TZ_TRAIL_LINE_MM) {
              p[n - 2] = x;
              p[n - 1] = y;
              return "move";
            }
          }
          if (n / 2 < TZ_TRAIL_CHUNK) {
            p.push(x, y);
            trail.kept++;
            return "add";
          }
        }
        trail.runs.push({ k: k, pts: [lx, ly, x, y] }); // starts at the last point: the line goes on without a gap
        trail.kept++;
        return "run";
      }

      // the points of a run as the "points" attribute of an SVG polyline (Y up on the bed is -Y on the screen)
      function tzTrailPoints(run) {
        var p = run.pts, out = [];
        for (var i = 0; i < p.length; i += 2) out.push(+p[i].toFixed(2) + "," + +(-p[i + 1]).toFixed(2));
        return out.join(" ");
      }

      // What a position is, for the trail: travel, or work of a colour bucket. Laser: power > 0 (bucket = power in tenths); CNC: spindle on
      // and Z below 0.2 (bucket = depth in mm, up to 10). q = {mode, pwm (0..1), rpm, z}
      function tzTrailKind(q) {
        if (q.mode === "CNC") {
          if (!(q.rpm > 0) || !(q.z < 0.2)) return "t";
          return "c" + Math.min(10, Math.max(0, Math.round(-q.z)));
        }
        if (!(q.pwm > 0.001)) return "t";
        return "c" + Math.min(10, Math.max(1, Math.round(q.pwm * 10)));
      }

      // the stroke colour of a run (the same scales as the recorded job: power for Laser, depth for CNC)
      function tzTrailColor(k, mode) {
        if (k === "t") return "#9e9e9e";
        var b = Number(k.slice(1)) || 0;
        return mode === "CNC" ? ttDepthColor(b / 10) : ttPowerColor(b / 10);
      }
