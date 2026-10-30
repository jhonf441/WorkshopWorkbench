      // ---- Zones > Job: what is being done, live ----
      //
      // Request 2026-10-08: "a part that draws what has been cut or
      // what is being done; the report of how the head moved, if there are
      // several pieces, at what power, speed, with air or not".
      // It understands the two modes of the Workbench (FFF prints are shown by WorkshopPrinting since 2026-10-21):
      //   Laser: job = power > 0, color by power.
      //   CNC:   job = spindle on and below Z0 (inside the
      //          material), color by depth, level report.
      //
      // The path is recorded by the backend (WorkshopService/dsf/job_trace.py) and read incrementally with the
      // operation trace.since (47-job-feed*.js: only the samples added since the last call, also for the history).
      // Samples (fields in trace.fields):
      //   [t, x, y, z, pwm, v, air, ..., rpm, fpos]  (indices by name in trace.fields)
      // The positions are MACHINE ones; in Laser what is drawn is where the BEAM lands
      // (machine - laser correction, same as the map's red dot).
      // The page never reads the trace file; the Delete button removes 0:/sys/workshop/data/trace.json.
      var TT_TRACE_FILE = "0:/sys/workshop/data/trace.json";
      // 2026-10-10 ("the shapes do not come out well built"): the samples are
      // the position every ~0.4 s, so circles came out as polygons and corners
      // cut. In a FILE job the Pi reads the G-code
      // (WorkshopService/dsf/gcode_plan.py) and leaves the exact path here;
      // each vertex carries its position in the file and the sample carries
      // job.filePosition (field fpos): what is done is drawn strong and what
      // is missing faint. Live jobs (without a file) keep using samples.
      var TT_PLAN_FILE = "0:/sys/workshop/data/trace-plan.json";
      var TT_PIECE_GAP_MM = 1.0; // a travel longer than this separates "pieces"
      // 2026-10-10: "everything is there, it is not removed, it is not updated and there is no
      // way to remove them". The backend keeps only the LAST job; now:
      // - the file keeps being checked even if the job finished (before it
      //   stopped reading it and a new job did not appear),
      // - "Remove from map" hides it on this screen (it comes back by itself with the
      //   next job) and "Delete" removes the trace file.
      var TT_HIDE_KEY = "workshopTraceHidden"; // localStorage: inicio del trabajo oculto
      // Historial (pedido 2026-10-10): job_trace.py copia cada trabajo
      // terminado a TT_HIST_DIR/<id>.json y lo anota en indice.json.
      var TT_HIST_DIR = "0:/sys/workshop/data/jobs";
      var TT_HIST_INDEX = TT_HIST_DIR + "/index.json";
      var TT_HIST_OPEN_KEY = "workshopJobsHistory";
      // strokes of the job layers in SCREEN pixels (vector-effect: non-scaling-stroke): done, still to do, travel, travel dashes
      var TT_STROKE_PX = { done: "3", todo: "2", travel: "1.2", dash: "5 5" };

      function ttPowerColor(pwm) {
        // 0 -> amarillo, 1 -> rojo
        var p = Math.max(0, Math.min(1, pwm));
        var g = Math.round(235 - 200 * p);
        return "rgb(255," + g + ",40)";
      }
      // CNC: 0 mm -> celeste, profundo -> violeta
      function ttDepthColor(f) {
        var p = Math.max(0, Math.min(1, f));
        return "rgb(" + Math.round(100 + 90 * p) + "," + Math.round(220 - 170 * p) + "," + Math.round(255 - 30 * p) + ")";
      }
      // Indices of the trace fields (trace.fields names them).
      function ttFields(trace) {
        var f = { t: 0, x: 1, y: 2, z: 3, pwm: 4, v: 5, air: 6, rpm: -1 };
        ((trace && trace.fields) || []).forEach(function (n, i) { f[n] = i; });
        return f;
      }
      function ttMode(trace) {
        return (trace && trace.mode) || "Laser";
      }
      // Whether the a->b stretch is a JOB (cut / mill).
      function ttWork(mode, F, a, b) {
        if (mode === "CNC") return F.rpm >= 0 ? a[F.rpm] > 0 && a[F.z] < 0.2 : a[F.z] < 0.2;
        return a[F.pwm] > 0.001;
      }

      function tjMountJob(ctx) {
        var tj = { ctx: ctx };
        tjTrInit(tj);
        return tjTrApi(tj);
      }
