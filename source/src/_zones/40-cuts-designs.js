      // ---- designs.json v2: the ONE drawing file of the single editor (stage 3: the format only, nothing reads or writes it yet) ----
      //
      //   { v: 2, active: id, designs: [ { id, name, materialId, units, direction, tool, nextId, trim, archived, activeLayer, air, ui,
      //                                    layers: [ { id, name, color, hidden, locked, order, process: { Laser: {...}, CNC: {...} } } ],
      //                                    shapes: [ { id, type, layer, ...geometry } ] } ] }
      //
      // The shapes do NOT keep power / speed / passes (they are copies of the layer: tcSyncLayers puts them back in memory). The process of a layer is
      // the one of 40-cuts-process.js. laser-designs.json and cnc-designs.json are never touched: tzDesignsMigrate READS them (the text) and
      // returns a new document; whoever writes it (a later stage) writes it only when designs.json does not exist. Reading is tolerant: a missing
      // file, bad JSON or unknown fields give an empty or partial document and never throw; a file of a NEWER version is read and marked readOnly.

      var TZ_DESIGNS_FORMAT = 2;
      var TZ_DESIGNS_COLORS = ["#ff1744", "#2979ff", "#00e676", "#ffea00", "#ff9100", "#d500f9", "#00e5ff", "#ff4081", "#8d6e63", "#bdbdbd"];

      function tzDesignsEmpty() {
        return { v: TZ_DESIGNS_FORMAT, active: "", designs: [], readOnly: false };
      }

      function tzDesignsJson(text) {
        try {
          var o = JSON.parse(text);
          return o && typeof o === "object" ? o : null;
        } catch (e) {
          return null;
        }
      }

      function tzDesignsArr(v) {
        return Array.isArray(v) ? v : [];
      }

      function tzDesignsLayer(L, i) {
        var proc = L.process && typeof L.process === "object" ? L.process : null;
        if (!proc) proc = { Laser: { power: L.power, speed: L.speed, passes: L.passes, air: !!L.air } };
        return {
          id: L.id, name: String(L.name === undefined ? "" : L.name), color: String(L.color || TZ_DESIGNS_COLORS[i % TZ_DESIGNS_COLORS.length]),
          hidden: !!L.hidden, locked: !!L.locked, order: typeof L.order === "number" ? L.order : i, process: proc,
        };
      }

      // a shape as it is stored: its own fields, without the copies of the layer's process
      function tzDesignsShape(s) {
        var out = {};
        Object.keys(s).forEach(function (k) {
          if (k !== "power" && k !== "speed" && k !== "passes") out[k] = s[k];
        });
        return out;
      }

      function tzDesignsOne(d, i) {
        var layers = tzDesignsArr(d.layers).filter(function (L) { return L && typeof L === "object" && L.id !== undefined; }).map(tzDesignsLayer);
        layers.sort(function (a, b) { return a.order - b.order; });
        return {
          id: String(d.id === undefined ? "d" + (i + 1) : d.id), name: String(d.name || d.id || "Design " + (i + 1)), materialId: d.materialId ? String(d.materialId) : "",
          units: d.units === "in" ? "in" : "mm", direction: d.direction === "cw" ? "cw" : "ccw", tool: d.tool && typeof d.tool === "object" ? d.tool : {},
          nextId: typeof d.nextId === "number" ? d.nextId : 1, trim: !!d.trim, archived: tzDesignsArr(d.archived), air: d.air !== false,
          activeLayer: d.activeLayer !== undefined ? d.activeLayer : layers.length ? layers[0].id : null, ui: d.ui && typeof d.ui === "object" ? d.ui : {}, layers: layers,
          shapes: tzDesignsArr(d.shapes).filter(function (s) { return s && typeof s === "object" && s.type && s.layer !== undefined; }).map(tzDesignsShape),
        };
      }

      // designs.json -> the document (never throws)
      function tzDesignsRead(text) {
        var o = tzDesignsJson(text);
        if (!o || !Array.isArray(o.designs)) return tzDesignsEmpty();
        var designs = o.designs.filter(function (d) { return d && typeof d === "object"; }).map(tzDesignsOne);
        return { v: TZ_DESIGNS_FORMAT, active: o.active ? String(o.active) : designs.length ? designs[0].id : "", designs: designs, readOnly: Number(o.v) > TZ_DESIGNS_FORMAT };
      }

      // the document -> designs.json text
      function tzDesignsWrite(doc) {
        return JSON.stringify({ v: TZ_DESIGNS_FORMAT, active: doc.active || "", designs: doc.designs }, null, 1);
      }

      // ---- laser-designs.json -> one design "Laser" ----
      // A very old file has no layers: one layer for each power|speed|passes combination, like the editor did on load (40-cuts-state.js).
      function tzDesignsLaserLayers(o) {
        if (Array.isArray(o.layers) && o.layers.length) return o.layers;
        var base = tzDesignsArr(o.shapes).length ? o.shapes : [Object.assign({}, o.defaults || { power: 30, speed: 1000, passes: 1 })];
        var seen = {}, layers = [];
        base.forEach(function (sh) {
          var k = [sh.power, sh.speed, sh.passes].join("|");
          if (seen[k] === undefined) {
            seen[k] = layers.length + 1;
            layers.push({ id: seen[k], name: "Layer " + seen[k], color: TZ_DESIGNS_COLORS[layers.length % TZ_DESIGNS_COLORS.length], power: sh.power, speed: sh.speed, passes: sh.passes, air: o.air !== false });
          }
          sh.layer = sh.layer === undefined ? seen[k] : sh.layer;
        });
        return layers;
      }

      function tzDesignsFromLaser(text) {
        var o = tzDesignsJson(text);
        if (!o || !Array.isArray(o.shapes)) return null;
        if (!o.shapes.length && !(Array.isArray(o.layers) && o.layers.length)) return null; // nothing drawn and no layer of the user: the editor makes its default one
        var layers = tzDesignsLaserLayers(o);
        return tzDesignsOne({
          id: "laser", name: "Laser", units: "mm", layers: layers, shapes: o.shapes, nextId: o.nextId, trim: o.trim, archived: o.archived, air: o.air, ui: { snap: o.snap, viewOrder: !!o.viewOrder },
          activeLayer: o.activeLayer !== undefined ? o.activeLayer : layers[0].id,
        }, 0);
      }

      // ---- cnc-designs.json -> N designs ----
      // Every CNC shape becomes a drawing shape (line / rect / circle; a pocket is a rect) and the layer that groups it carries the process
      // CNC { depth, side, operation }: one layer for each distinct combination, like the laser groups by power|speed|passes.
      function tzDesignsCncLayer(layers, byKey, f) {
        var op = f.kind === "pocket" ? "pocket" : "contour";
        var side = f.side === "inside" || f.side === "outside" ? f.side : "center";
        var key = [f.depth, side, op].join("|");
        if (byKey[key] === undefined) {
          var n = layers.length + 1;
          byKey[key] = n;
          layers.push({ id: n, name: "CNC " + (f.depth === undefined ? "?" : f.depth) + " mm " + side + (op === "pocket" ? " pocket" : ""), color: TZ_DESIGNS_COLORS[layers.length % TZ_DESIGNS_COLORS.length],
            process: { CNC: { depth: f.depth === undefined ? null : f.depth, side: side, operation: op } } });
        }
        return byKey[key];
      }

      function tzDesignsCncShape(f, id, layer) {
        var out = { id: id, type: f.kind === "pocket" ? "rect" : f.kind, layer: layer, src: f.id === undefined ? null : f.id };
        Object.keys(f).forEach(function (k) {
          if (k !== "id" && k !== "kind" && k !== "depth" && k !== "side") out[k] = f[k];
        });
        return out;
      }

      function tzDesignsFromCncOne(d, i) {
        var layers = [], byKey = {}, shapes = [];
        tzDesignsArr(d.shapes).forEach(function (f, n) {
          if (!f || typeof f !== "object") return;
          shapes.push(tzDesignsCncShape(f, n + 1, tzDesignsCncLayer(layers, byKey, f)));
        });
        return tzDesignsOne({ id: "cnc-" + (d.id === undefined ? i + 1 : d.id), name: d.name, materialId: d.materialId, units: d.units, direction: d.direction, tool: d.tool, layers: layers, shapes: shapes, nextId: shapes.length + 1 }, i);
      }

      function tzDesignsFromCnc(text) {
        var o = tzDesignsJson(text);
        if (!o || !Array.isArray(o.designs)) return [];
        return o.designs.filter(function (d) { return d && typeof d === "object"; }).map(tzDesignsFromCncOne);
      }

      // The two old files (their TEXT, or empty / null when missing) -> the v2 document. It writes nothing: the old files are not touched.
      function tzDesignsMigrate(laserText, cncText) {
        var designs = [];
        var laser = tzDesignsFromLaser(laserText);
        if (laser && (laser.shapes.length || laser.layers.length)) designs.push(laser);
        tzDesignsFromCnc(cncText).forEach(function (d) { designs.push(d); });
        return { v: TZ_DESIGNS_FORMAT, active: designs.length ? designs[0].id : "", designs: designs, readOnly: false };
      }
