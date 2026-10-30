      // Brings the current job's trace up to date: only the samples added since the last call (trace.since, 47-job-feed.js). The card and
      // the map are drawn again only when something changed (force: the Refresh button).
      function tjTrLoad(tj, force) {
        if (tj.loading) return Promise.resolve();
        tj.loading = true;
        tj.lastLoad = Date.now();
        var feed = tj.feed, errBefore = tj.err, r = null;
        return tjFeedPull(feed)
          .then(function (res) {
            r = res;
            var d = feed.trace;
            if (d && !d.active) tzTrailDone(tj, d.end); // the recorded trace of the live job that ended replaces its trail
            if (tj.viewId && r.fresh && d && d.active) { tj.viewId = null; tj.histFeed = null; } // a new job started: back to the current one
            if (!tj.viewId) tj.trace = d;
            tjTrSyncPlan(tj);
            if (r.ended || tj.hist === null) setTimeout(tzBind(tjTrLoadHist, tj), r.ended ? 2500 : 0); // one was archived
            tj.err = "";
          })
          .catch(function (e) {
            tj.err = i18nT('job.could_not_read_the_trace', { err: e.message || e });
          })
          .then(function () {
            tj.loading = false;
            if (!force && tj.err === errBefore && !(r && r.changed)) return;
            tj.lastKey = "";
            tjTrRender(tj);
            tj.ctx.map.redraw();
          });
      }

      function tjTrStart(tj) {
        if (tj.timer) return;
        tjTrLoad(tj);
        tj.timer = setInterval(function () {
          // hidden tab or on another DWC page (keep-alive): no call (the recorder falls asleep: nobody is watching)
          if (document.hidden || !tj.ctx.visible() || !workshopPageVisible(tj.ctx.card)) return;
          // The job is NOT followed sample by sample: while it runs only its new samples are asked every 10 s (they feed the report and
          // the recorded path; the map draws a live job from DWC's model, 47-job-live-trail.js, and a file job from its plan with the
          // progress of the page's own status). Right after a job starts or ends (the state and the trace disagree) every 3 s.
          var sj = tj.ctx.machine.getSt && tj.ctx.machine.getSt();
          var running = !!(sj && (sj.liveJob || sj.status === "processing" || sj.status === "paused" || sj.status === "simulating"));
          if (Date.now() - tj.lastLoad >= tjFeedDelay(tj.feed, running)) tjTrLoad(tj);
          // progress on the map: at most every TT_PROGRESO_MS and only while a file job runs
          var active = !!(tj.feed.trace && tj.feed.trace.active);
          if (active && running && tj.plan && Date.now() - tj.lastProgress >= tj.TT_PROGRESS_MS) {
            tj.lastProgress = Date.now();
            tj.ctx.map.redraw();
          }
        }, 1500);
      }

      function tjTrDur(tj, s) {
        s = Math.round(s || 0);
        var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
        return (h ? h + " h " : "") + (h || m ? m + " min " : "") + x + " s";
      }

      function tjTrRender(tj) {
        var card = tj.ctx.card;
        if (!tj.ctx.visible()) return;
        tjTrStart(tj);
        var mm = (tj.trace && tj.trace.samples) || [];
        var key = JSON.stringify([tj.feed.denied, tj.trace && tj.trace.start, tj.trace && tj.trace.active, mm.length, tj.err, !!tj.plan, tj.trace && tj.trace.plan, tjLaserWatts, tjTrHidden(tj), tj.viewId, tj.histOpen, tj.armed, tj.hist && tj.hist.map(function (e) { return e.id; }), tzLjSig()]);
        if (key === tj.lastKey) return;
        tj.lastKey = key;
        card.innerHTML = "";
        tjTrRenderMain(tj, card, mm);
        tzLjJobLine(tj, card); // interrupted jobs: how many, and the button to their tab (52-livejob-tool.js)
        tjTrRenderHist(tj, card);
      }

      function tjTrRenderMain(tj, card, mm) {
        var mn = {};

        if (tjTrMainHeader(tj, mn, card, mm)) return;
        tjTrMainReport(tj, mn, card, mm);
        tjTrMainNote(tj, mn, card, mm);
      }

      function tjTrMainHeader(tj, mn, card, mm) {
        var h = tzEl("div", "tz-row");
        h.style.alignItems = "center";
        var h3 = tzEl("h3", null, tj.viewId ? i18nT('job.job_from_the_history') : i18nT('job.current_job'));
        h3.style.marginRight = "auto";
        h.appendChild(h3);
        if (tj.viewId) {
          h.appendChild(tzBtn(i18nT('job.back_to_current'), "primary", function () { tjTrRevert(tj); }));
        } else {
          h.appendChild(tzBtn(i18nT('job.refresh'), null, function () { tjTrLoad(tj, true); }));
          if (tj.trace && !tj.trace.active) {
            h.appendChild(
              tzTip(
                tzBtn(tjTrHidden(tj) ? i18nT('job.show_on_the_map') : i18nT('job.remove_from_the_map'), null, function () { tjTrSetHidden(tj, !tjTrHidden(tj)); }),
                i18nT('job.hides_this_job_s_path_on')
              )
            );
            h.appendChild(tjTrArmBtn(tj, "actual", i18nT('common.delete'), i18nT('job.deletes_the_last_job_s_trace'), tzBind(tjTrDelete, tj)));
          }
        }
        card.appendChild(h);
        if (tj.err) card.appendChild(tzEl("div", "tz-msg err", tj.err));
        if (!tj.trace) {
          card.appendChild(tzEl("div", "tz-muted", tj.feed.denied && !tj.viewId ? i18nT('job.trace_needs_operator') : i18nT('job.no_job_recorded_yet_when_one')));
          return true;
        }
        mn.mode = ttMode(tj.trace);
        var F = ttFields(tj.trace);
        if (!TZ_PROFILES[mn.mode]) {
          // a job of a mode another plugin serves (an FFF print in the history): only where it is shown
          var other = tzModeElsewhere(mn.mode);
          card.appendChild(tzEl("div", "tz-muted", i18nT('job.other_mode_job', { mode: mn.mode, page: other ? i18nT(other.name) : "" })));
          return true;
        }
        mn.verb = mn.mode === "CNC" ? i18nT('job.milling') : i18nT('job.cutting');
        var c = tjTrCorrection(tj);
        mn.last = mm.length ? mm[mm.length - 1] : null;
        card.appendChild(
          tzEl(
            "div",
            "tz-msg " + (tj.trace.active ? "ok" : ""),
            i18nT('job.header', { state: tj.trace.active ? i18nT('job.running') : tj.viewId ? i18nT('job.from_history') : i18nT('job.last_job'), name: workshopDefaultName(tj.trace.name, ["svc.job_trace_job", "svc.live_job_default_name"]), origin: { live: i18nT('job.origin_live'), file: i18nT('job.origin_file') }[tj.trace.origin] || tj.trace.origin, start: String(tj.trace.start).replace("T", " "), end: tj.trace.end ? i18nT('job.to', { slice: String(tj.trace.end).slice(11) }) : "", dur: tjTrDur(tj, tj.trace.duration_s), mode: mn.mode })
          )
        );
        if (tjTrHidden(tj)) {
          card.appendChild(tzEl("div", "tz-muted", i18nT('job.removed_from_the_map_the_next')));
          return true;
        }
        mn.r = mm.length >= 2 ? tjTrReport(tj, mm, c, mn.mode, F) : null;
        if (mn.r && tj.plan) {
          var ps = tjTrPlanStats(tj, c);
          mn.r.dCut = ps.dCut;
          mn.r.dTravel = ps.dTravel;
          mn.r.pieces = ps.pieces;
          mn.r.bbox = ps.bbox || mn.r.bbox;
        }
        if (tj.trace.active && !tj.viewId) {
          // the samples come every 10 s: the progress is the page's own status, not the last sample
          var sj2 = tj.ctx.machine.getSt && tj.ctx.machine.getSt();
          var pj = sj2 && sj2.job;
          var tam = pj && pj.file && pj.file.size;
          var pct = tj.plan && tam && pj.filePosition > 0 ? Math.max(0, Math.min(100, Math.round((pj.filePosition / tam) * 100))) : null;
          card.appendChild(tzEl("div", "tz-muted", tj.plan ? i18nT('job.path_drawn_progress_updates', { pct: pct === null ? "--" : pct }) : i18nT('job.drawn_when_it_ends')));
        }
        if (!mn.r) {
          card.appendChild(tzEl("div", "tz-muted", i18nT('job.waiting_for_movement')));
          return true;
        }
      }

      function tjTrMainReport(tj, mn, card, mm) {
        var tbl = tzEl("table", "tz-table");
        var rows = [
          [i18nT('job.time', { verb: mn.verb }), tjTrDur(tj, mn.r.tCut) + " (" + Math.round((mn.r.tCut / Math.max(1, mn.r.tCut + mn.r.tTravel)) * 100) + " %)"],
          [i18nT('job.time_in_travel_moves'), tjTrDur(tj, mn.r.tTravel)],
          [mn.mode === "CNC" ? i18nT('job.dist_milled') : i18nT('job.dist_cut'), tj.fmt(mn.r.dCut) + " mm"],
          [i18nT('job.travel_distance'), tj.fmt(mn.r.dTravel) + " mm"],
        ];
        if (mn.mode === "CNC") {
          rows.push([i18nT('job.pieces_separate_outlines'), String(mn.r.pieces)]);
          rows.push([i18nT('job.maximum_depth'), mn.r.zMin !== null && mn.r.zMin < 0 ? tj.fmt(-mn.r.zMin) + " mm" : "--"]);
          var zn = Object.keys(mn.r.zLevels).sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
          if (zn.length) rows.push([i18nT('job.levels_passes'), zn.length + ": " + zn.slice(0, 8).map(function (z) { return tj.fmt(-parseFloat(z)) + " mm"; }).join(", ") + (zn.length > 8 ? " ..." : "")]);
          rows.push([i18nT('job.maximum_spindle'), mn.r.rpmMax ? mn.r.rpmMax + " rpm" : "--"]);
          rows.push([i18nT('job.feed_median'), tj.fmt(mn.r.vCutMed * 60) + " mm/min"]);
        } else {
          rows.push([i18nT('job.pieces_separate_outlines'), String(mn.r.pieces)]);
          rows.push([i18nT('job.cut_power'), i18nT('job.average_maximum_w_of_w', { v: Math.round(mn.r.pwmAvg * 100), v2: Math.round(mn.r.pwmMax * 100), v3: tj.fmt(mn.r.pwmMax * tjLaserWatts), tjLaserWatts: tjLaserWatts })]);
          rows.push([i18nT('job.cut_speed_median'), tj.fmt(mn.r.vCutMed * 60) + " mm/min"]);
          rows.push([i18nT('job.air_during_the_cut'), mn.r.tCut ? i18nT('job.of_the_time', { v: Math.round((mn.r.tAir / mn.r.tCut) * 100) }) : "--"]);
          var niv = Object.keys(mn.r.levels).map(Number).sort(function (a, b) { return b - a; });
          if (niv.length) rows.push([i18nT('job.powers_used'), niv.slice(0, 6).map(function (l) { return l + " % (" + tjTrDur(tj, mn.r.levels[l]) + ")"; }).join(", ") + (niv.length > 6 ? " ..." : "")]);
        }
        rows.push([i18nT('job.fastest_travel_move'), tj.fmt(mn.r.vTravelMax * 60) + " mm/min"]);
        if (tj.plan && tj.trace.active) {
          var fp = tjTrFposCurrent(tj), fm = tjTrPlanMaxF(tj);
          if (fm > 0 && fp !== Infinity) rows.push([i18nT('job.file_progress'), Math.min(100, Math.round((fp / fm) * 100)) + " %"]);
        }
        if (mn.r.bbox)
          rows.push([mn.mode === "Laser" ? i18nT('job.cut_area_beam') : i18nT('job.worked_area'), i18nT('job.bbox_range', { x0: tj.fmt(mn.r.bbox.xmin), x1: tj.fmt(mn.r.bbox.xmax), y0: tj.fmt(mn.r.bbox.ymin), y1: tj.fmt(mn.r.bbox.ymax) }) + "  (" + tj.fmt(mn.r.bbox.xmax - mn.r.bbox.xmin) + " x " + tj.fmt(mn.r.bbox.ymax - mn.r.bbox.ymin) + " mm)"]);
        rows.forEach(function (rw) {
          var tr = document.createElement("tr");
          tr.appendChild(tzEl("td", "tz-muted", rw[0]));
          tr.appendChild(tzEl("td", null, rw[1]));
          tbl.appendChild(tr);
        });
        card.appendChild(tbl);
        mn.legend = mn.mode === "CNC" ? i18nT('job.on_the_map_milling_light_blue') : i18nT('job.on_the_map_cut_yellow_low');
        // Fixed texts separately (so they get translated; without numbers inside).
        mn.pl = tj.trace.plan || {};
      }

      function tjTrMainNote(tj, mn, card, mm) {
        var note = tj.plan
          ? tj.trace.active ? i18nT('job.this_is_the_exact_path_from') : i18nT('job.this_is_the_exact_path_from_2')
          : mn.pl.assembling
          ? i18nT('job.reading_the_path_from_the_file')
          : mn.pl.error
          ? i18nT('job.could_not_read_the_path_from')
          : i18nT('job.job_without_a_file_live_the');
        if (mn.pl.error) console.warn("[WorkshopJog] file path:", mn.pl.error);
        card.appendChild(tzEl("div", "tz-muted", mn.legend));
        card.appendChild(tzEl("div", "tz-muted", note));
        if (tj.trace.reduction) card.appendChild(tzEl("div", "tz-muted", i18nT('job.long_job_samples_were_reduced_so')));
      }
