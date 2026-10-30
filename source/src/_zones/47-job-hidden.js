      function tjTrHidden(tj) {
        if (!tj.trace || tj.trace.active || tj.viewId) return false;
        try {
          return localStorage.getItem(TT_HIDE_KEY) === String(tj.trace.start);
        } catch (e) {
          return false;
        }
      }

      function tjTrSetHidden(tj, on) {
        try {
          if (on) localStorage.setItem(TT_HIDE_KEY, String(tj.trace.start));
          else localStorage.removeItem(TT_HIDE_KEY);
        } catch (e) {
          /* no critico */
        }
        tj.lastKey = "";
        tjTrRender(tj);
        tj.ctx.map.redraw();
      }

      function tjTrArmBtn(tj, id, label, tip, fn) {
        var b = tzBtn(tj.armed === id ? i18nT('job.confirm', { label: label.toLowerCase() }) : label, tj.armed === id ? "warn" : null, function () {
          clearTimeout(tj.armTimer);
          if (tj.armed !== id) {
            tj.armed = id;
            tj.armTimer = setTimeout(function () { tj.armed = null; tj.lastKey = ""; tjTrRender(tj); }, 3000);
          } else {
            tj.armed = null;
            fn();
          }
          tj.lastKey = "";
          tjTrRender(tj);
        });
        if (tip) tzTip(b, tip);
        return b;
      }

      // Deletes the last job's trace (its history copy stays). The reader starts again from nothing and asks at once: the service forgets
      // the deleted job, so the card shows what it answers (nothing recorded, or a job started since).
      function tjTrDelete(tj) {
        tzDelete(TT_TRACE_FILE)
          .then(function () {
            tzDelete(TT_PLAN_FILE).catch(function () {});
            tjFeedReset(tj.feed);
            if (!tj.viewId) { tj.trace = null; tjTrSyncPlan(tj); }
            tj.err = "";
            tjTrLoad(tj);
          })
          .catch(function (e) { tj.err = i18nT('common.could_not_delete', { err: e.message || e }); })
          .then(function () { tj.lastKey = ""; tjTrRender(tj); tj.ctx.map.redraw(); });
      }

      // ---- historial ----
      function tjTrLoadHist(tj) {
        return tzGetText(TT_HIST_INDEX)
          .then(function (t) {
            var d = JSON.parse(t);
            tj.hist = Array.isArray(d) ? d : [];
          }, function () {
            tj.hist = [];
          })
          .then(function () { tj.lastKey = ""; tjTrRender(tj); });
      }

      // Opens a job of the history: its trace comes by trace.since with its id, in pages (47-job-feed.js), and is shown when complete.
      function tjTrVerHist(tj, id) {
        tj.err = "";
        var feed = tjFeedNew(id);
        tj.histFeed = feed;
        return tjFeedPull(feed)
          .then(function (r) {
            if (tj.histFeed !== feed) return; // another one was chosen (or back to the current one) meanwhile
            if (r.denied || !feed.trace) throw new Error(i18nT('job.trace_needs_operator'));
            tj.viewId = id;
            tj.trace = feed.trace;
            tjTrSyncPlan(tj);
          })
          .catch(function (e) { if (tj.histFeed === feed) tj.err = i18nT('job.could_not_open_that_job_2', { err: e.message || e }); })
          .then(function () { tj.lastKey = ""; tjTrRender(tj); tj.ctx.map.redraw(); });
      }

      function tjTrRevert(tj) {
        tj.viewId = null;
        tj.histFeed = null;
        tj.trace = tj.feed.trace;
        tjTrSyncPlan(tj);
        tj.lastKey = "";
        tjTrRender(tj);
        tj.ctx.map.redraw();
      }

      function tjTrDeleteHist(tj, ids) {
        var remove = {};
        ids.forEach(function (id) { remove[id] = 1; });
        return Promise.all(ids.map(function (id) {
          tzDelete(TT_HIST_DIR + "/" + id + ".plan.json").catch(function () {}); // puede no tener
          return tzDelete(TT_HIST_DIR + "/" + id + ".json");
        }))
          .then(function () {
            var rest = (tj.hist || []).filter(function (e) { return !remove[e.id]; });
            return tzPutText(TT_HIST_INDEX, JSON.stringify(rest));
          })
          .then(function () {
            if (tj.viewId && remove[tj.viewId]) tjTrRevert(tj);
            tj.err = "";
          })
          .catch(function (e) { tj.err = i18nT('common.could_not_delete', { err: e.message || e }); })
          .then(tzBind(tjTrLoadHist, tj));
      }

      function tjTrRenderHist(tj, card) {
        var box = tzEl("div");
        box.style.cssText = "margin-top:12px;border-top:1px solid rgba(255,255,255,0.12);padding-top:8px;";
        card.appendChild(box);
        var hd = tzEl("button", "za-sec-hd");
        hd.type = "button";
        hd.appendChild(tzEl("span", "za-chev", tj.histOpen ? "▾" : "▸"));
        hd.appendChild(tzEl("span", "za-sec-t", i18nT('job.job_history')));
        hd.appendChild(tzEl("span", "za-sec-s", tj.hist === null ? "..." : tj.hist.length ? String(tj.hist.length) : i18nT('job.empty')));
        hd.addEventListener("click", function () {
          tj.histOpen = !tj.histOpen;
          try {
            localStorage.setItem(TT_HIST_OPEN_KEY, tj.histOpen ? "1" : "0");
          } catch (e) {
            /* no critico */
          }
          if (tj.histOpen) tjTrLoadHist(tj);
          tj.lastKey = "";
          tjTrRender(tj);
        });
        box.appendChild(hd);
        if (!tj.histOpen) return;
        if (tj.hist === null) return box.appendChild(tzEl("div", "tz-muted", i18nT('common.loading')));
        if (!tj.hist.length) return box.appendChild(tzEl("div", "tz-muted", i18nT('job.no_saved_jobs_yet_every_job')));
        // Compact list (2026-10-11, "the job history overflows"): the 6-column table
        // did not fit in the panel; each job on two lines, with its own
        // scroll so that 50 jobs do not stretch the page.
        var lst = tzEl("div");
        lst.style.cssText = "margin-top:6px;max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;";
        tj.hist.slice().reverse().forEach(function (e) {
          var row = tzEl("div");
          row.style.cssText = "display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:6px;min-width:0;background:" + (tj.viewId === e.id ? "rgba(66,165,245,0.15)" : "rgba(255,255,255,0.04)") + ";";
          var txt = tzEl("div");
          txt.style.cssText = "flex:1 1 auto;min-width:0;";
          var tn = tzEl("div", null, workshopDefaultName(e.name, ["svc.job_trace_job", "svc.live_job_default_name"]));
          tn.style.cssText = "font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
          tn.title = e.name || "";
          txt.appendChild(tn);
          var det = tzEl("div", "tz-muted");
          det.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;font-size:11px;";
          det.appendChild(tzEl("span", null, String(e.start || e.id).replace("T", " ").slice(0, 16)));
          det.appendChild(tzEl("span", null, e.mode || "--"));
          det.appendChild(tzEl("span", null, tjTrDur(tj, e.duration_s)));
          det.appendChild(tzEl("span", "wf-state tz-badge " + (e.result === "cancelled" ? "warn" : "ok"), e.result === "cancelled" ? i18nT('job.cancelled') : i18nT('job.finished')));
          txt.appendChild(det);
          row.appendChild(txt);
          var ta = tzEl("div");
          ta.style.cssText = "flex:none;display:flex;gap:4px;";
          ta.appendChild(tj.viewId === e.id ? tzBtn(i18nT('job.viewing'), "primary", function () { tjTrRevert(tj); }) : tzBtn(i18nT('common.view'), null, function () { tjTrVerHist(tj, e.id); }));
          ta.appendChild(tjTrArmBtn(tj, "h:" + e.id, i18nT('common.delete'), i18nT('job.deletes_this_job_from_the_history'), function () { tjTrDeleteHist(tj, [e.id]); }));
          row.appendChild(ta);
          lst.appendChild(row);
        });
        box.appendChild(lst);
        var rb = tzEl("div", "tz-row");
        rb.style.cssText += "gap:6px;margin-top:6px;";
        rb.appendChild(tzBtn(i18nT('job.refresh_list'), null, function () { tjTrLoadHist(tj); }));
        rb.appendChild(tjTrArmBtn(tj, "h:todo", i18nT('job.delete_the_whole_history'), i18nT('job.deletes_all_saved_jobs_tap_twice'), function () { tjTrDeleteHist(tj, tj.hist.map(function (e) { return e.id; })); }));
        box.appendChild(rb);
      }

      // Planned path of the job being viewed (once per job).
      function tjTrPlanKey(tj) {
        if (!tj.trace || !tj.trace.plan || !tj.trace.plan.ok) return "";
        return (tj.viewId ? "hist:" + tj.viewId : "live:" + tj.trace.start) + ":" + (tj.trace.plan.rev || 0);
      }

      function tjTrSyncPlan(tj) {
        var k = tjTrPlanKey(tj);
        if (k === tj.planOf) return;
        tj.plan = null;
        tj.planCache = null;
        tj.planOf = k;
        if (!k || tj.planLoading === k) return;
        tj.planLoading = k;
        var file = tj.viewId ? TT_HIST_DIR + "/" + tj.viewId + ".plan.json" : TT_PLAN_FILE;
        tzGetText(file)
          .then(function (t) {
            var d = JSON.parse(t);
            if (tj.planOf !== k) return;
            if (!tj.viewId && d.start && d.start !== tj.trace.start) return; // de otro trabajo
            tj.plan = Array.isArray(d.segments) ? d.segments : null;
            tj.planCache = null;
          })
          .catch(function () { /*  without a path: the samples remain */ })
          .then(function () {
            if (tj.planLoading === k) tj.planLoading = "";
            tj.lastKey = "";
            tjTrRender(tj);
            tj.ctx.map.redraw();
          });
      }

      // How far the file has gone (bytes). Finished well = all.
      function tjTrFposCurrent(tj) {
        var mm = (tj.trace && tj.trace.samples) || [];
        var F = ttFields(tj.trace);
        if (tj.trace && !tj.trace.active && tj.trace.result !== "cancelled") return Infinity;
        // running file job: the progress comes from the page's own status (job.filePosition), so the
        // trace file does not have to be read again and again just to know how far it went
        if (tj.trace && tj.trace.active && !tj.viewId) {
          var sj = tj.ctx.machine.getSt && tj.ctx.machine.getSt() && tj.ctx.machine.getSt().job;
          if (sj && sj.filePosition > 0) return sj.filePosition;
        }
        if (F.fpos === undefined || F.fpos < 0) return Infinity;
        for (var i = mm.length - 1; i >= 0; i--) if (mm[i][F.fpos] > 0) return mm[i][F.fpos];
        return 0;
      }

      function tjTrPlanMaxF(tj) {
        var m = 0;
        (tj.plan || []).forEach(function (r) { var f = r.f[r.f.length - 1]; if (f > m) m = f; });
        return m;
      }

      // Distancias, piezas y caja de lo HECHO segun el recorrido planeado.
      function tjTrPlanStats(tj, c) {
        var fp = tjTrFposCurrent(tj), o = { dCut: 0, dTravel: 0, pieces: 0, bbox: null };
        var prevW = 0, gap = Infinity;
        (tj.plan || []).forEach(function (r) {
          for (var i = 1; i < r.f.length; i++) {
            if (r.f[i] > fp) return;
            var x0 = r.p[2 * i - 2], y0 = r.p[2 * i - 1], x1 = r.p[2 * i], y1 = r.p[2 * i + 1];
            var d = Math.hypot(x1 - x0, y1 - y0);
            if (r.w) {
              if (!prevW && gap > TT_PIECE_GAP_MM) o.pieces++;
              o.dCut += d;
              gap = 0;
              [[x0, y0], [x1, y1]].forEach(function (q) {
                var x = q[0] - c.cx, y = q[1] - c.cy;
                if (!o.bbox) o.bbox = { xmin: x, xmax: x, ymin: y, ymax: y };
                o.bbox.xmin = Math.min(o.bbox.xmin, x); o.bbox.xmax = Math.max(o.bbox.xmax, x);
                o.bbox.ymin = Math.min(o.bbox.ymin, y); o.bbox.ymax = Math.max(o.bbox.ymax, y);
              });
            } else {
              o.dTravel += d;
              gap += d;
            }
            prevW = r.w;
          }
        });
        return o;
      }

      function tjTrCorrection(tj) {
        var c = tj.ctx.cut.correction && tj.ctx.cut.correction();
        if (!tj.trace || tj.trace.mode !== "Laser" || !c) return { cx: 0, cy: 0 };
        return { cx: c.cx || 0, cy: c.cy || 0 };
      }

