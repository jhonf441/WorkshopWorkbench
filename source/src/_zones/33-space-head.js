      // ---- Live state of the machine in the header of the page (2026-10-22) ----
      // The header was repeating the footer (mode, status, zone, head X/Y). Now each datum has one place: the header holds the live
      // state of the machine (state, active zone, position X/Y/Z, homing), the footer only the lock, the control and the job buttons.
      function tzSpaceCreateHead(psp) {
        psp.headBar = tzEl("div", "tz-hdstate");
        psp.headBar.setAttribute("role", "status");
        tzSpacePaintHead(psp);
        return psp.headBar;
      }

      function tzSpaceHeadCell(label, value) {
        var c = tzEl("span", "tz-hdcell");
        c.appendChild(tzEl("b", null, label));
        c.appendChild(tzEl("span", "tz-e-num", value));
        return c;
      }

      function tzSpacePaintHead(psp) {
        if (!psp.headBar) return;
        var st = psp.data.st();
        var t = tzTextState(st, psp.data.zones());
        var block = t.withState ? tzSpaceBlockReason(t, st) : null; // why the controls are locked: it is read at the top, where the state is
        var key = JSON.stringify([t.withState, t.level, t.state, t.zone, t.head, block, tzLjStopOffered() ? [!!(st && st.liveJob), tzLjBannerSig()] : null]);
        if (key === psp.headKey) return;
        psp.headKey = key;
        psp.headBar.innerHTML = "";
        tzSpacePaintHeadState(psp, t);
        tzSpacePaintHeadBlock(psp, block);
        tzSpacePaintHeadStop(psp, st);
      }

      function tzSpacePaintHeadState(psp, t) {
        if (!t.withState) {
          psp.headBar.appendChild(tzEl("span", "tz-muted", i18nT('space.state_without')));
          return;
        }
        var est = tzEl("span", "tz-hdcell");
        var point = tzEl("span", "tz-e-point");
        point.style.background = t.color;
        est.appendChild(point);
        est.appendChild(document.createTextNode(i18nT('space.state_' + t.level)));
        est.title = i18nT('space.state_tip', { state: t.state });
        psp.headBar.appendChild(est);
        if (t.zone) psp.headBar.appendChild(tzEl("span", "tz-hdcell", i18nT('space.zone', { code: t.zone.code }) + (t.zone.name ? " " + t.zone.name : "")));
        if (!t.head) return;
        psp.headBar.appendChild(tzEl("span", "tz-muted", i18nT('space.head')));
        psp.headBar.appendChild(tzSpaceHeadCell("X", tzFmt(t.head.x)));
        psp.headBar.appendChild(tzSpaceHeadCell("Y", tzFmt(t.head.y)));
        if (t.head.z !== null) psp.headBar.appendChild(tzSpaceHeadCell("Z", tzFmt(t.head.z)));
      }

      // The lock reason (a hint when it is only "no home yet"), in the header with the state: in the footer it sat too low and was often out of sight
      function tzSpacePaintHeadBlock(psp, r) {
        if (!r) return;
        var text = r.text || (r.key === "blocked_job" ? i18nT('space.blocked_job') : i18nT('space.' + r.key, r.params));
        var chip = tzEl("span", r.soft ? "tz-hdcell tz-e-hint" : "tz-hdcell tz-e-lock");
        chip.appendChild(tzEl("span", "mdi " + (r.soft ? "mdi-information-outline" : "mdi-lock")));
        chip.appendChild(document.createTextNode(" " + text));
        chip.title = text;
        psp.headBar.appendChild(chip);
      }

      // The safe stop of the live job lives in ONE place, the control side bar (it shows on every page). The header only says that a live job
      // runs, so nobody looks for the stop button here (2026-10-23).
      function tzSpacePaintHeadStop(psp, st) {
        if (!tzLjStopOffered() || !(st && st.liveJob)) return;
        var box = tzEl("span", "tz-hdstop");
        var cell = tzEl("span", "tz-hdcell", i18nT('livejob.in_progress'));
        cell.title = i18nT('livejob.in_progress_tip');
        box.appendChild(cell);
        psp.headBar.appendChild(box);
      }
