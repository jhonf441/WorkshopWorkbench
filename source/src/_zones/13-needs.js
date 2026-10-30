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
      //     + "Focus here" (sys/workshop/macros/focushere.g: measures with the BLTouch where it is,
      //     without moving X/Y, and leaves the laser at H mm)
      //
      // o: {st, free, mode?, focus?, focusList?: [{name,h}], onMsg(text, ok), after()}
      // Returns true if nothing mandatory is missing (homing / mode / free).

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
      // For the render key of whoever uses it (it changes what is seen).
      function tjNeedsKey(s) {
        var ax = (s && s.axes) || {};
        return [ax.X && ax.X.homed, ax.Y && ax.Y.homed, ax.Z && ax.Z.homed, s && s.mode, s && s.status, tjFocusH(), s && s.globals && s.globals.probePinOut, !!(s && s.liveJob)];
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
        if (!nr.modeOk) r.appendChild(tzEl("span", "wf-state tz-badge err", i18nT('needs.mode_needs_change_it_from_the', { cur: nr.s.mode || "?", mode: o.mode })));
        else if (o.mode) r.appendChild(tzEl("span", "wf-state tz-badge ok", i18nT('needs.mode', { mode: o.mode })));
        if (!o.free)
          r.appendChild(tzEl("span", "wf-state tz-badge err", nr.s.liveJob && nr.s.status === "busy" ? i18nT('needs.live_job_running', { name: nr.s.liveJob.name ? " (" + workshopDefaultName(nr.s.liveJob.name, ["svc.live_job_default_name"]) + ")" : "" }) : i18nT('needs.machine_busy', { status: nr.s.status || "?" })));
        else if (nr.s.liveJob) r.appendChild(tzEl("span", "wf-state tz-badge err", i18nT('needs.live_job_open_paused', { name: nr.s.liveJob.name ? " (" + workshopDefaultName(nr.s.liveJob.name, ["svc.live_job_default_name"]) + ")" : "" })));
        // BLTouch pin out (marked by sys/deployprobe.g / retractprobe.g
        // in global.probePinOut). Request: "before focusing check that the
        // BLTouch is folded". Saving it does not move any axis.
        var pinOut = nr.s.globals && nr.s.globals.probePinOut === true;
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
        tjNeedsFocus(nr, parent, o);
        return !nr.miss.length && nr.modeOk && o.free;
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
          var fb = tzBtn(i18nT('needs.focus_here'), "warn", function () {
            var hv = tjFocusH();
            o.onMsg(i18nT('needs.focusing_the_probe_measures_the_surface', { hv: hv }), true);
            postCode('M98 P"0:/sys/workshop/macros/focushere.g" H' + hv)
              .then(function (rs) { return rs.text(); })
              .then(function (t) {
                var bad = /error/i.test(t || "");
                if (!bad) tzFocusAppliedMark(nr.s.wn);
                o.onMsg(bad ? i18nT('needs.focus', { err: t.trim() }) : i18nT('needs.done_laser_mm_above_the_measured', { hv: hv }), !bad);
                o.after();
              })
              .catch(function (e) { o.onMsg(i18nT('needs.focus', { err: e && e.message ? e.message : e }), false); });
          });
          fb.disabled = !o.free || nr.miss.length > 0 || nr.s.mode !== "Laser";
          tzTip(
            fb,
            nr.miss.length ? i18nT('needs.home_first') : nr.s.mode !== "Laser" ? i18nT('common.laser_mode_only') :
              i18nT('needs.first_stows_the_bltouch_pin_if')
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
