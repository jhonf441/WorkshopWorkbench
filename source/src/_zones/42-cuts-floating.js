      // ---- Drawing tools ON the map (2026-10-18) ----
      //
      // The tools to draw sit over the map, where the drawing is done, and not in the long side panel: select, line, polyline,
      // rectangle, circle and import an SVG. The panel keeps what is about the shapes (layers, list, selection, cut).
      // The strip is a child of the box of the map (ctx.map.svgBox); the page tells when the laser editor tab is open
      // (cuts.floating(true / false) in applyLayout) and the strip leaves the DOM when it is not.

      // [id, mdi icon, i18n key of the name]
      var TC_FLOATING_TOOLS = [
        ["select", "cursor-default", "cuts.tool_select"],
        ["line", "vector-line", "cuts.line"],
        ["poly", "vector-polyline", "cuts.polyline"],
        ["rect", "vector-rectangle", "cuts.rectangle"],
        ["circle", "vector-circle", "cuts.circle"],
      ];

      function tcFloatingShow(tc, on) {
        tc.floatingOn = !!on;
        tcFloatingPaint(tc);
        tcSelBarPaint(tc);
      }

      function tcFloatingButton(tc, icon, nombre, active, alTocar) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "tc-ft" + (active ? " on" : "");
        b.title = nombre;
        b.setAttribute("aria-label", nombre);
        var ic = document.createElement("span");
        ic.className = "mdi mdi-" + icon;
        b.appendChild(ic);
        b.addEventListener("click", alTocar);
        return b;
      }

      function tcFloatingPaint(tc) {
        var box = tc.ctx.map.svgBox ? tc.ctx.map.svgBox() : null;
        if (!box || !tc.floatingOn || tc.view !== "cuts") {
          if (tc.floating && tc.floating.parentNode) tc.floating.parentNode.removeChild(tc.floating);
          return;
        }
        if (!tc.floating) {
          tc.floating = tzEl("div", "tc-floating");
          tc.floating.setAttribute("role", "toolbar");
          // a tap or a wheel turn on the strip is not a tap on the map
          ["pointerdown", "pointerup", "click", "wheel", "dblclick"].forEach(function (ev) {
            tc.floating.addEventListener(ev, function (e) { e.stopPropagation(); });
          });
        }
        if (tc.floating.parentNode !== box) {
          box.appendChild(tc.floating);
          tc.floatingKey = "";
        }
        tcEnsureCss();
        var kind = tc.tool ? tc.tool.type : "select";
        if (kind === tc.floatingKey) return;
        tc.floatingKey = kind;
        tc.floating.textContent = "";
        TC_FLOATING_TOOLS.forEach(function (h) {
          tc.floating.appendChild(tcFloatingButton(tc, h[1], i18nT(h[2]), h[0] === kind, function () {
            tc.tool = h[0] === "select" || h[0] === kind ? null : { type: h[0], p1: null };
            tc.centerMode = null;
            tcGo(tc);
          }));
        });
        tc.floating.appendChild(tzEl("div", "tc-ft-sep"));
        tc.floating.appendChild(tcFloatingButton(tc, "file-import-outline", i18nT("cuts.import_svg"), false, tzBind(tcPickSvg, tc)));
      }
