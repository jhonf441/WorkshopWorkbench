      // ---- Job in progress: the recorded trace read INCREMENTALLY, pure part (2026-10-24, docs-internal/MESA-RENOVADA.md section 10) ----
      // The service operation trace.since (WorkshopService dsf/trace_since.py) answers only the samples a job added since a cursor. This
      // file keeps what was received and applies each answer; no request, no DOM, no timer (47-job-feed.js asks, 47-job-load.js schedules).
      //   feed = { want ("current" | a history id YYYYMMDD-HHMMSS), job (id of the trace held, null = none), cursor (opaque: sent back
      //            exactly as it came), trace ({...meta, active, samples}: the object the job card and the map read; its samples array
      //            only grows in place), metaSig (JSON of the last meta), done, more, denied (the role cannot read it), failures (errors
      //            in a row), pulls (answers applied), received (samples received) }
      // Rules (tests/trace-feed.test.js): reset = drop what was held and start again with these samples; another job id = another job
      // (the same as a reset); more = ask again at once; done = the job ended and everything was sent; active = ask again in ~10 s.
      var TJ_FEED_LIMIT = 2000; // samples per answer (the service default; it allows up to 10 000)
      var TJ_FEED_ACTIVE_MS = 10000; // a running job: its new samples (asking for "current" also keeps the recorder awake: under its 30 s)
      var TJ_FEED_SETTLE_MS = 3000; // the page's state and the trace disagree (a job just started or ended)
      var TJ_FEED_IDLE_MS = 8000; // nothing running: see whether another job starts
      var TJ_FEED_DENIED_MS = 60000; // the role cannot read it: ask now and then in case the person signs in with another role
      var TJ_FEED_RETRY_MAX_MS = 30000; // errors: 5 s, 10 s, 20 s, then 30 s

      function tjFeedNew(want) {
        return { want: want || "current", job: null, cursor: "", trace: null, metaSig: "", done: false, more: false, denied: false, failures: 0, pulls: 0, received: 0 };
      }

      // the arguments of the next trace.since call
      function tjFeedArgs(feed) {
        return { job: feed.want, cursor: feed.cursor, limit: TJ_FEED_LIMIT };
      }

      // copies the meta of an answer over the held trace (never its samples or its active flag); true when it changed
      function tjFeedMeta(feed, meta) {
        var sig = JSON.stringify(meta || {});
        if (sig === feed.metaSig) return false;
        feed.metaSig = sig;
        Object.keys(meta || {}).forEach(function (k) {
          if (k !== "samples" && k !== "active") feed.trace[k] = meta[k];
        });
        return true;
      }

      // Applies one answer of trace.since. Returns { changed, fresh (what was held was dropped: another job or a reset), added (samples
      // kept from this answer), ended (the held job was running and now it is not, or another job replaced it), job (id before) }.
      function tjFeedApply(feed, res) {
        res = res || {};
        var samples = Array.isArray(res.samples) ? res.samples : [];
        var before = feed.job, wasActive = !!(feed.trace && feed.trace.active);
        var out = { changed: false, fresh: false, added: 0, ended: false, job: before };
        feed.pulls++;
        feed.received += samples.length;
        feed.denied = false;
        feed.failures = 0;
        feed.more = !!res.more;
        feed.done = !!res.done;
        feed.cursor = typeof res.cursor === "string" ? res.cursor : "";
        if (!res.job) {
          // nothing recorded: hold nothing
          out.changed = !!feed.trace;
          out.fresh = out.changed;
          out.ended = wasActive;
          feed.job = null;
          feed.trace = null;
          feed.metaSig = "";
          return out;
        }
        if (res.job !== feed.job || res.reset || !feed.trace) {
          feed.job = res.job;
          feed.trace = { active: !!res.active, samples: samples };
          feed.metaSig = "";
          tjFeedMeta(feed, res.meta);
          out.changed = out.fresh = true;
          out.added = samples.length;
          out.ended = wasActive && (!res.active || res.job !== before);
          return out;
        }
        var tr = feed.trace, s = tr.samples;
        for (var i = 0; i < samples.length; i++) s.push(samples[i]); // in place: what was held is never built again
        var metaChanged = tjFeedMeta(feed, res.meta);
        tr.active = !!res.active;
        out.added = samples.length;
        out.ended = wasActive && !tr.active;
        out.changed = samples.length > 0 || metaChanged || wasActive !== tr.active;
        return out;
      }

      // The role cannot read the trace (403, or 401 without a session): what was held is dropped (that person must not see it).
      function tjFeedDeny(feed) {
        var had = !!feed.trace;
        feed.denied = true;
        feed.more = false;
        feed.job = null;
        feed.trace = null;
        feed.cursor = "";
        feed.metaSig = "";
        return had;
      }

      // Another error (no service, network): what was held stays, the next call waits longer.
      function tjFeedFail(feed) {
        feed.failures++;
        feed.more = false;
      }

      // The reader starts again from nothing (the person deleted the last job's trace): no cursor, nothing held. What the card shows next
      // is what the next answer says (the service forgets a deleted job: job null = nothing recorded).
      function tjFeedReset(feed) {
        feed.job = null;
        feed.cursor = "";
        feed.trace = null;
        feed.metaSig = "";
        feed.done = false;
        feed.more = false;
      }

      // How long to wait before the next call (ms; Infinity = never again). running = the page's state says a job runs.
      function tjFeedDelay(feed, running) {
        if (feed.more) return 0;
        if (feed.denied) return TJ_FEED_DENIED_MS;
        if (feed.failures) return Math.min(TJ_FEED_RETRY_MAX_MS, 5000 * Math.pow(2, feed.failures - 1));
        if (feed.want !== "current") return feed.done ? Infinity : TJ_FEED_ACTIVE_MS;
        var active = !!(feed.trace && feed.trace.active);
        if (active && running) return TJ_FEED_ACTIVE_MS;
        if (active !== running) return TJ_FEED_SETTLE_MS;
        return feed.trace ? TJ_FEED_IDLE_MS : TJ_FEED_ACTIVE_MS; // no job: the call is tiny and keeps the recorder awake
      }
