      // ---- The gate of the Workbench, part 2: what to do when Laser / CNC are on but the machine is in another mode (WB-1, 2026-11-05) ----
      // The panel used to ask the same questions in every case: the two switches and Save, even when both modes were already on and the only thing missing was
      // the machine itself being in one of them. Saving then changed nothing (the answer was the same), said "saved" and the page stayed closed, asking again to
      // change the mode with no button to do it. Now: in that case the panel shows ONE thing, the button that switches the machine (the macro of the mode, with
      // the machine idle, waiting until the model shows the mode); and Save is grey while there is nothing new to save.

      // true when what is ticked is not what the profile has (the first answer is always worth saving)
      function tzGateDirty(pz) {
        var s = pz.modesGate.info.state, p = tzGatePick(pz);
        if (!s.answered) return true;
        return TZ_WORK_MODES.some(function (m) { return !!p[m] !== !!s.answer[m]; });
      }

      // The Save button and the line that explains why it is grey follow the ticks without drawing the panel again.
      function tzGateSaveState(pz) {
        var g = pz.modesGate;
        if (!g.saveBtn) return;
        var dirty = tzGateDirty(pz) && !g.busy;
        g.saveBtn.disabled = !dirty;
        if (g.saveNote) g.saveNote.style.display = tzGateDirty(pz) ? "none" : "";
      }

      // "Laser, CNC" of an answer {Laser, CNC} for the sentence that says what was saved
      function tzGateAnswerText(answer) {
        var on = TZ_WORK_MODES.filter(function (m) { return answer && answer[m]; });
        return on.length ? on.join(", ") : i18nT("modes_gate.none");
      }

      // The panel of the case "turned on, machine elsewhere": a button per work mode that is on.
      function tzGateSwitchBox(pz, p) {
        var g = pz.modesGate;
        var box = tzEl("div", null);
        box.style.marginTop = "12px";
        box.appendChild(tzEl("div", "tz-gate-miss", i18nT("modes_gate.switch_title")));
        box.appendChild(tzEl("div", "tz-gate-help", i18nT("modes_gate.switch_help")));
        var row = tzEl("div", "tz-row tz-actions");
        row.style.marginTop = "8px";
        workshopModesEnabled(g.info.state).filter(function (m) { return TZ_WORK_MODES.indexOf(m) >= 0; }).forEach(function (m) {
          var b = tzBtn(i18nT("modes_gate.switch_to", { mode: m }), "primary", function () { return tzGateSwitchMode(pz, m); }, i18nT("modes_gate.switch_confirm", { mode: m }), "gate-switch-" + m);
          b.disabled = g.busy;
          row.appendChild(tzTechOnly(b)); // it changes the machine's mode: the technician's (the page says so to the others)
        });
        box.appendChild(row);
        p.appendChild(box);
      }

      // Runs the macro of the mode and waits (at most 10 s) until the machine says it is in it. Resolves true / false; never rejects.
      function tzGateSwitchMode(pz, mode) {
        var g = pz.modesGate;
        if (g.busy) return Promise.resolve(false);
        var st = pz.data.st();
        if (st && tzJobInProgress(st)) { g.status = i18nT("modes_gate.switch_busy"); g.key = ""; tzGatePaint(pz); return Promise.resolve(false); }
        g.busy = true;
        g.status = i18nT("modes_gate.switching", { mode: mode });
        tzGatePaint(pz);
        var t0 = Date.now();
        function look() {
          return Promise.resolve(pz.data.readStatus()).catch(function () { /* the next look tries again */ }).then(function () {
            if (tzPageMode(pz) === mode) return true;
            if (Date.now() - t0 > 10000) return false;
            return new Promise(function (ok) { setTimeout(ok, 500); }).then(look);
          });
        }
        return postCode('M98 P"0:/macros/' + TZ_MACROS_MODE[mode] + '"')
          .then(function (r) { return r && typeof r.text === "function" ? r.text() : ""; })
          .then(function (reply) {
            return look().then(function (ok) {
              g.busy = false;
              g.status = ok ? i18nT("modes_gate.switched", { mode: mode }) : i18nT("modes_gate.switch_failed", { mode: mode, now: tzPageMode(pz) }) + (/error/i.test(reply || "") ? " " + String(reply).trim().slice(0, 120) : "");
              g.key = "";
              tzGatePaint(pz);
              return ok;
            });
          })
          .catch(function (e) {
            g.busy = false;
            g.status = i18nT("modes_gate.switch_failed", { mode: mode, now: tzPageMode(pz) }) + " " + String((e && e.message) || e).slice(0, 120);
            g.key = "";
            tzGatePaint(pz);
            return false;
          });
      }
