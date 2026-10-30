      // ---- Machine state helpers of the Workbench (pure; the page and every module ask these) ----
      // Stage 2 of the redesign (docs-internal/PLAN-EJECUCION-REDESIGN.md): one definition of
      // "a job is running", "the machine is free" and "the cut area".

      // A job of a file or a live job is running (the map shows only what the job needs).
      function tzJobInProgress(st) {
        if (!st) return false;
        if (st.liveJob) return true;
        return ["processing", "pausing", "paused", "resuming", "simulating"].indexOf(st.status) !== -1;
      }

      // The machine can move / change settings. memo = { liveBusyTs } keeps the hysteresis of the live job
      // (busy seen within the last 5 s still counts as busy). bloqueo = result of workshopMotionBlock([PLUGIN_ID])
      // (owner of the movement; truthy blocks). ahora = Date.now() (a parameter so it can be tested).
      function tzMachineFree(st, memo, now, block) {
        var s = st && st.status;
        if (st && st.liveJob && s === "busy") memo.liveBusyTs = now;
        if (st && st.liveJob && (s === "busy" || now - memo.liveBusyTs < 5000)) return false; // live job running
        if (block) return false;
        return s === "idle" || s === "busy";
      }

      // Cut area of the active mode as {xmin,xmax,ymin,ymax}, or null.
      function tzAreaCut(st) {
        var a = st && st.cutArea;
        return a ? { xmin: a[0], xmax: a[1], ymin: a[2], ymax: a[3] } : null;
      }
      // ---- Pause / resume / cancel of the job in progress (F0, 2026-10-21; pure, no DOM) ----
      // The same G-codes DWC sends from its own buttons: M25 pauses, M24 resumes, M0 cancels the file job. A live job (a program
      // through the bridge) has its own controls in the Jog bar and is not handled here.
      var TZ_JOB_CODES = { pause: "M25", resume: "M24", cancel: "M0" };

      // Which buttons the status bar offers for the machine state st: {pause, resume, cancel} (booleans).
      function tzJobControls(st) {
        var none = { pause: false, resume: false, cancel: false };
        if (!st || st.liveJob) return none;
        var s = st.status;
        return {
          pause: s === "processing",
          resume: s === "paused",
          cancel: ["processing", "pausing", "paused", "resuming"].indexOf(s) !== -1,
        };
      }
