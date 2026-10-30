      // Layer "zones" of the map: the rectangle of the material of each zone and the markers of the zone points. tzMapZonesPlan decides
      // what is shown (plain data, part of the signature of the layer); tzMapZones draws it.

      function tzMapZoneHidden(pmr, mp, i) {
        return i !== pmr.data.st().wn && (mp.focus || mp.other === "ocultas");
      }

      // mp.rectZone {i: true} = zones drawn with their rectangle; mp.gList = markers ({x, y, idx, active, main}); mp.zoneNw {i: warnings}
      // of the labels drawn; mp.activeMaterial = the material label of the active zone.
      function tzMapZonesPlan(pmr, mp) {
        var st = pmr.data.st(), zs = pmr.data.zones(), on = pmr.layerState.layers().zones;
        mp.rectZone = {};
        if (on) zs.forEach(function (z, i) {
          var sz = pmr.data.zoneSizes()[i];
          if (!z || !sz || !(sz.w > 0) || !(sz.h > 0) || tzMapZoneHidden(pmr, mp, i)) return;
          mp.rectZone[i] = true;
        });
        // NEARBY zone points on screen (not just equal: e.g. G55 and G56 almost at the same corner) = a single marker with one label;
        // if there are several, tapping it asks which one (2026-10-09: overlapped texts). The marker goes at the active one's point.
        mp.gList = [];
        var gTol = 22 * pmr.view.mapUnitsPerPx();
        zs.forEach(function (z, i) {
          if (!z || !on || tzMapZoneHidden(pmr, mp, i)) return;
          var gr = null;
          mp.gList.forEach(function (q) { if (!gr && Math.hypot(q.x - z.refX, q.y - z.refY) <= gTol) gr = q; });
          if (!gr) mp.gList.push((gr = { x: z.refX, y: z.refY, idx: [] }));
          gr.idx.push(i);
          if (i === st.wn) { gr.x = z.refX; gr.y = z.refY; }
        });
        mp.zoneNw = {};
        var nwOf = function (i) {
          if (!(i in mp.zoneNw)) mp.zoneNw[i] = pmr.data.zoneChecks(i).filter(function (c) { return c.lvl !== "info"; }).length;
        };
        mp.gList.forEach(function (gr) {
          gr.active = gr.idx.indexOf(st.wn) !== -1;
          // with a rectangle the label is already inside; here only those that do not have one: the active one (or the first)
          var withoutRect = gr.idx.filter(function (i) { return !mp.rectZone[i] && (i === st.wn || mp.other === "name"); });
          gr.main = withoutRect.indexOf(st.wn) !== -1 ? st.wn : withoutRect[0];
          if (gr.main !== undefined) nwOf(gr.main);
        });
        mp.activeMaterial = null;
        if (mp.rectZone[st.wn]) {
          nwOf(st.wn);
          var mz = tmatById(pmr.data.zoneMaterial(st.wn));
          mp.activeMaterial = mz ? tmatLabel(mz) : i18nT('zonesPage.no_material');
        }
      }

      function tzMapZones(pmr, mp) {
        tzMapZoneRects(pmr, mp);
        tzMapZoneMarkers(pmr, mp);
      }

      // Zones with a size = RECTANGLE of their material (colour per zone, the active one more marked) with name, material and checks.
      function tzMapZoneRects(pmr, mp) {
        var wn = pmr.data.st().wn;
        Object.keys(mp.rectZone).map(Number)
          .sort(function (a, b) { return (a === wn) - (b === wn) || a - b; }) // the active one on top
          .forEach(function (i) {
            var z = pmr.data.zones()[i];
            var sz = pmr.data.zoneSizes()[i];
            var act = i === wn;
            var col = TZ_ZCOL[i % TZ_ZCOL.length];
            var g = mp.node("g", { style: "cursor:pointer" });
            g.addEventListener("click", function (ev) {
              if (pmr.tools.mapTool() === "measure" || pmr.nav.layMod()) return;
              ev.stopPropagation();
              var p = pmr.view.svgPoint(ev);
              var hits = p ? pmr.jobFocus.zonesAt(p) : [];
              if (hits.length > 1) pmr.tools.openZonePickPop(hits, ev);
              else pmr.tools.openZonePop(i, ev);
            });
            if (!act) {
              // another zone: thin outline, no fill (several can overlap)
              mp.node("rect", { x: z.refX, y: -(z.refY + sz.h), width: sz.w, height: sz.h, fill: "transparent", stroke: col, "stroke-width": mp.w / (pmr.tools.zonePick() === i ? 300 : 650), "stroke-opacity": pmr.tools.zonePick() === i ? 1 : 0.55 }, g);
              if (mp.other === "name") {
                var tn = mp.node("text", { x: z.refX + sz.w - mp.w / 160, y: -z.refY - mp.fs * 0.45, fill: col, "fill-opacity": 0.85, "font-size": mp.fs * 0.72, "text-anchor": "end" }, g);
                tn.textContent = TZ_CODES[i] + (z.name ? " " + z.name : "");
              }
              return;
            }
            mp.node("rect", { x: z.refX, y: -(z.refY + sz.h), width: sz.w, height: sz.h, fill: col, "fill-opacity": mp.focus ? 0.06 : 0.16, stroke: col, "stroke-width": mp.w / 220, "stroke-opacity": 1 }, g);
            var nw = mp.zoneNw[i];
            var t1 = mp.node("text", { x: z.refX + mp.w / 160, y: -(z.refY + sz.h) + mp.fs * 1.05, fill: col, "font-size": mp.fs * 0.9, "font-weight": "bold" }, g);
            t1.textContent = i18nT('zonesPage.active_5', { code: TZ_CODES[i], v: z.name ? " " + z.name : "" });
            if (!mp.focus) {
              var t2 = mp.node("text", { x: z.refX + mp.w / 160, y: -(z.refY + sz.h) + mp.fs * 2.0, fill: nw ? "#ffb74d" : "#a5d6a7", "font-size": mp.fs * 0.7 }, g);
              t2.textContent = mp.activeMaterial + (nw ? "  ! " + nw + (nw === 1 ? i18nT('zonesPage.warning') : i18nT('zonesPage.warnings')) : "  OK");
            }
          });
      }

      // Zone points: one marker per group of nearby points, the active one drawn last (on top) and in blue.
      function tzMapZoneMarkers(pmr, mp) {
        mp.gList
          .slice()
          .sort(function (a, b) { return a.active - b.active; })
          .forEach(function (gr) {
            var active = gr.active;
            var g = mp.node("g", { style: "cursor:pointer" });
            g.addEventListener("click", function (ev) {
              if (pmr.tools.mapTool() === "measure" || pmr.nav.layMod()) return;
              ev.stopPropagation();
              if (gr.idx.length > 1) pmr.tools.openZonePickPop(gr.idx, ev);
              else pmr.tools.openZonePop(gr.idx[0], ev);
            });
            var r = mp.w / (active ? 90 : 160);
            mp.node("circle", { cx: gr.x, cy: -gr.y, r: r, fill: active ? "#1e88e5" : "#78909c", "fill-opacity": active ? 1 : 0.7, stroke: "#fff", "stroke-width": mp.w / (active ? 600 : 1200) }, g);
            var t = mp.node("text", { x: gr.x + r * 1.3, y: -gr.y - r * 0.4, fill: active ? "#90caf9" : "#cfd8dc", "font-size": mp.fs }, g);
            var main = gr.main;
            if (main !== undefined) {
              var nw = mp.zoneNw[main];
              var more = gr.idx.length - 1;
              t.textContent = TZ_CODES[main] + (pmr.data.zones()[main].name ? " " + pmr.data.zones()[main].name : "") + (nw ? " (!" + nw + ")" : "") + (more > 0 ? "  +" + more : "");
            }
            if (gr.idx.length > 1) {
              var titleThe = mp.node("text", { x: gr.x + r * 1.3, y: -gr.y + mp.fs * 0.95, fill: "#90a4ae", "font-size": mp.fs * 0.62 }, g);
              titleThe.textContent = i18nT('zonesPage.tap_to_choose_2', { list: gr.idx.map(function (i) { return TZ_CODES[i]; }).join(", ") });
            }
          });
      }
