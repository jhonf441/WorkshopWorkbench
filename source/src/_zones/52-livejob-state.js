      // ---- Live job: the state of the page and the calls (2026-10-22; pure part in 52-livejob.js) ----
      // ONE state object for the whole page: the stop button (banner of the job) and the card of the interrupted jobs read the same list.
      // The list is read every TZ_LJ_POLL_MS while the layout is visible, and only a change of it tells the listeners.
      var tzLjS = null;

      function tzLjNew() {
        return {
          loaded: false, loading: false, available: true, reason: "", liveJob: false, stopping: false, resume: null, records: [], err: "",
          detail: {},        // id -> the record with its path (livejob.interrupted.get), read when the person wants to see it
          selected: "",      // id of the record whose path is drawn on the map
          asst: null,        // {id, overlap}: the resume assistant is open for this record
          busy: "", msg: "", msgOk: true, msgTok: 0, // the action running (arm | disarm | discard:<id>) and its last message
          rev: 0, listeners: [], timer: null, visible: null, sigLast: "",
        };
      }

      function tzLj() {
        if (!tzLjS) tzLjS = tzLjNew();
        return tzLjS;
      }

      // The service decides; this only hides what the role cannot call (workshopCan says yes while the role is not known yet)
      function tzLjCan(op) {
        return typeof workshopCan !== "function" || workshopCan(op);
      }

      function tzLjOnChange(fn) {
        tzLj().listeners.push(fn);
      }

      function tzLjChanged() {
        var s = tzLj();
        s.rev++;
        s.listeners.slice().forEach(function (fn) {
          try { fn(); } catch (e) { /* a page that is gone must not stop the others */ }
        });
      }

      // Anything that changes what the card or the stop button draws (the armed countdown counts minutes)
      function tzLjSig() {
        var s = tzLj();
        var min = Math.floor(Date.now() / 60000);
        return s.rev + "|" + (s.records.some(function (r) { return r.armed; }) ? min : 0);
      }

      function tzLjDataSig(s) {
        return JSON.stringify([s.available, s.reason, s.liveJob, s.stopping, s.resume, s.err, s.records.map(function (r) { return [r.id, r.lines, r.armed && r.armed.expires, r.blockers, r.can_resume, !!r.hidden]; })]);
      }

      // The list of interrupted jobs (every few seconds while the page is open). Never asks for a login and never shows a toast: it is a poll.
      function tzLjLoad() {
        var s = tzLj();
        if (s.loading || !tzLjCan("livejob.interrupted.list")) return Promise.resolve();
        s.loading = true;
        return workshopApi("livejob.interrupted.list", {}, { quiet: true, byPerson: false, noLogin: true }).then(
          function (r) {
            s.loading = false;
            s.loaded = true;
            s.err = "";
            r = r || {};
            s.available = r.available !== false;
            s.reason = String(r.reason || "");
            s.liveJob = !!r.live_job;
            s.stopping = !!r.stopping;
            s.resume = r.resume || null;
            s.records = r.records || [];
            if (s.selected && !s.records.some(function (x) { return x.id === s.selected; })) s.selected = "";
            if (s.asst && !s.records.some(function (x) { return x.id === s.asst.id; })) s.asst = null;
            var sig = tzLjDataSig(s);
            if (sig !== s.sigLast) {
              s.sigLast = sig;
              tzLjChanged();
            }
          },
          function (e) {
            s.loading = false;
            s.loaded = true;
            s.err = (e && e.message) || String(e);
            var sig = tzLjDataSig(s);
            if (sig !== s.sigLast) {
              s.sigLast = sig;
              tzLjChanged();
            }
          }
        );
      }

      // Starts the reading (once). visible() tells whether the layout that shows the card is the one in front.
      function tzLjStart(visible) {
        var s = tzLj();
        s.visible = visible || s.visible;
        if (s.timer) return;
        tzLjLoad();
        s.timer = setInterval(function () {
          if (!s.visible || s.visible()) tzLjLoad();
        }, TZ_LJ_POLL_MS);
      }

      // The path of one record, to draw it (read once; the record never changes)
      function tzLjLoadDetail(id) {
        var s = tzLj();
        if (s.detail[id] || !tzLjCan("livejob.interrupted.get")) return Promise.resolve();
        return workshopApi("livejob.interrupted.get", { id: id }, { quiet: true, byPerson: false, noLogin: true }).then(
          function (r) {
            s.detail[id] = r || { path: [] };
            tzLjChanged();
          },
          function (e) {
            s.msg = (e && e.message) || String(e);
            s.msgOk = false;
            tzLjChanged();
          }
        );
      }

      // A message of the card goes away by itself after a while (a newer message keeps its own time)
      function tzLjMsgExpire() {
        var s = tzLj();
        var tok = ++s.msgTok;
        setTimeout(function () {
          if (s.msgTok !== tok || !s.msg) return;
          s.msg = "";
          tzLjChanged();
        }, 25000);
      }

      // One action of the card or of the assistant (arm, disarm, discard): shows the answer, then reads the list again.
      // key = what is busy; the service asks for the confirmation of level 3 by itself when the operation needs it.
      function tzLjAct(key, op, args) {
        var s = tzLj();
        s.busy = key;
        s.msg = "";
        tzLjChanged();
        return workshopApi(op, args || {}, {}).then(
          function (r) {
            s.busy = "";
            s.msg = r && typeof r === "object" && r.message ? String(r.message) : typeof r === "string" ? r : "";
            s.msgOk = true;
            tzLjMsgExpire();
            return tzLjLoad().then(tzLjChanged);
          },
          function (e) {
            s.busy = "";
            s.msg = (e && e.message) || String(e);
            s.msgOk = false;
            tzLjMsgExpire();
            tzLjChanged();
          }
        );
      }
