      // ---- Live job: the assistant to resume an interrupted job (2026-10-22) ----
      // Four steps, one after the other, in the order they can be done (the bridge needs the resume ARMED before the program sends the job again):
      //   1 where it goes on (the approach point) and the overlap, 2 arm (the service asks the confirmation of level 3), 3 send the same job again
      //   from the program, 4 the bridge verifies it line by line and goes to the point. A step is done / now / waiting; a mismatch says it plainly.
      TZ_CSS_EXTRA.push([
        ".tz-lj-asst{margin-top:8px;padding:8px;border-left:3px solid #42a5f5;background:rgba(66,165,245,0.08);border-radius:0 6px 6px 0;}",
        ".tz-lj-step{display:flex;gap:8px;align-items:flex-start;margin:6px 0;}",
        ".tz-lj-n{flex:none;width:22px;height:22px;border-radius:50%;background:#455a64;color:#fff;font-size:12px;line-height:22px;text-align:center;}",
        ".tz-lj-step.now .tz-lj-n{background:#1976d2;}",
        ".tz-lj-step.done .tz-lj-n{background:#2e7d32;}",
        ".tz-lj-step.bad .tz-lj-n{background:#c62828;}",
        ".tz-lj-step.todo{opacity:.7;}",
        ".tz-lj-sb{flex:1 1 auto;min-width:0;}",
        ".tz-lj-st{font-weight:600;}",
      ].join("\n"));

      // Which step is the one in front, and how each one is: [{state: done|now|todo|bad}] (pure; stage = tzLjStage)
      function tzLjSteps(stage) {
        var id = stage.id;
        if (id === "idle") return ["now", "now", "todo", "todo"]; // the overlap and the arming are chosen together
        if (id === "waiting") return ["done", "done", "now", "todo"];
        if (id === "verifying") return ["done", "done", "done", "now"];
        if (id === "approach") return ["done", "done", "done", "now"];
        if (id === "done") return ["done", "done", "done", "done"];
        return ["done", "done", "done", "bad"]; // mismatch
      }

      function tzLjStepBox(parent, n, state, title) {
        var row = tzEl("div", "tz-lj-step " + state);
        row.setAttribute("data-lj-step", String(n));
        row.appendChild(tzEl("span", "tz-lj-n", String(n)));
        var body = tzEl("div", "tz-lj-sb");
        body.appendChild(tzEl("div", "tz-lj-st", title));
        row.appendChild(body);
        parent.appendChild(row);
        return body;
      }

      function tzLjOverlapRow(body, s, rec, locked) {
        body.appendChild(tzEl("div", "tz-muted", i18nT('livejob.overlap_label')));
        var row = tzEl("div", "tz-row tz-actions");
        var cur = (s.asst && s.asst.overlap) || 0;
        TZ_LJ_OVERLAPS.forEach(function (n) {
          var b = tzBtn(n ? i18nT('livejob.overlap_n', { n: n }) : i18nT('livejob.overlap_0'), cur === n ? "primary" : null, function () {
            s.asst = { id: rec.id, overlap: n };
            tzLjChanged();
          });
          if (locked) b.disabled = true;
          row.appendChild(b);
        });
        body.appendChild(row);
      }

      function tzLjStep1(parent, s, rec, st) {
        var w = tzLjWhere(rec);
        var b = tzLjStepBox(parent, 1, st, i18nT('livejob.step1_title'));
        b.appendChild(tzEl("div", "tz-note", i18nT('livejob.step1_text', { x: w.x, y: w.y, line: w.line })));
        tzLjOverlapRow(b, s, rec, st !== "now");
      }

      function tzLjStep2(parent, s, rec, st) {
        var b = tzLjStepBox(parent, 2, st, i18nT('livejob.step2_title'));
        if (rec.armed) {
          var left = Math.ceil(tzLjArmLeft(rec, Date.now() / 1000) / 60);
          b.appendChild(tzEl("div", "tz-note", i18nT('livejob.armed_left', { min: left })));
          return;
        }
        b.appendChild(tzEl("div", "tz-note", i18nT('livejob.step2_text')));
        var row = tzEl("div", "tz-row tz-actions");
        var ab = tzBtn(s.busy === "arm" ? i18nT('livejob.arming') : i18nT('livejob.arm_btn'), "primary", function () {
          tzLjAct("arm", "livejob.resume.arm", { id: rec.id, overlap_lines: (s.asst && s.asst.overlap) || 0 });
        });
        if (st === "todo" || s.busy || !rec.can_resume) ab.disabled = true;
        row.appendChild(ab);
        b.appendChild(row);
      }

      function tzLjStep3(parent, rec, stage, st) {
        var b = tzLjStepBox(parent, 3, st, i18nT('livejob.step3_title'));
        var key = stage.id === "idle" ? "step3_idle" : stage.id === "waiting" ? "step3_wait" : "step3_got";
        b.appendChild(tzEl("div", "tz-note", i18nT('livejob.' + key)));
      }

      function tzLjStep4(parent, stage, st) {
        var b = tzLjStepBox(parent, 4, st, i18nT('livejob.step4_title'));
        var text = {
          idle: i18nT('livejob.step4_idle'), waiting: i18nT('livejob.step4_idle'),
          verifying: i18nT('livejob.step4_verifying', { done: stage.swallowed, total: stage.of }),
          approach: i18nT('livejob.step4_approach'), done: i18nT('livejob.step4_done'),
          mismatch: i18nT('livejob.step4_mismatch', { reason: stage.reason }),
        }[stage.id];
        b.appendChild(tzEl("div", stage.id === "mismatch" ? "tz-msg err" : "tz-note", text));
      }

      function tzLjRenderAssistant(box, s, rec) {
        var stage = tzLjStage(rec, s.resume);
        var st = tzLjSteps(stage);
        var a = tzEl("div", "tz-lj-asst");
        a.setAttribute("data-lj", "assistant");
        a.appendChild(tzEl("div", "tz-lj-st", i18nT('livejob.asst_title')));
        tzLjStep1(a, s, rec, st[0]);
        tzLjStep2(a, s, rec, st[1]);
        tzLjStep3(a, rec, stage, st[2]);
        tzLjStep4(a, stage, st[3]);
        box.appendChild(a);
      }
