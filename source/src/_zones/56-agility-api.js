      // What the page can call on this module.
      function tzAgilityApi(A) {
        return {
          openPalette: tzBind(tzAgilityOpenPalette, A),
          menuContextual: tzBind(tzAgilityMenuContextual, A),
          record: A.record,
          undo: A.undo,
          memory: A.memory,
          button: A.button,
          destroy: function () {
            A.mounted = false;
            document.removeEventListener("keydown", tzBind(tzAgilityOnKey, A));
            tzAgilityClosePalette(A);
            tzAgilityCloseMenu(A);
            clearTimeout(A.noticeT);
            if (A.noticeEl && A.noticeEl.parentNode) A.noticeEl.parentNode.removeChild(A.noticeEl);
          },
        };
      }
