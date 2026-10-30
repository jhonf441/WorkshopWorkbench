      // ---- Workbench page, part 7: zone table, zone editor and saved positions ----
      // Table of zones, the zone editor (and the history of a zone), the saved positions.

      // The state ptb is private to 29-zones-table*.js (step 6 of the restructuring, docs-internal/INTERFACES.md).
      // deps: nav (open tab, Zones inner tab, zone in the editor), data (zones, positions, files).
      function tzTableCreate(deps) {
        var ptb = { nav: deps.nav, data: deps.data };
        tzTableStart(ptb);
        deps.data.onPositions(tzBind(tzTableRenderPositions, ptb)); // the file read just took the saved positions
        return {
          buildEditorCard: function () { ptb.edCard = tzEl("div", "tz-card wf-card tz-form"); return ptb.edCard; },
          buildPositionsCard: function () { ptb.posCard = tzEl("div", "tz-card wf-card"); return ptb.posCard; },
          buildTableWrap: function () { ptb.tableWrap = tzEl("div"); ptb.tableWrap.style.overflowX = "auto"; return ptb.tableWrap; },
          editorCard: function () { return ptb.edCard; },
          positionsCard: function () { return ptb.posCard; },
          renderTable: tzBind(tzTableRenderTable, ptb),
          renderPositions: tzBind(tzTableRenderPositions, ptb),
          renderEditorEmpty: tzBind(tzTableRenderEditorEmpty, ptb),
          openEditor: tzBind(tzTableOpenEditor, ptb),
          openHistory: tzBind(tzTableOpenHistory, ptb),
          visionOrigin: tzBind(tzTableVisionOrigin, ptb),
        };
      }
