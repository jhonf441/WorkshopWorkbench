      // ---- Keyboard shortcuts of the Workbench (stage 5 of the redesign) ----
      //
      // Pure logic, no DOM: the table key -> command id, and the function that decides what a key press means. The page (56-agility.js)
      // listens to the keyboard and only runs what this file answers.
      //
      // Rules (tests/shortcuts.test.js checks them):
      //  - never while typing: a text field (input, textarea, select, editable element) ignores every shortcut, and so does an event that
      //    another handler already used (defaultPrevented), a key held down (repeat) or one that is part of a composition;
      //  - Alt / AltGr never make a shortcut (on many keyboards they type characters), and the numeric keypad belongs to the Jog keyboard
      //    control (PageUp / PageDown / Numpad9 / Numpad3 move Z): digits are read from the number row only;
      //  - no shortcut moves the machine: they open tools, the palette, the view or the undo of local things;
      //  - the keys of the laser editor (Ctrl+C / V / A / D / Z / Y, Delete, arrows) are reserved: Ctrl+Z / Ctrl+Y are NOT handled here while
      //    that editor is open (it has its own history and listener, and a second undo would undo twice).
      //
      // combo: "esc", "g", "1", "/", "ctrl+k", "ctrl+shift+z". Letters in lower case; Shift counts only with Ctrl or with a letter
      // (Shift+7 is "/" on a Spanish keyboard and must still be "/").
      var TZ_SHORTCUTS = [
        { combo: "ctrl+k", command: "palette" },
        { combo: "/", command: "palette" },
        { combo: "esc", command: "cancel" },
        { combo: "1", command: "step:1" },
        { combo: "2", command: "step:2" },
        { combo: "3", command: "step:3" },
        { combo: "g", command: "zone_active" },
        { combo: "m", command: "measure" },
        // global undo; while the laser editor is open its own listener does it (see above)
        { combo: "ctrl+z", command: "undo", no_en: ["cuts"] },
        { combo: "ctrl+y", command: "redo", no_en: ["cuts"] },
        { combo: "ctrl+shift+z", command: "redo", no_en: ["cuts"] },
      ];
      // combos that other code of the page, DWC or the browser already uses: they can never be in TZ_SHORTCUTS
      var TZ_SHORTCUTS_RESERVED = [
        "ctrl+c", "ctrl+v", "ctrl+x", "ctrl+a", "ctrl+d", "ctrl+s", "ctrl+f", "ctrl+p", "ctrl+r", "ctrl+w", "ctrl+t", "ctrl+l",
        "delete", "backspace", "enter", "tab", "arrowup", "arrowdown", "arrowleft", "arrowright", "pageup", "pagedown",
        "f5", "f11", "f12",
      ];

      // does the element take typed text? (every input counts: the Jog keyboard control and the editor do the same)
      function tzIsFieldText(el) {
        if (!el) return false;
        var t = String(el.tagName || "").toUpperCase();
        if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return true;
        if (el.isContentEditable) return true;
        var rol = el.getAttribute ? el.getAttribute("role") : null;
        return rol === "textbox" || rol === "combobox" || rol === "searchbox";
      }

      // The combo of a keyboard event, or null when the key cannot be a shortcut (Alt, keypad, composition, only a modifier).
      function tzComboOf(ev) {
        if (!ev || typeof ev.key !== "string" || !ev.key) return null;
        if (ev.altKey || ev.isComposing) return null;
        var k = ev.key;
        var code = typeof ev.code === "string" ? ev.code : "";
        if (code.indexOf("Numpad") === 0) return null; // keypad: Jog keyboard control
        if (k === "Shift" || k === "Control" || k === "Meta" || k === "Alt" || k === "AltGraph" || k === "CapsLock" || k === "Dead") return null;
        var base = k === "Escape" ? "esc" : k.toLowerCase();
        // digits: only from the number row (a keyboard that needs Shift for the digit sends another character, so it never matches)
        if (/^[0-9]$/.test(k) && code && code.indexOf("Digit") !== 0) return null;
        var ctl = !!(ev.ctrlKey || ev.metaKey);
        var parts = [];
        if (ctl) parts.push("ctrl");
        if (ev.shiftKey && (ctl || k.length > 1 || /^[a-z]$/i.test(k))) parts.push("shift");
        parts.push(base);
        return parts.join("+");
      }

      // What does this key press mean? Returns the command id or null.
      // estado = { layout, dentro(target) } ; dentro (optional) says if the target is part of the Workbench page (a key pressed in a
      // floating panel or a dialog of DWC is not ours).
      function tzResolverShortcut(ev, state, table) {
        state = state || {};
        if (!ev || ev.defaultPrevented || ev.repeat) return null;
        if (tzIsFieldText(ev.target)) return null;
        if (state.inside && !state.inside(ev.target)) return null;
        var combo = tzComboOf(ev);
        if (!combo) return null;
        var items = table || tzShortcutsActive();
        for (var i = 0; i < items.length; i++) {
          var a = items[i];
          if (a.combo !== combo) continue;
          if (a.no_en && a.no_en.indexOf(state.layout) >= 0) return null;
          return a.command;
        }
        return null;
      }

      // the combo as shown to people ("Ctrl+K", "Esc", "G")
      function tzNameCombo(combo) {
        return String(combo || "").split("+").map(function (p) {
          if (p === "esc") return "Esc";
          return p.charAt(0).toUpperCase() + p.slice(1);
        }).join("+");
      }
      // first combo of a command (for the hint in the palette and the menu), "" when it has none
      function tzShortcutOf(command, table) {
        var items = table || tzShortcutsActive();
        for (var i = 0; i < items.length; i++) if (items[i].command === command) return tzNameCombo(items[i].combo);
        return "";
      }

      // ---- Personal shortcuts (2026-10-18) ----
      // The person changes the key of a command from the palette (the key chip of each row). propios = { commandId: "combo" | "" }
      // ("" = that command has no key). Saved in the browser. A command with a personal entry loses its default combos; a combo
      // can belong to one command only, and the reserved ones (browser, editor, Jog) can never be given. `almacen` = localStorage
      // (a fake one in the tests); without it nothing is read or saved and the default table rules.
      var TZ_SHORTCUTS_OWN_KEY = "workshopWorkbenchShortcutsOwn";
      function tzShortcutsStore() {
        try {
          return typeof localStorage !== "undefined" ? localStorage : null;
        } catch (e) {
          return null;
        }
      }
      function tzShortcutsOwnRead(store) {
        var al = store || tzShortcutsStore();
        if (!al) return {};
        try {
          var o = JSON.parse(al.getItem(TZ_SHORTCUTS_OWN_KEY) || "{}");
          return o && typeof o === "object" && !Array.isArray(o) ? o : {};
        } catch (e) {
          return {};
        }
      }
      function tzShortcutsOwnSave(own, store) {
        var al = store || tzShortcutsStore();
        if (!al) return false;
        try {
          if (Object.keys(own).length) al.setItem(TZ_SHORTCUTS_OWN_KEY, JSON.stringify(own));
          else al.removeItem(TZ_SHORTCUTS_OWN_KEY);
          return true;
        } catch (e) {
          return false;
        }
      }
      // the default table with the personal entries applied
      function tzShortcutsCombine(base, own) {
        var out = base.filter(function (a) { return !Object.prototype.hasOwnProperty.call(own, a.command); });
        Object.keys(own).forEach(function (cmd) {
          if (!own[cmd]) return;
          var def = base.filter(function (a) { return a.command === cmd; })[0];
          var e = { combo: own[cmd], command: cmd };
          if (def && def.no_en) e.no_en = def.no_en;
          out.push(e);
        });
        return out;
      }
      function tzShortcutsActive(store) {
        return tzShortcutsCombine(TZ_SHORTCUTS, tzShortcutsOwnRead(store));
      }
      // can this combo be given to this command? { ok: true } or { ok: false, motivo: "invalido" | "reservado" | "usado", con: commandId }
      function tzShortcutCanBe(combo, command, table) {
        if (!/^(ctrl\+)?(shift\+)?([a-z0-9]|esc|f[1-9][0-2]?|[\/,.;'\-=\[\]`])$/.test(String(combo || ""))) return { ok: false, reason: "invalido" };
        if (TZ_SHORTCUTS_RESERVED.indexOf(combo) >= 0) return { ok: false, reason: "reserved" };
        var items = table || tzShortcutsActive();
        for (var i = 0; i < items.length; i++) if (items[i].combo === combo && items[i].command !== command) return { ok: false, reason: "used", con: items[i].command };
        return { ok: true };
      }
      // give a combo to a command ("" = take its key away); validates and saves. Returns the same answer as tzShortcutCanBe.
      function tzShortcutAssign(command, combo, store) {
        var own = tzShortcutsOwnRead(store);
        if (combo) {
          var v = tzShortcutCanBe(combo, command, tzShortcutsCombine(TZ_SHORTCUTS, own));
          if (!v.ok) return v;
        }
        own[command] = combo || "";
        // a personal entry equal to the default one is not a personal entry
        var def = TZ_SHORTCUTS.filter(function (a) { return a.command === command; });
        if (def.length === 1 && def[0].combo === combo) delete own[command];
        tzShortcutsOwnSave(own, store);
        return { ok: true };
      }
      function tzShortcutsReset(store) {
        return tzShortcutsOwnSave({}, store);
      }
      function tzShortcutsHasOwn(store) {
        return Object.keys(tzShortcutsOwnRead(store)).length > 0;
      }
