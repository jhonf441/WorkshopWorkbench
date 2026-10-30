      // Layer "marks" of the map: the point being picked, offcuts, what Vision detected, clamps, saved positions, fixed references and the
      // Z measuring point of the active zone. Everything it reads is in its signature (tzMapSigMarks, which also sets mp.pHit / mp.vision).

      function tzMapMarks(pmr, mp) {
        tzMapMarkPick(pmr, mp);
        tzMapOffcuts(pmr, mp);
        tzMapVision(pmr, mp);
        tzMapClamps(pmr, mp);
        tzMapPositions(pmr, mp);
        tzMapRefs(pmr, mp);
        tzMapZPoint(pmr, mp);
      }

      function tzMapMarkPick(pmr, mp) {
        var pp = pmr.tools.ptPick();
        if (!pp) return;
        var pc = mp.w / 70;
        mp.node("circle", { cx: pp.x, cy: -pp.y, r: pc, fill: "none", stroke: "#ffe082", "stroke-width": mp.w / 350 });
        mp.node("line", { x1: pp.x - pc * 1.6, y1: -pp.y, x2: pp.x + pc * 1.6, y2: -pp.y, stroke: "#ffe082", "stroke-width": mp.w / 500 });
        mp.node("line", { x1: pp.x, y1: -pp.y - pc * 1.6, x2: pp.x, y2: -pp.y + pc * 1.6, stroke: "#ffe082", "stroke-width": mp.w / 500 });
      }

      // Offcuts: dotted wood-coloured outline (not in focus mode)
      function tzMapOffcuts(pmr, mp) {
        if (!pmr.layerState.layers().offcuts || mp.focus) return;
        pmr.data.offcuts().forEach(function (q, k) {
          var g = mp.node("g", { style: "cursor:pointer" });
          g.addEventListener("click", function (ev) {
            if (pmr.tools.mapTool() === "measure" || pmr.nav.layMod()) return;
            ev.stopPropagation();
            pmr.tools.openRectPop("offcut", k, ev);
          });
          mp.node("rect", { x: q.x, y: -(q.y + q.h), width: q.w, height: q.h, fill: "#c8a878", "fill-opacity": 0.12, stroke: "#c8a878", "stroke-width": mp.w / 500, "stroke-dasharray": mp.w / 120 + " " + mp.w / 200 }, g);
          var rt = mp.node("text", { x: q.x + mp.w / 160, y: -q.y - mp.fs * 0.45, fill: "#e0c9a0", "font-size": mp.fs * 0.72 }, g);
          rt.textContent = (q.name || i18nT('zonesPage.offcut_2')) + " " + tzFmt(q.w) + "x" + tzFmt(q.h);
        });
      }

      // Vision (WorkshopVision, 2026-10-09): the last thing detected by the camera, in machine mm, for 30 min. Tapping opens the same
      // notice as a map point (Go here, Z point, position, scrap) + Zone origin.
      function tzMapVision(pmr, mp) {
        if (!mp.vision) return;
        mp.vision.items.forEach(function (it) {
          var m = it.mm;
          var col = { piece: "#76ff03", rect: "#ffd740", circle: "#40c4ff", hole: "#ff4081", corner: "#ffab40", line: "#e040fb", mark: "#ffffff" }[it.kind] || "#76ff03";
          var g = mp.node("g", { style: "cursor:pointer" });
          g.addEventListener("click", function (ev) {
            if (pmr.tools.mapTool() === "measure" || pmr.nav.layMod()) return;
            ev.stopPropagation();
            pmr.tools.openPointPop({ x: m.c[0], y: m.c[1], name: "Vision: " + it.kind + (m.w ? " " + tzFmt(m.w) + "x" + tzFmt(m.h) : m.d ? " d" + tzFmt(m.d) : ""), vision: it }, ev);
          });
          var sw = mp.w / 450;
          var poly = m.corners || m.box || (it.kind === "piece" && m.poly);
          if (it.kind === "line" && m.a && m.b) mp.node("line", { x1: m.a[0], y1: -m.a[1], x2: m.b[0], y2: -m.b[1], stroke: col, "stroke-width": sw * 1.5 }, g);
          else if (poly && poly.length > 2) mp.node("polygon", { points: poly.map(function (p) { return p[0] + "," + -p[1]; }).join(" "), fill: col, "fill-opacity": 0.08, stroke: col, "stroke-width": sw }, g);
          else if (m.d) mp.node("circle", { cx: m.c[0], cy: -m.c[1], r: m.d / 2, fill: col, "fill-opacity": 0.12, stroke: col, "stroke-width": sw }, g);
          mp.node("circle", { cx: m.c[0], cy: -m.c[1], r: mp.w / 220, fill: col }, g);
        });
      }

      // Clamps: red, also seen in focus mode (it is what must not be touched); the ones the job passes over (mp.pHit) stronger.
      function tzMapClamps(pmr, mp) {
        if (!pmr.layerState.clampsOn() || !(pmr.layerState.layers().clamps || mp.focus)) return;
        pmr.data.clamps().forEach(function (q, k) {
          var g = mp.node("g", { style: "cursor:pointer" });
          g.addEventListener("click", function (ev) {
            if (pmr.tools.mapTool() === "measure" || pmr.nav.layMod()) return;
            ev.stopPropagation();
            pmr.tools.openRectPop("prensa", k, ev);
          });
          var hit = mp.pHit.indexOf(k) !== -1;
          mp.node("rect", { x: q.x, y: -(q.y + q.h), width: q.w, height: q.h, fill: hit ? "#ff1744" : "#ef5350", "fill-opacity": hit ? 0.6 : 0.3, stroke: hit ? "#fff" : "#ef5350", "stroke-width": mp.w / (hit ? 250 : 450) }, g);
          mp.node("line", { x1: q.x, y1: -q.y, x2: q.x + q.w, y2: -(q.y + q.h), stroke: "#ef5350", "stroke-width": mp.w / 900, "stroke-opacity": 0.7 }, g);
          mp.node("line", { x1: q.x, y1: -(q.y + q.h), x2: q.x + q.w, y2: -q.y, stroke: "#ef5350", "stroke-width": mp.w / 900, "stroke-opacity": 0.7 }, g);
          if (!mp.focus || hit) {
            var pt = mp.node("text", { x: q.x + q.w / 2, y: -(q.y + q.h) - mp.fs * 0.35, fill: "#ff8a80", "font-size": mp.fs * 0.72, "text-anchor": "middle" }, g);
            pt.textContent = q.name || "prensa";
          }
        });
      }

      // Saved positions: orange diamond + name.
      function tzMapPositions(pmr, mp) {
        if (!pmr.layerState.layers().positions || mp.focus) return;
        var posClick = !pmr.nav.layMod(); // in every section that does not use the tap for something else
        pmr.data.savedPos().forEach(function (q, qi) {
          var d = mp.w / 110;
          var sel = pmr.tools.posPick() === qi;
          var pg = mp.node("g", { style: posClick ? "cursor:pointer" : "" });
          if (posClick) {
            // touch area bigger than the diamond (finger)
            mp.node("circle", { cx: q.x, cy: -q.y, r: d * 2.4, fill: "transparent" }, pg);
            pg.addEventListener("click", function (ev) {
              ev.stopPropagation();
              pmr.tools.openPosPop(qi, ev);
            });
          }
          mp.node("polygon", {
            points: [q.x, -q.y - d, q.x + d, -q.y, q.x, -q.y + d, q.x - d, -q.y].join(" "),
            fill: "#ffcc80",
            stroke: sel ? "#fff" : "#000",
            "stroke-width": sel ? mp.w / 250 : mp.w / 700,
          }, pg);
          var pt = mp.node("text", { x: q.x + d * 1.4, y: -q.y + d * 1.6, fill: "#ffcc80", "font-size": mp.fs * 0.85 }, pg);
          pt.textContent = q.name;
        });
      }

      // Fixed references: small circle with a sea-green cross (+ short name); with the zones layer off, the outline of each zone.
      function tzMapRefs(pmr, mp) {
        if (!pmr.layerState.layers().refs || mp.focus) return;
        if (!pmr.layerState.layers().zones)
          pmr.data.zones().forEach(function (z, i) {
            var sz = z && pmr.data.zoneSizes()[i];
            if (!sz || !(sz.w > 0) || !(sz.h > 0)) return;
            mp.node("rect", { x: z.refX, y: -(z.refY + sz.h), width: sz.w, height: sz.h, fill: "none", stroke: "#80cbc4", "stroke-width": mp.w / 700, "stroke-dasharray": mp.w / 150 + " " + mp.w / 200, "stroke-opacity": 0.7 });
          });
        var refG = mp.node("g", { "pointer-events": "none" });
        mp.refPoints.forEach(function (q) {
          var rr = mp.w / (q.short ? 130 : 190);
          mp.node("circle", { cx: q.x, cy: -q.y, r: rr, fill: "none", stroke: "#80cbc4", "stroke-width": mp.w / 600 }, refG);
          mp.node("line", { x1: q.x - rr * 1.6, y1: -q.y, x2: q.x + rr * 1.6, y2: -q.y, stroke: "#80cbc4", "stroke-width": mp.w / 900 }, refG);
          mp.node("line", { x1: q.x, y1: -q.y - rr * 1.6, x2: q.x, y2: -q.y + rr * 1.6, stroke: "#80cbc4", "stroke-width": mp.w / 900 }, refG);
          if (q.short) {
            var rt = mp.node("text", { x: q.x + rr * 1.8, y: -q.y - rr * 1.2, fill: "#80cbc4", "font-size": mp.fs * 0.75 }, refG);
            rt.textContent = q.short;
          }
        });
      }

      // Z measuring point of the active zone: magenta diamond with a cross (where the probe touches) + faint line to where the head goes
      // to reach it (point - G31 offset).
      function tzMapZPoint(pmr, mp) {
        var zpt = mp.zPoint;
        if (!zpt) return;
        var zr = mp.w / 85;
        var po = pmr.data.probeOffset();
        if (po) {
          mp.node("line", { x1: zpt.x, y1: -zpt.y, x2: zpt.x - po.x, y2: -(zpt.y - po.y), stroke: "#e040fb", "stroke-width": mp.w / 900, "stroke-dasharray": mp.w / 200 + " " + mp.w / 200, "stroke-opacity": 0.6 });
          mp.node("circle", { cx: zpt.x - po.x, cy: -(zpt.y - po.y), r: zr * 0.4, fill: "none", stroke: "#e040fb", "stroke-width": mp.w / 900, "stroke-opacity": 0.7 });
        }
        if (zpt.macro) {
          // the material macro measures somewhere else than the chosen point: orange ring where it really goes
          mp.node("circle", { cx: zpt.macro.x, cy: -zpt.macro.y, r: zr * 0.8, fill: "none", stroke: "#ff9800", "stroke-width": mp.w / 400, "stroke-dasharray": mp.w / 150 + " " + mp.w / 150 });
          var mt = mp.node("text", { x: zpt.macro.x + zr * 1.0, y: -zpt.macro.y - zr * 1.0, fill: "#ff9800", "font-size": mp.fs * 0.8 });
          mt.textContent = i18nT('zonesPage.macro_measures_here');
        }
        mp.node("polygon", { points: [zpt.x, -zpt.y - zr, zpt.x + zr, -zpt.y, zpt.x, -zpt.y + zr, zpt.x - zr, -zpt.y].join(" "), fill: "rgba(224,64,251,0.25)", stroke: "#e040fb", "stroke-width": mp.w / 400 });
        mp.node("line", { x1: zpt.x - zr * 1.5, y1: -zpt.y, x2: zpt.x + zr * 1.5, y2: -zpt.y, stroke: "#e040fb", "stroke-width": mp.w / 700 });
        mp.node("line", { x1: zpt.x, y1: -zpt.y - zr * 1.5, x2: zpt.x, y2: -zpt.y + zr * 1.5, stroke: "#e040fb", "stroke-width": mp.w / 700 });
        var zt = mp.node("text", { x: zpt.x + zr * 1.4, y: -zpt.y + zr * 1.9, fill: "#e040fb", "font-size": mp.fs * 0.8 });
        zt.textContent = (pmr.data.st().mode === "Laser" ? i18nT('zonesPage.measure_focus') : i18nT('zonesPage.measure_z'));
      }
