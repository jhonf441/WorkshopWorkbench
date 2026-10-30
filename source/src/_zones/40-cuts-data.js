      function tcSnapOf(tc) {
        return JSON.stringify({ shapes: tc.data.shapes, nextId: tc.data.nextId, archived: tc.data.archived || [] });
      }

      // save() saves AND records the step for Undo (up to 60 steps).
      function tcSave(tc, noUndo) {
        var cur = tcSnapOf(tc);
        if (!noUndo && tc.lastSnap !== null && cur !== tc.lastSnap) {
          tc.undoStack.push(tc.lastSnap);
          if (tc.undoStack.length > 60) tc.undoStack.shift();
          tc.redoStack = [];
        }
        tc.lastSnap = cur;
        tc.tcSd.save(tc.data);
      }

      function tcRestoreSnap(tc, js) {
        var o = JSON.parse(js);
        tc.data.shapes = o.shapes;
        tc.data.nextId = o.nextId;
        tc.data.archived = o.archived || [];
        tc.selIds = tc.selIds.filter(function (id) { return !!tcShapeById(tc, id); });
        if (tc.sel && !tcShapeById(tc, tc.sel)) tc.sel = tc.selIds[0] || null;
      }

      function tcUndo(tc) {
        if (!tc.undoStack.length) return;
        tc.redoStack.push(tcSnapOf(tc));
        tcRestoreSnap(tc, tc.undoStack.pop());
        tc.lastSnap = tcSnapOf(tc);
        tcSave(tc, true);
        tcGo(tc);
      }

      function tcRedo(tc) {
        if (!tc.redoStack.length) return;
        tc.undoStack.push(tcSnapOf(tc));
        tcRestoreSnap(tc, tc.redoStack.pop());
        tc.lastSnap = tcSnapOf(tc);
        tcSave(tc, true);
        tcGo(tc);
      }

      function tcIsSelId(tc, id) {
        return tc.selIds.indexOf(id) >= 0;
      }

      function tcSelShapes(tc) {
        return tc.data.shapes.filter(function (x) { return tcIsSelId(tc, x.id); });
      }

      function tcSetSel(tc, ids) {
        tc.selIds = ids.slice();
        tc.sel = tc.selIds.length ? tc.selIds[tc.selIds.length - 1] : null;
      }

      function tcToggleSel(tc, id) {
        if (tcIsSelId(tc, id)) tcSetSel(tc, tc.selIds.filter(function (x) { return x !== id; }));
        else tcSetSel(tc, tc.selIds.concat([id]));
      }

      function tcLayerById(tc, id) {
        return tc.data.layers.filter(function (L) { return L.id === id; })[0] || tc.data.layers[0];
      }

      // Each shape takes power/speed/passes from ITS layer (the rest of the
      // code -- validate, estimate, generate the G-code -- keeps reading
      // s.power/s.speed/s.passes).
      function tcSyncLayers(tc) {
        tc.data.shapes.forEach(function (sh) {
          var L = tcLayerById(tc, sh.layer);
          sh.layer = L.id;
          sh.power = L.power;
          sh.speed = L.speed;
          sh.passes = L.passes;
        });
      }

      function tcShapesInCutOrder(tc) {
        var out = [];
        tc.data.layers.forEach(function (L) {
          if (L.hidden) return; // capa apagada: no se corta
          tc.data.shapes.forEach(function (sh) { if (sh.layer === L.id && (!sh.cut || tc.data.trim)) out.push(sh); });
        });
        return out;
      }

