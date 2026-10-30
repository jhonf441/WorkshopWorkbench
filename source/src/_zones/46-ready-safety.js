      // ---- Manual safety checklist of a job, by mode (F3-W, 2026-10-21; CNC list 2026-10-30) ----
      // Before a laser cut the person ticks: glasses on, lid closed, extraction on, nobody inside the area. Before a CNC job: spindle
      // free and tool tight, workpiece clamped, extraction / ventilation on, nobody inside the area, Z zero set on the material. The
      // ticks are shared by every place that starts a job of that mode (the cut of the editor, the cut in parts, the "Ready to cut" card,
      // the CNC toolpaths card): they hold for a few minutes and are used up by the start (the next job asks again). The ticks of one
      // mode never count for the other (a tick in a new mode clears the previous ones). The start writes a safety_check event in the
      // Activity history with the user, the zone and the points confirmed (activity.log), so there is a record of who confirmed what:
      // the CNC ids carry a cnc_ prefix so the record says which list it was.
      // A point that the machine covers with a hardware interlock (lid, extraction) is not asked: the machine profile declares it with the
      // capabilities `lid_interlock` / `extraction_interlock` (workshopProfile.has). The service does not report them yet, so today the
      // lists are always complete; when it does, the points disappear by themselves.
      var TZ_SAFETY_TTL_MS = 15 * 60 * 1000;
      var TZ_SAFETY_ITEMS = {
        Laser: [
          { id: "glasses", key: "ready.safety_glasses", hw: "" },
          { id: "lid", key: "ready.safety_lid", hw: "lid_interlock" },
          { id: "extraction", key: "ready.safety_extraction", hw: "extraction_interlock" },
          { id: "clear", key: "ready.safety_clear", hw: "" },
        ],
        CNC: [
          { id: "cnc_spindle_tool", key: "ready.safety_cnc_spindle_tool", hw: "" },
          { id: "cnc_workpiece", key: "ready.safety_cnc_workpiece", hw: "" },
          { id: "cnc_extraction", key: "ready.safety_cnc_extraction", hw: "extraction_interlock" },
          { id: "cnc_clear", key: "ready.safety_clear", hw: "" },
          { id: "cnc_z_zero", key: "ready.safety_cnc_z_zero", hw: "" },
        ],
      };
      // the note shown under the list when an interlock of the profile replaces a point
      var TZ_SAFETY_HW_NOTE = { lid_interlock: "ready.safety_lid_hw", extraction_interlock: "ready.safety_extraction_hw" };
      var tzSafety = { mode: "", checked: {}, at: 0 };

      // pure: the points of `mode` ("Laser" | "CNC") that must be ticked; hw = { lid_interlock: bool, extraction_interlock: bool }
      function tzSafetyItems(hw, mode) {
        return (TZ_SAFETY_ITEMS[mode] || []).filter(function (it) { return !(it.hw && hw && hw[it.hw]); });
      }
      // pure: are all the points ticked, and recently? (a mode without points is never complete)
      function tzSafetyComplete(items, checked, at, now) {
        if (!items.length || !(now - at < TZ_SAFETY_TTL_MS)) return false;
        return items.every(function (it) { return !!(checked && checked[it.id]); });
      }
      // what the machine profile declares as hardware interlocks
      function tzSafetyHw() {
        var has = typeof workshopProfile !== "undefined" && workshopProfile && typeof workshopProfile.has === "function";
        return { lid_interlock: has ? !!workshopProfile.has("lid_interlock", false) : false, extraction_interlock: has ? !!workshopProfile.has("extraction_interlock", false) : false };
      }
      function tzSafetyDone(mode) {
        return tzSafety.mode === mode && tzSafetyComplete(tzSafetyItems(tzSafetyHw(), mode), tzSafety.checked, tzSafety.at, Date.now());
      }
      function tzSafetyReset() {
        tzSafety.mode = "";
        tzSafety.checked = {};
        tzSafety.at = 0;
      }
      // a tick of `mode`: the ticks of another mode are dropped first
      function tzSafetyTick(mode, id, on) {
        if (tzSafety.mode !== mode) { tzSafety.mode = mode; tzSafety.checked = {}; }
        tzSafety.checked[id] = !!on;
        tzSafety.at = Date.now();
      }
      // for the render keys of whoever shows the list (changes when a point is ticked or the ticks are used up)
      function tzSafetyKey() {
        return [tzSafety.mode, Object.keys(tzSafety.checked).filter(function (k) { return tzSafety.checked[k]; }).join(","), tzSafety.at, tzSafetyHw()];
      }

      // the list of points of `mode` inside `parent`; onChange() after a tick (the caller redraws what depends on it)
      function tzSafetyRender(parent, onChange, mode) {
        var box = tzEl("div", "tz-safety");
        box.style.cssText = "margin-top:6px;";
        box.appendChild(tzEl("div", "tz-muted", i18nT('ready.safety_title')));
        var hw = tzSafetyHw();
        tzSafetyItems(hw, mode).forEach(function (it) {
          var lb = tzEl("label");
          lb.style.cssText = "display:flex;gap:6px;align-items:center;margin-top:3px;font-size:13px;";
          var cb = tzEl("input");
          cb.type = "checkbox";
          cb.checked = tzSafety.mode === mode && !!tzSafety.checked[it.id] && tzSafety.at > 0;
          cb.addEventListener("change", function () {
            tzSafetyTick(mode, it.id, cb.checked);
            if (onChange) onChange();
          });
          lb.appendChild(cb);
          lb.appendChild(tzEl("span", null, i18nT(it.key)));
          box.appendChild(lb);
        });
        (TZ_SAFETY_ITEMS[mode] || []).forEach(function (it) {
          if (it.hw && hw[it.hw]) box.appendChild(tzEl("div", "tz-muted", i18nT(TZ_SAFETY_HW_NOTE[it.hw])));
        });
        parent.appendChild(box);
        return box;
      }

      // Writes the event of the confirmation in the Activity history as a `safety_check` (F3-X): the service makes the sentence from the user
      // (the caller), the zone and the points. It is NOT written as `job_start`: Activity counts a job started per job_start event and
      // the service already writes one for each real job (job_poller), so a second one would count the job twice. Never rejects: the
      // answer is true when it was written. An old service refuses the type: the answer is false and the job is not blocked.
      function tzSafetyRecord(info, ids) {
        var args = { type: "safety_check", zone: String((info && info.zone) || ""), points: ids.length ? ids : ["hardware"] };
        return workshopApi("activity.log", args).then(function () { return true; }, function () { return false; });
      }

      // Called when a job is about to start: rejects (Error with a text for the person) while the list of its mode is not complete;
      // otherwise it uses the ticks up, writes the record and resolves. info = { mode ("Laser" | "CNC"), zone, what } (what is being started).
      function tzSafetyGate(info) {
        var mode = info && info.mode;
        var items = tzSafetyItems(tzSafetyHw(), mode);
        if (!tzSafetyDone(mode)) return Promise.reject(new Error(i18nT(mode === "CNC" ? 'ready.safety_needed_cnc' : 'ready.safety_needed')));
        var ids = items.map(function (it) { return it.id; });
        tzSafetyReset();
        return tzSafetyRecord(info, ids);
      }
