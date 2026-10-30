      // ---- Workbench page, part 3: the running job on the map ----
      // Zoom to the job, banner of the job in progress and the other-zones toggle. The state pjf is private to 25-job-focus*.js
      // (step 6 of the restructuring, docs-internal/INTERFACES.md).
      // deps: shell, nav (open tab, the job module), layerState, data, camera (paused during a job), view (zoom to the job).

      function tzFocusCreate(deps) {
        var pjf = { shell: deps.shell, nav: deps.nav, layerState: deps.layerState, data: deps.data, camera: deps.camera, view: deps.view };
        tzFocusStart(pjf);
        return {
          mountBanner: tzBind(tzFocusMountBanner, pjf),
          mountOtherZones: tzBind(tzFocusMountOtherZones, pjf),
          paintBanner: tzBind(tzFocusPaintBanner, pjf),
          otherMode: tzBind(tzFocusOtherMode, pjf),
          zonesAt: tzBind(tzFocusZonesAt, pjf),
          viewTodo: function () { return pjf.viewTodo; },
        };
      }

      // ---- Job in progress: map focus mode ----
      // Request 2026-10-09: "I am worried about how a job in progress looks with
      // so many things at once on the same chart". While a job runs
      // (file or live job) the map shows only what is needed:
      // path, head, active zone, mode area and presses. "See all"
      // shows the rest again.
      function tzFocusMountBanner(pjf) {
        pjf.banner = tzEl("div", "tzm-banner");
        pjf.banner.style.display = "none";
        pjf.shell.svgBox().appendChild(pjf.banner);
      }

      function tzFocusMountOtherZones(pjf) {
        pjf.otherBox = tzEl("div");
        pjf.shell.layerPanel().appendChild(tzEl("div", "tzm-lg", i18nT('zonesPage.the_other_zones')));
        pjf.shell.layerPanel().appendChild(pjf.otherBox);
        tzFocusPaintOther(pjf);
      }
