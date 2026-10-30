      // ---- Live job: safe stop, interrupted jobs and the verified resume (2026-10-22) ----
      // Design: docs-internal/LIVE-JOB-STOP-RESUME.md. This file is the PURE part (no DOM, no calls); the state and the calls are in
      // 52-livejob-state.js, the stop button in 52-livejob-stop.js, the tab "Interrupted jobs" in 52-livejob-tool.js, its list in 52-livejob-card.js, the resume assistant in
      // 52-livejob-assistant.js and the path on the map in 52-livejob-draw.js.
      // A record is what livejob.interrupted.list gives (WorkshopService dsf/live_job_stop.py): {id, name, started, stopped (epoch s), lines,
      // bbox [xmin, ymin, xmax, ymax], cut_mm, program_pos {x, y, z}, position {work, machine}, mode, resumable, why_not, armed, blockers, can_resume}.
      var TZ_LJ_BLOCKERS = ["not_laser", "rebooted", "machine_unknown", "job_running", "machine_busy", "not_homed", "not_resumable"];
      var TZ_LJ_OVERLAPS = [0, 2, 5, 10]; // lines to cut again at the join (the service accepts 0..39)
      var TZ_LJ_POLL_MS = 10000;

      function tzLjNum(v, digits) {
        var n = Number(v);
        return isFinite(n) ? n.toFixed(digits) : "?";
      }

      // "22/10 16:17" from epoch seconds (local time of the screen)
      function tzLjClock(sec) {
        var n = Number(sec);
        if (!isFinite(n) || n <= 0) return "";
        var d = new Date(n * 1000);
        function z(x) { return (x < 10 ? "0" : "") + x; }
        return z(d.getDate()) + "/" + z(d.getMonth() + 1) + " " + z(d.getHours()) + ":" + z(d.getMinutes());
      }

      // Where the job stopped, as numbers: {line, x, y, mm} (x, y of the PROGRAM; the percentage is not known: the program never says how long the job is)
      function tzLjWhere(rec) {
        var p = (rec && rec.program_pos) || {};
        return { line: Math.max(0, Math.round(Number(rec && rec.lines) || 0)), x: tzLjNum(p.x, 1), y: tzLjNum(p.y, 1), mm: Math.round(Number(rec && rec.cut_mm) || 0) };
      }

      // When the board restarted and how long after the stop: {time: "15:12", min: 3}; "?" when the service could not tell
      function tzLjRebootParams(rec) {
        var at = Number(rec && rec.rebooted_at), stopped = Number(rec && rec.stopped);
        if (!(at > 0)) return { time: "?", min: "?" };
        var d = new Date(at * 1000);
        var hh = (d.getHours() < 10 ? "0" : "") + d.getHours(), mm = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
        return { time: hh + ":" + mm, min: stopped > 0 ? Math.max(0, Math.round((at - stopped) / 60)) : "?" };
      }

      // The reasons that stop a resume now, in the order the service gives them: [{key, params}] (key of the livejob.* texts).
      // A code the page does not know yet is shown by its code, never hidden.
      function tzLjBlockerRows(rec) {
        var out = [];
        ((rec && rec.blockers) || []).forEach(function (code) {
          if (TZ_LJ_BLOCKERS.indexOf(code) < 0) return out.push({ key: "blocker_unknown", params: { code: String(code) } });
          var params = {};
          if (code === "not_resumable") params = { why: String((rec && rec.why_not) || "") };
          if (code === "rebooted") params = tzLjRebootParams(rec);
          out.push({ key: "blocker_" + code, params: params });
        });
        return out;
      }

      // Seconds left of an armed resume (30 min after arming), 0 when it is not armed or it expired.
      function tzLjArmLeft(rec, nowSec) {
        var a = rec && rec.armed;
        if (!a || !isFinite(Number(a.expires))) return 0;
        return Math.max(0, Math.round(Number(a.expires) - nowSec));
      }

      // Where the resume is: idle (not armed) | waiting (armed, the program has not sent the job yet) | verifying (bridge swallows the lines already
      // done, comparing them) | approach (all verified, going to the point) | done | mismatch (the job is not the same one).
      // resume = livejob.interrupted.list().resume {state, swallowed, of, overlap, reason} (null when no session)
      function tzLjStage(rec, resume) {
        var st = resume && resume.state;
        if (st === "aborted") return { id: "mismatch", reason: String((resume && resume.reason) || ""), swallowed: 0, of: 0 };
        if (st === "skipping") return { id: "verifying", swallowed: Number(resume.swallowed) || 0, of: Number(resume.of) || 0 };
        if (st === "ready") return { id: "approach", swallowed: Number(resume.of) || 0, of: Number(resume.of) || 0 };
        if (st === "done") return { id: "done", swallowed: Number(resume.of) || 0, of: Number(resume.of) || 0 };
        return { id: rec && rec.armed ? "waiting" : "idle", swallowed: 0, of: 0 };
      }

      // The path done, in SVG coordinates of the map: [{cut, pts}] with pts "x,y x,y ...". The record's path is in PROGRAM coordinates; the map is in
      // machine coordinates minus the laser correction (c = {cx, cy}, the same as the job trace): machine = program + (where the head was - program position).
      function tzLjPathSegments(path, rec, c) {
        var pos = (rec && rec.position && rec.position.machine) || null, prog = (rec && rec.program_pos) || null;
        var ox = pos && prog && isFinite(pos.x) && isFinite(prog.x) ? pos.x - prog.x : 0;
        var oy = pos && prog && isFinite(pos.y) && isFinite(prog.y) ? pos.y - prog.y : 0;
        var out = [], run = null;
        (path || []).forEach(function (q) {
          var x = Number(q[0]) + ox - ((c && c.cx) || 0), y = -(Number(q[1]) + oy - ((c && c.cy) || 0));
          if (!isFinite(x) || !isFinite(y)) return;
          var cut = !!q[2], pt = x + "," + y;
          if (!run) {
            run = { cut: cut, pts: [pt] };
            return;
          }
          if (cut === run.cut) {
            run.pts.push(pt);
            return;
          }
          if (run.pts.length > 1) out.push({ cut: run.cut, pts: run.pts.join(" ") }); // the first point only says where it starts
          run = { cut: cut, pts: [run.pts[run.pts.length - 1], pt] };
        });
        if (run && run.pts.length > 1) out.push({ cut: run.cut, pts: run.pts.join(" ") });
        return out;
      }
