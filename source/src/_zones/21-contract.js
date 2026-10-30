      // ---- Contract of the ctx every Workbench module receives (stage 2 of the redesign) ----
      // docs-internal/PLAN-EJECUCION-REDESIGN.md, section 3. The list is CLOSED: a module that needs something new
      // adds it here and to tzCreateCtx in the same commit (tests/contract.test.js checks both sides).
      // Every function is called without `this`. i = zone index (0..9, same order as TZ_CODES).
      var TZ_CTX_CONTRACT = {
        // ctx.card (HTMLElement), ctx.centerCard (only the cuts module) and ctx.visible() (the tab of the module is open) are on the root of ctx
        root: ["card", "centerCard", "visible"],
        // machine state: st = last status read (readStatus)
        machine: ["getSt", "free", "jobInProgress", "mode", "read", "refresh"],
        // map drawing; svg, svgBox, ctm, capaActiva, barra, mostrar and camara are given by the page per module
        map: ["redraw", "svg", "svgBox", "ctm", "layerActive", "bar", "show", "camera"],
        // ctx.map.camera.*
        camera: ["hasVision", "usable", "shown", "notice", "turnon"],
        // geometry of the machine
        cut: ["correction", "limits", "area", "bboxShapes"],
        // zones and materials (read only; writing stays in the page except the two guardar* calls)
        data: ["zones", "size", "point", "savePoint", "material", "saveMaterial", "saveFocus", "focusPerZone", "focusList", "active", "pieces", "clamps", "nameActive", "controls", "pointsRef", "offsetProbe", "posSaved", "setCorrection", "sincFoco"],
        // change of tab and editing (goOffsets and offsetsProbeVisible are given per module: the Mesh of WorkshopMachine)
        nav: ["go", "goOffsets", "offsetsProbeVisible", "openEditorAt", "goPointer", "onChange", "cleanWorkbench"],
        // formatting and panels
        ui: ["fmt", "probePanel"],
      };

      // Builds the ctx of one module from the accessors of the page P (see tzMountPage) and the extras of that module.
      //   P     = { st, zones, zoneSizes, focusByZone, layout, renderMap, refreshAll, readStatus, machineFree, jobRunning,
      //             cutCorr, cutLimits, prensas, retazos, zonePoint, saveZonePoint, zoneMaterial, saveZoneMaterial,
      //             saveFocus, zoneChecks, refPoints, savedPos, probeOffset, setZoneCorr, syncFoco, openEditor,
      //             goLayout, syncMaterialZones }
      //   id    = tab id of the module (visible() defaults to "the layout is id")
      //   extra = { card, visible, mapa: {...}, nav: {...}, ui: {...}, datos: {...} } overrides / additions of the module
      function tzCreateCtx(P, id, extra) {
        extra = extra || {};
        function foco() { return Object.keys(P.focusByZone()).map(function (k) { return P.focusByZone()[k]; }); }
        var ctx = {
          card: extra.card,
          centerCard: extra.centerCard,
          visible: extra.visible || function () { return P.layout() === id; },
          machine: {
            getSt: function () { return P.st(); },
            free: function () { return P.machineFree(); },
            jobInProgress: function () { return P.jobRunning(); },
            mode: function () { var s = P.st(); return s ? s.mode : "?"; },
            read: function () { return P.readStatus(); },
            refresh: function () { return P.refreshAll(); },
          },
          map: {
            redraw: function () { if (P.st()) P.renderMap(); },
            matrix: function () { return P.viewMat ? P.viewMat() : null; }, // rotation / mirror of the view: {a, b, c, d}
          },
          cut: {
            correction: function () { return P.st() ? P.cutCorrection() : null; },
            limits: function () { return P.cutLimits(); },
            area: function () { return tzAreaCut(P.st()); },
            bboxShapes: function () {
              try {
                var d = JSON.parse(localStorage.getItem(TC_STORE_KEY) || "null");
                return d && Array.isArray(d.shapes) && d.shapes.length ? tcBBox(d.shapes) : null;
              } catch (e) {
                return null;
              }
            },
          },
          data: {
            zones: function () { return P.zones(); },
            size: function (i) { return P.zoneSizes()[i] || null; },
            point: function (i) { return P.zonePoint(i); },
            savePoint: function (i, p) { return P.saveZonePoint(i, p); },
            material: function (i) { return P.zoneMaterial(i); },
            saveMaterial: function (i, mid) { return P.saveZoneMaterial(i, mid); },
            saveFocus: function (i, h) { return P.saveFocus(i, h); },
            focusPerZone: function () { return P.focusByZone(); },
            focusList: foco,
            // active zone (point = 0,0 of the material, size optional)
            active: function () {
              var st = P.st();
              if (!st) return null;
              var zz = P.zones()[st.wn];
              if (!zz) return null;
              var sz = P.zoneSizes()[st.wn] || {};
              return { code: TZ_CODES[st.wn], x: zz.refX, y: zz.refY, w: sz.w > 0 ? sz.w : 0, h: sz.h > 0 ? sz.h : 0 };
            },
            // where a job can go: the material of the active zone and the offcuts
            pieces: function () {
              var out = [];
              var st = P.st(), zones = P.zones(), sizes = P.zoneSizes();
              if (st && zones[st.wn] && sizes[st.wn] && sizes[st.wn].w > 0) {
                var zz = zones[st.wn], sz = sizes[st.wn];
                out.push({ name: TZ_CODES[st.wn] + (zz.name ? " " + zz.name : ""), x: zz.refX, y: zz.refY, w: sz.w, h: sz.h });
              }
              P.offcuts().forEach(function (r) { out.push({ name: r.name || i18nT('zonesPage.offcut_2'), x: r.x, y: r.y, w: r.w, h: r.h }); });
              return out;
            },
            clamps: function () { return P.clamps(); },
            nameActive: function () {
              var st = P.st();
              var z = st ? P.zones()[st.wn] : null;
              return (st ? TZ_CODES[st.wn] : "") + (z && z.name ? " " + z.name : "");
            },
            controls: function (i) { return P.zoneChecks(i); },
            pointsRef: function () { return P.refPoints(); },
            offsetProbe: function () { return P.probeOffset(); },
            posSaved: function () { return P.savedPos(); },
            setCorrection: function (i, cx, cy) { return P.setZoneCorrection(i, cx, cy); },
            sincFoco: function () { return P.syncFocus(); },
          },
          nav: {
            go: function (l, query) { P.goLayout(l, query); },
            openEditorAt: function (i, p) { P.openEditor(i, { pre: p }); },
            goPointer: function (x, y) { return tjGoToBed(x, y); },
            onChange: function (mid) { P.syncMaterialZones(mid); },
          },
          ui: {
            fmt: tzFmt,
          },
        };
        // module specific parts (svg, camara, mostrar, limpiarMesa, sondaPanel...) and overrides
        ["map", "cut", "data", "nav", "ui", "machine"].forEach(function (ns) {
          var e = extra[ns];
          if (e) Object.keys(e).forEach(function (k) { ctx[ns][k] = e[k]; });
        });
        return ctx;
      }

      // One message helper for the cards: var M = tzMsg(function () { lastKey = ""; render(); });
      // M.set(text, ok) stores the text and calls the callback; M.text / M.ok are read when drawing;
      // M.node() is the element of the card (class "tz-msg ok" or "tz-msg err"); M.paints(el, text, ok) paints a given element.
      // estricto = true: ok is only true when the caller passes a true value (the cuts module); otherwise ok is false only when passed false.
      function tzMsg(alChange, strict) {
        var m = {
          text: "",
          ok: true,
          set: function (t, ok) {
            m.text = t || "";
            m.ok = strict ? !!ok : ok !== false;
            alChange();
          },
          node: function () { return tzEl("div", "tz-msg " + (m.ok ? "ok" : "err"), m.text); },
          paints: function (el, text, ok) {
            el.textContent = text || "";
            el.className = "tz-msg" + (text ? (ok ? " ok" : " err") : "");
          },
        };
        return m;
      }
