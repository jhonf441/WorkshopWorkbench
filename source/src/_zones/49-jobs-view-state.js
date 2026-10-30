      function tvVisStartup(tvs) {
        /* ctx: contract (21-contract.js) */
        tvs.card = tvs.ctx.card;
        tvs.prev = null; // answer of jobs.preview
        tvs.files = []; // [{ruta, size, date}]
        tvs.loadingList = false;
        tvs.sel = "";
        tvs.reading = false;
        tvs.msg = "", tvs.msgOk = true;
        tvs.tNow = 0, tvs.playing = false, tvs.speedIx = 1, tvs.timer = null;
        tvs.shape = "frame", tvs.how = "pointer", tvs.pct = TJ_LASER_FRAME_DEFAULT_PCT;
        tvs.layer = null; // cached path elements {key, g, runs: [{el, run, pts}]}
        var parcial = null; // the run being drawn partly while the simulation runs
        tvs.scrub = null, tvs.clock = null, tvs.chartPlay = null;
        tvs.done = false;
        // the board: several jobs placed on the area to be sent together
        tvs.board = []; // [{ruta, prev, dx, dy, color, g, gkey}]
        tvs.COLORS = ["#ffb300", "#29b6f6", "#9ccc65", "#ec407a", "#ab47bc", "#ff7043", "#26a69a", "#d4e157"];
        tvs.boardMsg = "", tvs.boardOk = true, tvs.boardFile = null, tvs.boardNotices = [];
        tvs.colorBy = "layers"; // Laser / CNC: colour by layer (power + feed) or by power
        tvs.hidden = {}; // layers hidden on the map
        tvs.sinceMsg = "", tvs.sinceOk = true, tvs.msgPost = "";
        tvs.repeat = "once", tvs.nTimes = 3; // frame: once, N times or until stopped
        tvs.frameSt = null, tvs.frameTimer = null; // state of the frame the service is tracing (frame.status)
      }
