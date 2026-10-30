      // ---- Work state of the Workbench kept in the service, per zone (F3-W, 2026-10-21) ----
      // What used to live only in this browser or in this session now lives in the shared settings store with revision (02-settings.js),
      // so another screen or another person sees the same:
      //   - the steps of Prepare marked done (Measure / focus and Frame the material), per zone;
      //   - the focus applied to a zone (the Z where the lens was left), per zone;
      //   - the focus height H chosen for "Focus here" (valid while the laser focus it was chosen over does not change).
      // File: "focus" (one of the names the service allows: dsf/settings_store.py). That file also holds the numbers of the focus rule
      // (57-focus-rule.js), so everything here goes under ONE key, `work_state`, and the other keys are never touched.
      //   work_state = { v: 1, zones: { "<wn>": { prepare: { measure: ts, border: ts }, applied: { z, ts } } }, focus_h: { h, base, ts } }
      // A flag is the time it was set; a negative one means "cleared at that time" (so two screens merge by the newest time).
      // Reading is synchronous (memory), writing is a debounced save. Order of use (F3-X, 2026-10-21): the operations workstate.get (viewer) and
      // workstate.set (operator) of the service, which validate the document strictly (dsf/work_state.py: tzWorkClean sends only what they
      // accept) and merge it zone by zone; if the service refuses (role), the `focus` settings file above (technician);
      // if that fails too, this browser (localStorage), which is read from there: nothing is lost, only not shared. A copy that could not
      // be sent is sent again on the next reload of the page.
      var TZ_WORK_FILE = "focus";
      var TZ_WORK_KEY = "work_state";
      var TZ_WORK_LOCAL_KEY = "workshopWorkState";
      var TZ_WORK_PREPARE_TTL_MS = 8 * 3600 * 1000; // a measured / framed mark is trusted for a work shift
      var TZ_WORK_SAVE_DELAY_MS = 400;
      var TZ_WORK_RELOAD_MS = 20000;
      var tzWork = { data: null, timer: 0, saving: false, again: false, loaded: false, shared: null, dirty: false };

      // ---- pure part (tests/work-state.test.js) ----
      function tzWorkEmpty() {
        return { v: 1, zones: {}, focus_h: null };
      }
      function tzWorkNorm(d) {
        var out = tzWorkEmpty();
        if (!d || typeof d !== "object" || Array.isArray(d)) return out;
        if (d.zones && typeof d.zones === "object") {
          Object.keys(d.zones).forEach(function (k) {
            var z = d.zones[k];
            if (!z || typeof z !== "object") return;
            out.zones[k] = { prepare: z.prepare && typeof z.prepare === "object" ? z.prepare : {}, applied: z.applied && typeof z.applied === "object" ? z.applied : null };
          });
        }
        if (d.focus_h && typeof d.focus_h === "object") out.focus_h = d.focus_h;
        return out;
      }
      function tzWorkZone(d, wn) {
        var k = String(wn);
        if (!d.zones[k]) d.zones[k] = { prepare: {}, applied: null };
        return d.zones[k];
      }
      function tzWorkSetPrepare(d, wn, kind, on, now) {
        tzWorkZone(d, wn).prepare[kind] = on ? now : -now;
      }
      // is the step done for the zone and still fresh?
      function tzWorkPrepareDone(d, wn, kind, now) {
        var z = d.zones[String(wn)];
        var t = z && z.prepare ? z.prepare[kind] : 0;
        return typeof t === "number" && t > 0 && now - t < TZ_WORK_PREPARE_TTL_MS;
      }
      // {"measure:1": true, "border:1": true} of every zone that has a fresh mark (what the Prepare render key and its steps read)
      function tzWorkPrepareFlags(d, now) {
        var out = {};
        Object.keys(d.zones).forEach(function (k) {
          ["measure", "border"].forEach(function (kind) {
            if (tzWorkPrepareDone(d, k, kind, now)) out[kind + ":" + k] = true;
          });
        });
        return out;
      }
      function tzWorkSetApplied(d, wn, rec) {
        tzWorkZone(d, wn).applied = rec ? { z: rec.z === undefined ? null : rec.z, ts: rec.ts || 0 } : null;
      }
      // the record of the focus applied to the zone, in the shape tzFocusAppliedOk reads ({wn, z, ts}), or null
      function tzWorkGetApplied(d, wn) {
        var z = d.zones[String(wn)];
        return z && z.applied ? { wn: Number(wn), z: z.applied.z === undefined ? null : z.applied.z, ts: z.applied.ts || 0 } : null;
      }
      // the most recent one of all the zones (what callers that do not say the zone read)
      function tzWorkLastApplied(d) {
        var best = null;
        Object.keys(d.zones).forEach(function (k) {
          var r = tzWorkGetApplied(d, k);
          if (r && (!best || r.ts >= best.ts)) best = r;
        });
        return best;
      }
      // focus height chosen for "Focus here": only valid while the laser focus is the one it was chosen over
      function tzWorkFocusH(d, laserFocus) {
        var f = d.focus_h;
        return f && f.h >= 1 && f.h <= 60 && Math.abs((f.base || 0) - laserFocus) < 1e-6 ? f.h : null;
      }
      function tzWorkSetFocusH(d, h, laserFocus, now) {
        d.focus_h = { h: h, base: laserFocus, ts: now };
      }
      function tzWorkNewer(a, b) {
        return Math.abs(b || 0) >= Math.abs(a || 0) && b ? b : a; // a tie goes to b (the newer source)
      }
      // merges two states: for every mark the newest time wins (two screens that saved at the same time lose nothing)
      function tzWorkMerge(a, b) {
        var x = tzWorkNorm(a), y = tzWorkNorm(b);
        var out = tzWorkEmpty();
        Object.keys(x.zones).concat(Object.keys(y.zones)).forEach(function (k) {
          if (out.zones[k]) return;
          var za = x.zones[k] || { prepare: {}, applied: null }, zb = y.zones[k] || { prepare: {}, applied: null };
          var z = { prepare: {}, applied: null };
          ["measure", "border"].forEach(function (kind) {
            var v = tzWorkNewer(za.prepare[kind], zb.prepare[kind]);
            if (v) z.prepare[kind] = v;
          });
          z.applied = za.applied && zb.applied ? ((zb.applied.ts || 0) >= (za.applied.ts || 0) ? zb.applied : za.applied) : za.applied || zb.applied || null;
          out.zones[k] = z;
        });
        out.focus_h = x.focus_h && y.focus_h ? ((y.focus_h.ts || 0) >= (x.focus_h.ts || 0) ? y.focus_h : x.focus_h) : x.focus_h || y.focus_h || null;
        return out;
      }

      // ---- in memory, the service and the browser ----
      function tzWorkData() {
        if (!tzWork.data) tzWork.data = tzWorkMerge(tzWorkLocalRead(), null);
        return tzWork.data;
      }
      function tzWorkLocalRead() {
        try {
          return JSON.parse(localStorage.getItem(TZ_WORK_LOCAL_KEY) || "null");
        } catch (e) {
          return null;
        }
      }
      function tzWorkLocalWrite(d) {
        try {
          localStorage.setItem(TZ_WORK_LOCAL_KEY, JSON.stringify(d));
        } catch (e) {
          /* no critico */
        }
      }
      function tzWorkAdopt(stored) {
        tzWork.data = tzWorkMerge(tzWorkData(), stored);
        tzWork.loaded = true;
      }

      // ---- what the service validates (WorkshopService dsf/work_state.py): the document is cleaned before it is sent ----
      var TZ_WORK_MAX_ZONES = 32;
      var TZ_WORK_MAX_TS = 4e12;
      function tzWorkOkNum(v, lo, hi) {
        return typeof v === "number" && isFinite(v) && v >= lo && v <= hi;
      }
      // pure: a copy with only what workstate.set accepts (zone keys 1..999, known keys, numbers in range, ts never 0); the rest is dropped
      function tzWorkClean(d) {
        var x = tzWorkNorm(d), out = tzWorkEmpty();
        Object.keys(x.zones).forEach(function (k) {
          if (!/^[0-9]{1,3}$/.test(k) || Number(k) < 1 || Object.keys(out.zones).length >= TZ_WORK_MAX_ZONES) return;
          var z = x.zones[k], c = { prepare: {}, applied: null };
          ["measure", "border"].forEach(function (kind) {
            var t = z.prepare[kind];
            if (tzWorkOkNum(t, -TZ_WORK_MAX_TS, TZ_WORK_MAX_TS) && t !== 0) c.prepare[kind] = t;
          });
          var ap = z.applied;
          if (ap && tzWorkOkNum(ap.ts, 1, TZ_WORK_MAX_TS) && (ap.z === null || ap.z === undefined || tzWorkOkNum(ap.z, -10000, 10000))) {
            c.applied = { z: ap.z === undefined ? null : ap.z, ts: ap.ts };
          }
          out.zones[String(Number(k))] = c;
        });
        var f = x.focus_h;
        if (f && tzWorkOkNum(f.h, 0, 1000) && tzWorkOkNum(f.ts, 1, TZ_WORK_MAX_TS)) {
          out.focus_h = { h: f.h, base: tzWorkOkNum(f.base, -10000, 10000) ? f.base : 0, ts: f.ts };
        }
        return out;
      }
      function tzWorkApi() {
        return typeof workshopApi === "function" ? workshopApi : null;
      }
      // Reads the state, in this order: workstate.get of the service; the `focus` settings file if the service refuses;
      // the browser alone if neither answers. Merges it with what this screen has. Never rejects.
      function tzWorkLoad() {
        var api = tzWorkApi();
        if (!api) return tzWorkLoadSettings();
        return api("workstate.get", {}).then(function (r) {
          tzWorkAdopt(r && r.state);
          tzWork.shared = true;
          return true;
        }, function () {
          return tzWorkLoadSettings();
        });
      }
      function tzWorkLoadSettings() {
        if (typeof workshopSettings === "undefined") return Promise.resolve(false);
        return workshopSettings.load(TZ_WORK_FILE).then(function (r) {
          tzWorkAdopt(r && r.value && typeof r.value === "object" ? r.value[TZ_WORK_KEY] : null);
          tzWork.shared = true;
          return true;
        }, function () {
          tzWork.shared = false;
          return false;
        });
      }

      // Asks to save: the writes of the next moments go out together
      function tzWorkSave() {
        tzWorkLocalWrite(tzWorkData()); // the browser keeps it too until the service has it (removed when it does)
        if (!tzWorkApi() && typeof workshopSettings === "undefined") return;
        if (tzWork.saving) { tzWork.again = true; return; }
        clearTimeout(tzWork.timer);
        tzWork.timer = setTimeout(tzWorkFlush, TZ_WORK_SAVE_DELAY_MS);
      }
      function tzWorkSaved(state) {
        tzWorkAdopt(state);
        tzWork.shared = true;
        tzWork.dirty = false;
        try { localStorage.removeItem(TZ_WORK_LOCAL_KEY); } catch (e) { /* no critico */ }
      }
      function tzWorkKept() {
        tzWork.shared = false; // the service refused (role): it stays in this browser
        tzWork.dirty = true; // tried again on the next reload of the page
        tzWorkLocalWrite(tzWorkData());
      }
      // workstate.set (operator or higher); on a refusal falls back to the settings file, then to the browser
      function tzWorkFlush() {
        tzWork.saving = true;
        var api = tzWorkApi();
        var first = api
          ? api("workstate.set", { state: tzWorkClean(tzWorkData()) }).then(function (r) {
            tzWorkSaved(r && r.state);
          }, function (e) {
            if (e && e.code === "conflict") { tzWorkKept(); return; } // the service was busy: the copy waits for the next try
            return tzWorkFlushSettings();
          })
          : tzWorkFlushSettings();
        first.then(function () {
          tzWork.saving = false;
          if (tzWork.again) { tzWork.again = false; tzWorkSave(); }
        });
      }
      function tzWorkFlushSettings() {
        if (typeof workshopSettings === "undefined") { tzWorkKept(); return Promise.resolve(); }
        var mine = tzWorkData();
        return workshopSettings.save(TZ_WORK_FILE, function (cfg) {
          if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) cfg = {};
          cfg[TZ_WORK_KEY] = tzWorkMerge(cfg[TZ_WORK_KEY], mine); // the other keys of the file stay as they are
          return cfg;
        }).then(function (r) {
          tzWorkSaved(r.value && r.value[TZ_WORK_KEY]);
        }, tzWorkKept);
      }

      // Called by the page when it is mounted: reads the state and rereads it from time to time (another screen may have changed it)
      function tzWorkStart(pz) {
        tzWorkLoad().then(function () { if (pz.shell.alive()) pz.nav.module("prepare").render(); });
        pz.timers.push(setInterval(function () { if (pz.shell.alive() && !tzWork.saving) tzWorkLoad().then(function () { if (tzWork.dirty) tzWorkSave(); }); }, TZ_WORK_RELOAD_MS));
      }

      // ---- what the rest of the Workbench calls ----
      function tzWorkPrepareMark(wn, kind, on) {
        tzWorkSetPrepare(tzWorkData(), wn, kind, on !== false, Date.now());
        tzWorkSave();
      }
      function tzWorkFlags() {
        return tzWorkPrepareFlags(tzWorkData(), Date.now());
      }
