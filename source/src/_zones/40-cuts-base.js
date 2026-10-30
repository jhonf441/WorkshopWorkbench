      function tcShapeById(tc, id) {
        return tc.data.shapes.filter(function (s) { return s.id === id; })[0] || null;
      }

      function tcSetMsg(tc, t, ok) {
        tc.M.set(t, ok);
      }

      function tcGo(tc) {
        tc.lastKey = "";
        tcRender(tc);
        tc.ctx.map.redraw();
      }

      function tcHeadPoint(tc) {
        var st = tc.ctx.machine.getSt();
        var ax = st && st.axes;
        if (!ax || !ax.X || !ax.Y || !ax.X.homed || !ax.Y.homed) return null;
        return { x: ax.X.machinePosition, y: ax.Y.machinePosition }; // puntero = coords de cama
      }

      function tcAddShape(tc, s) {
        s.id = tc.data.nextId++;
        s.layer = tcLayerById(tc, tc.data.activeLayer).id;
        tcSyncLayers(tc);
        tc.data.shapes.push(s);
        tcSyncLayers(tc);
        tcSetSel(tc, [s.id]);
        tcSave(tc);
      }

