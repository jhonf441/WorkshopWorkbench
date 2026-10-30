      // Imports an SVG: each stroke color goes to a layer (the one that already
      // has that color is reused, otherwise one is created). It is placed centered in the
      // cutting area (or at 100,100) and stays selected to move/scale it.
      function tcImportSvgText(tc, text, name) {
        var items;
        try {
          items = tcParseSvg(text);
        } catch (e) {
          return tcSetMsg(tc, i18nT('cuts.could_not_import', { name: name, err: e.message || e }), false);
        }
        if (!items.length) return tcSetMsg(tc, i18nT('cuts.has_no_paths_to_cut_if', { name: name }), false);
        var total = items.reduce(function (m, it) { return m + it.pts.length; }, 0);
        if (total > 60000) return tcSetMsg(tc, i18nT('cuts.too_much_detail_points_simplify_it', { name: name, total: total }), false);
        // capas por color
        var byColor = {};
        items.forEach(function (it) {
          var hex = tcRgbToHex(it.color);
          if (!byColor[hex]) {
            var L = tc.data.layers.filter(function (x) { return x.color.toLowerCase() === hex; })[0];
            if (!L) {
              var base = tcLayerById(tc, tc.data.activeLayer);
              var id = tc.data.layers.reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1;
              L = { id: id, name: "SVG " + hex, color: hex === "#000000" ? base.color : hex, power: base.power, speed: base.speed, passes: base.passes, air: base.air };
              if (hex === "#000000" || Object.keys(byColor).length === 0 && items.every(function (x) { return tcRgbToHex(x.color) === hex; })) L = base; // a single color: to the active layer
              else tc.data.layers.push(L);
            }
            byColor[hex] = L.id;
          }
        });
        var shapes = items.map(function (it) {
          return { type: "path", pts: it.pts, closed: it.closed, layer: byColor[tcRgbToHex(it.color)] };
        });
        var bb = tcBBox(shapes);
        var area = tc.ctx.cut.area();
        var fitMsg = "";
        if (area && !tcFitsArea(tc, bb)) {
          var kf = Math.min((area.xmax - area.xmin) / (bb.xmax - bb.xmin), (area.ymax - area.ymin) / (bb.ymax - bb.ymin)) * 0.98;
          shapes.forEach(function (sh) { sh.pts = sh.pts.map(function (q) { return { x: q.x * kf, y: q.y * kf }; }); });
          fitMsg = i18nT('cuts.it_was_larger_than_the_cut', { v: Math.round(kf * 100) });
          bb = tcBBox(shapes);
        }
        var cx = area ? (area.xmin + area.xmax) / 2 : 100, cy = area ? (area.ymin + area.ymax) / 2 : 100;
        var dx = cx - (bb.xmin + bb.xmax) / 2, dy = cy - (bb.ymin + bb.ymax) / 2;
        var nuevos = [];
        shapes.forEach(function (sh) {
          sh.pts = sh.pts.map(function (q) { return { x: Math.round((q.x + dx) * 1000) / 1000, y: Math.round((q.y + dy) * 1000) / 1000 }; });
          sh.id = tc.data.nextId++;
          tc.data.shapes.push(sh);
          nuevos.push(sh.id);
        });
        tcSyncLayers(tc);
        tcSetSel(tc, nuevos);
        tcSave(tc);
        tcSetMsg(tc, i18nT('cuts.imported_paths_x_mm_colour_s', { name: name, shapesLen: shapes.length, v: tc.fmt(bb.xmax - bb.xmin), v2: tc.fmt(bb.ymax - bb.ymin), keysLen: Object.keys(byColor).length, fitMsg: fitMsg }), true);
        tcGo(tc);
      }

      function tcPickSvg(tc) {
        var fi = document.createElement("input");
        fi.type = "file";
        fi.accept = ".svg,image/svg+xml";
        fi.style.display = "none";
        fi.addEventListener("change", function () {
          var f = fi.files && fi.files[0];
          fi.remove();
          if (!f) return;
          if (f.size > 5 * 1024 * 1024) return tcSetMsg(tc, i18nT('cuts.the_file_is_larger_than_5'), false);
          var rd = new FileReader();
          rd.onload = function () { tcImportSvgText(tc, String(rd.result), f.name); };
          rd.onerror = function () { tcSetMsg(tc, i18nT('cuts.couldn_t_read_the_file'), false); };
          rd.readAsText(f);
        });
        document.body.appendChild(fi);
        fi.click();
      }

