      // ---- Focus height by material thickness (pure) ----
      //
      // The laser maker gives a "fixed focus lever" per thickness: how much the focus goes deeper than with the lever at 0
      // (below 5 mm = 0, 5 mm = 2, 8 mm = 4, 10 mm = 5, 12 mm = 6, 15 mm or more = 7; between rows it is interpolated).
      // The lens box has a tab of 8 mm: with lever 0 the focus is 8 mm under the edge of the box. The BLTouch gives the height of
      // the reference of the laser, which is 0.533 mm UNDER the edge of the box (measured 2026-10-15: the pin triggers 3.000 mm above
      // the position where the box touches and G31 Z is 2.467). So, in the frame the probe gives (Z = height of the reference
      // above the surface):
      //     H = 8.0 - 0.533 - lever(thickness)      (rounded to 0.1 mm: 3 mm -> 7.5, 6 mm -> 4.8, 10 mm -> 2.5)
      // The numbers are in 0:/sys/workshop/config/focus.json (geometry.*); these are the factory ones.
      var TZ_FOCUS_GEOMETRY = { focusBelowBoxEdge: 8.0, boxEdgeAboveReference: 0.533 };
      var TZ_FOCUS_TABLE = [[5, 2], [8, 4], [10, 5], [12, 6], [15, 7]];

      // lever of the table for a thickness in mm (null if it is not a number)
      function tzFocusLever(thickness, table) {
        var t = parseFloat(thickness);
        if (!isFinite(t) || t < 0) return null;
        var rows = table || TZ_FOCUS_TABLE;
        if (t < rows[0][0]) return 0;
        for (var i = 1; i < rows.length; i++) {
          if (t <= rows[i][0]) {
            var a = rows[i - 1], b = rows[i];
            return a[1] + ((t - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
          }
        }
        return rows[rows.length - 1][1];
      }

      // Reads the laserfocus.g line of a material macro. Returns {zona (1..6), h, t, nombre, px, py} or null.
      // H wins; a macro without H (the ones made after the thickness rule: W2 N"MDF 3mm" T3 ...) takes its height from T.
      function tzFocusReadLine(txt) {
        var m = String(txt || "").match(/^\s*M98\s+P"0:\/sys\/(?:workshop\/macros\/|taller\/)?laserfocus\.g"([^\n]*)/m);
        if (!m) return null;
        var args = m[1].replace(/;.*/, "");
        var w = args.match(/\sW(\d)/);
        var h = args.match(/\sH(-?[\d.]+)/);
        var t = args.match(/\sT([\d.]+)/);
        if (!w) return null;
        var height = h ? parseFloat(h[1]) : t ? tzFocusHeight(parseFloat(t[1])) : null;
        if (height === null || !isFinite(height)) return null;
        var n = args.match(/N"([^"]*)"/);
        var without = args.replace(/N"[^"]*"/, "");
        var x = without.match(/\sX(-?[\d.]+)/);
        var y = without.match(/\sY(-?[\d.]+)/);
        var out = { zone: parseInt(w[1], 10), h: height, t: t ? parseFloat(t[1]) : null, name: n ? n[1] : null };
        if (/\sQ1(?![\d.])/.test(without)) out.ask = true;   // Q1: laserfocus.g asks whether there is material before measuring
        if (x && y) {
          out.px = parseFloat(x[1]);
          out.py = parseFloat(y[1]);
        }
        return out;
      }

      // height H (mm, in the frame of the probe) to leave the laser at for that thickness, or null.
      // geo = {focusBelowBoxEdge, boxEdgeAboveReference} (default: the factory ones)
      function tzFocusHeight(thickness, geo, table) {
        var p = tzFocusLever(thickness, table);
        if (p === null) return null;
        var g = geo || TZ_FOCUS_GEOMETRY;
        var h = g.focusBelowBoxEdge - g.boxEdgeAboveReference - p;
        return Math.round(h * 10) / 10; // to 0.1 mm: the touch of the tab by hand is not better than that
      }
