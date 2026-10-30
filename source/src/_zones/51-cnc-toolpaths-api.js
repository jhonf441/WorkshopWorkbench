      // What the page can call on this module.
      function tzCncTrayApi(cnc) {
        return {
          draw: tzBind(tzCncTrayDraw, cnc),
          render: function () { tzCncTrayRender(cnc, false); },
          refresh: function () { tzCncTrayRender(cnc, false); },
          tipLines: function () { return []; },
          snapPoints: function () { return []; },
          wantsClick: function () { return !!cnc.placing; },
          onClick: function (p) { if (p) tzCncTrayPutPoint(cnc, p); },
          pointerDown: function () { return false; },
          pointerMove: function () {},
          pointerUp: function () {},
          cursorAt: function () { return cnc.placing ? "crosshair" : ""; },
          dragging: function () { return false; },
        };
      }
