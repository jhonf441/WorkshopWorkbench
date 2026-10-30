      // ---- Live job: the list of the interrupted jobs (2026-10-22; its own tab since 2026-10-24, 52-livejob-tool.js) ----
      // One row per interrupted job: its name, when, where it stopped, why it cannot be resumed now (written, one line each) and the buttons.
      // The assistant of the resume (52-livejob-assistant.js) opens under the row. The path done is drawn on the map while the row is selected
      // (52-livejob-draw.js).
      TZ_CSS_EXTRA.push([
        ".tz-lj{margin-top:8px;}",
        ".tz-lj-row{padding:8px;border-radius:6px;background:rgba(255,255,255,0.05);margin-top:6px;}",
        ".tz-lj-name{font-weight:600;}",
        ".tz-lj-why{color:#ffab91;margin:2px 0;font-size:12px;}",
        ".theme--light .tz-lj-row{background:rgba(0,0,0,0.04);}",
        ".theme--light .tz-lj-why{color:#bf360c;}",
        "@media (pointer:coarse),(hover:none){.tz-lj .tz-btn{min-height:44px;}}",
      ].join("\n"));

      function tzLjRecordTitle(rec) {
        var h = tzEl("div", "tz-row");
        h.style.cssText = "align-items:center;gap:8px;flex-wrap:wrap;";
        h.appendChild(tzEl("span", "tz-lj-name", workshopDefaultName(rec.name, ["svc.live_job_default_name"]) || i18nT('livejob.default_name')));
        h.appendChild(tzEl("span", "tz-muted", i18nT('livejob.stopped_at', { time: tzLjClock(rec.stopped) })));
        if (rec.armed) h.appendChild(tzEl("span", "wf-state tz-badge ok", i18nT('livejob.armed_badge')));
        return h;
      }

      function tzLjRecordWhere(rec) {
        var w = tzLjWhere(rec);
        return tzEl("div", "tz-note", i18nT('livejob.where', { line: w.line, x: w.x, y: w.y, mm: w.mm }));
      }

      // Why it cannot be resumed now: one written line per reason (and the role, when that is the reason)
      function tzLjRecordWhy(rec, box) {
        var rows = tzLjBlockerRows(rec);
        if (!tzLjCan("livejob.resume.arm")) rows.push({ key: "blocker_role", params: {} });
        if (!rows.length || rec.armed) return false;
        box.appendChild(tzEl("div", "tz-muted", i18nT('livejob.blockers_title')));
        rows.forEach(function (r) { box.appendChild(tzEl("div", "tz-lj-why", "• " + i18nT('livejob.' + r.key, r.params))); });
        return true;
      }

      function tzLjToggleAsst(s, rec) {
        s.asst = s.asst && s.asst.id === rec.id ? null : { id: rec.id, overlap: 0 };
        tzLjChanged();
      }

      function tzLjToggleSelected(s, rec) {
        s.selected = s.selected === rec.id ? "" : rec.id;
        if (s.selected) tzLjLoadDetail(rec.id);
        tzLjChanged();
      }

      // "Start again" and "Discard" both delete the record (tap twice); the first one also says what to do next
      function tzLjDiscardButton(s, rec, restart) {
        var label = restart ? i18nT('livejob.btn_restart') : i18nT('livejob.btn_discard');
        var tip = restart ? i18nT('livejob.tap_again_restart') : i18nT('livejob.tap_again_discard');
        var b = tzBtn(label, null, function () {
          tzLjAct("discard:" + rec.id, "livejob.interrupted.discard", { id: rec.id }).then(function () {
            if (restart && s.msgOk) { s.msg = i18nT('livejob.restart_done'); tzLjMsgExpire(); tzLjChanged(); }
          });
        }, tip, "lj-discard-" + rec.id + (restart ? "-r" : ""));
        tzTip(b, restart ? i18nT('livejob.restart_tip') : i18nT('livejob.discard_tip'));
        if (s.busy) b.disabled = true;
        return b;
      }

      function tzLjRecordButtons(s, rec) {
        var row = tzEl("div", "tz-row tz-actions");
        var armed = !!rec.armed;
        var open = !!(s.asst && s.asst.id === rec.id);
        var rb = tzBtn(armed ? i18nT('livejob.btn_disarm') : open ? i18nT('livejob.btn_close_assistant') : i18nT('livejob.btn_resume'), armed ? null : "primary", function () {
          if (armed) tzLjAct("disarm", "livejob.resume.disarm", {});
          else tzLjToggleAsst(s, rec);
        });
        if (!armed && (!rec.can_resume || !tzLjCan("livejob.resume.arm"))) rb.disabled = true; // the reason is written under the title
        if (s.busy) rb.disabled = true;
        row.appendChild(rb);
        var vb = tzBtn(s.selected === rec.id ? i18nT('livejob.btn_hide_path') : i18nT('livejob.btn_view_path'), null, function () { tzLjToggleSelected(s, rec); });
        tzTip(vb, i18nT('livejob.view_path_tip'));
        row.appendChild(vb);
        if (tzLjCan("livejob.interrupted.hide")) {
          // not a delete: the record stays in this list, only the work table stops showing it (and it is not shown by itself again)
          var hb = tzBtn(rec.hidden ? i18nT('livejob.btn_put_back') : i18nT('livejob.btn_take_off'), null, function () {
            if (!rec.hidden && s.selected === rec.id) s.selected = "";
            tzLjAct("hide:" + rec.id, "livejob.interrupted.hide", { id: rec.id, hidden: !rec.hidden });
          });
          tzTip(hb, rec.hidden ? i18nT('livejob.put_back_tip') : i18nT('livejob.take_off_tip'));
          if (s.busy) hb.disabled = true;
          row.appendChild(hb);
        }
        if (tzLjCan("livejob.interrupted.discard")) {
          row.appendChild(tzLjDiscardButton(s, rec, true));
          row.appendChild(tzLjDiscardButton(s, rec, false));
        }
        return row;
      }

      function tzLjRecordRow(s, rec) {
        var box = tzEl("div", "tz-lj-row");
        box.setAttribute("data-lj-id", rec.id);
        box.appendChild(tzLjRecordTitle(rec));
        if (rec.hidden) box.appendChild(tzEl("div", "tz-muted", i18nT('livejob.off_the_table')));
        box.appendChild(tzLjRecordWhere(rec));
        tzLjRecordWhy(rec, box);
        box.appendChild(tzLjRecordButtons(s, rec));
        if ((s.asst && s.asst.id === rec.id) || rec.armed) tzLjRenderAssistant(box, s, rec);
        return box;
      }

      // The list of the "Interrupted jobs" tab (52-livejob-tool.js mounts the tab, reads the list and redraws on every change). For a role
      // that can read the list it is always there, so the person knows where interrupted jobs go: with none, it says so.
      function tzLjRenderCard(card) {
        var s = tzLj();
        if (!tzLjCan("livejob.interrupted.list")) return;
        var box = tzEl("div", "tz-lj");
        box.setAttribute("data-lj", "card");
        if (!s.loaded) {
          box.appendChild(tzEl("div", "tz-muted", i18nT('common.loading')));
          return card.appendChild(box);
        }
        if (!s.available) {
          box.appendChild(tzEl("div", "tz-muted", i18nT('livejob.stop_unavailable', { reason: s.reason })));
          return card.appendChild(box);
        }
        if (s.err) box.appendChild(tzEl("div", "tz-msg err", s.err));
        if (s.msg) box.appendChild(tzEl("div", "tz-msg " + (s.msgOk ? "ok" : "err"), s.msg));
        if (!s.records.length) box.appendChild(tzEl("div", "tz-muted", i18nT('livejob.card_empty')));
        s.records.forEach(function (rec) { box.appendChild(tzLjRecordRow(s, rec)); });
        card.appendChild(box);
      }
