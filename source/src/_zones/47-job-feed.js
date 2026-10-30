      // ---- Job in progress: the recorded trace read INCREMENTALLY, the requests (2026-10-24, docs-internal/MESA-RENOVADA.md section 10) ----
      // One pull = trace.since with the feed's cursor, asked again at once while the answer says more (paging a long job), applied by
      // 47-job-feed-pure.js. Quiet calls: a timer never opens the PIN dialog nor a toast; a role that cannot read the trace (403, or 401
      // without a session) marks the feed denied and the card says so, the page goes on.
      var TJ_FEED_PAGES_MAX = 60; // pages of one pull (60 x 2 000 samples: more than the recorder ever keeps)

      // the caller cannot read the trace: 403 of its role, or no session at all
      function tjFeedIsDenied(e) {
        return !!e && (e.code === "forbidden" || e.code === "login_required");
      }

      // Resolves { changed, fresh, added, ended, denied, pages } for the whole pull; rejects only on another error (the feed counts it).
      function tjFeedPull(feed) {
        var sum = { changed: false, fresh: false, added: 0, ended: false, denied: false, pages: 0 };
        if (typeof workshopCan === "function" && !workshopCan("trace.since")) {
          sum.changed = tjFeedDeny(feed);
          sum.denied = true;
          return Promise.resolve(sum);
        }
        function page() {
          return workshopApi("trace.since", tjFeedArgs(feed), { noLogin: true, quiet: true, byPerson: false }).then(function (res) {
            var r = tjFeedApply(feed, res);
            sum.pages++;
            sum.changed = sum.changed || r.changed;
            sum.fresh = sum.fresh || r.fresh;
            sum.ended = sum.ended || r.ended;
            sum.added = r.fresh ? r.added : sum.added + r.added;
            if (feed.more && sum.pages < TJ_FEED_PAGES_MAX) return page();
            feed.more = false; // the rest comes with the next pull
            return sum;
          });
        }
        return page().catch(function (e) {
          if (!tjFeedIsDenied(e)) {
            tjFeedFail(feed);
            throw e;
          }
          sum.changed = tjFeedDeny(feed) || sum.changed;
          sum.denied = true;
          return sum;
        });
      }
