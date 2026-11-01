      // What the page can call on this module.
      function tzAgilityApi(A) {
        return {
          openPalette: tzBind(tzAgilityOpenPalette, A),
          menuContextual: tzBind(tzAgilityMenuContextual, A),
          record: A.record,
          undo: A.undo,
          memory: A.memory,
          button: A.button,
          destroy: tzBind(tzAgilityDestroy, A),
        };
      }
