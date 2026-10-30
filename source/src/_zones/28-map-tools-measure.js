      // Measure (drawn apart, like the magnet's ring: renderMap rebuilds the SVG)
      function tzToolPlaceMeasure(pmt) {
        var old = pmt.shell.svg().querySelector("#tzm-meas");
        if (old) old.parentNode.removeChild(old);
        if (!pmt.measure || !pmt.measure.a) return;
        var k = (pmt.view.mapView() || pmt.view.mapFull() || { w: 1 }).w / (pmt.shell.svg().clientWidth || 1);
        var g = document.createElementNS(TZ_SVG_NS, "g");
        g.setAttribute("id", "tzm-meas");
        g.setAttribute("pointer-events", "none");
        function el(tag, at) {
          var n = document.createElementNS(TZ_SVG_NS, tag);
          Object.keys(at).forEach(function (q) { n.setAttribute(q, at[q]); });
          g.appendChild(n);
          return n;
        }
        var a = pmt.measure.a, b = pmt.measure.b || pmt.measure.hover;
        el("circle", { cx: a.x, cy: -a.y, r: 5 * k, fill: "#00e5ff", stroke: "#000", "stroke-width": k });
        if (b) {
          el("line", { x1: a.x, y1: -a.y, x2: b.x, y2: -b.y, stroke: "#00e5ff", "stroke-width": 2 * k, "stroke-dasharray": pmt.measure.b ? "" : 6 * k + " " + 4 * k });
          el("circle", { cx: b.x, cy: -b.y, r: 5 * k, fill: pmt.measure.b ? "#00e5ff" : "none", stroke: "#00e5ff", "stroke-width": 1.5 * k });
          var d = Math.hypot(b.x - a.x, b.y - a.y);
          var t = el("text", { x: (a.x + b.x) / 2 + 8 * k, y: -(a.y + b.y) / 2 - 8 * k, fill: "#00e5ff", "font-size": 13 * k, "font-weight": "bold", stroke: "#000", "stroke-width": 3 * k, "paint-order": "stroke" });
          t.textContent = tzFmt(d) + " mm";
          // diagonal: the two sides (dx along X, dy along Y) are drawn and measured too
          var ddx = b.x - a.x, ddy = b.y - a.y;
          if (Math.abs(ddx) > 0.005 && Math.abs(ddy) > 0.005) {
            el("polyline", { points: a.x + "," + (-a.y) + " " + b.x + "," + (-a.y) + " " + b.x + "," + (-b.y), fill: "none", stroke: "#00e5ff", "stroke-opacity": 0.6, "stroke-width": 1.5 * k, "stroke-dasharray": 3 * k + " " + 3 * k });
            var side = { fill: "#80deea", "font-size": 12 * k, stroke: "#000", "stroke-width": 3 * k, "paint-order": "stroke" };
            var tx = el("text", Object.assign({ x: (a.x + b.x) / 2, y: -a.y + (ddy > 0 ? 15 : -6) * k, "text-anchor": "middle" }, side));
            tx.textContent = "X " + tzFmt(Math.abs(ddx)) + " mm";
            var ty = el("text", Object.assign({ x: b.x + (ddx > 0 ? 8 : -8) * k, y: -(a.y + b.y) / 2, "text-anchor": ddx > 0 ? "start" : "end" }, side));
            ty.textContent = "Y " + tzFmt(Math.abs(ddy)) + " mm";
          }
        }
        (pmt.shell.mapRoot() || pmt.shell.svg()).appendChild(g);
        pmt.view.xfUpright(g);
      }

      function tzToolMeasureText(pmt) {
        if (!pmt.measure || !pmt.measure.a) return "";
        var a = pmt.measure.a, b = pmt.measure.b || pmt.measure.hover;
        if (!b) return i18nT('zonesPage.measure_tap_the_second_point');
        var dx = b.x - a.x, dy = b.y - a.y;
        var ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        return i18nT('zonesPage.measured_mm_dx_dy', { hypot: tzFmt(Math.hypot(dx, dy)), dx: tzFmt(dx), dy: tzFmt(dy), ang: ang.toFixed(1), v: pmt.measure.b ? "" : " ..." });
      }

      // Barra de estado de abajo
      function tzToolPaintStatus(pmt) {
        if (!pmt.data.st() || !pmt.data.st().axes || !pmt.data.st().axes.X) return;
        var ax = pmt.data.st().axes;
        var parts = [];
        if (pmt.lastCursor) parts.push("<b>Cursor</b> X" + tzFmt(pmt.lastCursor.x) + " Y" + tzFmt(pmt.lastCursor.y));
        var hx = ax.X.machinePosition, hy = ax.Y.machinePosition; // the head and the zone are in the status bar of the page (33-espacio): not repeated here
        var hc = pmt.data.cutCorrection();
        if (hc && pmt.data.st().mode === "Laser") parts.push("<b>Laser</b> X" + tzFmt(hx - hc.cx) + " Y" + tzFmt(hy - hc.cy));
        parts.push("<b>Zoom</b> x" + (pmt.view.mapView() && pmt.view.mapFull() ? (pmt.view.mapFull().w / pmt.view.mapView().w).toFixed(1) : "1") + (pmt.view.mapFollow() ? i18nT('zonesPage.following') : ""));
        var mt = tzToolMeasureText(pmt);
        if (mt) parts.push("<span style='color:#00e5ff'>" + mt + "</span>");
        pmt.shell.mapStatus().innerHTML = parts.join("<span class='tzm-sep'>|</span>");
      }

