
      function tzSpaceRead(psp) {
        try {
          var j = JSON.parse(localStorage.getItem(psp.KEY_STEP) || "null");
          if (j && typeof j === "object" && j.tool && typeof j.tool === "object") psp.remembered = { step: j.step || 0, tool: j.tool };
        } catch (e) {
          /*  without storage: it is not remembered */
        }
        try { psp.inspAbierto = localStorage.getItem(psp.KEY_INSP) !== "0"; } catch (e) { psp.inspAbierto = true; }
      }

      function tzSpaceSave(psp) {
        try { localStorage.setItem(psp.KEY_STEP, JSON.stringify(psp.remembered)); } catch (e) { /* no critico */ }
      }

      function tzSpaceNameTool(psp, id) {
        var b = psp.nav.tabButtons() && psp.nav.tabButtons()[id];
        var tx = b && b.querySelector(".tz-tab-txt");
        return tx ? tx.textContent : id;
      }

      function tzSpaceModeNow(psp) { return psp.data.st() ? psp.data.st().mode : "?"; }

      // ---- step bar ----
      function tzSpaceCreateSteps(psp) {
        tzSpaceRead(psp);
        psp.stepsBar = tzEl("div", "tz-steps");
        psp.stepsBar.setAttribute("role", "navigation");
        psp.stepsBar.setAttribute("aria-label", i18nT('space.steps_aria'));
        tzSpacePaintSteps(psp);
        return psp.stepsBar;
      }

      function tzSpacePaintSteps(psp) {
        if (!psp.stepsBar || !psp.nav.pag()) return;
        var mode = tzSpaceModeNow(psp);
        var current = tzStepOf(psp.nav.layout());
        var key = mode + "|" + current + "|" + psp.nav.pag().layouts.join(",");
        if (current) {
          // remember the tool used in this step (it is what the step opens next time)
          if (psp.remembered.tool[current] !== psp.nav.layout() || psp.remembered.step !== current) {
            psp.remembered.tool[current] = psp.nav.layout();
            psp.remembered.step = current;
            tzSpaceSave(psp);
          }
        }
        if (key === psp.stepsKey) return;
        psp.stepsKey = key;
        psp.stepsBar.innerHTML = "";
        tzStepsVisible(mode, psp.nav.pag().layouts).forEach(function (p, i) {
          var b = tzEl("button", "tz-step" + (p.n === current ? " on" : ""), i18nT(p.key));
          b.type = "button";
          b.title = i18nT('space.step_opens', { tools: p.tools.map(tzBind(tzSpaceNameTool, psp)).join(" / ") });
          b.addEventListener("click", function () {
            if (tzStepOf(psp.nav.layout()) === p.n) return; // already in this step: the tools of the step are in the left bar
            var id = tzToolOfStep(tzSpaceModeNow(psp), p.n, psp.nav.pag().layouts, psp.remembered.tool);
            if (id) psp.nav.goLayout(id);
          });
          psp.stepsBar.appendChild(b);
        });
      }

      // ---- status bar (the footer): only what the header does not show: who holds the control, the lock and the job buttons ----
      function tzSpaceCreateState(psp) {
        psp.stateBar = tzEl("div", "tz-state");
        psp.stateBar.setAttribute("role", "status");
        tzSpacePaintState(psp);
        return psp.stateBar;
      }

      function tzSpacePaintState(psp) {
        if (!psp.stateBar) return;
        var t = tzTextState(psp.data.st(), psp.data.zones());
        var key = JSON.stringify([t.withState, t.blocked, t.controls, t.head && t.head.homed, t.state, !!(psp.data.st() && psp.data.st().liveJob), tzViewNow(), workshopMotionBlock([PLUGIN_ID])]) + tzSpaceControlKey();
        if (key === psp.stateKey) return;
        psp.stateKey = key;
        psp.stateBar.innerHTML = "";
        if (t.withState) {
          tzSpaceControlMark(psp, t);
          tzSpaceJobButtons(psp, t);
        }
        psp.stateBar.style.display = psp.stateBar.childNodes.length ? "" : "none"; // an empty bar takes no room
      }

      // ---- inspector header (the side panel of the page, shell.wsSide(), is the inspector) ----
      function tzSpaceCreateInspector(psp) {
        tzSpaceRead(psp);
        psp.inspHead = tzEl("div", "tz-insp-head");
        tzSpacePaintInspector(psp, true);
        return psp.inspHead;
      }

      function tzSpacePaintInspector(psp, force) {
        if (!psp.inspHead) return;
        var n = tzStepOf(psp.nav.layout());
        var key = psp.nav.layout() + "|" + n + "|" + psp.inspAbierto;
        if (!force && key === psp.inspKey) return;
        psp.inspKey = key;
        if (psp.shell.wsSide()) psp.shell.wsSide().classList.toggle("tz-insp-closed", !psp.inspAbierto);
        psp.inspHead.innerHTML = "";
        var ic = tzEl("span", "mdi mdi-tune-variant");
        ic.setAttribute("aria-hidden", "true");
        psp.inspHead.appendChild(ic);
        psp.inspHead.appendChild(tzEl("span", null, i18nT('space.inspector')));
        psp.inspHead.appendChild(tzEl("span", "tz-insp-tool", tzSpaceNameTool(psp, psp.nav.layout())));
        if (n) psp.inspHead.appendChild(tzEl("span", "tz-insp-sp", i18nT(TZ_STEPS[n - 1].key)));
        var tg = tzEl("button", "tz-insp-toggle");
        tg.type = "button";
        tg.title = i18nT('space.inspector_tip');
        tg.appendChild(tzEl("span", "mdi mdi-chevron-" + (psp.inspAbierto ? "down" : "up")));
        if (!n) tg.classList.add("tz-insp-sp");
        tg.addEventListener("click", function () {
          psp.inspAbierto = !psp.inspAbierto;
          try { localStorage.setItem(psp.KEY_INSP, psp.inspAbierto ? "1" : "0"); } catch (e) { /* no critico */ }
          tzSpacePaintInspector(psp, true);
        });
        psp.inspHead.appendChild(tg);
      }

