      // ---- Start-up card of the Workbench, step 1 "Prepare" (2026-10-15) ----
      //
      // A person who installs the plugins on THEIR machine may not have the macros, the probe or the zones the Workbench
      // uses. The card lists what each function needs and in what state it is (src/_shared/16-startup.js):
      // green = ready, orange = only the example, red = missing, grey = does not apply to this machine (never an error:
      // hardware is not promised). Nothing here moves the machine or writes over a file of the person.
      //
      //   1 service (added by the card itself)
      //   2 mode of the machine + the mode macros (macros/mode/select*.g; grey when the machine does not have them)
      //   3 hardware: probe (Level Z, Mesh, focus), measured cut area, one work zone, one material in the library
      //   4 the examples the Workbench ships (sd/sys/workshop/examples/WorkshopWorkbench/..., copied once by the service)

      // Pure rules (no DOM): tests/startup-workbench.test.js runs them.
      // Reads the text of a mode macro: null (does not exist) -> "na", only comments -> "example", any other line -> "configured".
      function tpStartupStateMacro(text) {
        if (text === null || text === undefined) return "na";
        var active = String(text).split(/\r?\n/).some(function (l) {
          var x = l.trim();
          return x && x[0] !== ";";
        });
        return active ? "configured" : "example";
      }

      // h = what the page knows: { modo: "Laser"|"CNC"|"?", sonda: bool, area: bool, zonas: n, materiales: n }
      // Returns the state of each check row; a tool that does not exist in the mode is grey (tzToolVisible).
      function tpStartupStates(h) {
        function inMode(id) {
          return tzToolVisible(h.mode, id);
        }
        return {
          mode: TZ_PROFILES[h.mode] ? "configured" : "missing",
          probe: h.probe ? "configured" : "na",
          area: !inMode("area") ? "na" : h.area ? "configured" : "missing",
          zone: h.zones > 0 ? "configured" : "missing",
          material: !inMode("materials") ? "na" : h.materials > 0 ? "configured" : "missing",
        };
      }

      // A macro of 0:/macros/; null when the machine does not have it.
      function tpStartupReadMacro(rel) {
        return fetch("/machine/file/" + encodeURIComponent("0:/macros/" + rel), { cache: "no-store" })
          .then(function (r) {
            return r.ok ? r.text() : null;
          })
          .catch(function () {
            return null;
          });
      }

      // What the page knows now, from the contract (21-contract.js).
      function tpStartupKnow(ctx) {
        var mats = window.__workshopMaterials;
        var zs = ctx.data.zones() || [];
        return {
          mode: ctx.machine.mode(),
          probe: !!ctx.data.offsetProbe(),
          area: !!ctx.cut.area(),
          zones: zs.filter(function (z) {
            return !!z;
          }).length,
          materials: Array.isArray(mats) ? mats.length : 0,
        };
      }

      // Assistant of the example "Z from here" (macros/probe/homezhere.g, 2026-10-17): nothing assumes the owner's probe or heights.
      // The lines that move the machine (G1, G30) come out commented by the assistant itself (docs-internal/STARTUP-WIZARD.md):
      // the person reads them and removes the ";" when they are right for the machine.
      function tpWizardHomezhere() {
        return {
          questions: [
            { id: "raise", kind: "number", min: 1, max: 50, defaultValue: 5, label: "startup_workbench.q_raise", help: "startup_workbench.q_raise_tip" },
            { id: "speed", kind: "number", integer: true, min: 100, max: 20000, defaultValue: 3000, label: "startup_workbench.q_feed", help: "startup_workbench.q_feed_tip" },
            { id: "probe", kind: "number", integer: true, min: 0, max: 9, defaultValue: 0, label: "startup_workbench.q_probe", help: "startup_workbench.q_probe_tip" },
            { id: "thickness", kind: "si_no", defaultValue: true, label: "startup_workbench.q_thickness", help: "startup_workbench.q_thickness_tip" },
          ],
          template: function (r) {
            var l = ["; Z from here (homezhere.g): Z0 with the probe where it stands", "; Made with the start-up assistant of the Workbench. Edit it whenever you need.", ";"];
            l.push("G91", "G1 H2 Z" + r.raise + " F" + r.speed + " S0   ; raise Z for safety", "G90", "G30 K" + r.probe);
            if (r.thickness) l.push('M98 P"0:/sys/workshop/macros/zsurface.g"   ; thickness of what was measured (needs a bed reference)');
            return l.join("\n");
          },
        };
      }

      // Rows of the card; ctx = contract. Each check reads the page when the card refreshes.
      function tpStartupDefs(ctx) {
        function state(key) {
          return function () {
            return tpStartupStates(tpStartupKnow(ctx))[key];
          };
        }
        function macroMode(mode) {
          return function () {
            return tpStartupReadMacro(TZ_MACROS_MODE[mode]).then(tpStartupStateMacro);
          };
        }
        return [
          { id: "mode", label: "startup_workbench.mode", what: "startup_workbench.mode_what", why: "startup_workbench.mode_for", ifMissing: "startup_workbench.mode_missing", help: "startup_workbench.mode_tip", texts: { configured: "startup_workbench.mode_known", missing: "startup_workbench.mode_unknown" }, check: state("mode") },
          { id: "mode_laser", label: "startup_workbench.macro_laser", what: "startup_workbench.macro_laser_what", why: "startup_workbench.macro_laser_for", ifMissing: "startup_workbench.macro_laser_missing", help: "startup_workbench.macro_tip", check: macroMode("Laser") },
          { id: "mode_cnc", label: "startup_workbench.macro_cnc", what: "startup_workbench.macro_cnc_what", why: "startup_workbench.macro_cnc_for", ifMissing: "startup_workbench.macro_cnc_missing", help: "startup_workbench.macro_tip", check: macroMode("CNC") },
          { id: "probe", label: "startup_workbench.probe", what: "startup_workbench.probe_what", why: "startup_workbench.probe_for", ifMissing: "startup_workbench.probe_missing", help: "startup_workbench.probe_tip", texts: { configured: "startup_workbench.probe_found", na: "startup_workbench.probe_none" }, check: state("probe") },
          { id: "cutarea", label: "startup_workbench.cutarea", what: "startup_workbench.cutarea_what", why: "startup_workbench.cutarea_for", ifMissing: "startup_workbench.cutarea_missing", help: "startup_workbench.cutarea_tip", texts: { configured: "startup_workbench.cutarea_ok", missing: "startup_workbench.cutarea_missing" }, check: state("area") },
          { id: "zone", label: "startup_workbench.zone", what: "startup_workbench.zone_what", why: "startup_workbench.zone_for", ifMissing: "startup_workbench.zone_missing", help: "startup_workbench.zone_tip", texts: { configured: "startup_workbench.zone_ok", missing: "startup_workbench.zone_missing" }, check: state("zone") },
          { id: "material", label: "startup_workbench.material", what: "startup_workbench.material_what", why: "startup_workbench.material_for", ifMissing: "startup_workbench.material_missing", help: "startup_workbench.material_tip", texts: { configured: "startup_workbench.material_ok", missing: "startup_workbench.material_missing" }, check: state("material") },
          // example shipped by the Workbench (it needs the probe: grey on a machine without one, see tpStartupCreate)
          { id: "homezhere", file: "macros/probe/homezhere.g", label: "startup_workbench.homezhere", what: "startup_workbench.homezhere_what", why: "startup_workbench.homezhere_for", ifMissing: "startup_workbench.homezhere_missing", help: "startup_workbench.homezhere_tip", wizard: tpWizardHomezhere() },
        ];
      }

      // The card shown at the top of the Prepare card. Its element is kept: the page redraws around it.
      // refrescar() decides which rows apply (the probe) and then lets the card ask the service and the page.
      function tpStartupCreate(ctx) {
        var rows = tpStartupDefs(ctx);
        var card = workshopStartupInput({ plugin: "WorkshopWorkbench", rows: rows, createOnStart: true, up: "10px" }); // a strip; the card is in the dialog
        return {
          el: card.el,
          refresh: function () {
            var conProbe = !!ctx.data.offsetProbe();
            // the mode macros are rows only of a machine that switches between modes (2 or more answered, like the other cards)
            return workshopModes.load(false).then(function (info) {
              var on = workshopModesEnabled(info.state);
              rows.forEach(function (d) {
                if (d.file) d.applies = conProbe;
                if (d.id === "mode_laser" || d.id === "mode_cnc") d.applies = on.length >= 2 && on.indexOf(d.id === "mode_laser" ? "Laser" : "CNC") >= 0;
              });
              return card.refresh();
            });
          },
        };
      }
