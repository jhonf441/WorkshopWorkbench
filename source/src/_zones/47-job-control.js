      // ---- Job control (stage 1, read only): the card of the "Job in progress" tool for Laser and CNC ----
      // Layout: wide = two columns (state + live checks | controls + "What happened"), narrow = one column. The map is not here (it is the
      // page's map, drawn as before). The logic is in 47-job-control-pure.js; this file reads the page's status, draws, and keeps the timeline
      // in the memory of the page (tj.cj, never localStorage). The only things that can act are the buttons that already existed:
      // Pause / Resume / Cancel (tzSpaceJobBox, the double tap of tzBtn) and the safe stop (livejob.stop_safe, the same call as the control bar).
      // The emergency stop is NOT here: DWC's is the only one. Its CSS (.tjc*) is at the end of TZ_CSS_BASE (22-ui-style-css.js).

      var TJC_STATE_DOT = { running: "ok", paused: "warn", stopped: "err", finished: "info" };

      // What the service says about the interlocks ({lid, extraction}); nothing today (the service does not report them yet): {}
      function tjcInterlocks(st) {
        var p = st && st.om && typeof workshopPluginOf === "function" ? workshopPluginOf(st.om.plugins, "service") : null;
        var il = p && p.data && p.data.interlocks;
        return il && typeof il === "object" ? il : {};
      }

      function tjcMode(tj, st) {
        var m = st && st.mode;
        if (TZ_PROFILES[m]) return m;
        return tj.trace && !tj.viewId ? ttMode(tj.trace) : "?";
      }

      function tjcSnap(tj) {
        var st = tj.ctx.machine.getSt && tj.ctx.machine.getSt();
        if (!st) return null;
        var mode = tjcMode(tj, st);
        var trace = tj.viewId ? null : tj.trace;
        var cj = tj.cj;
        var safe = !!(cj.stopBusy || (tzLj().stopping && st.liveJob));
        return { st: st, mode: mode, state: tjcState(st, trace), safe: safe, head: tjcHeader(st, trace, mode), rows: tjcChecks(st.om, mode, tzSafetyHw(), tjcInterlocks(st), st.wn) };
      }

      // Called by the timer of the job tool (every 1.5 s, also while the tab is not in front) and by the render: it keeps the timeline.
      // Returns true when the card has to be drawn again.
      function tjcSample(tj) {
        if (!tj.cj) tj.cj = tjcNew();
        var snap = tj.viewId ? null : tjcSnap(tj);
        if (!snap || !TZ_PROFILES[snap.mode]) return false;
        var before = tj.cj.log.length;
        tjcStep(tj.cj, snap, Date.now());
        return tj.cj.log.length !== before;
      }

      // What changes the card (it is drawn again only when this changes; the clock moves every 5 s)
      function tjcSig(tj) {
        if (!tj.cj) tj.cj = tjcNew();
        var snap = tj.viewId ? null : tjcSnap(tj);
        if (!snap) return "";
        var h = snap.head;
        return JSON.stringify([snap.state, snap.mode, h.name, h.pct, h.elapsed === null ? null : Math.floor(h.elapsed / 5), h.left === null ? null : Math.floor(h.left / 5), h.power, h.rpm, h.pass, h.passOf, snap.rows.map(function (r) { return [r.id, r.ok, r.ev && r.ev.params]; }), tj.cj.log.length, snap.safe, tj.cj.stopMsg, workshopJobButtons(snap.st.status, !!snap.st.liveJob)]);
      }

      function tjcKv(box, label, value) {
        var d = tzEl("div");
        d.appendChild(tzEl("span", "tz-muted", label));
        d.appendChild(tzEl("b", null, value));
        box.appendChild(d);
      }

      function tjcBlock(title) {
        var b = tzEl("div", "tz-card wf-card tjc-blk");
        b.appendChild(tzEl("div", "tjc-t", title));
        return b;
      }

      // 1. the state of the job: state + name, progress, times, power / rpm, pass
      function tjcStateBlock(tj, snap) {
        var h = snap.head, b = tjcBlock(i18nT('jobctl.title_state'));
        var top = tzEl("div", "tjc-top");
        top.appendChild(tzEl("span", "wf-state " + (TJC_STATE_DOT[h.state] || ""), i18nT('jobctl.state_' + h.state)));
        if (h.name) {
          var nm = tzEl("span", "tjc-name", workshopDefaultName(h.name, ["svc.job_trace_job", "svc.live_job_default_name"]));
          nm.title = h.name;
          top.appendChild(nm);
        }
        b.appendChild(top);
        if (h.pct !== null) {
          b.appendChild(tzEl("div", "tjc-pct", h.pct + " %"));
          var bar = tzEl("div", "tjc-bar");
          bar.setAttribute("role", "progressbar");
          bar.setAttribute("aria-valuenow", String(h.pct));
          var fill = tzEl("div", "tjc-fill");
          fill.style.width = h.pct + "%";
          bar.appendChild(fill);
          b.appendChild(bar);
          b.appendChild(tzEl("div", "tz-muted", i18nT('jobctl.of_file')));
        }
        var kv = tzEl("div", "tjc-kv");
        if (h.elapsed !== null) tjcKv(kv, i18nT('jobctl.elapsed'), tjcClock(h.elapsed));
        if (h.left !== null) tjcKv(kv, i18nT('jobctl.left'), tjcClock(h.left));
        if (h.power !== null) tjcKv(kv, i18nT('jobctl.power'), h.power + " %");
        if (h.rpm !== null) tjcKv(kv, i18nT('jobctl.rpm'), h.rpm + " rpm");
        if (h.pass !== null) tjcKv(kv, i18nT('jobctl.pass'), h.passOf ? i18nT('jobctl.pass_of', { n: h.pass, total: h.passOf }) : String(h.pass));
        if (kv.children.length) b.appendChild(kv);
        return b;
      }

      // 2. the live checks, read only: a dot (green / red), the text and the value read
      function tjcChecksBlock(tj, snap) {
        if (!snap.rows.length) return null;
        var b = tjcBlock(i18nT('jobctl.title_checks'));
        snap.rows.forEach(function (r) {
          var row = tzEl("div", "tjc-chk" + (r.ok ? "" : " bad"));
          row.setAttribute("data-check", r.id);
          row.appendChild(tzEl("span", "wf-dot " + (r.ok ? "ok" : "err")));
          row.appendChild(tzEl("span", null, i18nT('jobctl.check_' + r.id)));
          if (r.ev) row.appendChild(tzEl("span", "tjc-ev", i18nT(r.ev.key, r.ev.params)));
          b.appendChild(row);
        });
        b.appendChild(tzEl("div", "tz-muted", i18nT('jobctl.checks_note')));
        return b;
      }

      // the safe stop of a live job: the same operation and confirmation as the control bar (it is not the emergency stop)
      function tjcStopSafe(tj) {
        var cj = tj.cj;
        if (cj.stopBusy) return;
        workshopConfirmRisk({ title: i18nT('jobctl.stop_confirm_title'), text: i18nT('jobctl.stop_confirm_text') }).then(function (ok) {
          if (!ok) return;
          cj.stopBusy = true;
          cj.stopMsg = i18nT('jobctl.stop_wait');
          tj.lastKey = "";
          tjTrRender(tj);
          return workshopApi("livejob.stop_safe", {}, {}).then(
            function (r) { cj.stopMsg = (r && r.message) || i18nT('jobctl.stop_done'); },
            function (e) { cj.stopMsg = (e && e.message) || String(e); }
          ).then(function () { cj.stopBusy = false; tj.lastKey = ""; tjTrRender(tj); });
        });
      }

      // 3. the controls: the buttons that already existed, next to the state
      function tjcControlsBlock(tj, snap) {
        var st = snap.st, b = tjcBlock(i18nT('jobctl.title_controls'));
        var act = tzEl("div", "tjc-act");
        var box = tzSpaceJobBox(workshopJobButtons(st.status, !!st.liveJob), function () { return tj.ctx.machine.read(); }, "jc-cancel");
        if (box) act.appendChild(box);
        if (st.liveJob && tzLjStopOffered()) {
          var sb = tzActOnly(tzBtn(tj.cj.stopBusy ? i18nT('jobctl.stop_stopping') : i18nT('jobctl.stop_safe'), null, function () { tjcStopSafe(tj); }));
          tzTip(sb, i18nT('jobctl.stop_tip'));
          if (tj.cj.stopBusy) sb.disabled = true;
          act.appendChild(sb);
        }
        if (act.children.length) b.appendChild(act);
        if (tj.cj.stopMsg) b.appendChild(tzEl("div", "tz-muted", tj.cj.stopMsg));
        b.appendChild(tzEl("div", "tz-muted", i18nT('jobctl.hint')));
        return b;
      }

      function tjcClockOfDay(ms) {
        var d = new Date(ms);
        function z(n) { return (n < 10 ? "0" : "") + n; }
        return z(d.getHours()) + ":" + z(d.getMinutes()) + ":" + z(d.getSeconds());
      }

      // 4. "What happened": newest first, in the memory of the page
      function tjcLogBlock(tj) {
        var b = tjcBlock(i18nT('jobctl.title_log'));
        var log = tj.cj.log;
        if (!log.length) {
          b.appendChild(tzEl("div", "tz-muted", i18nT('jobctl.log_empty')));
          return b;
        }
        var ul = tzEl("ul", "tjc-log");
        log.slice().reverse().forEach(function (e) {
          var li = document.createElement("li");
          li.appendChild(tzEl("time", null, tjcClockOfDay(e.t)));
          var txt = e.id === "check_failed" ? i18nT('jobctl.ev_check_failed', { check: i18nT('jobctl.check_' + e.params.check), ev: e.params.ev ? i18nT(e.params.ev.key, e.params.ev.params) : "" }) : i18nT('jobctl.ev_' + e.id);
          li.appendChild(tzEl("span", e.id === "check_failed" ? "tjc-bad" : null, txt));
          ul.appendChild(li);
        });
        b.appendChild(ul);
        b.appendChild(tzEl("div", "tz-muted", i18nT('jobctl.log_note')));
        return b;
      }

      // Draws the block at the top of the card (called by tjTrRender); nothing when there is no Laser / CNC job to talk about
      function tjcRender(tj, card) {
        if (!tj.cj) tj.cj = tjcNew();
        if (tj.viewId) return;
        var snap = tjcSnap(tj);
        if (!snap || !TZ_PROFILES[snap.mode]) return;
        tjcStep(tj.cj, snap, Date.now());
        if (snap.state === "idle" && !tj.cj.log.length) return;
        var wrap = tzEl("div", "tjc");
        wrap.setAttribute("data-jobctl", snap.state);
        var left = tzEl("div", "tjc-col"), right = tzEl("div", "tjc-col");
        left.appendChild(tjcStateBlock(tj, snap));
        var checks = tjcChecksBlock(tj, snap);
        if (checks) left.appendChild(checks);
        if (snap.state === "running" || snap.state === "paused") right.appendChild(tjcControlsBlock(tj, snap));
        right.appendChild(tjcLogBlock(tj));
        wrap.appendChild(left);
        wrap.appendChild(right);
        card.appendChild(wrap);
      }
