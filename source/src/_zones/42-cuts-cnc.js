      // ---- The editor in CNC mode (single editor, stage 6): BEHIND A FLAG THAT IS OFF ----
      //
      // With the flag off (the default) NOTHING in this file runs and the laser editor is exactly as it was (tests/cut-job-golden.test.js, trace-modules).
      // With the flag on AND the machine in CNC, the editor of the laser takes the spindle: the layers show their CNC process (depth, side, operation,
      // 40-cuts-process.js), the Cut card is the CNC one below, and the job is the one of the CNC engine (51-cnc-pure.js): tcProcToCnc -> tzCncPlan ->
      // tzCncValidate -> tzCncGcode, started by tzStartArmed("CNC") behind the safety list of the CNC. Two steps (decision of the owner): REVIEW (the whole
      // plan is checked and shown) and then CUT (safety list + double tap). The flag is a browser setting: localStorage workshopCncEditor = "1".
      // Technician only (the CNC is not an operator's, as today): the buttons carry tzTechOnly.
      // Not done yet: frame (spindle off, at safe height) and the tool library (the tool of the editor is the small form of the card).

      var TC_CNC_FLAG_KEY = "workshopCncEditor";
      var TC_CNC_JOB_FILE = "0:/sys/workshop/gcodes/cnc-editor.gcode";

      function tcCncFlag() {
        try { return localStorage.getItem(TC_CNC_FLAG_KEY) === "1"; } catch (e) { return false; }
      }

      // the editor works as the CNC editor: flag on and the machine in CNC
      function tcCncOn(tc) {
        var st = tc.ctx.machine.getSt();
        return tcCncFlag() && !!st && st.mode === "CNC";
      }

      function tcCncMaterial(tc) {
        var st = tc.ctx.machine.getSt();
        return st ? tmatById(tc.ctx.data.material(st.wn)) : null;
      }

      // The job of the drawing: { skipped: [{id, c}], plan, v, key, estimate, text }. `withDate` puts the date in the header of the G-code (the key does not).
      function tcCncBuild(tc, withDate) {
        var conv = tcProcToCnc(tc.data.layers, tc.data.shapes, tc.data.trim);
        var opts = { units: "mm", direction: tc.data.cncDirection === "cw" ? "cw" : "ccw", name: "Editor de corte", date: "" };
        var plan = tzCncPlan(conv.shapes, tcCncMaterial(tc), tc.data.cncTool || {}, opts);
        var clamps = tc.ctx.data.clampsFile ? tc.ctx.data.clampsFile() || [] : [];
        var v = tzCncValidate(plan, tc.ctx.cut.area() || tc.ctx.cut.limits(), tzCncTrayZ({ ctx: tc.ctx }), clamps);
        var out = { skipped: conv.skipped, plan: plan, v: v, key: JSON.stringify(plan), estimate: plan.ok ? tzCncEstimate(plan) : null, text: "" };
        if (plan.ok && v.ok) out.text = tzCncGcode(withDate ? tzCncPlan(conv.shapes, tcCncMaterial(tc), tc.data.cncTool || {}, Object.assign({}, opts, { date: tzLocalTime() })) : plan);
        return out;
      }

      // Why the cut is locked ("" = it can go), the most final reason first; the same words as the CNC card (51-cnc-toolpaths-save-draft.js)
      function tcCncStartBlock(tc, b) {
        var s = tc.ctx.machine.getSt();
        if (!s || s.mode !== "CNC") return i18nT('cnc.mode_is_not_cnc');
        if (!tc.ctx.machine.free()) return i18nT('zoneActive.' + tzNotFreeWhy(s.status));
        if (!b.plan.ok || !b.v.ok) return i18nT('cnc.fix_errors_first');
        if (!tc.cnc || tc.cnc.key !== b.key) return i18nT('cuts.cnc_not_reviewed');
        if (!tzCncTrayZ({ ctx: tc.ctx }).z0) return i18nT('cnc.z0_not_set');
        if (!tzSafetyDone("CNC")) return i18nT('ready.safety_needed_cnc');
        return "";
      }

      // The cut: the safety list is used up and recorded in the Activity history, the guard is armed and only then the file starts
      function tcCncStart(tc) {
        var b = tcCncBuild(tc, true);
        var why = tcCncStartBlock(tc, b);
        if (why) return tcSetMsg(tc, why, false);
        tzSafetyGate({ mode: "CNC", zone: tcCutGuardInput(tc).zoneName, what: "cnc" })
          .then(function () { return tzStartArmed("CNC", TC_CNC_JOB_FILE, b.text); }) // the text starts with cncguard.g: tzStartArmed checks it is a CNC one
          .then(function () { tcSetMsg(tc, i18nT('cnc.started', { path: TC_CNC_JOB_FILE }), true); })
          .catch(function (e) { tcSetMsg(tc, i18nT('cnc.not_started', { err: e && e.message ? e.message : e }), false); });
      }

      // ---- the tool of the editor (a small form; the library of tools comes later) ----
      var TC_CNC_TOOL_FIELDS = [["diameter", "cuts.cnc_f_diameter"], ["feed", "cuts.cnc_f_feed"], ["feedPen", "cuts.cnc_f_feed_pen"], ["rpm", "cuts.cnc_f_rpm"], ["profPass", "cuts.cnc_f_step"], ["altSafe", "cuts.cnc_f_alt_safe"]];

      function tcCncToolForm(tc, parent) {
        var tool = tc.data.cncTool || {};
        var row = tzEl("div");
        row.style.cssText = "display:flex;flex-wrap:wrap;align-items:flex-end;margin-top:6px;";
        TC_CNC_TOOL_FIELDS.forEach(function (f) {
          var inp = tzCncTrayNum(null, tool[f[0]], function (x) {
            tc.data.cncTool = Object.assign({}, tc.data.cncTool || {});
            if (x === null) delete tc.data.cncTool[f[0]]; else tc.data.cncTool[f[0]] = x;
            tcSave(tc, true);
            tc.cnc = null;
            tcGo(tc);
          });
          row.appendChild(tzCncTrayField(null, i18nT(f[1]), inp));
        });
        parent.appendChild(tzTechOnly(row));
      }

      // ---- the card ----
      function tcCncIssues(tc, parent, b) {
        b.plan.errors.concat(b.v.errors).forEach(function (e) { parent.appendChild(tzEl("div", "tz-msg err", tzCncTrayText(null, Object.assign({ err: true }, e), e))); });
        b.plan.notices.concat(b.v.notices).forEach(function (e) { parent.appendChild(tzEl("div", "tz-muted", tzCncTrayText(null, e, e))); });
        if (b.skipped.length) {
          var why = {};
          b.skipped.forEach(function (s) { why[s.c] = (why[s.c] || 0) + 1; });
          parent.appendChild(tzEl("div", "tz-msg err", i18nT('cuts.cnc_skipped', { n: b.skipped.length, list: Object.keys(why).map(function (c) { return why[c] + " " + i18nT('cuts.cnc_skip_' + c); }).join(", ") })));
        }
      }

      function tcCncReview(tc, jb, b) {
        var reviewed = !!tc.cnc && tc.cnc.key === b.key;
        var rv = tzBtn(reviewed ? i18nT('cuts.cnc_review_again') : i18nT('cuts.cnc_review'), reviewed ? null : "primary", function () { tc.cnc = { key: b.key }; tc.lastKey = ""; tcGo(tc); });
        rv.disabled = !(b.plan.ok && b.v.ok);
        jb.appendChild(tzTechOnly(rv));
        if (reviewed && b.estimate) jb.appendChild(tzEl("div", "tz-msg ok", i18nT('cuts.cnc_reviewed', { shapes: b.plan.shapes.length, passes: b.estimate.passes, mm: Math.round(b.estimate.length), min: Math.ceil(b.estimate.minutes) })));
        else jb.appendChild(tzEl("div", "tz-muted", i18nT('cuts.cnc_review_help')));
      }

      function tcCncCutStep(tc, rc, jb, b) {
        var reviewed = !!tc.cnc && tc.cnc.key === b.key;
        if (!reviewed) return;
        var conf = tzEl("div", "tz-card wf-card");
        conf.style.cssText += "margin-top:6px;border-color:#c62828;";
        jb.appendChild(conf);
        conf.appendChild(tzEl("div", "tz-msg err", i18nT('cuts.cnc_cut_warning')));
        tzSafetyRender(conf, function () { tcGo(tc); }, "CNC"); // the manual safety list of the CNC (46-ready-safety.js)
        var go = tzBtn(i18nT('cuts.cnc_cut_btn'), "danger", function () { tcCncStart(tc); }, i18nT('cuts.cnc_cut_confirm'));
        var why = tcCncStartBlock(tc, b);
        go.disabled = !!why;
        conf.appendChild(tzTechOnly(go));
        if (why) conf.appendChild(tzEl("div", "tz-muted", why));
      }

      function tcCardCutCnc(tc, rc) {
        var b = tcCncBuild(tc, false);
        var n = b.plan.errors.length + b.v.errors.length;
        rc.card = tcSection(rc.root, "cut", i18nT('cuts.cnc_cut'), n ? i18nT('cuts.thing_s_to_fix', { n: n }) : i18nT('cuts.ready_to_cut'), true, tzBind(tcGo, tc));
        var jb = tzEl("div");
        rc.card.appendChild(jb);
        tcCncToolForm(tc, jb);
        tcCncIssues(tc, jb, b);
        tcCncReview(tc, jb, b);
        tcCncCutStep(tc, rc, jb, b);
      }

      // ---- the layer rows: depth, side and operation instead of power / speed / passes ----
      function tcLayerCncInputs(tc, ly, L) {
        var p = tcProcRead(L, "CNC");
        function put(patch) { tcProcWrite(L, "CNC", patch); tc.cnc = null; tcSave(tc); tcGo(tc); }
        var d = tzCncTrayNum(null, p.depth, function (x) { put({ depth: x }); }, 56, "mm");
        ly.row.appendChild(d);
        ly.row.appendChild(tzCncTraySelector(null, [["center", i18nT('cnc.side_center')], ["inside", i18nT('cnc.side_inside')], ["outside", i18nT('cnc.side_outside')]], p.side, function (v) { put({ side: v }); }));
        ly.row.appendChild(tzCncTraySelector(null, [["contour", i18nT('cuts.cnc_op_contour')], ["pocket", i18nT('cuts.cnc_op_pocket')]], p.operation, function (v) { put({ operation: v }); }));
      }
