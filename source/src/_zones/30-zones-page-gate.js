      // ---- Workbench page: the gate of the laser / CNC work (2026-10-26, owner report "Mesa de trabajo se ve muy mal") ----
      // The page is for Laser and CNC work. When this machine does not do it (it only prints, or nobody said yet) the page used to show
      // its whole interface anyway: the bed map, the tabs, the bars. Now it shows ONE panel instead, like the Timelapse page does without
      // a camera (WorkshopCamera 18-no-camera.js): what the page is for, why it is closed now, the switches to turn it on and a guide
      // ("Guiame paso a paso") that says literally what is missing. Which modes the machine uses is the shared answer of the machine
      // profile (src/_shared/07-modes.js); nothing here needs another plugin: the link to Machine > Modes appears only if it is installed.
      // The rest of the page is hidden by one CSS class on the page (tz-modes-closed), so the working interface is exactly the one it always was.

      var TZ_GATE_CSS_ID = "tz-gate-style";
      var TZ_GATE_CSS =
        ".tz-modes-closed > :not(.tz-hd):not([data-modes-gate]) { display: none !important; }" +
        ".tz-modes-closed .tz-hd > [data-tz-headinfo], .tz-modes-closed .tz-hd .tz-chip-mode { display: none !important; }" +
        "[data-modes-gate] { margin-top: 12px; width: 100%; box-sizing: border-box; }" +
        "[data-modes-gate] .tz-gate-row { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; border-top: 1px solid rgba(128,128,128,0.3); }" +
        "[data-modes-gate] .tz-gate-row label { display: flex; align-items: center; gap: 8px; font-weight: 500; cursor: pointer; }" +
        "[data-modes-gate] .tz-gate-help { font-size: 13px; line-height: 1.45; opacity: 0.85; margin-left: 26px; }" +
        "[data-modes-gate] .tz-gate-guide { margin-top: 12px; padding: 10px 12px; border-radius: 6px; border: 1px solid rgba(25,118,210,0.6); }" +
        "[data-modes-gate] .tz-gate-miss { font-weight: 500; }";

      function tzPagGate(pz, root, opts) {
        if (!document.getElementById(TZ_GATE_CSS_ID)) {
          var st = document.createElement("style");
          st.id = TZ_GATE_CSS_ID;
          st.textContent = TZ_GATE_CSS;
          document.head.appendChild(st);
        }
        var g = { panel: tzEl("div", "tz-card wf-card"), info: null, key: "", gated: true, guide: false, pick: null, status: "", busy: false, loadedAt: 0 };
        g.panel.setAttribute("data-modes-gate", "");
        pz.modesGate = g;
        if (pz.headInfo) pz.headInfo.setAttribute("data-tz-headinfo", "");
        pz.page.appendChild(g.panel);
        pz.page.classList.add("tz-modes-closed"); // closed until the profile is read: the interface never flashes
        tzGateLoad(pz, false);
        pz.timers.push(setInterval(function () { if (pz.shell.alive()) tzGatePaint(pz); }, 1500));
      }

      function tzGateLoad(pz, force) {
        return workshopModes.load(force).then(function (info) {
          if (!pz.shell.alive()) return;
          pz.modesGate.info = info;
          pz.modesGate.pick = null;
          tzGatePaint(pz);
        });
      }

      // true when the page is closed now (the panel is shown instead of the interface)
      function tzGateClosed(pz) {
        return !!(pz.modesGate && pz.modesGate.gated);
      }

      function tzGateDecision(pz) {
        return workshopModesGate(pz.modesGate.info.state, tzPageMode(pz), TZ_WORK_MODES);
      }

      // The switch between the panel and the interface, and the repaint of the panel when something it says changed
      function tzGatePaint(pz) {
        var g = pz.modesGate;
        if (!g || !pz.page) return;
        if (!g.info) { g.panel.style.display = ""; g.panel.textContent = ""; g.panel.appendChild(tzEl("div", "tz-muted", i18nT("modes_gate.checking"))); return; }
        var d = tzGateDecision(pz);
        var was = g.gated;
        g.gated = !d.open;
        pz.page.classList.toggle("tz-modes-closed", g.gated);
        g.panel.style.display = g.gated ? "" : "none";
        if (g.gated) {
          var key = [d.reason, tzPageMode(pz), g.info.state.source, JSON.stringify(g.info.state.answer), g.guide, g.status, g.busy, workshopPathExists("/Plugins/Machine")].join("|");
          if (key !== g.key) { g.key = key; tzGateRender(pz, d); }
        } else if (was) {
          g.key = "";
          g.guide = false;
          pz.wsLayout(); // the map was hidden: measure it again
          pz.applyLayout();
          pz.shell.renderMap();
        }
      }

      // what the person has ticked in the panel (starts from the answer, or from what the board suggests)
      function tzGatePick(pz) {
        var g = pz.modesGate;
        if (!g.pick) {
          var s = g.info.state, det = g.info.detected;
          g.pick = { Laser: s.answered ? !!s.answer.Laser : !!det.Laser, CNC: s.answered ? !!s.answer.CNC : !!det.CNC };
        }
        return g.pick;
      }

      function tzGateRender(pz, d) {
        var g = pz.modesGate;
        var p = g.panel;
        p.textContent = "";
        var h = tzEl("h3", null, i18nT("modes_gate.title"));
        h.style.cssText = "display:flex;align-items:center;gap:8px;margin:0 0 8px 0;";
        h.insertBefore(tzEl("span", "mdi mdi-" + String(pz.pag.icon || "vector-square").replace(/^mdi-/, "")), h.firstChild);
        p.appendChild(h);
        p.appendChild(tzEl("div", null, i18nT("modes_gate.what")));
        var why = tzEl("div", "tz-note", i18nT("modes_gate.why_" + d.reason, { mode: tzPageMode(pz), modes: tzGateNames(g.info.state) }));
        why.style.marginTop = "8px";
        p.appendChild(why);
        if (!g.info.viaService) p.appendChild(tzEl("div", "tz-muted", i18nT("modes_gate.local_note")));
        if (g.guide) p.appendChild(tzGateGuideBox(pz, d));
        else tzGateSwitches(pz, p);
        tzGateActions(pz, p);
        if (g.status) p.appendChild(tzEl("div", "tz-muted", g.status));
      }

      // "Laser, CNC" (the work modes that are on) for the texts
      function tzGateNames(state) {
        return workshopModesEnabled(state).filter(function (m) { return TZ_WORK_MODES.indexOf(m) >= 0; }).join(", ");
      }

      // One row per mode of the page: switch + what / why / if missing / how (the help rule of every row)
      function tzGateSwitches(pz, p) {
        var pick = tzGatePick(pz);
        var box = tzEl("div", null);
        box.style.marginTop = "12px";
        box.appendChild(tzEl("div", "tz-gate-miss", i18nT("modes_gate.switches_title")));
        TZ_WORK_MODES.forEach(function (m) {
          var k = m.toLowerCase();
          var row = tzEl("div", "tz-gate-row");
          var lab = tzEl("label", null);
          var cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = !!pick[m];
          cb.setAttribute("data-mode", m);
          cb.addEventListener("change", function () { pick[m] = cb.checked; });
          lab.appendChild(cb);
          lab.appendChild(tzEl("span", null, i18nT("modes_gate.row_" + k)));
          row.appendChild(lab);
          ["what", "why", "missing", "help"].forEach(function (part) {
            row.appendChild(tzEl("div", "tz-gate-help", i18nT("modes_gate.row_" + k + "_" + part)));
          });
          box.appendChild(row);
        });
        p.appendChild(box);
      }

      function tzGateActions(pz, p) {
        var g = pz.modesGate;
        var row = tzEl("div", "tz-row tz-actions");
        row.style.marginTop = "12px";
        if (!g.guide) {
          row.appendChild(tzBtn(i18nT("modes_gate.save"), "primary", function () { tzGateSave(pz, tzGatePick(pz)); }));
          row.appendChild(tzBtn(i18nT("modes_gate.guide"), "", function () { g.guide = true; g.status = ""; tzGatePaint(pz); }));
        } else {
          row.appendChild(tzBtn(i18nT("modes_gate.guide_close"), "", function () { g.guide = false; g.status = ""; tzGatePaint(pz); }));
        }
        // optional enrichment: the same switches live in Machine > Modes, linked only when that plugin is there
        if (workshopPathExists("/Plugins/Machine")) {
          row.appendChild(tzBtn(i18nT("modes_gate.open_machine"), "", function () {
            try { localStorage.setItem("workshopMachineSection", "modes"); } catch (e) { /* not critical */ }
            pz.nav.goPath("/Plugins/Machine");
            // the page can already be open with another module on show (Machine listens for this)
            try { window.dispatchEvent(new CustomEvent("workshop-machine-goto", { detail: { section: "modes" } })); } catch (e) { /* not critical */ }
          }));
        }
        var other = tzModeElsewhere(tzPageMode(pz));
        if (other && workshopPathExists(other.path)) {
          row.appendChild(tzBtn(i18nT("zonesPage.other_mode_open", { page: i18nT(other.name) }), "", function () { pz.nav.goPath(other.path); }));
        }
        p.appendChild(row);
      }

      // Saves the answer (Laser / CNC ticked; FFF stays as it was, or as the board suggests while nothing is answered)
      function tzGateSave(pz, pick) {
        var g = pz.modesGate;
        if (g.busy) return Promise.resolve();
        var s = g.info.state;
        var answer = workshopModesSet(s, pick, g.info.detected);
        g.busy = true;
        g.status = i18nT("common.saving");
        tzGatePaint(pz);
        return workshopModes.save(answer, g.info.profile).then(function (r) {
          g.busy = false;
          g.status = r.viaService ? i18nT("modes_gate.saved_service") : i18nT("modes_gate.saved_local");
          return tzGateLoad(pz, true);
        });
      }
