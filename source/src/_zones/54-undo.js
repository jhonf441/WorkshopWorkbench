      // ---- Global undo of the Workbench (stage 5 of the redesign) ----
      //
      // Pure logic, no DOM. It undoes only LOCAL things of the page (shapes of the editor, the view of the map...): an entry is a pair of
      // functions that put a local state back. It never undoes an order sent to the machine, and nothing here sends anything: modules that
      // would need that simply do not register.
      //
      // Two ways for a module to take part, none changes what the module saves:
      //  - push(entry): { origen, etiqueta, deshacer(), rehacer() } one entry per change (a shared linear history, 100 entries at most);
      //  - registrarOrigen(nombre, api): a module that already keeps its own history (the laser editor) gives { deshacer, rehacer,
      //    puedeDeshacer, puedeRehacer } and the global undo hands over to it while it has the focus (setFoco(nombre)).
      // deshacer(origen) with an origin looks only at the entries of that origin, so several origins stay independent.
      function tzCreateUndo(opts) {
        var cap = opts && opts.stop > 0 ? opts.stop : 100;
        var u = []; // entries that can be undone (the last one is the next)
        var r = []; // entries undone, that can be redone
        var origenes = {};
        var foco = null;
        function recortar(l) { while (l.length > cap) l.shift(); }
        function last(l, origin) {
          for (var i = l.length - 1; i >= 0; i--) if (!origin || l[i].origin === origin) return i;
          return -1;
        }
        function delegado() { return foco && origenes[foco] ? origenes[foco] : null; }
        function call(fn) {
          try { fn(); return true; } catch (e) { return false; }
        }
        var api = {
          push: function (e) {
            if (!e || typeof e.undo !== "function" || typeof e.redo !== "function") return false;
            u.push({ origin: e.origin || "", label: e.label || "", undo: e.undo, redo: e.redo });
            recortar(u);
            r.length = 0; // a new change ends the redo of the entries undone before it
            return true;
          },
          registerOrigin: function (nombre, o) {
            if (!nombre || !o || typeof o.undo !== "function" || typeof o.redo !== "function") return false;
            origenes[nombre] = o;
            return true;
          },
          removeOrigin: function (nombre) {
            delete origenes[nombre];
            if (foco === nombre) foco = null;
          },
          setFocus: function (nombre) { foco = nombre || null; },
          focus: function () { return foco; },
          canUndo: function (origin) {
            var d = origin ? origenes[origin] : delegado();
            if (d) return d.canUndo ? !!d.canUndo() : true;
            return last(u, origin) >= 0;
          },
          canRedo: function (origin) {
            var d = origin ? origenes[origin] : delegado();
            if (d) return d.canRedo ? !!d.canRedo() : true;
            return last(r, origin) >= 0;
          },
          // -> { ok, origen, motivo } ; motivo "nada" (empty) or "error"
          undo: function (origin) {
            var d = origin ? origenes[origin] : delegado();
            if (d) {
              if (d.canUndo && !d.canUndo()) return { ok: false, reason: "nothing" };
              return call(d.undo) ? { ok: true, origin: origin || foco } : { ok: false, reason: "error" };
            }
            var i = last(u, origin);
            if (i < 0) return { ok: false, reason: "nothing" };
            var e = u.splice(i, 1)[0];
            if (!call(e.undo)) return { ok: false, reason: "error" }; // the entry is dropped: it cannot be applied
            r.push(e);
            recortar(r);
            return { ok: true, origin: e.origin, label: e.label };
          },
          redo: function (origin) {
            var d = origin ? origenes[origin] : delegado();
            if (d) {
              if (d.canRedo && !d.canRedo()) return { ok: false, reason: "nothing" };
              return call(d.redo) ? { ok: true, origin: origin || foco } : { ok: false, reason: "error" };
            }
            var i = last(r, origin);
            if (i < 0) return { ok: false, reason: "nothing" };
            var e = r.splice(i, 1)[0];
            if (!call(e.redo)) return { ok: false, reason: "error" };
            u.push(e);
            recortar(u);
            return { ok: true, origin: e.origin, label: e.label };
          },
          clean: function (origin) {
            if (!origin) { u.length = 0; r.length = 0; return; }
            u = u.filter(function (e) { return e.origin !== origin; });
            r = r.filter(function (e) { return e.origin !== origin; });
          },
          state: function () { return { u: u.length, r: r.length, focus: foco }; },
        };
        return api;
      }

      // Watches a local value that changes in many places (the view of the map) and turns each settled change into an entry of the
      // global undo, without touching the code that changes it. leer() -> a plain object or null; poner(v) puts it back;
      // activo() (optional) says whether changes count right now (not while the map follows a job by itself).
      // Call tick() on a timer: a change is recorded when the value stays the same for two ticks (a drag or a pan is one entry).
      function tzWatchChanges(deshacer, origin, label, read, put, active) {
        var base = JSON.stringify(read());
        var baseVal = read();
        var seen = base;
        return {
          tick: function () {
            var v = read();
            var s = JSON.stringify(v);
            if (active && !active()) { base = s; baseVal = v; seen = s; return false; }
            if (s !== seen) { seen = s; return false; } // still changing
            if (s === base) return false;
            var before = baseVal, after = v;
            base = s; baseVal = v;
            deshacer.push({
              origin: origin,
              label: label,
              undo: function () { put(before); base = JSON.stringify(read()); baseVal = read(); seen = base; },
              redo: function () { put(after); base = JSON.stringify(read()); baseVal = read(); seen = base; },
            });
            return true;
          },
        };
      }
