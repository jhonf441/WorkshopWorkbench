      // ---- Gate of the Workbench: "Guiame paso a paso" (2026-10-26) ----
      // The steps come from workshopModesGuideSteps (src/_shared/07-modes.js, pure). The guide lists what is missing in plain words, shows
      // the first step that is not done with its help (what / why / if missing / how) and does it with ONE button when it can (the answer);
      // a manual step (switch the machine to the mode) has a "Done - check" button that reads the machine again. "I do not use laser or
      // CNC" answers that the machine only prints and closes the guide.

      function tzGateGuideBox(pz, d) {
        var g = pz.modesGate;
        var box = tzEl("div", "tz-gate-guide");
        var steps = workshopModesGuideSteps(g.info.state, tzPageMode(pz), TZ_WORK_MODES);
        var pending = steps.filter(function (s) { return !s.done; });
        box.appendChild(tzEl("div", "tz-gate-miss", i18nT("modes_gate.guide_missing_title")));
        pending.forEach(function (s) {
          box.appendChild(tzEl("div", null, "- " + i18nT("modes_gate.miss_" + s.id, { mode: tzPageMode(pz), modes: tzGateNames(g.info.state) || TZ_WORK_MODES.join(", ") })));
        });
        var step = pending[0];
        if (!step) return box;
        var n = steps.indexOf(step) + 1;
        var head = tzEl("div", "tz-gate-miss", i18nT("modes_gate.step_of", { i: n, n: steps.length }) + ": " + i18nT("modes_gate.step_" + step.id));
        head.style.marginTop = "10px";
        box.appendChild(head);
        ["what", "why", "missing", "help"].forEach(function (part) {
          box.appendChild(tzEl("div", "tz-gate-help", i18nT("modes_gate.step_" + step.id + "_" + part)));
        });
        if (step.kind === "apply") tzGateSwitches(pz, box);
        var row = tzEl("div", "tz-row tz-actions");
        row.style.marginTop = "10px";
        if (step.kind === "apply") {
          row.appendChild(tzBtn(i18nT("modes_gate.guide_apply"), "primary", function () {
            var pick = tzGatePick(pz);
            if (!pick.Laser && !pick.CNC) { pz.modesGate.status = i18nT("modes_gate.pick_one"); pz.modesGate.key = ""; tzGatePaint(pz); return; }
            tzGateSave(pz, pick);
          }));
          row.appendChild(tzBtn(i18nT("modes_gate.not_using"), "", function () {
            pz.modesGate.guide = false;
            tzGateSave(pz, { Laser: false, CNC: false });
          }));
        } else {
          row.appendChild(tzBtn(i18nT("modes_gate.guide_check"), "primary", function () { tzGateCheck(pz); }));
        }
        box.appendChild(row);
        return box;
      }

      // "Done - check": read the machine again and repaint (the gate opens by itself when the mode is right)
      function tzGateCheck(pz) {
        var g = pz.modesGate;
        g.status = i18nT("modes_gate.checking");
        tzGatePaint(pz);
        return Promise.resolve(pz.data.readStatus()).catch(function () { /* the status stays as it was */ }).then(function () {
          g.status = tzGateDecision(pz).open ? "" : i18nT("modes_gate.still_missing");
          g.key = "";
          tzGatePaint(pz);
        });
      }
