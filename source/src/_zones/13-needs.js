      // ---- Requirements of a step, with the button to resolve them right there ----
      //
      // Request: "add buttons in the steps if things or states are needed,
      // for example a button for homing if needed; or to receive a Z height
      // value to do the focus". Instead of a gray button with "homing
      // missing" in the notice, the step shows what is missing and the button that
      // fixes it:
      //   - homing X/Y/Z  -> "Home" (G28, double tap)
      //   - mode          -> a notice (the mode change belongs to the bar)
      //   - machine busy  -> a notice
      //   - focus (optional) -> height H (shortcuts from the material macros)
      //     + "Focus here" (sys/workshop/macros/focushere.g: measures with the probe where it is,
      //     without moving X/Y, and leaves the laser at H mm; a machine without a probe sets Z0 with a sheet of paper instead,
      //     12-probe-kind.js)
      //   - the BLTouch pin (stow it) only when the machine declares a BLTouch: no other probe has a pin
      //
      // o: {st, free, mode?, focus?, focusList?: [{name,h}], onMsg(text, ok), after()}
      // Returns true if nothing mandatory is missing (homing / mode / free / the board running the machine's laser correction).

      // The focus height H used by "Focus here" / "Go to height": the one chosen here (kept in the work state of the service, per
      // machine, 22-work-state.js; it replaces the old browser key workshopFocusH) while the lens focus of the machine (15-cutarea.js)
      // is the one it was chosen over; otherwise the lens focus.
      function tjFocusH() {
        var chosen = tzWorkFocusH(tzWorkData(), tjLaserFocus());
        return chosen === null ? tjLaserFocus() : chosen;
      }
      function tjSetFocusH(v) {
        tzWorkSetFocusH(tzWorkData(), v, tjLaserFocus(), Date.now());
        tzWorkSave();
      }
      // The laser <-> pointer correction the BOARD runs against the one of the machine (the settings store "laser"). The zones are loaded with the
      // board's globals (lasercorrection.g, which the service writes from that store), so a board that never got the file, lost it or runs another
      // number cuts shifted by the whole correction. -> "ok" | "none" (the store has no measured correction: the area check says so) |
      // "board_missing" (the board has no known correction) | "differs" (the board's numbers are not the store's).
      function tjCorrectionState(globals, correction) {
        if (!correction || !isFinite(correction.x) || !isFinite(correction.y)) return "none";
        var g = globals || {};
        if (g.workshopLaserCorrKnown !== true || typeof g.workshopLaserCorrX !== "number" || typeof g.workshopLaserCorrY !== "number") return "board_missing";
        return Math.abs(g.workshopLaserCorrX - correction.x) > 0.005 || Math.abs(g.workshopLaserCorrY - correction.y) > 0.005 ? "differs" : "ok";
      }
      // The same with the correction of the store as this page has it, and the store read again (at most every 5 s) while the two do not agree: the
      // correction may have been saved in Machine after this page loaded the store, and a stale copy must not block a cut with a "differs" that
      // pressing Apply could never fix. The callers that draw or decide use this one; the render key uses the pure one.
      var tjCorrReadAt = 0;
      function tjBoardCorrection(globals) {
        var s = tjCorrectionState(globals, tjLaserCorrection());
        if ((s === "differs" || s === "board_missing") && Date.now() - tjCorrReadAt > 5000) {
          tjCorrReadAt = Date.now();
          tjLoadLaserCfg();
        }
        return s;
      }
      // For the render key of whoever uses it (it changes what is seen).
      function tjNeedsKey(s) {
        var ax = (s && s.axes) || {};
        return [ax.X && ax.X.homed, ax.Y && ax.Y.homed, ax.Z && ax.Z.homed, s && s.mode, s && s.status, tjFocusH(), s && s.globals && s.globals.probePinOut, !!(s && s.liveJob), tzProbeInfo(s && s.probes).kind, tzFocusKey(), tjCorrectionState(s && s.globals, tjLaserCorrection())];
      }

      function tjNeedsRow(parent, o) {
        var nr = {};
        nr.s = o.st || {};
        nr.ax = nr.s.axes || {};
        nr.miss = ["X", "Y", "Z"].filter(function (k) { return !(nr.ax[k] && nr.ax[k].homed); });
        nr.modeOk = !o.mode || nr.s.mode === o.mode;
        var r = tzEl("div", "tz-row");
        r.style.cssText += "gap:4px;align-items:center;margin-top:6px;";
        parent.appendChild(r);
        r.appendChild(tzEl("span", "tz-muted", i18nT('needs.first')));
        if (nr.miss.length) {
          r.appendChild(tzEl("span", "wf-state tz-badge err", i18nT('needs.homing_missing', { axes: nr.miss.join(" ") })));
          var hb = tzBtn(i18nT('needs.home'), "primary", function () {
            o.onMsg(i18nT('needs.homing_g28'), true);
            postCode("G28")
              .then(function (rs) { return rs.text(); })
              .then(function (t) { o.onMsg(/error/i.test(t || "") ? "Homing: " + t.trim() : i18nT('needs.homing_done'), !/error/i.test(t || "")); o.after(); })
              .catch(function (e) { o.onMsg("Homing: " + (e && e.message ? e.message : e), false); });
          }, i18nT('needs.tap_again_g28_moves_all_axes'));
          hb.disabled = !o.free;
          tzTip(hb, i18nT('needs.g28_homes_all_axes_the_machine'));
          r.appendChild(hb);
        } else r.appendChild(tzEl("span", "wf-state tz-badge ok", "homing OK"));
        if (!nr.modeOk) r.appendChild(tzEl("span", "wf-state tz-badge err", tzTx('needs.mode_needs_change_it_from_the', 'bar', { cur: nr.s.mode || "?", mode: o.mode })));
        else if (o.mode) r.appendChild(tzEl("span", "wf-state tz-badge ok", i18nT('needs.mode', { mode: o.mode })));
        if (!o.free)
          r.appendChild(tzEl("span", "wf-state tz-badge err", nr.s.liveJob && nr.s.status === "busy" ? i18nT('needs.live_job_running', { name: nr.s.liveJob.name ? " (" + workshopDefaultName(nr.s.liveJob.name, ["svc.live_job_default_name"]) + ")" : "" }) : tzNotFreeBadge(nr.s.status)));
        else if (nr.s.liveJob) r.appendChild(tzEl("span", "wf-state tz-badge err", i18nT('needs.live_job_open_paused', { name: nr.s.liveJob.name ? " (" + workshopDefaultName(nr.s.liveJob.name, ["svc.live_job_default_name"]) + ")" : "" })));
        // BLTouch pin out (marked by sys/deployprobe.g / retractprobe.g
        // in global.probePinOut). Request: "before focusing check that the
        // BLTouch is folded". Saving it does not move any axis.
        nr.probe = tzProbeInfo(nr.s.probes);
        var pinOut = nr.probe.servo && nr.s.globals && nr.s.globals.probePinOut === true;
        if (pinOut) {
          r.appendChild(tzEl("span", "wf-state tz-badge err", i18nT('needs.bltouch_pin_out')));
          var pb = tzBtn(i18nT('needs.stow_pin'), "primary", function () {
            postCode("M280 P0 S160") // liberar alarma (sube el pin)
              .then(function () { return postCode("G4 P300"); })
              .then(function () { return postCode("M402"); }) // guardar (retractprobe.g marca probePinOut = false)
              .then(function () { o.onMsg(i18nT('needs.bltouch_pin_stowed'), true); o.after(); })
              .catch(function (e) { o.onMsg(i18nT('needs.stow_pin_2', { err: e && e.message ? e.message : e }), false); });
          });
          pb.disabled = !o.free;
          tzTip(pb, i18nT('needs.clears_a_possible_bltouch_alarm_and'));
          r.appendChild(pb);
        }
        nr.corrBad = tjNeedsCorrection(nr, r, o);
        tjNeedsFocus(nr, parent, o);
        return !nr.miss.length && nr.modeOk && o.free && !nr.corrBad;
      }

      // A laser step needs the board to run the machine's correction: the badge says which way it is wrong and the button loads it again (wpload.g
      // runs lasercorrection.g and the zones; it moves nothing). True when it is wrong.
      function tjNeedsCorrection(nr, r, o) {
        nr.corr = tjBoardCorrection(nr.s.globals);
        if (!(nr.s.mode === "Laser" || o.mode === "Laser") || (nr.corr !== "board_missing" && nr.corr !== "differs")) return false;
        var g = nr.s.globals || {}, c = tjLaserCorrection();
        r.appendChild(tzEl("span", "wf-state tz-badge err", nr.corr === "differs" ? i18nT('needs.correction_differs', { bx: tzFmt(g.workshopLaserCorrX), by: tzFmt(g.workshopLaserCorrY), sx: tzFmt(c.x), sy: tzFmt(c.y) }) : i18nT('needs.correction_board_missing')));
        var ab = tzBtn(i18nT('needs.apply_correction'), "primary", function () {
          postCode('M98 P"0:/sys/workshop/macros/wpload.g"')
            .then(function (rs) { return rs.text(); })
            .then(function (t) {
              var bad = /error|abort/i.test(t || "");
              o.onMsg(bad ? i18nT('needs.correction_apply_failed', { err: t.trim() }) : i18nT('needs.correction_applied'), !bad);
              o.after();
            })
            .catch(function (e) { o.onMsg(i18nT('needs.correction_apply_failed', { err: e && e.message ? e.message : e }), false); });
        });
        ab.disabled = !o.free;
        tzTip(ab, tzTx('needs.apply_correction_tip', 'machine'));
        r.appendChild(ab);
        return true;
      }

      function tjNeedsFocus(nr, parent, o) {
        if (o.focus) {
          var fr = tzEl("div", "tz-row");
          fr.style.cssText += "gap:4px;align-items:center;margin-top:4px;";
          parent.appendChild(fr);
          fr.appendChild(tzEl("span", "tz-muted", o.focusRequired ? i18nT('needs.focus_required') : i18nT('needs.focus_optional')));
          if (o.focusRequired) fr.appendChild(tzEl("span", "wf-state tz-badge " + (o.focusDone ? "ok" : "err"), o.focusDone ? i18nT('needs.focus_done_badge') : i18nT('needs.focus_missing_badge')));
          var h = tjFocusH();
          (o.focusList || []).forEach(function (f) {
            if (!f || !(f.h > 0)) return;
            fr.appendChild(
              tzTip(
                tzBtn(f.name + " " + f.h, Math.abs(f.h - h) < 0.001 ? "primary" : null, function () { tjSetFocusH(f.h); o.after(); }),
                i18nT('needs.use_the_focus_height_of_the', { macro: f.macro || f.name, h: f.h })
              )
            );
          });
          var hi = document.createElement("input");
          hi.type = "number";
          hi.className = "tz-input";
          hi.style.width = "64px";
          hi.step = "0.1";
          hi.min = "1";
          hi.max = "60";
          hi.value = String(h);
          hi.addEventListener("change", function () {
            var v = parseFloat(hi.value);
            if (isFinite(v) && v >= 1 && v <= 60) tjSetFocusH(v);
            o.after();
          });
          fr.appendChild(hi);
          fr.appendChild(tzEl("span", "tz-muted", "mm"));
          // With a probe focushere.g measures the surface here; without one the paper sets Z0 here (tzProbeFocusHereCode)
          var paper = !nr.probe.measures;
          if (paper) tzcLoad();
          var fb = tzBtn(paper ? i18nT('needs.focus_here_paper') : i18nT('needs.focus_here'), "warn", function () {
            var hv = tjFocusH();
            o.onMsg(paper ? i18nT('needs.focusing_with_the_paper', { hv: hv }) : i18nT('needs.focusing_the_probe_measures_the_surface', { hv: hv }), true);
            postCode(tzProbeFocusHereCode(nr.probe, hv, 0, tzcPaper(tzc.data)))
              .then(function (rs) { return rs.text(); })
              .then(function (t) {
                var bad = /error/i.test(t || "");
                if (!bad) tzFocusAppliedMark(nr.s.wn);
                o.onMsg(bad ? i18nT('needs.focus', { err: t.trim() }) : paper ? i18nT('needs.done_laser_mm_above_the_paper', { hv: hv }) : i18nT('needs.done_laser_mm_above_the_measured', { hv: hv }), !bad);
                o.after();
              })
              .catch(function (e) { o.onMsg(i18nT('needs.focus', { err: e && e.message ? e.message : e }), false); });
          }, paper ? i18nT('needs.focus_here_paper_confirm') : undefined, paper ? "nd-focus-paper" : undefined);
          fb.disabled = !o.free || nr.miss.length > 0 || nr.s.mode !== "Laser";
          tzTip(
            fb,
            nr.miss.length ? i18nT('needs.home_first') : nr.s.mode !== "Laser" ? i18nT('common.laser_mode_only') :
              paper ? tzTx('needs.focus_here_paper_tip', 'jog') : nr.probe.servo ? i18nT('needs.first_stows_the_bltouch_pin_if') : i18nT('needs.focus_here_tip', { probe: tzProbeName(nr.probe) })
          );
          fr.appendChild(fb);
          // Without probing: only moves Z to the focus height (machine coordinates). Valid if the material was
          // already measured with this zone and Z was not homed again; the confirm text and the tip say so.
          var gb = tzBtn(i18nT('needs.go_height'), null, function () {
            var hg = tjFocusH();
            postCode('M98 P"0:/sys/workshop/macros/zfocusgo.g" H' + hg)
              .then(function (rs) { return rs.text(); })
              .then(function (t) {
                var bad = /error|abort/i.test(t || "");
                if (!bad) tzFocusAppliedMark(nr.s.wn);
                o.onMsg(bad ? i18nT('needs.go_height_failed', { err: t.trim() }) : i18nT('needs.go_height_done', { hv: hg }), !bad);
                o.after();
              })
              .catch(function (e) { o.onMsg(i18nT('needs.go_height_failed', { err: e && e.message ? e.message : e }), false); });
          }, i18nT('needs.go_height_confirm', { hv: tjFocusH() }), "nd-gofocus");
          gb.disabled = !o.free || !(nr.ax.Z && nr.ax.Z.homed) || nr.s.mode !== "Laser";
          tzTip(gb, !(nr.ax.Z && nr.ax.Z.homed) ? i18nT('needs.home_first') : nr.s.mode !== "Laser" ? i18nT('common.laser_mode_only') : i18nT('needs.go_height_tip', { hv: tjFocusH() }));
          fr.appendChild(gb);
        }
      }
