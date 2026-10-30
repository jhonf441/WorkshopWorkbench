      // What the page can call on this module.
      function tgGrApi(tg) {
        return {
          draw: tzBind(tgGrDraw, tg),
          render: function () { tgGrRender(tg, false); },
          refresh: function () { return tgGrLoadPreview(tg).then(tzBind(tgGrUpdateCounts, tg)); },
          tipLines: tzBind(tgGrTipLines, tg),
          snapPoints: function () { return []; },
          wantsClick: function () { return tg.choosingOrigin || !!tg.touching; },
          onClick: function (p) {
            if (tg.touching && p) {
              var which = tg.touching;
              tg.touching = null;
              return tgGrPutPoint(tg, which, [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]);
            }
            if (!tg.choosingOrigin || !p) return;
            tg.choosingOrigin = false;
            tg.data.T.tx = Math.round(p.x * 100) / 100;
            tg.data.T.ty = Math.round(p.y * 100) / 100;
            tgGrSave(tg);
            tgGrUpdateCounts(tg);
            tgGrRender(tg, true);
            tg.ctx.map.redraw();
          },
          pointerDown: function (p) {
            if (tg.choosingOrigin || tg.touching || !tgGrCanMove(tg) || !tgGrOverDesign(tg, p)) return false;
            tg.drag = { p0: { x: p.x, y: p.y }, tx0: tg.data.T.tx, ty0: tg.data.T.ty };
            return true;
          },
          pointerMove: function (p) {
            if (!tg.drag || !p) return;
            tg.data.T.tx = tg.drag.tx0 + (p.x - tg.drag.p0.x);
            tg.data.T.ty = tg.drag.ty0 + (p.y - tg.drag.p0.y);
            tg.drawing = null;
            tg.ctx.map.redraw();
          },
          pointerUp: function () {
            if (!tg.drag) return;
            tg.drag = null;
            tgGrMoved(tg);
          },
          cursorAt: function (p) { return tg.choosingOrigin || tg.touching ? "crosshair" : tgGrCanMove(tg) && tgGrOverDesign(tg, p) ? "move" : ""; },
          dragging: function () { return !!tg.drag; },
        };
      }
