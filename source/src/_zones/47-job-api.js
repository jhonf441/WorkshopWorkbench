      // What the page can call on this module.
      function tjTrApi(tj) {
        return {
          info: tzBind(tjTrInfo, tj),
          hits: tzBind(tjTrHits, tj),
          draw: tzBind(tjTrDraw, tj),
          layer: tzBind(tjTrLayer, tj), // the kept group of the job, for the fixed layers of the map
          render: tzBind(tjTrRender, tj),
          refresh: tzBind(tjTrLoad, tj),
          // hides the path of the last recorded job on the map (it comes back with the next job); nothing is deleted
          hide: function () { if (tj.trace && !tj.trace.active && !tj.viewId) tjTrSetHidden(tj, true); },
          tipLines: tzBind(tjTrTipLines, tj),
          snapPoints: function () { return []; },
          wantsClick: function () { return false; },
          onClick: function () {},
          pointerDown: function () { return false; },
          pointerMove: function () {},
          pointerUp: function () {},
          cursorAt: function () { return ""; },
          dragging: function () { return false; },
        };
      }
