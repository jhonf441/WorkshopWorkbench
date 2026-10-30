      function tjTrInit(tj) {
        // ctx: contract (21-contract.js): card, visible(), maquina.getSt, mapa.redraw, corte.correction, ui.fmt
        tj.fmt = tj.ctx.ui.fmt;
        tj.trace = null; // what is shown: the current job or one from the history
        tj.feed = tjFeedNew("current"); // the current job's trace, read incrementally with trace.since (47-job-feed*.js)
        tj.histFeed = null; // the feed of the history entry being opened or viewed
        tj.hist = null; // history index (list, the newest at the end)
        tj.viewId = null; // id of the history entry being viewed (null = the current one)
        tj.histOpen = false;
        try {
          tj.histOpen = localStorage.getItem(TT_HIST_OPEN_KEY) === "1";
        } catch (e) {
          /* cerrado */
        }
        tj.err = "";
        tj.plan = null; // tramos del recorrido planeado (o null)
        tj.planOf = ""; // de que trabajo es: "vivo:<inicio>" | "hist:<id>"
        tj.planLoading = "";
        tj.planCache = null; // points already converted per stretch (for the map)
        tj.lastKey = "";
        tj.timer = null;
        tj.loading = false;
        tj.lastLoad = 0;
        // Button that asks for a double tap (delete): the first arms it for 3 s.
        tj.armed = null, tj.armTimer = null;
        tj.lastProgress = 0;
        // While the page is visible the feed asks for the new samples (tjFeedDelay says when). WorkshopService only records the trajectory
        // while someone watches it and falls asleep after 30 s without a beat (dsf/job_trace.py): asking trace.since for "current" is
        // that beat, so there is no separate heartbeat.
        // Map with the planned path: done strong, what is missing faint.
        // The layer is split in chunks of consecutive runs (TT_CHUNK): when the progress moves only the chunks that
        // changed are drawn again (a few polylines), not the whole path.
        tj.TT_CHUNK = 120;
        // The job layer is built ONCE and put back in the map on every redraw (the map is rebuilt every
        // second): drawing it again each time with thousands of segments was what loaded the screen.
        // It is built again only when the job, the zoom, the layer or the progress shown change; the
        // progress shown moves at most every TT_PROGRESO_MS (not in real time).
        tj.TT_PROGRESS_MS = 20000;
        tj.jobCache = null;
        tj.fpShown = 0, tj.fpShownAt = 0;
        // Indices of the rectangles ({x, y, w, h}, bed coords) through which
        // the JOB passed (not the travels). For the presses notice.
        tj.hitsKey = "", tj.hitsVal = [];
        // For the map's focus mode: seconds since it started (the trace's
        // clock, not the browser's: the Pi may have another time) and the box of
        // what was cut (bed coords, where the beam lands).
        tj.infoKey = "", tj.infoVal = null;
      }
