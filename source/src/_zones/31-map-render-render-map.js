      // The drawing of the map, in layers (2026-10-24, docs-internal/MESA-RENOVADA.md section 9). The FIXED layers (bed, areas, zones,
      // marks, origin of the active zone, head, ruler) are groups kept in pmr.layerCache with the signature of what they were drawn from
      // (31-map-render-sigs.js): a redraw where nothing of that changed (the 1 s status read while the machine moves) puts nothing new in
      // the DOM; the head is a kept group that only gets a new transform, the job a group the job module keeps. What follows them inside
      // the root (the tool of the open tab, the drag, the markers of the tools) is drawn again on every redraw, as before.

      function tzMapRenderMap(pmr) {
        var mp = { into: null, fixed: [] };
        mp.node = function node(tag, attrs, parent) {
          var n = document.createElementNS(TZ_SVG_NS, tag);
          Object.keys(attrs).forEach(function (k) {
            n.setAttribute(k, attrs[k]);
          });
          (parent || mp.into || pmr.shell.mapRoot()).appendChild(n);
          return n;
        };
        if (tzMapScene(pmr, mp)) return;
        mp.common = tzMapSigCommon(pmr, mp);
        tzMapLayer(pmr, mp, "bed", tzMapSigBed(pmr, mp), tzMapBed);
        tzMapLayer(pmr, mp, "areas", tzMapSigAreas(pmr, mp), tzMapAreas);
        tzMapZonesPlan(pmr, mp);
        tzMapLayer(pmr, mp, "zones", tzMapSigZones(pmr, mp), tzMapZones);
        tzMapLayer(pmr, mp, "marks", tzMapSigMarks(pmr, mp), tzMapMarks);
        tzMapLayer(pmr, mp, "origin", tzMapSigOrigin(pmr, mp), tzMapOrigin);
        tzMapHead(pmr, mp);
        tzMapJob(pmr, mp);
        tzMapPlace(pmr.shell.mapRoot(), mp.fixed); // the fixed groups first, in order; the rest of the last redraw goes
        tzMapLive(pmr, mp);
        var top = [pmr.shell.mapRoot()];
        if (pmr.layerState.layers().ruler) top.push(tzMapRulerLayer(pmr, mp));
        tzMapPlace(pmr.shell.svg(), top);
      }

      // The kept group of a fixed layer (built again by build(pmr, mp) when its signature changed). upright: its texts are straightened
      // for the rotated map (once: the group is kept); not for the ruler, which is drawn in view coords outside the root.
      function tzMapLayerGroup(pmr, mp, name, sig, build, upright) {
        return tzLayerGet(pmr.layerCache, name, sig, function (g) {
          mp.into = g;
          build(pmr, mp);
          mp.into = null;
          if (upright) pmr.view.xfUpright(g);
        });
      }

      // A fixed layer of the root: its group goes to mp.fixed, in drawing order.
      function tzMapLayer(pmr, mp, name, sig, build) {
        var g = tzMapLayerGroup(pmr, mp, name, sig, build, true);
        mp.fixed.push(g);
        return g;
      }

      // parent's children become `list` followed by nothing: a group already in its place is not touched (no re-attach)
      function tzMapPlace(parent, list) {
        for (var k = 0; k < list.length; k++) {
          if (parent.childNodes[k] !== list[k]) parent.insertBefore(list[k], parent.childNodes[k] || null);
        }
        while (parent.childNodes.length > list.length) parent.removeChild(parent.lastChild);
      }

      function tzMapScene(pmr, mp) {
        mp.ax = pmr.data.st().axes;
        if (!mp.ax.X || !mp.ax.Y) return true;
        var x0 = mp.ax.X.min,
          x1 = mp.ax.X.max,
          y0 = mp.ax.Y.min,
          y1 = mp.ax.Y.max;
        mp.bounds = [x0, x1, y0, y1];
        var pad = 15;
        mp.w = x1 - x0;
        var h = y1 - y0;
        // Zoom/pan (request 2026-10-08): mapView = visible window in SVG coords, or null = everything. The sizes (text, strokes,
        // markers) are computed with "w" divided by the zoom, so they do not grow when zooming in. EQUAL margin on the 4 sides
        // (2026-10-09): it leaves room for the ruler (top/left, especially with the map rotated) and for the labels drawn outside the bed.
        var padA = pad + mp.w * 0.11;
        pmr.view.setMapFull({ x: x0 - padA, y: -y1 - padA, w: mp.w + padA * 2, h: h + padA * 2 });
        if (pmr.view.mapFollow() && mp.ax.X.homed && mp.ax.Y.homed) {
          var fv = pmr.view.mapView() || { w: pmr.view.mapFull().w / 3, h: pmr.view.mapFull().h / 3 };
          pmr.view.setMapView(pmr.view.mapClampView({ x: mp.ax.X.machinePosition - fv.w / 2, y: -mp.ax.Y.machinePosition - fv.h / 2, w: fv.w, h: fv.h }));
        }
        var vb = pmr.view.mapClampView(pmr.view.mapView()) || pmr.view.mapFull();
        pmr.view.setMapView(pmr.view.mapView() ? vb : null);
        mp.vbv = pmr.view.xfBox(vb); // the rotated / mirrored view
        tzSvgSetChanged(pmr.shell.svg(), { viewBox: mp.vbv.x + " " + mp.vbv.y + " " + mp.vbv.w + " " + mp.vbv.h });
        tzMapRoot(pmr);
        mp.themeKey = pmr.view.mapThemeKey();
        mp.TH = pmr.view.themes()[mp.themeKey];
        mp.travelW = mp.w;
        mp.travelH = h;
        mp.w = mp.w / (pmr.view.mapFull().w / vb.w); // sizes follow the zoom
        mp.fs = Math.max(8 / (pmr.view.mapFull().w / vb.w), mp.w / 45);
        tzMapTheme(pmr, mp);
        mp.focus = pmr.data.jobRunning() && !pmr.jobFocus.viewTodo(); // job in progress: only what is needed
        mp.other = pmr.jobFocus.otherMode();
      }

      // The root group of the map (bed coords, with the view's rotation / mirror): kept while the svg is the same.
      function tzMapRoot(pmr) {
        var root = pmr.shell.mapRoot();
        if (!root || root.parentNode !== pmr.shell.svg()) {
          root = document.createElementNS(TZ_SVG_NS, "g");
          pmr.shell.setMapRoot(root);
          pmr.shell.svg().appendChild(root);
        }
        var M0 = pmr.view.xfMat();
        if (pmr.view.xfId()) root.removeAttribute("transform");
        else tzSvgSetChanged(root, { transform: "matrix(" + [M0.a, M0.b, M0.c, M0.d, 0, 0].join(" ") + ")" });
      }

      function tzMapTheme(pmr, mp) {
        // (the background is always drawn: it is the reference for tapping on the map)
        mp.cameraShown = !!(pmr.layerState.layers().camera && pmr.camera.map().hasCalibration());
        pmr.shell.svg().style.background = mp.cameraShown ? "transparent" : mp.TH.bg;
        // with the camera background it is also inverted: the photo is an <img> under the svg (the filter does not touch it) and around
        // it the background stays light (before it stayed black even if the theme was Light)
        pmr.shell.svg().classList.toggle("tzm-inv", !!mp.TH.inv);
        pmr.shell.svgBox().style.background = mp.TH.inv ? "#e5e5e5" : "#121212";
        if (pmr.view.miniSvg()) pmr.view.miniSvg().classList.toggle("tzm-inv", !!mp.TH.inv);
        pmr.shell.mapCard().classList.toggle("tzm-bright", !!mp.TH.inv);
        var wsM = pmr.shell.mapCard().closest(".tz-ws-map");
        if (wsM) wsM.classList.toggle("tzm-bright", !!mp.TH.inv);
      }

      // Layer "bed": the travel of the machine, its background (honeycomb / battens), the photo of the bed and the travel label.
      function tzMapBed(pmr, mp) {
        var x0 = mp.bounds[0], x1 = mp.bounds[1], y0 = mp.bounds[2], y1 = mp.bounds[3];
        var travelW = mp.travelW, travelH = mp.travelH, cameraShown = mp.cameraShown;
        mp.node("rect", { x: x0, y: -y1, width: travelW, height: travelH, fill: cameraShown ? "rgba(0,0,0,0.08)" : mp.TH.bed, stroke: pmr.layerState.layers().travel ? "#757575" : "none", "stroke-width": mp.w / 400 });
        // Background of the bed: honeycomb or battens (roughly to scale, in mm)
        if (pmr.view.mapBed() === "honeycomb" && !cameraShown) {
          var defs = mp.node("defs", {});
          var pat = mp.node("pattern", { id: "tzm-hex", width: 14, height: 24.2, patternUnits: "userSpaceOnUse" }, defs);
          mp.node("path", { d: "M7 0l7 4v8l-7 4-7-4V4z M7 16v8.2", fill: "none", stroke: mp.TH.pat, "stroke-width": 0.8 }, pat);
          mp.node("rect", { x: x0, y: -y1, width: travelW, height: travelH, fill: "url(#tzm-hex)" });
        } else if (pmr.view.mapBed() === "battens" && !cameraShown) {
          for (var lx = Math.ceil(x0 / 25) * 25 + 12.5; lx < x1; lx += 25) mp.node("rect", { x: lx - 1.5, y: -y1, width: 3, height: travelH, fill: mp.TH.pat });
        }
        // Photo of the bed (Vision, feature 7): view from above already corrected, in machine mm (pointer coords), under everything else.
        if (pmr.layerState.layers().photoBed && pmr.data.photoBed() && pmr.data.photoBed().info && !cameraShown) {
          var fc = pmr.data.photoBed().info;
          mp.node("image", { href: "/machine/file/" + encodeURIComponent("0:/sys/workshop/data/vision-bed.jpg") + "?ts=" + encodeURIComponent(fc.ts || ""), x: fc.x0, y: -fc.y1, width: fc.x1 - fc.x0, height: fc.y1 - fc.y0, preserveAspectRatio: "none", opacity: pmr.data.photoBed().opacity, "pointer-events": "none" });
        }
        if (pmr.layerState.layers().travel) {
          var lbl = mp.node("text", { x: x1 - 2, y: -y0 + mp.fs * 1.3, fill: "#9e9e9e", "font-size": mp.fs, "text-anchor": "end" });
          lbl.textContent = "X " + x0 + ".." + x1 + "  Y " + y0 + ".." + y1;
        }
      }

      // Layer "areas": the cutting area of each mode of the Workbench, each with its colour; the active mode's with a thicker stroke and a
      // more visible fill.
      function tzMapAreas(pmr, mp) {
        var gl = pmr.data.st().globals || {};
        TZ_WORK_MODES.slice().reverse().forEach(function (m) {
          var a = gl["cutArea" + m];
          if (!pmr.layerState.layers()["area" + m] || !Array.isArray(a) || a.length !== 4) return;
          if (mp.focus && m !== pmr.data.st().mode) return;
          var isAct = m === pmr.data.st().mode;
          var col = TZ_AREA_COLORS[m];
          mp.node("rect", {
            x: a[0],
            y: -a[3],
            width: a[1] - a[0],
            height: a[3] - a[2],
            fill: col,
            "fill-opacity": isAct ? 0.1 : 0.03,
            stroke: col,
            "stroke-width": mp.w / (isAct ? 250 : 500),
            "stroke-dasharray": mp.w / 80 + " " + mp.w / 120,
          });
          // 2026-10-11 ("the text overflows"): name and coordinates OUTSIDE the box (above and below), with a dark border to be read
          // over the map: inside they overlapped the design and the right one ended up on the edge
          var halo = { stroke: "rgba(0,0,0,0.75)", "stroke-width": mp.fs * 0.18, "paint-order": "stroke", "stroke-linejoin": "round" };
          var al = mp.node("text", Object.assign({ x: a[0], y: -a[3] - mp.fs * 0.35, fill: col, "font-size": mp.fs * 0.85 }, halo));
          al.textContent = (i18nT('zonesPage.area', { m: m, v: isAct ? i18nT('zonesPage.active_2') : "" })) + (mp.focus ? "" : "  X" + tzFmt(a[0]) + " Y" + tzFmt(a[3]));
          // Coordinates at the corners (to adjust it with precision). The exact limits are shown by the single floating tooltip (see
          // mapTip): no native <title> here, they overlapped with it.
          var cfs = mp.fs * (isAct ? 0.75 : 0.6);
          // the top left corner goes with the name
          if (!mp.focus) [
            [a[0], a[2], "start", cfs * 1.05],
            [a[1], a[2], "end", cfs * 1.05],
            [a[1], a[3], "end", -mp.fs * 0.35],
          ].forEach(function (cc) {
            var ct = mp.node("text", Object.assign({
              x: cc[0],
              y: -cc[1] + cc[3],
              fill: col,
              "fill-opacity": isAct ? 0.95 : 0.6,
              "font-size": cfs,
              "text-anchor": cc[2],
            }, halo, { "stroke-width": cfs * 0.18 }));
            ct.textContent = "X" + tzFmt(cc[0]) + " Y" + tzFmt(cc[1]);
          });
        });
      }
