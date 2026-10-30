      // ---- Mode profiles of the Workbench (stage 1 of the redesign, 2.4.0) ----
      //
      // The interface is built from the MODE of the machine: the Workbench serves Laser and CNC (TZ_PROFILES). Every tool says in
      // which modes it exists and the page shows only those; the accent colour tells the mode at a glance. A mode that another plugin
      // serves (FFF: WorkshopPrinting, since 2026-10-21) shows no Workbench tool, only a card that sends there (TZ_MODES_ELSEWHERE). Pure data and two functions (no DOM), so that
      // a new tool or a new mode is one line here and tests/profile.test.js checks the table.
      //
      // The tabs are grouped by FUNCTION, not as a wizard (2026-10-18): Work zone (where the material is and what area can be cut),
      // Design and cut (draw, simulate, run) and Machine (offsets, levelling, mesh). Every tool is always one tap away.
      // Since 2026-10-21 the Machine group is its own plugin (WorkshopMachine, page /Plugins/Machine): its three tools register
      // themselves (tzRegisterTool, step 3) from src/WorkshopMachine/10-machine-page.js and are not in these tables.
      //
      // tool id -> modes in which it exists. A tool that is not here is shown in every mode (safe default).
      var TZ_TOOLS_MODES = {
        prepare: ["Laser", "CNC"],
        materials: ["Laser", "CNC"],
        zones: ["Laser", "CNC"],
        area: ["Laser", "CNC"], // the work area (cutting area) of each mode
        center: ["Laser", "CNC"],
        cuts: ["Laser"], // Laser editor: shapes, layers, power per layer
        large: ["Laser"], // Cut in parts
        simulate: ["Laser", "CNC"],
        job: ["Laser", "CNC"],
      };
      // tool id -> lowest role that sees it (F3-W of the redesign, 2026-10-21). The roles are viewer < operator < technician < admin
      // (WorkshopService dsf/permissions.py); the service applies them, the page only shows what the role can use. A tool that is not
      // here needs "operator" (safe default for a new tool is NOT to show it to a viewer). The Operator view groups the tools it keeps
      // in three sections (20-role-view.js). Tools registered later bring their own `minRole` (tzRegisterTool).
      var TZ_TOOLS_ROLE = {
        prepare: "operator",
        job: "operator",
        simulate: "operator",
        cuts: "operator",
        large: "operator",
        zones: "technician", // technical table of the zones: edit / delete
        area: "technician", // cut area of each mode
        center: "technician", // find the centre of a hole / piece (calibration style measuring)
        materials: "technician", // library of materials (the operator CHOOSES a material in Prepare)
      };
      var TZ_ROLE_RANK = { viewer: 0, operator: 1, technician: 2, admin: 3 };
      // pure: does `role` (viewer | operator | technician | admin) see the tool? An empty / unknown role sees everything (the
      // Technician view is the compatibility one: an old service or client answers no role).
      function tzToolVisibleForRole(role, id) {
        if (typeof role !== "string" || TZ_ROLE_RANK[role] === undefined) return true;
        var need = TZ_TOOLS_ROLE[id] || "operator";
        return TZ_ROLE_RANK[role] >= TZ_ROLE_RANK[need];
      }

      // the modes the Workbench serves, with their accent colour (the same as the cut areas of the map: Laser orange, CNC cyan)
      var TZ_PROFILES = {
        Laser: { accent: "#ff7043", label: "Laser" },
        CNC: { accent: "#26c6da", label: "CNC" },
      };
      var TZ_WORK_MODES = Object.keys(TZ_PROFILES);
      // modes of the machine that another plugin serves: the page hides its tools and says which plugin to open (30-zones-page-other-mode.js)
      var TZ_MODES_ELSEWHERE = {
        FFF: { accent: "#9e9e9e", label: "FFF", plugin: "WorkshopPrinting", path: "/Plugins/Printing", name: "zonesPage.other_mode_printing" },
      };
      // macro that switches the machine to each mode (sys/modestate.g, run with the machine idle)
      var TZ_MACROS_MODE = { Laser: "mode/selectlaser.g", CNC: "mode/selectcnc.g" };

      // profile of a mode; an unknown one (the state is not known yet) uses the Laser one so nothing disappears by mistake
      function tzProfileOf(mode) {
        return TZ_PROFILES[mode] || TZ_MODES_ELSEWHERE[mode] || TZ_PROFILES.Laser;
      }
      // the entry of TZ_MODES_ELSEWHERE of a mode another plugin serves, or null
      function tzModeElsewhere(mode) {
        return Object.prototype.hasOwnProperty.call(TZ_MODES_ELSEWHERE, mode) ? TZ_MODES_ELSEWHERE[mode] : null;
      }
      // Does the tool exist in the mode? A tool that names no modes exists in every mode the Workbench serves; while the mode is not
      // known yet everything is shown (nothing disappears by mistake); a mode served elsewhere only keeps a registered tool that names it.
      function tzToolVisible(mode, id) {
        var m = TZ_TOOLS_MODES[id];
        if (tzModeElsewhere(mode)) return !!m && m.indexOf(mode) >= 0;
        if (!m || !TZ_PROFILES[mode]) return true;
        return m.indexOf(mode) >= 0;
      }

      // ---- Groups of tools (stage 4 of the redesign; by function since 2026-10-18) ----
      // tool id -> group (1 Work zone, 2 Design and cut, 3 Machine). It is the grouping of the tabs
      // (TZ_PAGES.<page>.groups in 30-zones-page.js; tests/steps.test.js checks that both agree). A tool that is not here belongs to no
      // group; the Machine tools (group 3) are added by their registration.
      var TZ_STEPS_TOOLS = {
        prepare: 1, zones: 1, materials: 1, area: 1, center: 1,
        cuts: 2, large: 2, simulate: 2, job: 2,
      };

      // HOOK etapa 6/7: tools registered by later stages from their own file (at load time). A new tool is one call:
      //   tzRegisterTool({ id: "example", step: 2, modes: ["CNC"], name: "example.tab", tip: "example.tab_tip", icon: "cube-outline",
      //                            mount: function (host, card, parts) { ...fill the card...; return { render: fn, enable: fn }; } });
      // host = what the page gives a registered tool or module (pz.host in tzPagModules: createCtx, goLayout, layout, tool(id) and the
      // interfaces of the parts, docs-internal/INTERFACES.md).
      // name / tip are i18n keys (read when the page is mounted). tzMountPage adds the tab to the group of its step on the page that
      // has a group of that step (TZ_PAGES), creates its card in the side panel (the inspector), shows it only while the tool is open and
      // calls api.render() (when the machine state is known) and api.enable(); api.tick, api.refresh, api.mapModule, def.bar and
      // def.help are described at tzPagTools (30-zones-page-base.js). See docs-internal/ENGANCHES.md.
      var TZ_TOOLS_EXTRA = [];
      function tzRegisterTool(def) {
        // a bad registration must not take the whole page down at load time: it is reported and the tool is simply not there
        if (!def || !def.id || !def.step || !def.modes || typeof def.mount !== "function") { console.error("[Workbench] tzRegistrarHerramienta: incomplete definition", def); return false; }
        if (TZ_TOOLS_MODES[def.id] || TZ_TOOLS_EXTRA.some(function (d) { return d.id === def.id; })) { console.error("[Workbench] tzRegistrarHerramienta: repeated tool " + def.id); return false; }
        TZ_TOOLS_MODES[def.id] = def.modes;
        TZ_TOOLS_ROLE[def.id] = def.minRole || "operator";
        TZ_STEPS_TOOLS[def.id] = def.step;
        TZ_TOOLS_EXTRA.push(def);
        return true;
      }

      // HOOK etapa 5/6/7: modules that are not a tool (shortcuts, command palette, global undo...) register once, from their
      // own file (at load time), and tzMountPage mounts them when the page is complete (every part of the host exists) and closes them on destroy:
      //   tzRegisterModule({ id: "shortcuts", minRole: "technician", mount: function (host) { ...add listeners / elements...; return api; }, destroy: function (host, api) { ...remove them... } });
      // A module that adds window / document listeners MUST remove them in destroy (the page can be mounted again without a reload).
      // mount / destroy run inside try / catch: a failing module is reported on the console and the page goes on.
      var TZ_MODULES_EXTRA = [];
      function tzRegisterModule(def) {
        if (!def || !def.id || typeof def.mount !== "function") { console.error("[Workbench] tzRegistrarModulo: incomplete definition", def); return false; }
        if (TZ_MODULES_EXTRA.some(function (m) { return m.id === def.id; })) { console.error("[Workbench] tzRegistrarModulo: repeated module " + def.id); return false; }
        TZ_MODULES_EXTRA.push(def); // def.minRole: lowest role that gets the module (default "operator")
        return true;
      }
