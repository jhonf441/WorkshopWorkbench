      // ---- Command registry and search (stage 5 of the redesign: agility) ----
      //
      // Pure logic, no DOM: a command is { id, etiqueta, ayuda, paso, herr, modos, mueve, contexto, atajo, ejecutar }.
      //  - etiqueta / ayuda arrive ALREADY translated (the caller uses i18nT), so this file has no text of its own.
      //  - herr: id of a tool of TZ_TOOLS_MODES; the command is hidden in the modes where that tool does not exist.
      //  - modos: for commands that are not tools, the modes where they make sense (null = every mode).
      //  - mueve: true when running it could move the machine. Such a command is never run without the machine being free
      //    (tzMachineFree, passed in as ctx.free) AND an explicit confirmation (ctx.confirm), see tzExecuteCommand.
      //    No command registered in stage 5 moves the machine: the flag is the guard for the ones that come later.
      //  - contexto: layouts (tab ids) where the command also shows in the right-click menu ("*" = every layout, null = never).
      //
      // The file keeps no state of the page: tzCreateCommands() returns an independent registry (the page makes one per mount).

      // lower case, no accents, single spaces: "Área  de corte" -> "area de corte"
      function tzNormalizeText(s) {
        var t = String(s === null || s === undefined ? "" : s).toLowerCase();
        if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
        return t.replace(/\s+/g, " ").replace(/^ | $/g, "");
      }

      // is the command available in this mode? (a tool follows the table of 20-mode-profile.js; an unknown mode hides nothing)
      function tzCommandVisible(cmd, mode) {
        if (!cmd) return false;
        if (cmd.tool) return tzToolVisible(mode, cmd.tool);
        if (cmd.modes && TZ_PROFILES[mode]) return cmd.modes.indexOf(mode) >= 0;
        return true;
      }

      function tzCreateCommands() {
        var items = [];
        var byId = {};
        var api = {
          // adds a command; one with the same id is replaced (same place in the list)
          register: function (cmd) {
            if (!cmd || !cmd.id) return api;
            var c = {
              id: String(cmd.id),
              label: String(cmd.label || cmd.id),
              help: cmd.help ? String(cmd.help) : "",
              step: cmd.step || 0,
              tool: cmd.tool || null,
              modes: cmd.modes || null,
              moves: !!cmd.moves,
              context: cmd.context || null,
              shortcut: cmd.shortcut || "",
              execute: typeof cmd.execute === "function" ? cmd.execute : null,
            };
            if (byId[c.id]) items[items.indexOf(byId[c.id])] = c;
            else items.push(c);
            byId[c.id] = c;
            return api;
          },
          remove: function (id) {
            var c = byId[id];
            if (!c) return false;
            items.splice(items.indexOf(c), 1);
            delete byId[id];
            return true;
          },
          get: function (id) { return byId[id] || null; },
          all: function () { return items.slice(); },
          visible: function (mode) { return items.filter(function (c) { return tzCommandVisible(c, mode); }); },
          // commands of the right-click menu for a layout (only the ones that say so: "*" or the id of the layout)
          forMenu: function (mode, layout) {
            return items.filter(function (c) {
              return tzCommandVisible(c, mode) && !!c.context && (c.context.indexOf("*") >= 0 || c.context.indexOf(layout) >= 0);
            });
          },
          search: function (text, mode, memory, max) { return tzSearchCommands(items, text, mode, memory, max); },
        };
        return api;
      }

      // One command per tool of the page: items = [{ id, etiqueta, ayuda, paso }] (the page knows the translated names of its tabs).
      // The command id is "go:<tool>"; `ejecutar` is filled by the caller (it opens the tool).
      function tzCommandsOfTools(items, abrir) {
        return (items || []).map(function (it) {
          return {
            id: "go:" + it.id,
            label: it.label,
            help: it.help || "",
            step: it.step || 0,
            tool: it.id,
            moves: false,
            execute: function () { return abrir(it.id); },
          };
        });
      }

      // Search: every word of the text must be in the label, the help or the id of the command (no accents, any case).
      // Order: the label starts with the text, a word of it does, it is inside, only the help has it; inside each group favorites
      // first, then recents (most recent first), then the registry order. With no text: favorites, recents, the rest.
      // memoria (optional) = { esFavorita(id), posReciente(id) } (54-favoritas.js); max = limit of the list (0 = no limit).
      function tzSearchCommands(items, text, mode, memory, max) {
        var q = tzNormalizeText(text);
        var palabras = q ? q.split(" ") : [];
        var out = [];
        (items || []).forEach(function (c, i) {
          if (!tzCommandVisible(c, mode)) return;
          var et = tzNormalizeText(c.label);
          var ay = tzNormalizeText(c.help);
          var id = tzNormalizeText(String(c.id).replace(/[:_]/g, " "));
          var etPal = et.split(" ");
          var peor = 0;
          var ok = true;
          palabras.forEach(function (p) {
            var s;
            if (et.indexOf(p) === 0) s = 0;
            else if (etPal.some(function (w) { return w.indexOf(p) === 0; })) s = 1;
            else if (et.indexOf(p) >= 0) s = 2;
            else if (ay.indexOf(p) >= 0 || id.indexOf(p) >= 0) s = 3;
            else { ok = false; return; }
            if (s > peor) peor = s;
          });
          if (!ok) return;
          var fav = memory && memory.isFavorite && memory.isFavorite(c.id) ? 0 : 1;
          var rec = memory && memory.posRecent ? memory.posRecent(c.id) : -1;
          out.push({ c: c, g: peor, f: fav, r: rec < 0 ? 1e6 : rec, i: i });
        });
        out.sort(function (a, b) { return a.g - b.g || a.f - b.f || a.r - b.r || a.i - b.i; });
        var res = out.map(function (x) { return x.c; });
        return max > 0 ? res.slice(0, max) : res;
      }

      // Runs a command and says how it went (a Promise of { ok, motivo }). A command that could move the machine only runs when
      //  1) ctx.free() says the machine is free (tzMachineFree of the page: no job, idle, no other owner of the movement),
      //  2) ctx.confirm(cmd) resolves true (the page asks with the same double tap as every other moving button),
      //  3) the machine is still free after the confirmation.
      // A command that does not move the machine runs at once (in the same call, so a browser gesture such as full screen works).
      function tzExecuteCommand(cmd, ctx) {
        ctx = ctx || {};
        if (!cmd || typeof cmd.execute !== "function") return Promise.resolve({ ok: false, reason: "without_action" });
        function run() {
          try {
            return Promise.resolve(cmd.execute()).then(
              function () { return { ok: true }; },
              function (e) { return { ok: false, reason: "error", error: e }; }
            );
          } catch (e) {
            return Promise.resolve({ ok: false, reason: "error", error: e });
          }
        }
        if (!cmd.moves) return run();
        if (typeof ctx.free !== "function" || !ctx.free()) return Promise.resolve({ ok: false, reason: "busy" });
        if (typeof ctx.confirm !== "function") return Promise.resolve({ ok: false, reason: "without_confirmation" });
        return Promise.resolve(ctx.confirm(cmd)).then(function (si) {
          if (!si) return { ok: false, reason: "no_confirmed" };
          if (!ctx.free()) return { ok: false, reason: "busy" };
          return run();
        });
      }
