      // ---- Workbench page, part 2b: the camera layer of the map (step 6 of the restructuring, docs-internal/INTERFACES.md) ----
      // The module of 39-camera-map.js (configured and calibrated on the Vision page; here only the Camera layer, its eye) and
      // whether it is forced on during a job. map() is that module once mount() made it (the page calls it while it builds the
      // map, with the accessors of its ctx and the root of the route).

      function tzCameraCreate(deps) {
        var pcl = { shell: deps.shell, layerState: deps.layerState, data: deps.data, map: null, forced: false };
        return {
          map: function () { return pcl.map; },
          mount: tzBind(tzCameraMount, pcl),
          // the person turned the layer on during a job: it stays on until the job ends
          forced: function () { return pcl.forced; },
          setForced: function (on) { pcl.forced = on; },
        };
      }

      function tzCameraMount(pcl, P, root) {
        pcl.map = tcmMount(tzCreateCtx(P, "camera", {
          map: {
            svg: pcl.shell.svg(),
            svgBox: pcl.shell.svgBox(),
            ctm: function () { return pcl.shell.mapRoot() ? pcl.shell.mapRoot().getScreenCTM() : pcl.shell.svg().getScreenCTM(); },
            // The camera layer pauses while a job runs (the video decode and its perspective transform cost the screen a
            // lot, and nobody looks at the bed photo while cutting). It comes back when the job ends; if the user turns
            // the layer on during the job, that choice is kept until the job ends.
            layerActive: function () { return !!pcl.layerState.layers().camera && !(pcl.data.jobRunning() && !pcl.forced); },
          },
          // alive AND on screen: a hidden tab, or another DWC page (this one is kept alive), does not hold the video
          visible: function () { return pcl.shell.alive() && workshopPageVisible(root) && !document.hidden; },
        }));
      }
