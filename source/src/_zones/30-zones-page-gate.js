      // ---- Workbench page: the gate of the laser / CNC work (2026-10-26, user report "Mesa de trabajo se ve muy mal") ----
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
        // redesign 2026-11-23: the head of the family (icon, title, 4 % band), under it ONE line that says why the page is closed; each switch is a row
        // of the family, 48 high (name 14 + short phrase 12, the box at the right; the row is a label, so all of it is the touch area); the long texts
        // (what the page is for, the four texts of each switch) live in ONE fold at the foot
        "[data-modes-gate] .tz-gate-why { font-size: 13px; line-height: 1.4; opacity: 0.9; }" +
        "@media (min-width: 900px) { [data-modes-gate] .tz-gate-why { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } }" +
        "[data-modes-gate] label.wf-row { cursor: pointer; }" +
        "[data-modes-gate] .tz-gate-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }" +
        "[data-modes-gate] .wf-row-control input[type=checkbox] { width: 18px; height: 18px; margin: 0; }" +
        "[data-modes-gate] .tz-gate-help { font-size: 13px; line-height: 1.45; opacity: 0.85; }" +
        "[data-modes-gate] .tz-gate-guide { margin-top: 12px; padding: 10px 12px; border-radius: 6px; border: 1px solid rgba(25,118,210,0.6); }" +
        "[data-modes-gate] .tz-gate-miss { font-size: 13px; font-weight: 600; margin-bottom: 4px; }" +
        "[data-modes-gate] .help-tip-list dd { white-space: pre-line; }";

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
        // ELSEWHERE (a work mode is on in the profile, the machine is in another one now, FFF included): the page STAYS open for reading and editing
        // and the panel shrinks to a note on top with the switch; what acts refuses with its own reason (tzDataMachineFree + tzNotFreeWhy).
        // Unanswered / off keep the closed behaviour: the page has nothing to do there.
        var note = !d.open && d.reason === "elsewhere";
        g.gated = !d.open && !note;
        g.note = note;
        pz.page.classList.toggle("tz-modes-closed", g.gated);
        g.panel.style.display = g.gated || note ? "" : "none";
        if (note) {
          if (pz.header && pz.header.parentNode === pz.page && g.panel.previousSibling !== pz.header && typeof pz.page.insertBefore === "function") pz.page.insertBefore(g.panel, pz.header.nextSibling); // on top, below the header
          var nkey = ["note", tzPageMode(pz), g.info.state.source, JSON.stringify(g.info.state.answer), g.status, g.busy, workshopModeSwitchReason()].join("|");
          if (nkey !== g.key) { g.key = nkey; tzGateRenderNote(pz); }
          if (was) { g.guide = false; pz.wsLayout(); pz.applyLayout(); pz.shell.renderMap(); } // the map was hidden: measure it again
        } else if (g.gated) {
          var key = [d.reason, tzPageMode(pz), g.info.state.source, JSON.stringify(g.info.state.answer), g.guide, g.status, g.busy, workshopPluginActive("machine")].join("|");
          if (key !== g.key) { g.key = key; tzGateRender(pz, d); }
        } else if (was) {
          g.key = "";
          g.guide = false;
          pz.wsLayout(); // the map was hidden: measure it again
          pz.applyLayout();
          pz.shell.renderMap();
        }
      }

      // The thin panel of the ELSEWHERE case: one sentence and the switch button (30-zones-page-gate-switch.js); the rest of the page works
      function tzGateRenderNote(pz) {
        var g = pz.modesGate;
        var p = g.panel;
        p.textContent = "";
        p.appendChild(tzEl("div", "tz-note", i18nT("modes_gate.note_elsewhere", { mode: tzPageMode(pz), modes: tzGateNames(g.info.state) })));
        tzGateSwitchBox(pz, p, true);
        if (g.status) p.appendChild(tzEl("div", "tz-muted", g.status));
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
        // the family head (22-ui-base.js tzCardHead): the icon of the page in the section color, the title and the 4 % band
        p.appendChild(tzCardHead(tzEl("h3", null, i18nT("modes_gate.title")), pz.pag.icon || "vector-square"));
        // ONE secondary line under the head (13 px): why the page is closed now; everything else that explains (what the page is for, the texts of
        // each switch) is in the fold at the foot (ux, 2026-11-23: nothing but that line before the question)
        p.appendChild(tzEl("div", "tz-gate-why", i18nT("modes_gate.why_" + d.reason, { mode: tzPageMode(pz), modes: tzGateNames(g.info.state) })));
        if (g.guide) p.appendChild(tzGateGuideBox(pz, d));
        else if (d.reason === "elsewhere") tzGateSwitchBox(pz, p); // 30-zones-page-gate-switch.js: nothing to answer, the machine has to change mode
        else tzGateSwitches(pz, p);
        tzGateActions(pz, p, d);
        // not saved in the service: said under Save, where it matters (without a session that is the cause: sign in and it is saved, not a service
        // that is down)
        if (!g.info.viaService) p.appendChild(tzEl("div", "tz-muted tz-gate-local", i18nT(typeof workshopSignedOut === "function" && workshopSignedOut() ? "modes_gate.local_note_signed_out" : "modes_gate.local_note")));
        if (g.status) p.appendChild(tzEl("div", "tz-muted", g.status));
        p.appendChild(tzGateHelp());
      }

      // The ONE help of the panel, folded at its foot (family rule: one help per section): what the page is for, and for each switch its four
      // texts (what it is, what it is for, if it is off, how), one per line
      function tzGateHelp() {
        var rows = [[i18nT("modes_gate.help_page"), i18nT("modes_gate.what")]];
        TZ_WORK_MODES.forEach(function (m) {
          var k = m.toLowerCase();
          rows.push([i18nT("modes_gate.row_" + k), ["what", "why", "missing", "help"].map(function (part) { return i18nT("modes_gate.row_" + k + "_" + part); }).join("\n")]);
        });
        return workshopHelpFoldEl({ rows: rows });
      }

      // "Laser, CNC" (the work modes that are on) for the texts
      function tzGateNames(state) {
        return workshopModesEnabled(state).filter(function (m) { return TZ_WORK_MODES.indexOf(m) >= 0; }).join(", ");
      }

      // A group (family .wf-group: its title 13/600) with one family row of 48 per mode of the page (.wf-row: the name, the short phrase of what it
      // is, and the box at the right); the row is a label, so a tap anywhere on it ticks the box. The four texts of the row (what / why / if missing /
      // how, the help rule of every row) are in the fold at the foot of the panel (tzGateHelp).
      function tzGateSwitches(pz, p) {
        var pick = tzGatePick(pz);
        var box = tzEl("div", "wf-group");
        box.style.marginTop = "12px";
        box.appendChild(tzEl("div", "wf-group-title", i18nT("modes_gate.switches_title")));
        TZ_WORK_MODES.forEach(function (m) {
          var k = m.toLowerCase();
          var row = tzEl("label", "wf-row");
          var name = tzEl("span", "tz-gate-name");
          name.appendChild(tzEl("span", "wf-row-name", i18nT("modes_gate.row_" + k)));
          name.appendChild(tzEl("span", "wf-row-text", i18nT("modes_gate.row_" + k + "_what")));
          row.appendChild(name);
          var ctl = tzEl("span", "wf-row-control");
          var cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = !!pick[m];
          cb.setAttribute("data-mode", m);
          cb.addEventListener("change", function () { pick[m] = cb.checked; tzGateSaveState(pz); });
          ctl.appendChild(cb);
          row.appendChild(ctl);
          box.appendChild(row);
        });
        p.appendChild(box);
      }

      function tzGateActions(pz, p, d) {
        var g = pz.modesGate;
        var row = tzEl("div", "tz-row tz-actions");
        row.style.marginTop = "12px";
        g.saveBtn = g.saveNote = null;
        if (!g.guide && d.reason !== "elsewhere") {
          // Save is grey while what is ticked is what the profile already has, and says so (it used to stay active and say "saved" for nothing)
          g.saveBtn = tzBtn(i18nT("modes_gate.save"), "primary", function () { tzGateSave(pz, tzGatePick(pz)); });
          row.appendChild(g.saveBtn);
          row.appendChild(tzBtn(i18nT("modes_gate.guide"), "", function () { g.guide = true; g.status = ""; tzGatePaint(pz); }));
          g.saveNote = tzEl("span", "tz-muted", i18nT("modes_gate.save_nochange"));
          row.appendChild(g.saveNote);
          tzGateSaveState(pz);
        } else if (g.guide) {
          row.appendChild(tzBtn(i18nT("modes_gate.guide_close"), "", function () { g.guide = false; g.status = ""; tzGatePaint(pz); }));
        }
        // optional enrichment: the same switches live in Machine > Modes, linked only when that plugin is there
        if (workshopPluginActive("machine")) {
          // the section travels as the route query ?layout=modes (vue/WorkshopMachine lib/cross-page.js): nothing stored, no event
          row.appendChild(tzBtn(i18nT("modes_gate.open_machine"), "", function () {
            pz.nav.goPath("/Plugins/Machine", { layout: "modes" });
          }));
        }
        var other = tzModeElsewhere(tzPageMode(pz));
        if (other && workshopPluginActive(other.plugin)) {
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
          g.status = i18nT(r.viaService ? "modes_gate.saved_service" : "modes_gate.saved_local", { modes: tzGateAnswerText(answer) }); // says what was saved and where
          return tzGateLoad(pz, true);
        });
      }
