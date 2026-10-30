      // ---- Manual safety checklist of the laser (F3-W, 2026-10-21) ----
      // Before a laser cut the person ticks: glasses on, lid closed, extraction on, nobody inside the area. The ticks are shared by every
      // place that starts a laser job (the cut of the editor, the cut in parts, the "Ready to cut" card): they hold for a few minutes and
      // are used up by the start (the next cut asks again). The start writes a safety_check event in the Activity history with the user, the zone and the points
      // confirmed (activity.log), so there is a record of who confirmed what.
      // A point that the machine covers with a hardware interlock (lid, extraction) is not asked: the machine profile declares it with the
      // capabilities `lid_interlock` / `extraction_interlock` (workshopProfile.has). The service does not report them yet, so today the
      // list is always complete; when it does, the points disappear by themselves.
      var TZ_SAFETY_TTL_MS = 15 * 60 * 1000;
      var TZ_SAFETY_ITEMS = [
        { id: "glasses", key: "ready.safety_glasses", hw: "" },
        { id: "lid", key: "ready.safety_lid", hw: "lid_interlock" },
        { id: "extraction", key: "ready.safety_extraction", hw: "extraction_interlock" },
        { id: "clear", key: "ready.safety_clear", hw: "" },
      ];
      var tzSafety = { checked: {}, at: 0 };

      // pure: the points that must be ticked; hw = { lid_interlock: bool, extraction_interlock: bool }
      function tzSafetyItems(hw) {
        return TZ_SAFETY_ITEMS.filter(function (it) { return !(it.hw && hw && hw[it.hw]); });
      }
      // pure: are all the points ticked, and recently?
      function tzSafetyComplete(items, checked, at, now) {
        if (!(now - at < TZ_SAFETY_TTL_MS)) return false;
        return items.every(function (it) { return !!(checked && checked[it.id]); });
      }
      // what the machine profile declares as hardware interlocks
      function tzSafetyHw() {
        var has = typeof workshopProfile !== "undefined" && workshopProfile && typeof workshopProfile.has === "function";
        return { lid_interlock: has ? !!workshopProfile.has("lid_interlock", false) : false, extraction_interlock: has ? !!workshopProfile.has("extraction_interlock", false) : false };
      }
      function tzSafetyDone() {
        return tzSafetyComplete(tzSafetyItems(tzSafetyHw()), tzSafety.checked, tzSafety.at, Date.now());
      }
      function tzSafetyReset() {
        tzSafety.checked = {};
        tzSafety.at = 0;
      }
      // for the render keys of whoever shows the list (changes when a point is ticked or the ticks are used up)
      function tzSafetyKey() {
        return [Object.keys(tzSafety.checked).filter(function (k) { return tzSafety.checked[k]; }).join(","), tzSafety.at, tzSafetyHw()];
      }

      // the list of points inside `parent`; onChange() after a tick (the caller redraws what depends on it)
      function tzSafetyRender(parent, onChange) {
        var box = tzEl("div", "tz-safety");
        box.style.cssText = "margin-top:6px;";
        box.appendChild(tzEl("div", "tz-muted", i18nT('ready.safety_title')));
        var hw = tzSafetyHw();
        tzSafetyItems(hw).forEach(function (it) {
          var lb = tzEl("label");
          lb.style.cssText = "display:flex;gap:6px;align-items:center;margin-top:3px;font-size:13px;";
          var cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = !!tzSafety.checked[it.id] && tzSafety.at > 0;
          cb.addEventListener("change", function () {
            tzSafety.checked[it.id] = cb.checked;
            tzSafety.at = Date.now();
            if (onChange) onChange();
          });
          lb.appendChild(cb);
          lb.appendChild(document.createTextNode(i18nT(it.key)));
          box.appendChild(lb);
        });
        if (hw.lid_interlock) box.appendChild(tzEl("div", "tz-muted", i18nT('ready.safety_lid_hw')));
        if (hw.extraction_interlock) box.appendChild(tzEl("div", "tz-muted", i18nT('ready.safety_extraction_hw')));
        parent.appendChild(box);
        return box;
      }

      // Writes the event of the confirmation in the Activity history as a `safety_check` (F3-X): the service makes the sentence from the user
      // (the caller), the zone and the points. It is NOT written as `job_start`: Activity counts a job started per job_start event and
      // the service already writes one for each real job (job_poller), so a second one would count the job twice. Never rejects: the
      // answer is true when it was written. An old service refuses the type: the answer is false and the cut is not blocked.
      function tzSafetyRecord(info, ids) {
        var args = { type: "safety_check", zone: String((info && info.zone) || ""), points: ids.length ? ids : ["hardware"] };
        return workshopApi("activity.log", args).then(function () { return true; }, function () { return false; });
      }

      // Called when a laser job is about to start: rejects (Error with a text for the person) while the list is not complete; otherwise it
      // uses the ticks up, writes the record and resolves. info = { zone, what } (what is being started).
      function tzSafetyGate(info) {
        var items = tzSafetyItems(tzSafetyHw());
        if (!tzSafetyComplete(items, tzSafety.checked, tzSafety.at, Date.now())) return Promise.reject(new Error(i18nT('ready.safety_needed')));
        var ids = items.map(function (it) { return it.id; });
        tzSafetyReset();
        return tzSafetyRecord(info, ids);
      }
