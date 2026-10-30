      function tzAgilityNotice(A, text) {
        if (!A.noticeEl) {
          A.noticeEl = tzEl("div", "tz-ag-notice");
          A.noticeEl.id = "workshop-workbench-notice";
          A.noticeEl.setAttribute("data-tp-panel", "1");
          A.noticeEl.setAttribute("role", "status");
        }
        A.noticeEl.textContent = text;
        (document.fullscreenElement || document.body).appendChild(A.noticeEl);
        clearTimeout(A.noticeT);
        A.noticeT = setTimeout(function () { if (A.noticeEl && A.noticeEl.parentNode) A.noticeEl.parentNode.removeChild(A.noticeEl); }, 3000);
      }

      function tzAgilityFocusOrigin(A) {
        var l = A.layout();
        A.undo.setFocus(l === "cuts" || l === "center" ? "editor" : null);
      }

      function tzAgilityDoUndo(A) {
        tzAgilityFocusOrigin(A);
        var r = A.undo.undo();
        tzAgilityNotice(A, r.ok ? i18nT('commands.deshecho') : i18nT('commands.nothing_undo'));
        if (A.repaint) A.repaint();
      }

      function tzAgilityDoRedo(A) {
        tzAgilityFocusOrigin(A);
        var r = A.undo.redo();
        tzAgilityNotice(A, r.ok ? i18nT('commands.rehecho') : i18nT('commands.nothing_redo'));
        if (A.repaint) A.repaint();
      }

      // ---- the commands ----
      function tzAgilityStepOfTool(A, id) {
        var steps = A.steps();
        for (var i = 0; i < steps.length; i++) if (steps[i].tools.indexOf(id) >= 0) return i + 1;
        return 0;
      }

      function tzAgilityIrStep(A, n) {
        var gr = A.steps()[n - 1];
        if (!gr) return;
        var mode = A.mode();
        var vis = gr.tools.filter(function (id) { return tzToolVisible(mode, id); });
        if (!vis.length) return tzAgilityNotice(A, i18nT('commands.step_empty', { mode: mode || "" }));
        if (vis.indexOf(A.layout()) >= 0) return; // already in this step: the tool stays
        A.goLayout(vis[0]);
      }

      function tzAgilityAction(A, id, key, extra) {
        var c = { id: id, label: i18nT(key), shortcut: tzShortcutOf(id) };
        Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
        A.record.register(c);
      }

      // run a command; moving ones (none for now) go through the guard of 52-commands.js
      function tzAgilityConfirm(A, cmd) {
        if (typeof workshopConfirmRisk !== "function") return Promise.resolve(false); // no way to ask: do not run
        return workshopConfirmRisk({ title: i18nT('commands.confirm_title'), text: i18nT('commands.confirm_text', { name: cmd.label }) });
      }

      function tzAgilityRun(A, cmd) {
        if (!cmd.moves) A.memory.use(cmd.id); // a command that does not move the machine runs at once: it is a recent one now
        return tzExecuteCommand(cmd, { free: function () { return !!A.free(); }, confirm: tzBind(tzAgilityConfirm, A) }).then(function (r) {
          if (r.ok && cmd.moves) A.memory.use(cmd.id);
          else if (r.reason === "busy") tzAgilityNotice(A, i18nT('commands.busy'));
          return r;
        });
      }

      function tzAgilityClosePalette(A) {
        if (!A.palette) return false;
        var p = A.palette;
        A.palette = null;
        if (p.background.parentNode) p.background.parentNode.removeChild(p.background);
        try { if (p.previous && p.previous.focus && document.contains(p.previous)) p.previous.focus(); } catch (e) { /* focus is a courtesy */ }
        return true;
      }

      function tzAgilityOpenPalette(A) {
        if (!A.mounted) return;
        if (A.palette) { A.palette.input.focus(); return; }
        tzAgilityCloseMenu(A);
        if (A.cancel) A.cancel();
        var background = tzEl("div", "tz-ag-background");
        background.id = "workshop-workbench-palette";
        background.setAttribute("data-tp-panel", "1");
        var box = tzEl("div", "tz-ag-box");
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-label", i18nT('commands.palette'));
        var input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.placeholder = i18nT('commands.placeholder');
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-expanded", "true");
        input.setAttribute("aria-controls", "workshop-workbench-palette-list");
        input.setAttribute("aria-label", i18nT('commands.palette'));
        var lista = tzEl("div", "tz-ag-list");
        lista.id = "workshop-workbench-palette-list";
        lista.setAttribute("role", "listbox");
        var pie = tzEl("div", "tz-ag-foot", i18nT('commands.footer') + " " + i18nT('shortcuts.footer'));
        pie.appendChild(tzEl("div", null, i18nT('shortcuts.personalizar')));
        box.appendChild(input);
        box.appendChild(lista);
        box.appendChild(pie);
        background.appendChild(box);
        var p = { background: background, input: input, previous: document.activeElement, sel: 0, items: [], footer: pie };
        A.palette = p;

        function stepLabel(c) {
          var gr = c.step ? A.steps()[c.step - 1] : null;
          return gr && c.tool ? gr.label : "";
        }
        function mark(visible) {
          var rows = lista.children;
          for (var i = 0; i < rows.length; i++) {
            var on = i === p.sel;
            if (rows[i].classList) rows[i].classList.toggle("sel", on);
            if (rows[i].setAttribute) rows[i].setAttribute("aria-selected", on ? "true" : "false");
            if (on && visible && rows[i].scrollIntoView) { try { rows[i].scrollIntoView({ block: "nearest" }); } catch (e) { /* old browser */ } }
          }
        }
        function launch(c) {
          tzAgilityClosePalette(A);
          tzAgilityRun(A, c);
        }
        input.addEventListener("input", function () { p.sel = 0; tzAgilityPaintPalette(A, lista, p, input, stepLabel, launch, mark); });
        input.addEventListener("keydown", function (ev) {
          var k = ev.key;
          var n = p.items.length;
          if (k === "ArrowDown" || (k === "Tab" && !ev.shiftKey)) { ev.preventDefault(); if (n) { p.sel = (p.sel + 1) % n; mark(true); } }
          else if (k === "ArrowUp" || (k === "Tab" && ev.shiftKey)) { ev.preventDefault(); if (n) { p.sel = (p.sel - 1 + n) % n; mark(true); } }
          else if (k === "Enter") {
            ev.preventDefault();
            var c = p.items[p.sel];
            if (!c) return;
            if (ev.shiftKey) { A.memory.toggleFavorite(c.id); tzAgilityPaintPalette(A, lista, p, input, stepLabel, launch, mark); } // Shift+Enter marks or unmarks the favorite
            else launch(c);
          } else if (k === "Escape") { ev.preventDefault(); tzAgilityClosePalette(A); }
          ev.stopPropagation(); // typing in the palette is not for the page, the editor or the Jog
        });
        background.addEventListener("pointerdown", function (ev) { if (ev.target === background) tzAgilityClosePalette(A); });
        (document.fullscreenElement || document.body).appendChild(background);
        tzAgilityPaintPalette(A, lista, p, input, stepLabel, launch, mark);
        input.focus();
      }

      function tzAgilityPaintPalette(A, lista, p, input, stepLabel, launch, mark) {
        lista.innerHTML = "";
        p.items = A.record.search(input.value, A.mode(), A.memory, 40);
        if (p.sel >= p.items.length) p.sel = p.items.length - 1;
        if (p.sel < 0) p.sel = 0;
        if (!p.items.length) lista.appendChild(tzEl("div", "tz-ag-empty", i18nT('commands.without_results')));
        p.items.forEach(function (c, i) {
          var row = tzEl("div", "tz-ag-row" + (i === p.sel ? " sel" : ""));
          row.setAttribute("role", "option");
          row.setAttribute("aria-selected", i === p.sel ? "true" : "false");
          var fav = A.memory.isFavorite(c.id);
          var estrella = tzEl("button", "tz-ag-star mdi mdi-" + (fav ? "star" : "star-outline") + (fav ? " on" : ""));
          estrella.type = "button";
          estrella.setAttribute("aria-label", i18nT(fav ? 'commands.remove_favorite' : 'commands.mark_favorite'));
          estrella.setAttribute("title", i18nT(fav ? 'commands.remove_favorite' : 'commands.mark_favorite'));
          estrella.addEventListener("click", function (ev) {
            ev.stopPropagation();
            A.memory.toggleFavorite(c.id);
            tzAgilityPaintPalette(A, lista, p, input, stepLabel, launch, mark);
            input.focus();
          });
          var txt = tzEl("div", "tz-ag-txt");
          txt.appendChild(tzEl("span", null, c.label));
          var sub = [stepLabel(c), c.help].filter(function (x) { return !!x; }).join(" - ");
          if (sub) txt.appendChild(tzEl("span", "tz-ag-help", sub));
          row.appendChild(estrella);
          row.appendChild(txt);
          row.appendChild(tzAgilityButtonShortcut(A, c, function () { tzAgilityPaintPalette(A, lista, p, input, stepLabel, launch, mark); input.focus(); }));
          row.addEventListener("click", function () { launch(c); });
          row.addEventListener("pointermove", function () {
            if (p.sel === i) return;
            p.sel = i;
            mark();
          });
          lista.appendChild(row);
        });
        mark(true);
        tzAgilityPaintReset(A, p, function () { tzAgilityPaintPalette(A, lista, p, input, stepLabel, launch, mark); });
      }

      // The key chip of a row: shows the shortcut of the command (or "+") and a tap changes it: the next key pressed is the new one
      // (Esc keeps the old one, Backspace / Delete takes the key away). The pure rules are in 53-shortcuts.js.
      function tzAgilityButtonShortcut(A, c, alChange) {
        var at = tzShortcutOf(c.id);
        var b = tzEl("button", "tz-ag-shortcut" + (at ? "" : " vacio"), at || "+");
        b.type = "button";
        b.setAttribute("title", i18nT('shortcuts.change'));
        b.addEventListener("click", function (ev) {
          ev.stopPropagation();
          b.textContent = i18nT('shortcuts.pulsa');
          b.classList.add("cap");
          function end() { document.removeEventListener("keydown", onTecla, true); alChange(); }
          function onTecla(e) {
            if (e.key === "Shift" || e.key === "Control" || e.key === "Meta" || e.key === "Alt") return; // waiting for the key itself
            e.preventDefault();
            e.stopPropagation();
            if (e.key === "Escape") return end();
            var combo = e.key === "Backspace" || e.key === "Delete" ? "" : tzComboOf(e);
            if (combo === null) return tzAgilityNotice(A, i18nT('shortcuts.invalid'));
            var r = tzShortcutAssign(c.id, combo);
            if (!r.ok) {
              var other = r.con ? A.record.get(r.con) : null;
              tzAgilityNotice(A, r.reason === "used" ? i18nT('shortcuts.used', { name: other ? other.label : r.con }) : r.reason === "reserved" ? i18nT('shortcuts.reservado') : i18nT('shortcuts.invalid'));
              return;
            }
            tzAgilityNotice(A, combo ? i18nT('shortcuts.saved', { combo: tzNameCombo(combo) }) : i18nT('shortcuts.removed'));
            end();
          }
          document.addEventListener("keydown", onTecla, true);
        });
        return b;
      }

      // "Reset the shortcuts" in the footer of the palette, only while there is a personal one
      function tzAgilityPaintReset(A, p, alChange) {
        var old = p.footer.querySelector(".tz-ag-reset");
        if (old) old.parentNode.removeChild(old);
        if (!tzShortcutsHasOwn()) return;
        var r = tzEl("button", "tz-ag-reset", i18nT('shortcuts.restablecer'));
        r.type = "button";
        r.addEventListener("click", function () {
          tzShortcutsReset();
          tzAgilityNotice(A, i18nT('shortcuts.restablecidos'));
          alChange();
        });
        p.footer.appendChild(r);
      }

      function tzAgilityCloseMenu(A) {
        if (!A.menu) return false;
        var m = A.menu;
        A.menu = null;
        if (m.el.parentNode) m.el.parentNode.removeChild(m.el);
        document.removeEventListener("pointerdown", m.outside, true);
        return true;
      }

