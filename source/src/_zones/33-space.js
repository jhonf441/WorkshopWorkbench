      // ---- Workbench page, part 10 (stage 4 of the redesign): one workspace ----
      // Step bar on top (Prepare > Position > Edit > Simulate > Run, every step one tap away), the tools in the left bar (the tabs),
      // the map in the middle, the inspector on the right (the side panel with the card of the open tool; on a narrow screen it
      // folds down to its header) and a status bar that is always visible below. Everything here only SHOWS what the page already
      // knows (the machine state and the open tab): no other timer, no other request; the status bar is painted by the same status cycle as the map.
      // The pure parts (which steps, what the bar says) are in 34-steps.js.
      TZ_CSS_EXTRA.push([
        "/* espacio (stage 4) */",
        ".tz-steps{display:flex;gap:4px;align-items:center;overflow-x:auto;scrollbar-width:none;margin:0 0 10px 0;padding:2px;}",
        ".tz-steps::-webkit-scrollbar{display:none;}",
        ".tz-step{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border:1px solid rgba(255,255,255,.2);border-radius:17px;background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap;}",
        ".tz-step:hover{background:rgba(255,255,255,.07);}",
        ".tz-step.on{border-color:var(--tz-accent,#1976d2);background:rgba(255,255,255,.09);font-weight:600;box-shadow:inset 0 -3px 0 var(--tz-accent,#1976d2);}",
        ".tz-step-sep{flex:0 0 auto;opacity:.45;font-size:18px;line-height:1;}",
        ".theme--light .tz-step{border-color:rgba(0,0,0,.22);}",
        ".theme--light .tz-step:hover{background:rgba(0,0,0,.05);}",
        ".theme--light .tz-step.on{background:rgba(0,0,0,.06);}",
        ".tz-state{position:sticky;bottom:0;z-index:7;display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin-top:10px;padding:6px 12px;border-radius:6px;background:#1e1e1e;border:1px solid rgba(255,255,255,.14);font-size:12px;line-height:1.4;box-shadow:0 -3px 10px rgba(0,0,0,.35);}",
        ".theme--light .tz-state{background:#fff;border-color:rgba(0,0,0,.14);box-shadow:0 -3px 10px rgba(0,0,0,.12);}",
        ".tz-state .tz-e-lock{display:inline-block;padding:1px 10px;border-radius:10px;font-weight:700;color:#fff;background:#c62828;}",
        ".tz-state .tz-e-job{display:inline-flex;gap:6px;margin-left:auto;}",
        ".tz-e-num{font-variant-numeric:tabular-nums;}",
        // 2026-11-22 header in ONE line (requested: "limit everything to a single line"): badge, title, mode chip, the live state of the machine
        // (state, zone, lock), the start-up chip and the Commands button. Nothing wraps: what does not fit is cut with an ellipsis (the full
        // text is in the title attribute); the head position (X Y Z) moved to the bar over the map (28-map-tools-measure.js); the size, the title and the
        // one lead line are the bar of the family (design/family.css), the same as every plugin (2026-11-22, lote 10). The place of each child is its CSS order (they are added from several files).
        ".tz-hd.wf-bar{flex-wrap:nowrap;align-items:center;overflow:hidden;}",
        ".tz-hd.wf-bar > *{order:5;flex:0 0 auto;min-width:0;}",
        ".tz-hd.wf-bar > .wf-badge{order:1;}",
        ".tz-hd.wf-bar > .wf-bar-txt{order:2;flex:0 1 auto;min-width:0;}",
        ".tz-hd.wf-bar > .wf-bar-right{order:3;margin-left:0;}",
        ".tz-hd.wf-bar > .tz-hdstate{order:4;flex:1 1 0;min-width:0;}",
        // the start-up chip and the Commands button close the line, on the right
        ".tz-hd.wf-bar > [data-workshop-startup-input]{order:6;}",
        ".tz-hd.wf-bar > [data-tz-palette-btn]{order:7;}",
        // phone / small screen (s): row 1 = badge + the WHOLE title (it never gets cut); row 2 = state, chips and Commands
        "@media (max-width:899px){.tz-hd.wf-bar{flex-wrap:wrap;overflow:visible;}.tz-hd.wf-bar > .wf-bar-txt{flex:1 1 calc(100% - 64px);}.tz-hd.wf-bar .wf-title{white-space:normal;overflow:visible;text-overflow:clip;}.tz-hd.wf-bar > .tz-hdstate{flex:1 1 120px;}.tz-hd.wf-bar > [data-workshop-startup-input],.tz-hd.wf-bar > [data-tz-palette-btn],.tz-hd.wf-bar > .wf-bar-right{margin-top:0;}}",
        ".tz-hdstate{display:flex;flex-wrap:nowrap;align-items:center;gap:2px 14px;font-size:13px;overflow:hidden;white-space:nowrap;}",
        ".tz-hdstate .tz-hdcell{display:inline-flex;align-items:center;gap:5px;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;}",
        ".tz-hdstate .tz-hdstop{margin-left:auto;display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap;}",
        ".tz-hdstate .tz-hdcell b{font-weight:600;opacity:.65;}",
        ".tz-hdstate .tz-e-lock{padding:1px 10px;border-radius:10px;font-weight:700;color:#fff;background:#c62828;}",
        ".tz-hdstate .tz-e-hint{font-weight:600;color:var(--wf-n-down-text,#ffb74d);}",
        ".tz-hdstate .tz-e-point{display:inline-block;width:9px;height:9px;border-radius:50%;}",
        ".tz-insp-head{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;font-size:12px;background:rgba(255,255,255,.05);border-left:3px solid var(--tz-accent,#1976d2);}",
        ".theme--light .tz-insp-head{background:rgba(0,0,0,.05);}",
        ".tz-insp-head .tz-insp-tool{font-weight:600;}",
        ".tz-insp-head .tz-insp-sp{margin-left:auto;opacity:.7;}",
        ".tz-insp-toggle{display:none;align-items:center;justify-content:center;width:30px;height:30px;border:none;border-radius:6px;background:transparent;color:inherit;cursor:pointer;}",
        ".tz-insp-toggle:hover{background:rgba(255,255,255,.08);}",
        ".tz-ws.narrow .tz-insp-toggle{display:inline-flex;}",
        ".tz-ws.narrow .tz-ws-side.tz-insp-closed>*:not(.tz-insp-head){display:none !important;}",
        ".tz-ws.narrow .tz-state{gap:2px 10px;padding:4px 8px;margin-top:6px;}",
        // 2026-10-16 ("the information bar overlaps the main buttons, even on the Pi"): stuck to the bottom edge it
        // covered the end of the editor on short screens. It only stays stuck if the window is tall; otherwise it goes at the end
        // of the page, in its place.
        "@media (max-height:899px){.tz-state{position:static;box-shadow:none;}}",
        ".tz-ws.narrow .tz-state{position:static;box-shadow:none;}",
      ].join("\n"));

      // The state psp is private to 33-space*.js (step 6 of the restructuring, docs-internal/INTERFACES.md).
      // deps: shell (the side panel is the inspector), nav (the open tool, the tabs), data (machine state and zones).
      function tzSpaceCreate(deps) {
        var psp = { shell: deps.shell, nav: deps.nav, data: deps.data };
        tzSpaceStart(psp);
        return {
          createSteps: tzBind(tzSpaceCreateSteps, psp),
          createHead: tzBind(tzSpaceCreateHead, psp),
          createState: tzBind(tzSpaceCreateState, psp),
          createInspector: tzBind(tzSpaceCreateInspector, psp),
          paint: tzBind(tzSpacePaint, psp),
        };
      }
