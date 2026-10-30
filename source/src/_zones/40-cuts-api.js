      // What the page (30-zones-page.js) and the map toolbar can call on the Cortes module.
      function tcCutsApi(tc) {
        return {
          takeVisionShape: tzBind(tcTakeVisionShape, tc),
          snapPoints: tzBind(tcSnapPoints, tc),
          setView: tzBind(tcSetView, tc),
          draw: tzBind(tcDraw, tc),
          wantsCamera: tzBind(tcWantsCamera, tc),
          // Undo / Redo from the map's work bar (2026-10-10)
          undo: tzBind(tcUndo, tc),
          redo: tzBind(tcRedo, tc),
          history: function () { return { u: tc.undoStack.length, r: tc.redoStack.length }; },
          wantsClick: tzBind(tcWantsClick, tc),
          onClick: tzBind(tcOnClick, tc),
          render: tzBind(tcRender, tc),
          floating: tzBind(tcFloatingShow, tc),
          tipLines: tzBind(tcTipLines, tc),
          buildJob: tzBind(tcBuildJob, tc),
          validate: function () { return tcValidate(tc); }, // what stops a cut: the "Ready to cut" card reads it (46-ready.js)
          pointerDown: tzBind(tcPointerDown, tc),
          pointerMove: tzBind(tcPointerMove, tc),
          pointerUp: tzBind(tcPointerUp, tc),
          cursorAt: tzBind(tcCursorAt, tc),
          dragging: function () { return !!tc.drag; },
        };
      }
