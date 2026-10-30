      function tzAgilityMenuContextual(A, ev) {
        if (!A.mounted) return;
        tzAgilityCloseMenu(A);
        tzAgilityClosePalette(A);
        tzAgilityFocusOrigin(A);
        var el = tzEl("div", "tz-ag-menu");
        el.id = "workshop-workbench-menu";
        el.setAttribute("data-tp-panel", "1");
        el.setAttribute("role", "menu");
        function row(label, atajo, active, fn) {
          var f = tzEl("div", "tz-ag-item" + (active ? "" : " off"));
          f.setAttribute("role", "menuitem");
          f.appendChild(tzEl("span", null, label));
          if (atajo) f.appendChild(tzEl("span", "tz-ag-shortcut", atajo));
          if (active) f.addEventListener("click", function () { tzAgilityCloseMenu(A); fn(); });
          el.appendChild(f);
        }
        A.record.forMenu(A.mode(), A.layout()).forEach(function (c) {
          var active = c.id === "undo" ? A.undo.canUndo() : c.id === "redo" ? A.undo.canRedo() : true;
          row(c.label, c.shortcut, active, function () { tzAgilityRun(A, c); });
        });
        el.appendChild(tzEl("div", "tz-ag-sep"));
        row(i18nT('commands.menu_search'), tzShortcutOf("palette"), true, tzBind(tzAgilityOpenPalette, A));
        (document.fullscreenElement || document.body).appendChild(el);
        // inside the screen
        var w = el.offsetWidth || 220, h = el.offsetHeight || 200;
        var x = Math.max(4, Math.min(ev.clientX, (window.innerWidth || 800) - w - 4));
        var y = Math.max(4, Math.min(ev.clientY, (window.innerHeight || 600) - h - 4));
        el.style.left = x + "px";
        el.style.top = y + "px";
        var m = { el: el, outside: function (e) { if (!el.contains(e.target)) tzAgilityCloseMenu(A); } };
        A.menu = m;
        document.addEventListener("pointerdown", m.outside, true);
      }

      // ---- keyboard ----
      function tzAgilityInside(A, t) {
        if (!t || t === document.body || t === document.documentElement || t === document) return true;
        return !!(A.page && A.page.contains && A.page.contains(t));
      }

      function tzAgilityOnKey(A, ev) {
        if (!A.mounted || !A.live()) return;
        if (ev.key === "Escape" && (A.palette || A.menu)) { // Esc closes what this file opened, wherever the focus is
          ev.preventDefault();
          tzAgilityClosePalette(A);
          tzAgilityCloseMenu(A);
          return;
        }
        var cmd = tzResolverShortcut(ev, { layout: A.layout(), inside: tzBind(tzAgilityInside, A) }, tzShortcutsActive());
        if (!cmd) return;
        if (cmd === "palette") { ev.preventDefault(); tzAgilityOpenPalette(A); return; }
        if (cmd === "cancel") { if (A.cancel && A.cancel()) ev.preventDefault(); return; }
        var c = A.record.get(cmd);
        if (!c || !tzCommandVisible(c, A.mode())) return;
        ev.preventDefault();
        tzAgilityRun(A, c);
      }

