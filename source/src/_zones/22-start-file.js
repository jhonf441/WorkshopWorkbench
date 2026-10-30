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

      function tzStartFile(path, texto, deps) {
        var read = (deps && deps.readState) || workshopReadState;
        var put = deps && deps.put ? deps.put : function (p, t) {
          return fetch("/machine/file/" + p, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: t }).then(function (r) {
            if (!r.ok) throw new Error(i18nT('common.http_saving_the_job', { status: r.status }));
          });
        };
        var send = deps && deps.code ? deps.code : function (c) { return postCode(c).then(function (r) { return r && typeof r.text === "function" ? r.text() : ""; }); };
        var before = null;
        return Promise.resolve()
          .then(function () { return read().then(function (s) { before = s; }, function () { before = null; }); })
          .then(function () { return texto === undefined || texto === null ? null : put(path, texto); })
          .then(function () { return send('M32 "' + path + '"'); })
          .then(function (t) {
            if (/error|cancel/i.test(t || "")) throw new Error(String(t).trim());
            return before ? tzStartConfirm(path, before, deps).then(function () { return t; }) : t; // no state to compare with: the answer decides
          });
      }
