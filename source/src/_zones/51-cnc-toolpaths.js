      // ---- CNC toolpaths card (stage 7 of the redesign): step 3 "Edit", CNC mode only ----
      //
      // Draw simple shapes (line, rectangle, circle, pocket), say how deep, and get a G-code file with passes by depth. It is a
      // separate tool from the Laser editor (40-cuts.js): nothing of it is shared or touched. The calculation lives in
      // 51-cnc-pure.js (pure, tested); this file is only the card and the map hooks.
      //
      // Safety: the card never moves the machine by itself. "Create file" only writes a .gcode in 0:/gcodes; "Start" is a double
      // tap button that needs the machine free (ctx.machine.free()), the CNC mode, a valid plan and the file made from the
      // CURRENT design (any change makes the file stale). The checks of postCode (risks, movement owner) still apply.
      //
      // Data: sys/workshop/data/cnc-designs.json (own versioned format, see tzCncDesignsRead) and a draft of the design being
      // edited in localStorage "workshopCncShapes".

      var TCN_FILE = "0:/sys/workshop/data/cnc-designs.json";
      var TCN_DRAFT_KEY = "workshopCncShapes";
      var TCN_DIR = "0:/gcodes/";
      // tab of the page (id, label, tip) and its icon: the page only registers them
      var TCN_TAB_ID = "toolpaths";
      var TCN_TAB_ICON = "vector-polyline";

      var TCN_KINDS_TXT = {
        line: function () { return i18nT('cnc.type_line'); },
        rect: function () { return i18nT('cnc.type_rect'); },
        circle: function () { return i18nT('cnc.type_circle'); },
        pocket: function () { return i18nT('cnc.type_pocket'); },
      };
      function tcnDesignNew(n) {
        return { id: "d" + Date.now().toString(36), name: i18nT('cnc.design_n', { n: n }), materialId: "", units: "mm", direction: "ccw", tool: {}, shapes: [] };
      }
      // file name from the name of the design: letters, digits, dash, underscore
      function tcnNameFile(nombre) {
        var s = String(nombre || "").replace(/[^A-Za-z0-9_\-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
        return "cnc-" + (s || "design") + ".gcode";
      }

      function tzCncAssemble(ctx) {
        var cnc = { ctx: ctx };
        tzCncTrayStart(cnc);
        return tzCncTrayApi(cnc);
      }

      // The tool joins the page by registration (20-mode-profile.js): step 3 (Edit), CNC mode only. Its map module (draw, clicks) is the
      // object tzCncAssemble returns.
      if (typeof tzRegisterTool === "function") {
        tzRegisterTool({
          id: TCN_TAB_ID, step: 2, minRole: "technician", modes: ["CNC"], name: "cnc.tab", tip: "cnc.tab_tip", icon: TCN_TAB_ICON,
          mount: function (host, card) {
            var m = tzCncAssemble(host.createCtx(TCN_TAB_ID, { card: card }));
            return { render: function () { m.render(); }, modMap: m };
          },
        });
      }
