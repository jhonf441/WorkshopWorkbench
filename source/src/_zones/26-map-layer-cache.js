      // ---- Cache of the fixed layers of an SVG (the bed map and its minimap, 2026-10-24) ----
      // A layer is a <g> built once and kept with the SIGNATURE of what it was built from (a string: the zones, the area, the view and
      // zoom, the theme, the language, the size...). While the signature is the same the kept group is put back as it is (no element
      // created, no attribute written); when it changes the group is built again. What moves (the head, the trail) is not a fixed layer.
      // State (explicit, one per drawing): cache = { entries: { name: { sig, g } }, builds: { name: n }, reuses: { name: n } }.
      // docs-internal/MESA-RENOVADA.md section 9; tests/map-layer-cache.test.js.

      function tzLayerCacheCreate() {
        return { entries: {}, builds: {}, reuses: {} };
      }

      // The signature of a layer from the values it is drawn from (any JSON-able list).
      function tzLayerSig(parts) {
        return JSON.stringify(parts);
      }

      // The group of layer `name` for signature `sig`: the kept one, or a new one filled by build(g).
      function tzLayerGet(cache, name, sig, build) {
        var e = cache.entries[name];
        if (e && e.sig === sig) {
          cache.reuses[name] = (cache.reuses[name] || 0) + 1;
          return e.g;
        }
        var g = document.createElementNS(TZ_SVG_NS, "g");
        build(g);
        cache.entries[name] = { sig: sig, g: g };
        cache.builds[name] = (cache.builds[name] || 0) + 1;
        return g;
      }

      // Writes only the attributes whose value changed (the moving parts: a transform, a position).
      function tzSvgSetChanged(el, attrs) {
        Object.keys(attrs).forEach(function (k) {
          var v = String(attrs[k]);
          if (el.getAttribute(k) !== v) el.setAttribute(k, v);
        });
      }
