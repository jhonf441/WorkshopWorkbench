      // ---- Live job: the "Stop safely" of the page (2026-10-22) ----
      // The button itself lives in the control side bar (WorkshopControlBar, sbLiveStop): it is NOT the emergency stop, it asks first and waits for
      // the board. The Workbench header only says that a live job runs (33-space-head.js, tzSpacePaintHeadStop) for a role that can stop it.
      // (2026-10-24: the old header button of this file, tzLjStopButton, was no longer called by anything and was removed.)
      TZ_CSS_EXTRA.push([
        ".tz-hdstop .tz-btn{margin:0;}",
        ".tz-hdstop .tz-muted{font-size:12px;}",
      ].join("\n"));

      // What the notice of the header depends on (it is drawn again only when its key changes)
      function tzLjBannerSig() {
        var s = tzLj();
        return [s.available ? 1 : 0, s.stopping ? 1 : 0].join("");
      }

      // The role can call the stop (livejob.stop_safe): only then the header says that a live job runs and where the stop is
      function tzLjStopOffered() {
        return tzLjCan("livejob.stop_safe");
      }

