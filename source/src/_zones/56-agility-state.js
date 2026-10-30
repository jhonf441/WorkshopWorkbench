      function tzAgilityStart(A) {
        tzAgilityStyles();
        var store = null;
        try { store = window.localStorage; } catch (e) { store = null; }
        A.memory = tzCreateMemoryCommands(store);
        A.record = tzCreateCommands();
        A.undo = tzCreateUndo({ stop: 100 });
        A.mounted = true;
        // ---- notices (one line at the bottom, 3 s) ----
        A.noticeEl = null, A.noticeT = null;
        // ---- undo: the laser editor keeps its own history, the rest goes to the shared one ----
        A.undo.registerOrigin("editor", {
          undo: function () { var c = A.cuts(); if (c && c.undo) c.undo(); },
          redo: function () { var c = A.cuts(); if (c && c.redo) c.redo(); },
          canUndo: function () { var c = A.cuts(); var h = c && c.history ? c.history() : null; return !!(h && h.u); },
          canRedo: function () { var c = A.cuts(); var h = c && c.history ? c.history() : null; return !!(h && h.r); },
        });
        // the view of the map (zoom, pan, rotation, mirror) is local: every settled change is one entry
        A.watchdog = A.view ? tzWatchChanges(A.undo, "view", i18nT('commands.view'), A.view.read, A.view.put, A.view.active) : null;
        if (A.watchdog && A.timers) A.timers.push(setInterval(function () { if (A.mounted) A.watchdog.tick(); }, 400));
        var herr = A.tools().map(function (h) { return { id: h.id, label: h.label, help: h.help, step: tzAgilityStepOfTool(A, h.id) }; });
        tzCommandsOfTools(herr, function (id) {
          if (!A.goLayout(id)) tzAgilityNotice(A, i18nT('commands.no_available'));
        }).forEach(function (c) { A.record.register(c); });
        A.steps().forEach(function (gr, i) {
          var n = i + 1;
          // the step exists in the modes where at least one of its tools does
          var modes = Object.keys(TZ_PROFILES).filter(function (m) {
            return gr.tools.some(function (id) { return tzToolVisible(m, id); });
          });
          A.record.register({
            id: "step:" + n,
            label: gr.label,
            help: i18nT('commands.step_help'),
            step: n,
            modes: modes,
            shortcut: tzShortcutOf("step:" + n),
            execute: function () { tzAgilityIrStep(A, n); },
          });
        });
        tzAgilityAction(A, "undo", "commands.undo", { help: i18nT('commands.undo_help'), context: ["*"], execute: tzBind(tzAgilityDoUndo, A) });
        tzAgilityAction(A, "redo", "commands.redo", { help: i18nT('commands.redo_help'), context: ["*"], execute: tzBind(tzAgilityDoRedo, A) });
        tzAgilityAction(A, "zone_active", "commands.zone_active", { help: i18nT('commands.zone_active_help'), step: 1, context: ["*"], execute: function () { A.zoneActive(); } });
        tzAgilityAction(A, "measure", "commands.measure", {
          help: i18nT('commands.measure_help'),
          step: 1,
          context: ["zones", "area", "prepare", "materials", "level", "simulate"],
          execute: function () {
            if (!A.canMeasure()) return tzAgilityNotice(A, i18nT('commands.measure_no_here'));
            A.setTool(A.tool() === "measure" ? "point" : "measure");
          },
        });
        tzAgilityAction(A, "view:adjust", "commands.adjust", { help: i18nT('commands.adjust_help'), context: ["*"], execute: function () { A.adjust(); } });
        tzAgilityAction(A, "view:zoomin", "commands.zoomin", { context: ["*"], execute: function () { A.zoomin(); } });
        tzAgilityAction(A, "view:zoomout", "commands.zoomout", { context: ["*"], execute: function () { A.zoomout(); } });
        tzAgilityAction(A, "view:screen", "commands.screen", { help: i18nT('commands.screen_help'), execute: function () { A.screen(); } });
        tzAgilityAction(A, "favorite", "commands.favorite_current", {
          help: i18nT('commands.favorite_help'),
          context: ["*"],
          execute: function () {
            var c = A.record.get("go:" + A.layout());
            if (!c) return;
            var si = A.memory.toggleFavorite(c.id);
            tzAgilityNotice(A, i18nT(si ? 'commands.favorite_si' : 'commands.favorite_no', { name: c.label }));
          },
        });
        // ---- palette ----
        A.palette = null;
        // ---- right-click menu ----
        A.menu = null;
        document.addEventListener("keydown", tzBind(tzAgilityOnKey, A));
        // button of the palette in the header: the way in for the touch screen and for whoever does not know the keys
        A.button = tzBtn(i18nT('commands.search'), null, function () { tzAgilityOpenPalette(A); });
        A.button.setAttribute("aria-haspopup", "dialog");
        tzTip(A.button, i18nT('commands.search_tip', { shortcut: tzShortcutOf("palette") }));
        if (A.header) A.header.appendChild(A.button);
      }
