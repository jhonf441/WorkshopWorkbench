      // ---- "Ready to cut" card of the Run section (F3-W, 2026-10-21) ----
      // One look at everything a laser cut needs: mode, homing, machine free, zone, material, focus, cut area, design, the frame and, if
      // the machine profile declares them, the lid and the extraction (a hardware interlock). It reuses what the editor already checks
      // (tcValidate through deps.designErrors, tjNeedsRow for homing / mode / busy). Below it, the manual safety list (46-ready-safety.js):
      // without it ticked the cut does not start.

      // pure: the checks. inp = { st, zoneName (null when the zone has no file), material, focus (record of the zone), area, correction,
      // designErrors: [text], frameDone, hw: { lid_interlock, extraction_interlock }, modeAllowed }.
      // Returns [{ id, state: "ok" | "bad" | "info", text }]; "info" never blocks (the frame is optional, an interlock is the machine's).
      function tzReadyChecks(inp) {
        var st = inp.st || {};
        var ax = st.axes || {};
        var homed = !!(ax.X && ax.X.homed && ax.Y && ax.Y.homed && ax.Z && ax.Z.homed);
        var m = inp.material;
        var out = [];
        function add(id, ok, textOk, textBad, params) {
          out.push({ id: id, state: ok === null ? "info" : ok ? "ok" : "bad", text: i18nT(ok === null || ok ? textOk : textBad, params || {}) });
        }
        add("mode", st.mode === "Laser" && inp.modeAllowed !== false, "ready.mode_ok", inp.modeAllowed === false ? "ready.mode_role" : "ready.mode_bad", { mode: st.mode || "?" });
        add("homing", homed, "ready.homing_ok", "ready.homing_bad");
        add("free", st.status === "idle" && !st.liveJob, "ready.free_ok", "ready.free_bad");
        add("zone", inp.zoneName !== null && inp.zoneName !== undefined, "ready.zone_ok", "ready.zone_bad", { zone: inp.zoneName || "" });
        var matOk = !!m && !(m.mode && m.mode !== "Laser");
        add("material", matOk, "ready.material_ok", "ready.material_bad", { material: m ? tmatLabel(m) : "" });
        if (matOk && tcFocusRequired(m)) add("focus", tzFocusAppliedOk(inp.focus, st), "ready.focus_ok", "ready.focus_bad");
        else add("focus", null, "ready.focus_not_needed", "ready.focus_not_needed");
        add("area", !!inp.area && !!inp.correction, "ready.area_ok", inp.area ? "ready.correction_bad" : "ready.area_bad");
        var errs = inp.designErrors || [];
        add("design", errs.length === 0, "ready.design_ok", "ready.design_bad", { n: errs.length });
        add("frame", inp.frameDone ? true : null, "ready.frame_ok", "ready.frame_optional");
        if (inp.hw && inp.hw.lid_interlock) add("lid", null, "ready.lid_hw", "ready.lid_hw");
        if (inp.hw && inp.hw.extraction_interlock) add("extraction", null, "ready.extraction_hw", "ready.extraction_hw");
        return out;
      }

      // pure: true when nothing blocks the cut (the manual list is separate)
      function tzReadyAllOk(checks) {
        return checks.every(function (c) { return c.state !== "bad"; });
      }

      function tzReadyInput(rd) {
        var ctx = rd.ctx;
        var st = ctx.machine.getSt();
        var zones = ctx.data.zones();
        var z = st && zones ? zones[st.wn] : null;
        return {
          st: st,
          zoneName: st && z ? TZ_CODES[st.wn] + (z.name ? " " + z.name : "") : null,
          material: st && z ? tmatById(ctx.data.material(st.wn)) : null,
          focus: st ? tzFocusAppliedRead(st.wn) : null,
          area: !!ctx.cut.area(),
          correction: !!ctx.cut.correction(),
          designErrors: rd.deps.designErrors(),
          frameDone: !!(st && tzWorkFlags()["border:" + st.wn]),
          hw: tzSafetyHw(),
          modeAllowed: st ? tzModeAllowed(typeof workshopIdentity === "function" ? workshopIdentity() : null, st.mode) : true,
        };
      }

      function tzMountReady(ctx, deps) {
        var rd = { ctx: ctx, deps: deps, lastKey: "", msg: tzMsg(function () { rd.lastKey = ""; tzReadyRender(rd); }) };
        return { render: function () { tzReadyRender(rd); } };
      }

      function tzReadyRender(rd) {
        if (!rd.ctx.visible()) return;
        var st = rd.ctx.machine.getSt();
        if (!st || !st.axes) return;
        var inp = tzReadyInput(rd);
        var checks = tzReadyChecks(inp);
        var key = JSON.stringify([checks, inp.designErrors, tjNeedsKey(st), rd.msg.text, tzSafetyKey(), st.wn, !!rd.ctx.machine.free()]);
        if (key === rd.lastKey) return;
        if (tzEditing(rd.ctx.card)) return tzRedrawOnRelease(rd.ctx.card, function () { tzReadyRender(rd); });
        rd.lastKey = key;
        var card = rd.ctx.card;
        card.innerHTML = "";
        tzReadyHeader(rd, card, checks);
        if (st.mode !== "Laser") {
          card.appendChild(tzEl("div", "tz-muted", i18nT('ready.laser_only')));
        } else {
          tjNeedsRow(card, { st: st, free: rd.ctx.machine.free(), mode: "Laser", focus: false, onMsg: tzBind(tzReadyMsg, rd), after: function () { rd.lastKey = ""; rd.ctx.machine.refresh(); } });
        }
        tzReadyRows(card, checks, inp);
        if (rd.msg.text) card.appendChild(rd.msg.node());
        tzSafetyRender(card, function () { rd.lastKey = ""; tzReadyRender(rd); }, "Laser");
        var go = tzEl("div", "tz-row");
        go.style.cssText += "gap:6px;margin-top:8px;";
        go.appendChild(tzBtn(i18nT('ready.go_job'), "primary", function () { rd.ctx.nav.go("cuts"); }));
        card.appendChild(tzActOnly(go));
      }

      function tzReadyMsg(rd, text, ok) {
        rd.msg.set(text, ok);
      }

      function tzReadyHeader(rd, card, checks) {
        var hd = tzEl("div", "tz-row");
        hd.style.alignItems = "center";
        hd.appendChild(tzEl("h3", null, i18nT('ready.title')));
        var bad = checks.filter(function (c) { return c.state === "bad"; }).length;
        var ready = bad === 0 && tzSafetyDone("Laser");
        var badge = tzEl("span", "wf-state tz-badge " + (ready ? "ok" : "err"), bad ? i18nT('ready.n_to_fix', { n: bad }) : ready ? i18nT('ready.all_ok') : i18nT('ready.tick_the_list'));
        badge.style.marginLeft = "8px";
        hd.appendChild(badge);
        card.appendChild(hd);
      }

      // the rows of the checks that tjNeedsRow does not already show, and the first lines of what is wrong in the design
      function tzReadyRows(card, checks, inp) {
        checks.forEach(function (c) {
          if (c.id === "mode" || c.id === "homing" || c.id === "free") return; // shown by tjNeedsRow, with its buttons
          var r = tzEl("div", "tz-row");
          r.style.cssText += "gap:6px;align-items:center;margin-top:3px;";
          r.appendChild(tzEl("span", "wf-state tz-badge " + (c.state === "ok" ? "ok" : c.state === "bad" ? "err" : ""), c.state === "ok" ? "OK" : c.state === "bad" ? "!" : "-"));
          r.appendChild(tzEl("span", c.state === "info" ? "tz-muted" : null, c.text));
          card.appendChild(r);
        });
        (inp.designErrors || []).slice(0, 4).forEach(function (e) {
          var d = tzEl("div", "tz-msg err", e);
          d.style.marginTop = "3px";
          card.appendChild(d);
        });
        if ((inp.designErrors || []).length > 4) card.appendChild(tzEl("div", "tz-muted", i18nT('ready.more_errors', { n: inp.designErrors.length - 4 })));
      }
