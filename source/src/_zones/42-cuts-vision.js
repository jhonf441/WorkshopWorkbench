      // Shape sent by Vision ("Take to the Laser Editor", 2026-10-10):
      // window.__workshop.visionForma = {nombre, ts, contorno: [[x,y],...],
      // agujeros: [[[x,y],...],...], ang, w, h} in machine mm (bed
      // coords). It is added to the active layer, in its real place, selected.
      function tcTakeVisionShape(tc) {
        var t = window.__workshop;
        var vf = t && t.visionShape;
        if (!vf || !Array.isArray(vf.outline) || vf.outline.length < 3) return false;
        t.visionShape = null;
        var aPts = function (poly) {
          return poly.map(function (q) { return { x: Math.round(Number(q[0]) * 1000) / 1000, y: Math.round(Number(q[1]) * 1000) / 1000 }; })
            .filter(function (q) { return isFinite(q.x) && isFinite(q.y); });
        };
        var ids = [];
        var c = aPts(vf.outline);
        if (c.length >= 3) {
          tcAddShape(tc, { type: "path", pts: c, closed: true });
          ids.push(tc.data.nextId - 1);
        }
        (vf.holes || []).forEach(function (h) {
          var hp = aPts(h || []);
          if (hp.length >= 3) {
            tcAddShape(tc, { type: "path", pts: hp, closed: true });
            ids.push(tc.data.nextId - 1);
          }
        });
        if (!ids.length) return false;
        tcSetSel(tc, ids);
        tcSave(tc);
        var bb = tcBBox(tcSelShapes(tc));
        var outside = bb && !tcInArea(tc, bb);
        tcSetMsg(tc, i18nT('cuts.vision_shape_layer', { v: vf.name || i18nT('cuts.piece_2'), n: ids.length, v2: ids.length === 1 ? i18nT('cuts.shape_3') : i18nT('cuts.shapes_3'), name: tcLayerById(tc, tc.data.activeLayer).name, v3: outside ? i18nT('cuts.careful_it_ends_up_outside_the') : "" }), !outside);
        tcGo(tc);
        tc.ctx.map.redraw();
        return true;
      }

