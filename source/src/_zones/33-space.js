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
        ".tz-hdstate{display:flex;flex-wrap:wrap;align-items:center;gap:2px 14px;font-size:13px;}",
        ".tz-hdstate .tz-hdcell{display:inline-flex;align-items:center;gap:5px;}",
        ".tz-hdstate .tz-hdstop{margin-left:auto;display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;}",
        ".tz-hdstate .tz-hdcell b{font-weight:600;opacity:.65;}",
        ".tz-hdstate .tz-e-lock{padding:1px 10px;border-radius:10px;font-weight:700;color:#fff;background:#c62828;}",
        ".tz-hdstate .tz-e-hint{font-weight:600;color:#ffb74d;}",
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
