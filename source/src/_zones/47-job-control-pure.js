      // ---- Job control (stage 1, read only): the PURE part (no DOM, no calls) ----
      // The header of the job (state, name, progress, times, power / rpm, pass), the live checks and the timeline "What happened".
      // Everything is computed from what the page already reads: st (the summary of readStatus: st.status, st.job, st.liveJob, st.wn, st.om = the
      // object model) and the recorded trace (47-job-feed). A value that does not exist is not shown: the field is null, the row is not made.
      // The drawing is in 47-job-control.js. NOTHING here (nor there) writes to the machine, except the buttons that already existed.
      var TJC_VIN_MIN = 10; // volts: below this a Duet board browns out; the model gives no limit of its own (vIn.min is the lowest seen)
      var TJC_LOG_MAX = 60;

      function tjcNum(v) {
        return typeof v === "number" && isFinite(v) ? v : null;
      }

      // The state of the job: running | paused | stopped (cancelled) | finished | idle (nothing to say)
      function tjcState(st, trace) {
        var s = (st && st.status) || "";
        if (st && st.liveJob) return "running"; // a live job has no pause (it is the program's): it runs until the safe stop or the end
        if (s === "processing" || s === "resuming" || s === "simulating") return "running";
        if (s === "paused" || s === "pausing") return "paused";
        if (trace && !trace.active) return trace.result === "cancelled" ? "stopped" : "finished";
        return "idle";
      }

      function tjcBase(name) {
        var n = String(name || "").split("/").pop();
        return n || null;
      }

      // the first spindle that turns, else the first one: rpm or null
      function tjcRpm(om) {
        var sp = om && Array.isArray(om.spindles) ? om.spindles.filter(function (s) { return s && tjcNum(Number(s.current)) !== null; }) : [];
        if (!sp.length) return null;
        var on = sp.filter(function (s) { return Number(s.current) > 0; });
        return Math.round(Number((on[0] || sp[0]).current));
      }

      // The header: { state, name, pct, elapsed, left, power, rpm, pass, passOf } (numbers in seconds, percent, rpm); null where there is no data
      function tjcHeader(st, trace, mode) {
        var job = (st && st.job) || {}, om = (st && st.om) || {};
        var state = tjcState(st, trace);
        var live = !!(st && st.liveJob);
        var running = state === "running" || state === "paused";
        var size = tjcNum(job.file && job.file.size), pos = tjcNum(job.filePosition);
        var h = { state: state, name: null, pct: null, elapsed: null, left: null, power: null, rpm: null, pass: null, passOf: null };
        if (live) h.name = (st.liveJob.name && String(st.liveJob.name)) || null;
        else if (running) h.name = tjcBase(job.file && job.file.fileName);
        if (!h.name && trace && trace.name) h.name = tjcBase(trace.name);
        if (!live && running && size > 0 && pos !== null) h.pct = Math.max(0, Math.min(100, Math.round((pos / size) * 100)));
        if (state === "finished") h.pct = 100;
        if (running && !live && tjcNum(job.duration) !== null) h.elapsed = Math.round(job.duration);
        else if (!running && trace && tjcNum(trace.duration_s) !== null) h.elapsed = Math.round(trace.duration_s);
        var tl = job.timesLeft && tjcNum(job.timesLeft.file);
        if (running && !live && tl !== null && tl > 0) h.left = Math.round(tl);
        if (running) {
          var mv = om.move && om.move.currentMove;
          if (mode === "Laser" && mv && tjcNum(mv.laserPwm) !== null) h.power = Math.round(mv.laserPwm * 100);
          if (mode === "CNC") h.rpm = tjcRpm(om);
          var layer = tjcNum(job.layer), total = tjcNum(job.file && job.file.numLayers);
          if (layer !== null && layer > 0) {
            h.pass = Math.round(layer);
            if (total !== null && total > 0) h.passOf = Math.round(total);
          }
        }
        return h;
      }

      // "interlock reading" -> true (satisfied) | false (open) | null (not known). Accepts a boolean or the words a service would use.
      function tjcInterlockOk(v) {
        if (v === true || v === false) return v;
        var w = String(v === undefined || v === null ? "" : v).toLowerCase();
        if (["closed", "ok", "on", "active", "satisfied"].indexOf(w) >= 0) return true;
        if (["open", "off", "inactive", "broken", "fault"].indexOf(w) >= 0) return false;
        return null;
      }

      // An axis of the model by letter
      function tjcAxis(om, letter) {
        var ax = (om && om.move && om.move.axes) || [];
        for (var i = 0; i < ax.length; i++) if (ax[i] && ax[i].letter === letter) return ax[i];
        return null;
      }

      // The live checks (READ ONLY): [{ id, ok, ev: {key, params} | null }]; label key of a row = "jobctl.check_" + id.
      //   om = the object model; mode = "Laser" | "CNC"; hw = { lid_interlock, extraction_interlock } (the profile declares them, tzSafetyHw);
      //   il = { lid, extraction } what the service reports about the interlocks (not known yet -> {}); wn = active workplace number.
      // A row exists only when its data exists: no axes in the model = no homing row; no vIn = no supply row; an interlock the profile does not
      // declare, or declares but nobody reads, has no row.
      function tjcChecks(om, mode, hw, il, wn) {
        var rows = [];
        var axes = ["X", "Y", "Z"].map(function (l) { return tjcAxis(om, l); }).filter(function (a) { return !!a; });
        if (axes.length) {
          var miss = axes.filter(function (a) { return !a.homed; }).map(function (a) { return a.letter; });
          var all = axes.map(function (a) { return a.letter; }).join(" ");
          rows.push({ id: "homed", ok: !miss.length, ev: miss.length ? { key: "jobctl.ev_homed_missing", params: { axes: miss.join(" ") } } : { key: "jobctl.ev_homed_all", params: { axes: all } } });
        }
        var vin = om && om.boards && om.boards[0] && om.boards[0].vIn;
        var v = vin ? tjcNum(vin.current) : null;
        if (v !== null && v > 0) {
          var okv = v >= TJC_VIN_MIN;
          rows.push({ id: "supply", ok: okv, ev: okv ? { key: "jobctl.ev_vin", params: { v: v.toFixed(1) } } : { key: "jobctl.ev_vin_low", params: { v: v.toFixed(1), min: TJC_VIN_MIN } } });
        }
        if (mode === "CNC") {
          var z = tjcAxis(om, "Z");
          var n = typeof wn === "number" && wn >= 0 ? wn : tjcNum(om && om.move && om.move.workplaceNumber) || 0;
          var off = z && Array.isArray(z.workplaceOffsets) ? tjcNum(z.workplaceOffsets[n]) : null;
          if (off !== null) rows.push({ id: "z0", ok: off !== 0, ev: off !== 0 ? { key: "jobctl.ev_z0_set", params: { z: Math.round(off * 1000) / 1000 } } : { key: "jobctl.ev_z0_zero", params: {} } });
        }
        var lid = hw && hw.lid_interlock && mode === "Laser" ? tjcInterlockOk(il && il.lid) : null;
        if (lid !== null) rows.push({ id: "lid", ok: lid, ev: { key: lid ? "jobctl.ev_lid_closed" : "jobctl.ev_lid_open", params: {} } });
        var ext = hw && hw.extraction_interlock ? tjcInterlockOk(il && il.extraction) : null;
        if (ext !== null) rows.push({ id: "extraction", ok: ext, ev: { key: ext ? "jobctl.ev_ext_on" : "jobctl.ev_ext_off", params: {} } });
        return rows;
      }

      // Events of a change of state: prev / cur = { state, safe } (safe: the safe stop is in progress); prev null = the page just opened.
      // Returns the event ids in order: joined | start | pause | resume | safe_stop | finished | cancelled.
      function tjcTransition(prev, cur) {
        var out = [];
        var act = function (s) { return s === "running" || s === "paused"; };
        if (!prev) return act(cur.state) ? ["joined"] : [];
        if (!prev.safe && cur.safe && act(cur.state)) out.push("safe_stop");
        if (prev.state === cur.state) return out;
        if (!act(prev.state) && cur.state === "running") out.push("start");
        else if (!act(prev.state) && cur.state === "paused") out.push("joined");
        else if (prev.state === "running" && cur.state === "paused") out.push("pause");
        else if (prev.state === "paused" && cur.state === "running") out.push("resume");
        else if (act(prev.state) && cur.state === "finished") out.push("finished");
        else if (act(prev.state) && cur.state === "stopped") {
          if (!(prev.safe || cur.safe)) out.push("cancelled");
        }
        return out;
      }

      // Rows that were fine and now fail while the job is active: [{ id, ev }] (for the timeline)
      function tjcCheckFalls(prevRows, rows, active) {
        if (!active || !prevRows) return [];
        var before = {};
        prevRows.forEach(function (r) { before[r.id] = r.ok; });
        return rows.filter(function (r) { return !r.ok && before[r.id] === true; });
      }

      // One sample of the page: snap = { state, safe, rows } at time `now` (ms). cj = { prev, rows, log } (memory of the page, never saved).
      // Returns true when something was added to the log.
      function tjcStep(cj, snap, now) {
        var added = [];
        tjcTransition(cj.prev, snap).forEach(function (id) { added.push({ id: id, t: now, params: {} }); });
        var active = snap.state === "running" || snap.state === "paused";
        tjcCheckFalls(cj.rows, snap.rows, active).forEach(function (r) { added.push({ id: "check_failed", t: now, params: { check: r.id, ev: r.ev } }); });
        cj.prev = { state: snap.state, safe: snap.safe };
        cj.rows = snap.rows;
        added.forEach(function (e) { cj.log.push(e); });
        if (cj.log.length > TJC_LOG_MAX) cj.log.splice(0, cj.log.length - TJC_LOG_MAX);
        return added.length > 0;
      }

      function tjcNew() {
        return { prev: null, rows: null, log: [] };
      }

      // "mm:ss" or "h:mm:ss" from seconds (a clock for the timeline and the times of the header)
      function tjcClock(sec) {
        var s = Math.max(0, Math.round(sec)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
        function z(n) { return (n < 10 ? "0" : "") + n; }
        return (h ? h + ":" + z(m) : String(m)) + ":" + z(x);
      }
