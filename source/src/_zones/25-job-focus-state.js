      function tzFocusStart(pjf) {
        pjf.cameraJobBefore = false; // the map is zoomed in on the job
        pjf.focusJobKey = ""; // job it already zoomed in on by itself (once)
        pjf.bannerKey = "";
        pjf.viewTodo = false; // "Show everything" while a job runs
        // ---- The other zones (not the active one) ----
        // Request 2026-10-09: with several zones of almost the same size stacked the
        // map became a tangle. The active one is seen whole (with its 0,0); the
        // others, only a thin outline. In the Zones tab (or with the option)
        // also their name. Tapping where they overlap asks which one.
        pjf.TZ_OTHER_KEY = "workshopZonesOther";
        pjf.otherZones = "auto";
        try {
          var lsOt = localStorage.getItem(pjf.TZ_OTHER_KEY);
          if (["auto", "outline", "name", "ocultas"].indexOf(lsOt) !== -1) pjf.otherZones = lsOt;
        } catch (e) {
          /* default */
        }
      }
