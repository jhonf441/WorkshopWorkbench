      // ---- Focus height by material thickness ----
      //
      // The laser maker gives a "fixed focus lever" per thickness: how much the focus goes deeper than with the lever at 0
      // (below 5 mm = 0, 5 mm = 2, 8 mm = 4, 10 mm = 5, 12 mm = 6, 15 mm or more = 7; between rows it is interpolated).
      // The lens box has a tab: with lever 0 the focus is `focusBelowBoxEdge` under the edge of the box. The probe gives the height of the
      // reference of the laser, which is `boxEdgeAboveReference` UNDER the edge of the box. So, in the frame the probe gives (Z = height of the
      // reference above the surface):
      //     H = focusBelowBoxEdge - boxEdgeAboveReference - lever(thickness)      (rounded to 0.1 mm)
      // Those two numbers are the geometry of THE MACHINE (measured with focusref.g) and live in 0:/sys/workshop/config/focus.json, key
      // geometry. RRF cannot read JSON, so the macros (focusrule.g) read the same two numbers from 0:/sys/workshop/config/focus.g: the page
      // reads both files and warns when they differ or focus.g is missing (tzFocusStatus). Both files come from the examples of the Workbench.
      //
      // TZ_FOCUS_GEOMETRY holds the numbers of the reference laser (tab 8.0, edge 0.533: with them 3 mm -> 7.5, 6 mm -> 4.8, 10 mm -> 2.5). It is
      // used ONLY while focus.json has not been read or cannot be read, so the height of a material is never worked out without a geometry.
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
        var m = String(txt || "").match(/^\s*M98\s+P"0:\/sys\/(?:workshop\/macros\/(?:focus\/)?|taller\/)?laserfocus\.g"([^\n]*)/m);
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
      // geo = {focusBelowBoxEdge, boxEdgeAboveReference} (default: the ones of focus.json, else the reference laser's)
      function tzFocusHeight(thickness, geo, table) {
        var p = tzFocusLever(thickness, table);
        if (p === null) return null;
        var g = geo || tzFocusGeometry();
        var h = g.focusBelowBoxEdge - g.boxEdgeAboveReference - p;
        return Math.round(h * 10) / 10; // to 0.1 mm: the touch of the tab by hand is not better than that
      }

      // ---- The geometry files: focus.json (the page) and focus.g (the macros) ----
      var TZ_FOCUS_JSON = "0:/sys/workshop/config/focus.json";
      var TZ_FOCUS_G = "0:/sys/workshop/config/focus.g";
      var TZ_FOCUS_TTL_MS = 5000; // the files are read again at most this often
      // geo = geometry of focus.json (null: missing or not valid); gGeo = the numbers of focus.g (null: missing or without them)
      var tzFocusFiles = { geo: null, gGeo: null, at: 0, loading: null };

      // The geometry of a focus.json already parsed: {focusBelowBoxEdge, boxEdgeAboveReference}, or null when a number is missing or absurd
      function tzFocusGeoOfJson(data) {
        var g = data && data.geometry;
        var tab = g && typeof g.focusBelowBoxEdge === "number" ? g.focusBelowBoxEdge : NaN;
        var edge = g && typeof g.boxEdgeAboveReference === "number" ? g.boxEdgeAboveReference : NaN;
        if (!isFinite(tab) || !isFinite(edge) || tab <= 0 || tab > 30 || edge < -5 || edge > 5) return null;
        return { focusBelowBoxEdge: tab, boxEdgeAboveReference: edge };
      }

      // The same numbers in the text of focus.g (the lines `set global.focusTab = N` and `set global.focusBoxEdge = N`), or null
      function tzFocusGeoOfG(text) {
        var s = String(text || "");
        var tab = /^[ \t]*set[ \t]+global\.focusTab[ \t]*=[ \t]*(-?\d+(?:\.\d+)?)/m.exec(s);
        var edge = /^[ \t]*set[ \t]+global\.focusBoxEdge[ \t]*=[ \t]*(-?\d+(?:\.\d+)?)/m.exec(s);
        return tab && edge ? { focusBelowBoxEdge: parseFloat(tab[1]), boxEdgeAboveReference: parseFloat(edge[1]) } : null;
      }

      // The geometry the page works with: the one of focus.json when it was read, else the reference laser's
      function tzFocusGeometry() {
        return tzFocusFiles.geo || TZ_FOCUS_GEOMETRY;
      }

      // What the two files say together: "ok" | "differs" (the page and the macros would focus differently) | "no_g" (the macros that use the
      // thickness rule stop: focus.g is missing) | "no_json" (focus.json missing or not valid: the page uses the reference laser's numbers)
      function tzFocusStatus() {
        var f = tzFocusFiles;
        if (!f.geo) return "no_json";
        if (!f.gGeo) return "no_g";
        var d = Math.abs(f.geo.focusBelowBoxEdge - f.gGeo.focusBelowBoxEdge) > 0.0005 || Math.abs(f.geo.boxEdgeAboveReference - f.gGeo.boxEdgeAboveReference) > 0.0005;
        return d ? "differs" : "ok";
      }

      // Reads focus.json and focus.g (cached for TZ_FOCUS_TTL_MS). Never rejects: a file that cannot be read is a null. onChange runs when what the
      // page works with changed, so the card that shows a height is drawn again.
      function tzFocusLoad(onChange) {
        if (tzFocusFiles.loading) return tzFocusFiles.loading;
        if (tzFocusFiles.at && Date.now() - tzFocusFiles.at < TZ_FOCUS_TTL_MS) return Promise.resolve();
        var reading = function (path, parse) {
          return tzGetText(path).then(parse, function () { return null; });
        };
        tzFocusFiles.loading = Promise.all([
          reading(TZ_FOCUS_JSON, function (t) { try { return tzFocusGeoOfJson(JSON.parse(t)); } catch (e) { return null; } }),
          reading(TZ_FOCUS_G, tzFocusGeoOfG),
        ]).then(function (r) {
          var before = tzFocusKey();
          tzFocusFiles.geo = r[0];
          tzFocusFiles.gGeo = r[1];
          tzFocusFiles.at = Date.now();
          tzFocusFiles.loading = null;
          if (onChange && tzFocusKey() !== before) onChange();
        });
        return tzFocusFiles.loading;
      }

      // What redraws a card that shows a focus height: the geometry in use and the state of the two files
      function tzFocusKey() {
        var g = tzFocusGeometry();
        return [g.focusBelowBoxEdge, g.boxEdgeAboveReference, tzFocusStatus()].join("|");
      }
