      // ---- Steps of the flow and the text of the status bar (pure, no DOM; stage 4 of the redesign) ----
      // The table of tools by step is TZ_STEPS_TOOLS (20-mode-profile.js); tests/steps.test.js and tests/state-bar.test.js check this file.

      // the three groups; clave = i18n key of the name (no number: they are not steps of a wizard)
      var TZ_STEPS = [
        { n: 1, key: "profile.group_area" },
        { n: 2, key: "profile.group_design" },
        { n: 3, key: "profile.group_machine" },
      ];
      // group (1..3) of a tool, 0 when the tool belongs to none
      function tzStepOf(id) {
        return TZ_STEPS_TOOLS[id] || 0;
      }
      // tools of step n that exist in the mode, in the order of `order` (the tabs of the page)
      function tzToolsOfStep(mode, n, order) {
        return (order || []).filter(function (id) { return tzStepOf(id) === n && tzToolVisible(mode, id); });
      }
      // groups that have at least one tool in the mode: [{n, clave, herramientas}]. A group with no tool does not appear.
      function tzStepsVisible(mode, order) {
        return TZ_STEPS.map(function (p) { return { n: p.n, key: p.key, tools: tzToolsOfStep(mode, p.n, order) }; })
          .filter(function (p) { return p.tools.length > 0; });
      }
      // tool to open when a step is tapped: the last one used in that step if it still exists in the mode, else the first.
      // recordadas = {n: tool id}. null when the step has no tool in the mode.
      function tzToolOfStep(mode, n, order, recordadas) {
        var items = tzToolsOfStep(mode, n, order);
        if (!items.length) return null;
        var r = recordadas && recordadas[n];
        return r && items.indexOf(r) >= 0 ? r : items[0];
      }

      // colour of each level of the status bar
      var TZ_COLOR_STATE = { sin: "#9e9e9e", off: "#9e9e9e", free: "#66bb6a", busy: "#ffb74d", blocked: "#ef5350" };
      // What the status bar shows, from the summarised state of the page (st of readStatus) and the zones (zones[i].name):
      //   modo: "Laser" | "CNC" | a mode served elsewhere ("FFF") | "?"     zona: {codigo, nombre} | null     cabezal: {x, y, z, homed} | null (machine coordinates)
      //   estado: status word of the machine      bloqueado: a job (file or live) is running or paused: nothing that moves the machine
      //   nivel: "sin" (no state yet) | "off" (powered off) | "free" (idle) | "ocupado" (busy but no job) | "bloqueado" (job running)     color: TZ_COLOR_STATE[nivel]
      function tzTextState(st, zones) {
        var r = { mode: "?", withState: !!st, state: "", zone: null, head: null, blocked: false, level: "sin", color: TZ_COLOR_STATE.sin };
        if (!st) return r;
        r.mode = TZ_PROFILES[st.mode] || tzModeElsewhere(st.mode) ? st.mode : "?";
        r.state = String(st.status || "");
        if (typeof st.wn === "number" && st.wn >= 0 && st.wn < TZ_CODES.length) {
          var z = zones && zones[st.wn];
          r.zone = { code: TZ_CODES[st.wn], name: z && z.name ? z.name : "" };
        }
        var ax = st.axes;
        if (ax && ax.X && ax.Y) r.head = { x: ax.X.machinePosition, y: ax.Y.machinePosition, z: ax.Z ? ax.Z.machinePosition : null, homed: !!(ax.X.homed && ax.Y.homed) };
        r.blocked = tzJobInProgress(st);
        r.controls = tzJobControls(st);
        r.level = r.blocked ? "blocked" : r.state === "idle" ? "free" : r.state === "off" ? "off" : "busy";
        r.color = TZ_COLOR_STATE[r.level];
        return r;
      }

      // ---- Tab the page opens on (F0, 2026-10-21) ----
      // The last tab used wins when it exists in the current mode. Without one, a page that declares `initial` ({idle, job} tab ids)
      // opens on Prepare when nothing is running and on the job tab while a job runs; if that tab does not exist in the mode (a mode served
      // by another plugin has none), or the page declares nothing, it opens on its defaultValue.
      function tzInitialTab(pag, mode, st, stored) {
        var ok = function (id) { return pag.layouts.indexOf(id) !== -1 && tzToolVisible(mode, id); };
        if (stored && ok(stored)) return stored;
        var want = pag.initial ? (tzJobInProgress(st) ? pag.initial.job : pag.initial.idle) : null;
        return want && ok(want) ? want : pag.defaultValue;
      }
