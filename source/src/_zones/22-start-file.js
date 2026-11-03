      // ---- One way to start a job file (2026-10-16) ----
      // Laser cuts (40-cuts.js), mesh (45-mesh.js), big pieces (48-large.js) and CNC (51-cnc-toolpaths.js) each had
      // their own copy of "upload the file, run M32, read the answer". Now they all use this: it uploads the text when
      // there is one (ruta only = the file is already on the machine), runs M32 and turns an error / cancel in the answer
      // into a rejection, so every tool reports a job that did not start the same way.
      // F0 (2026-10-21): the answer of M32 is not enough (it can be empty and the job still die in its first lines, e.g.
      // cutguard.g cancelling it), so after it the real state of the job is checked: it has to be running (or already
      // finished without being cancelled) within a few seconds, else the start is reported as failed.

      var TZ_START_RUNNING = ["processing", "starting", "resuming", "pausing", "paused", "simulating"];
      var TZ_START_POLLS = 4;
      var TZ_START_POLL_MS = 700;

      function tzBaseName(p) {
        return String(p || "").split("/").pop();
      }

      // What the machine state s says about the job `path` started after the state `before`:
      // "ok" (running, or finished without being cancelled), "cancelled" (it ran and was cancelled / aborted) or "wait" (no sign yet).
      function tzStartVerdict(s, path, before) {
        var job = (s && s.job) || {}, name = tzBaseName(path);
        var status = s && s.state && s.state.status;
        if (job.file && tzBaseName(job.file.fileName) === name && TZ_START_RUNNING.indexOf(status) !== -1) return "ok";
        var prevDur = (before && before.job && before.job.lastDuration) || 0;
        if (tzBaseName(job.lastFileName) === name && (job.lastDuration || 0) !== prevDur) {
          return job.lastFileCancelled || job.lastFileAborted ? "cancelled" : "ok";
        }
        return "wait";
      }

      // deps (optional, for tests): { readState: function -> Promise<state>, wait: function(ms) -> Promise }
      function tzStartConfirm(path, before, deps) {
        var read = (deps && deps.readState) || workshopReadState;
        var wait = (deps && deps.wait) || function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
        function attempt(n) {
          return wait(TZ_START_POLL_MS).then(function () {
            return read();
          }).then(function (s) {
            var v = tzStartVerdict(s, path, before);
            if (v === "ok") return true;
            if (v === "cancelled") throw new Error(i18nT('common.start_cancelled_by_machine'));
            if (n + 1 >= TZ_START_POLLS) throw new Error(i18nT('common.start_not_confirmed'));
            return attempt(n + 1);
          });
        }
        return attempt(0);
      }

      // The text of a job file onto the machine (nothing to do without a text: the file is already there).
      function tzPutJob(path, texto, deps) {
        if (texto === undefined || texto === null) return Promise.resolve();
        var put = deps && deps.put ? deps.put : function (p, t) {
          return fetch("/machine/file/" + p, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: t }).then(function (r) {
            if (!r.ok) throw new Error(i18nT('common.http_saving_the_job', { status: r.status }));
          });
        };
        return Promise.resolve(put(path, texto));
      }

      function tzStartFile(path, texto, deps) {
        var read = (deps && deps.readState) || workshopReadState;
        var send = deps && deps.code ? deps.code : function (c) { return postCode(c).then(function (r) { return r && typeof r.text === "function" ? r.text() : ""; }); };
        var before = null;
        return Promise.resolve()
          .then(function () { return read().then(function (s) { before = s; }, function () { before = null; }); })
          .then(function () { return tzPutJob(path, texto, deps); })
          .then(function () { return send('M32 "' + path + '"'); })
          .then(function (t) {
            if (/error|cancel/i.test(t || "")) throw new Error(String(t).trim());
            return before ? tzStartConfirm(path, before, deps).then(function () { return t; }) : t; // no state to compare with: the answer decides
          });
      }

      // ---- The permission of ONE launch of a generated job (2026-10-30, architecture review finding 6) ----
      // The file of a laser cut (0:/sys/workshop/gcodes/cuts.gcode) or of the CNC toolpaths (0:/gcodes/cnc-*.gcode) can be launched from DWC
      // (Files, Jobs, the Send of Simulate job, M32 by hand) without the checks the page makes before it: zone, material, focus, work area,
      // clamps, safety list. The first line of those files is a guard (cutguard.g, cncguard.g) that only lets the launch go when the page armed
      // it with jobarm.g right before its M32 (global.workshopLaserArmed / workshopCncArmed = uptime + 30 s) and uses the permission up.
      // kind = "Laser" | "CNC". A1 arms one launch of that kind, A0 disarms both. The macro ships with the plugin:
      // src/_workbench_cut/sd/sys/workshop/macros/jobarm.g.
      var TZ_JOB_ARM = "0:/sys/workshop/macros/jobarm.g";
      function tzJobArmCode(kind, on) {
        return 'M98 P"' + TZ_JOB_ARM + '" A' + (on ? 1 : 0) + (on ? ' K"' + kind + '"' : "");
      }

      // The order has to be taken: a reply with an error or a warning (macro missing, board refusing) is a refusal.
      // deps (optional, for tests): { send: function(code) -> Promise<text> }
      function tzJobArm(kind, on, deps) {
        var send = deps && deps.send ? deps.send : function (c) { return postCode(c).then(function (r) { return r && typeof r.text === "function" ? r.text() : ""; }); };
        return send(tzJobArmCode(kind, on)).then(function (t) {
          if (/error|warning/i.test(t || "")) throw new Error(String(t).trim());
        });
      }

      // The mode whose guard a job text calls in its first line of code ("Laser" for cutguard.g, "CNC" for cncguard.g), or null when the first line
      // is another thing or there is no text (a file already on the machine). Comments and blank lines before it do not count.
      function tzJobGuardKind(texto) {
        if (texto === undefined || texto === null) return null;
        var lines = String(texto).split("\n");
        for (var i = 0; i < lines.length; i++) {
          var code = lines[i].split(";")[0].trim();
          if (!code) continue;
          var m = /^M98\s+P"[^"]*\/(cutguard|cncguard)\.g"/i.exec(code);
          return m ? (m[1].toLowerCase() === "cncguard" ? "CNC" : "Laser") : null;
        }
        return null;
      }

      // Uploads the text (if there is one), arms the guard of that kind, starts the file (tzStartFile) and, when the start did not go through,
      // takes the permission back so it cannot serve the next file (it also expires by itself in 30 s). The permission is given AFTER the
      // upload, right before M32. When the job started the guard has used it up already: nothing is sent to the machine while a job runs.
      // A machine without jobarm.g refuses the start (common.not_armed). deps (optional, for tests): { send, start, put, ... } as the two above.
      function tzStartArmed(kind, path, texto, deps) {
        var start = deps && deps.start ? deps.start : tzStartFile;
        var disarm = function () { return tzJobArm(kind, false, deps).catch(function () { /* it expires by itself */ }); };
        // one job = one mode: a text that starts with the guard of ANOTHER mode is refused before anything reaches the machine
        var found = tzJobGuardKind(texto);
        if (found && found !== kind) return Promise.reject(new Error(i18nT('common.job_guard_mismatch', { kind: kind, found: found })));
        return tzPutJob(path, texto, deps).then(function () {
          return tzJobArm(kind, true, deps)
            .catch(function (e) { throw new Error(i18nT('common.not_armed', { err: e && e.message ? e.message : e })); })
            .then(function () { return start(path, null, deps); })
            .catch(function (e) { return disarm().then(function () { throw e; }); });
        });
      }
