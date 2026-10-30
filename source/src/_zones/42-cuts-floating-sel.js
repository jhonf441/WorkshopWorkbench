      // ---- Selection strip ON the map (2026-10-18) ----
      //
      // What you do most with a selected shape, without going to the side panel: move it a little (1 mm; 10 mm with Shift), turn it 90
      // degrees (around the pivot of 41-cuts-rotate.js), duplicate it, change its layer and delete it. Scaling stays on the handles.
      // It is a second child of the box of the map, at the bottom centre, and only exists while something is selected.

      var TC_SEL_STEP = 1;
      var TC_SEL_STEP_LARGE = 10;

      // [icon, i18n key of the name, dx sign, dy sign]
      var TC_SEL_MOVE = [
        ["arrow-left", "cuts.nudge_left", -1, 0],
        ["arrow-right", "cuts.nudge_right", 1, 0],
        ["arrow-up", "cuts.nudge_up", 0, 1],
        ["arrow-down", "cuts.nudge_down", 0, -1],
      ];

      function tcSelBarRemove(tc) {
        if (tc.floatingSel && tc.floatingSel.parentNode) tc.floatingSel.parentNode.removeChild(tc.floatingSel);
        tc.floatingSelKey = "";
      }

      function tcSelBarLayer(tc) {
        var capas = tcSelShapes(tc).map(function (x) { return x.layer; });
        var same = capas.every(function (c) { return c === capas[0]; });
        var sel = tcLayerSelect(tc, same ? capas[0] : tc.data.layers[0].id, function (id) { tcMoveSelA(tc, id); });
        sel.title = i18nT("cuts.layer_4");
        sel.className = "tz-input tc-ft-layer";
        if (!same) sel.selectedIndex = -1;
        return sel;
      }

      function tcSelBarPaint(tc) {
        var box = tc.ctx.map.svgBox ? tc.ctx.map.svgBox() : null;
        var has = tc.floatingOn && tc.view === "cuts" && box && tcSelShapes(tc).length;
        if (!has) { tcSelBarRemove(tc); return; }
        if (!tc.floatingSel) {
          tc.floatingSel = tzEl("div", "tc-floating tc-floating-sel");
          tc.floatingSel.setAttribute("role", "toolbar");
          ["pointerdown", "pointerup", "click", "wheel", "dblclick"].forEach(function (ev) {
            tc.floatingSel.addEventListener(ev, function (e) { e.stopPropagation(); });
          });
        }
        if (tc.floatingSel.parentNode !== box) { box.appendChild(tc.floatingSel); tc.floatingSelKey = ""; }
        var key = JSON.stringify([tc.selIds, tcSelShapes(tc).map(function (x) { return x.layer; }), tc.data.layers.length]);
        if (key === tc.floatingSelKey) return;
        tc.floatingSelKey = key;
        tcSelBarArm(tc);
      }

      function tcSelBarArm(tc) {
        var bar = tc.floatingSel;
        bar.textContent = "";
        TC_SEL_MOVE.forEach(function (m) {
          bar.appendChild(tcFloatingButton(tc, m[0], i18nT(m[1]), false, function (e) {
            var step = e && e.shiftKey ? TC_SEL_STEP_LARGE : TC_SEL_STEP;
            tcMoveBy(tc, m[2] * step, m[3] * step, false);
          }));
        });
        bar.appendChild(tzEl("div", "tc-ft-sep"));
        bar.appendChild(tcFloatingButton(tc, "rotate-left", i18nT("cuts.rotate_left_90", { n: 90 }), false, function () { tcRotateSel(tc, 90); }));
        bar.appendChild(tcFloatingButton(tc, "rotate-right", i18nT("cuts.rotate_right_90", { n: 90 }), false, function () { tcRotateSel(tc, -90); }));
        bar.appendChild(tzEl("div", "tc-ft-sep"));
        bar.appendChild(tcFloatingButton(tc, "content-copy", i18nT("cuts.duplicate"), false, function () { tcDuplicateSel(tc, 5, 5); }));
        bar.appendChild(tcSelBarLayer(tc));
        bar.appendChild(tcFloatingButton(tc, "delete-outline", i18nT("common.delete"), false, tzBind(tcDeleteSel, tc)));
      }
