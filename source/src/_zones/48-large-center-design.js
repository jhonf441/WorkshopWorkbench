      function tgGrCenterDesign(tg) {
        var b = (tg.preview && tg.preview.bbox) || (tg.data.summary && tg.data.summary.bbox) || [0, 0, 0, 0];
        return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
      }

      function tgGrOverDesign(tg, p) {
        if (!p || !tg.data.T || !(tg.preview || tg.data.summary)) return false;
        var b = (tg.preview && tg.preview.bbox) || tg.data.summary.bbox;
        var q = tgInverse(tg.data.T, p.x, p.y);
        return q[0] >= b[0] - 5 && q[0] <= b[2] + 5 && q[1] >= b[1] - 5 && q[1] <= b[3] + 5;
      }

      function tgGrCanMove(tg) {
        return !tg.data.done.length && tg.data.step === "place";
      }

      // -- place with 2 points of the piece (2026-10-11: "arranging the piece
      // is hard"): the front left corner and another point of the front
      // edge, with the pointer or by tapping the map. The design stays inside
      // the piece, `margen` mm from the two edges and straight with the front one.
      function tgGrPointPointer(tg) {
        var st = tg.ctx.machine.getSt();
        if (!st || !st.axes || !st.axes.X) return null;
        return [Math.round(st.axes.X.machinePosition * 100) / 100, Math.round(st.axes.Y.machinePosition * 100) / 100];
      }

      function tgGrPutPoint(tg, which, p) {
        if (!p) return tgGrSetMsg(tg, i18nT('large.no_machine_position'), false);
        tg.data.pts = tg.data.pts || {};
        tg.data.pts[which] = p;
        tgGrSave(tg);
        tgGrPlaceByPoints(tg);
      }

      function tgGrPlaceByPoints(tg) {
        var P = tg.data.pts || {}, e = P.corner, b = P.edge;
        if (!e || !b) {
          tgGrRender(tg, true);
          tg.ctx.map.redraw();
          return;
        }
        var dx = b[0] - e[0], dy = b[1] - e[1];
        if (Math.hypot(dx, dy) < 10) return tgGrSetMsg(tg, i18nT('large.the_two_points_are_too_close'), false);
        var turn = (Math.atan2(dy, dx) * 180) / Math.PI;
        var bb = (tg.preview && tg.preview.bbox) || (tg.data.summary && tg.data.summary.bbox) || [0, 0, 0, 0];
        var m = tg.data.margin == null ? 5 : tg.data.margin;
        var a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
        tg.data.T = { rotation: Math.round(turn * 100) / 100, tx: 0, ty: 0 };
        var q = tgApply(tg.data.T, bb[0], bb[1]);
        tg.data.T.tx = e[0] + c * m - s * m - q[0];
        tg.data.T.ty = e[1] + s * m + c * m - q[1];
        tg.M.text = "";
        tgGrMoved(tg);
      }

      function tgGrMoved(tg) {
        tg.data.T.tx = Math.round(tg.data.T.tx * 100) / 100;
        tg.data.T.ty = Math.round(tg.data.T.ty * 100) / 100;
        tgGrSave(tg);
        tgGrUpdateCounts(tg);
        tgGrRender(tg, true);
        tg.ctx.map.redraw();
      }

      // -- tarjeta --
      function tgGrButton(tg, text, cls, fn, confirmar, key) {
        var b = tzBtn(text, cls, fn, confirmar, key);
        if (tg.busy) b.disabled = true;
        return b;
      }

      function tgGrStep(tg, num, title, active, done) {
        var c = tzEl("div", "tz-card wf-card");
        c.style.cssText = "margin-top:10px;padding:10px;border-left:3px solid " + (active ? "#1976d2" : done ? "#66bb6a" : "rgba(255,255,255,0.15)") + ";" + (active || done ? "" : "opacity:0.6;");
        var h = tzEl("div");
        h.style.cssText = "font-weight:600;margin-bottom:6px;display:flex;gap:6px;";
        h.appendChild(tzEl("span", null, num + "."));
        h.appendChild(tzEl("span", null, title));
        c.appendChild(h);
        tg.card.appendChild(c);
        return c;
      }

      function tgGrNumber(tg, valor, alChange, ancho) {
        var i = tzEl("input", "tz-input");
        i.type = "number";
        i.step = "any";
        i.value = valor;
        i.style.width = (ancho || 70) + "px";
        i.addEventListener("change", function () {
          var v = parseFloat(i.value);
          if (isFinite(v)) alChange(v);
        });
        return i;
      }

