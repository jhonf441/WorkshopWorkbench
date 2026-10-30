      // ---- Agility of the Workbench: command palette, shortcuts, global undo, right-click menu (stage 5 of the redesign) ----
      //
      // The only file of stage 5 that touches the DOM. The logic is in the pure files 52 (commands), 53 (shortcuts), 54 (undo) and
      // 55 (favorites); this one builds the palette and the menu, listens to the keyboard and joins everything to the page through ONE
      // adapter object `A` that the page gives (see docs-internal/ENGANCHES-ETAPA5.md for the list of fields):
      //   A.page, A.header          elements of the page (the palette button goes in the header)
      //   A.live()                  the page is still mounted
      //   A.mode()                  mode of the machine ("Laser" | "CNC" | another | null)
      //   A.layout(), A.goLayout(id)
      //   A.steps()                 [{ etiqueta, herramientas: [tool ids] }] the steps of the flow, in order
      //   A.tools()          [{ id, etiqueta, ayuda }] the tools that exist on this page
      //   A.free()                 machine free (tzMachineFree of the page); used by the guard of the commands that could move it
      //   A.tool(), A.setTool(t), A.puedeMedir()         tool of the map
      //   A.zonaActiva(), A.zoomin(), A.zoomout(), A.adjust(), A.screen(), A.cancel() (true if it closed something)
      //   A.cuts()                the laser editor module (undo, redo, historial) or null
      //   A.view = { leer(), poner(v), activo() }       view of the map (zoom, pan, rotation, mirror)
      //   A.repintar()              repaint what shows the undo state (optional)
      //   A.timers                  array of the page whose intervals are cleared when it is destroyed
      // No command of this file moves the machine; the guard of tzExecuteCommand is there for the ones that come later.

      var TZ_AGILITY_STYLE_ID = "workshop-workbench-agility-style";
      function tzAgilityStyles() {
        if (document.getElementById(TZ_AGILITY_STYLE_ID)) return;
        var s = document.createElement("style");
        s.id = TZ_AGILITY_STYLE_ID;
        // floating panel: palette of DESIGN.md (dark; the light theme is converted by 03-theme.js through data-tp-panel)
        s.textContent = [
          ".tz-ag-background{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;padding:8vh 12px 12px;box-sizing:border-box;}",
          ".tz-ag-box{background:#1e272c;color:#eceff1;border:1px solid rgba(255,255,255,.12);border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.5);width:100%;max-width:560px;max-height:80vh;display:flex;flex-direction:column;font-family:Roboto,sans-serif;font-size:13px;}",
          ".tz-ag-box input{background:#263238;color:#eceff1;border:0;border-bottom:1px solid rgba(255,255,255,.12);border-radius:8px 8px 0 0;padding:12px 14px;font-size:15px;outline:none;width:100%;box-sizing:border-box;}",
          ".tz-ag-box input:focus{border-bottom-color:#1976d2;}",
          ".tz-ag-list{overflow-y:auto;padding:4px 0;min-height:0;}",
          ".tz-ag-row{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 4px;cursor:pointer;min-height:36px;}",
          ".tz-ag-row.sel{background:rgba(25,118,210,.35);}",
          ".tz-ag-star{background:transparent;border:0;color:#b0bec5;cursor:pointer;font-size:18px;line-height:1;padding:6px;border-radius:4px;}",
          ".tz-ag-star.on{color:#ffe082;}",
          ".tz-ag-txt{flex:1;min-width:0;display:flex;flex-direction:column;}",
          ".tz-ag-help{color:#b0bec5;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
          ".tz-ag-shortcut{background:transparent;color:#b0bec5;font:inherit;font-size:11px;border:1px solid rgba(255,255,255,.18);border-radius:4px;padding:1px 6px;white-space:nowrap;cursor:pointer;}",
          ".tz-ag-shortcut.empty{opacity:.35;}.tz-ag-row:hover .tz-ag-shortcut.empty,.tz-ag-shortcut.cap{opacity:1;}",
          ".tz-ag-shortcut.cap{border-color:#ffb74d;color:#ffb74d;}",
          ".tz-ag-reset{margin-top:6px;background:transparent;color:#90caf9;border:0;padding:2px 0;cursor:pointer;font-size:11px;text-decoration:underline;}",
          ".tz-ag-empty{padding:14px;color:#b0bec5;}",
          ".tz-ag-foot{padding:8px 14px;color:#b0bec5;font-size:11px;border-top:1px solid rgba(255,255,255,.12);line-height:1.4;}",
          ".tz-ag-menu{position:fixed;z-index:2147483000;background:#1e272c;color:#eceff1;border:1px solid rgba(255,255,255,.12);border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.5);padding:4px 0;min-width:200px;max-width:320px;font-family:Roboto,sans-serif;font-size:13px;}",
          ".tz-ag-item{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:7px 12px;cursor:pointer;}",
          ".tz-ag-item:hover{background:rgba(25,118,210,.35);}",
          ".tz-ag-item.off{color:#78909c;cursor:default;}",
          ".tz-ag-item.off:hover{background:transparent;}",
          ".tz-ag-sep{height:1px;background:rgba(255,255,255,.12);margin:4px 0;}",
          ".tz-ag-notice{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483000;background:#263238;color:#eceff1;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:8px 14px;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.45);max-width:90vw;}",
          "@media (pointer:coarse){.tz-ag-row{min-height:48px;}.tz-ag-item{padding:12px 14px;}.tz-ag-star{padding:10px;}.tz-ag-box input{font-size:16px;}}",
        ].join("\n");
        document.head.appendChild(s);
      }

      function tzAgilityAssemble(A) {
        tzAgilityStart(A);
        return tzAgilityApi(A);
      }
