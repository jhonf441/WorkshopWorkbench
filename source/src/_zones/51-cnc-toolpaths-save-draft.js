      function tzCncTraySaveDraft(cnc) {
        try { localStorage.setItem(TCN_DRAFT_KEY, JSON.stringify(cnc.d)); } catch (e) { /* not critical */ }
      }

      function tzCncTrayChange(cnc, rehacer) {
        tzCncTraySaveDraft(cnc);
        cnc.ctx.map.redraw();
        if (rehacer !== false) tzCncTrayRender(cnc, true);
      }

      function tzCncTrayMaterial(cnc) {
        return cnc.d && cnc.d.materialId && typeof tmatById === "function" ? tmatById(cnc.d.materialId) : null;
      }

      function tzCncTrayArea(cnc) {
        return cnc.ctx.cut.area() || cnc.ctx.cut.limits();
      }

      function tzCncTrayZRoute(cnc) {
        var s = cnc.ctx.machine.getSt();
        var ax = s && s.axes && s.axes.Z;
        return ax && isFinite(ax.max) && isFinite(ax.min) ? ax.max - ax.min : null;
      }

      function tzCncTrayPlan(cnc, conDate) {
        return tzCncPlan(cnc.d.shapes, tzCncTrayMaterial(cnc), cnc.d.tool, { units: cnc.d.units, direction: cnc.d.direction, name: cnc.d.name, date: conDate ? tzLocalTime() : "" });
      }

      function tzCncTrayValidate(cnc, pl) {
        var v = tzCncValidate(pl, tzCncTrayArea(cnc), tzCncTrayZRoute(cnc));
        if (!cnc.ctx.cut.area()) v.notices.push({ c: "area_machine" });
        return v;
      }

      // ---- files ----
      function tzCncTrayLoad(cnc) {
        return tzGetText(TCN_FILE)
          .then(function (t) { cnc.doc = tzCncDesignsRead(t); }, function () { cnc.doc = tzCncDesignsRead(""); })
          .then(function () {
            var b = null;
            try { b = JSON.parse(localStorage.getItem(TCN_DRAFT_KEY) || "null"); } catch (e) { b = null; }
            if (b && typeof b === "object" && Array.isArray(b.shapes)) cnc.d = tzCncDesignsRead(JSON.stringify({ designs: [b] })).designs[0] || null;
            if (!cnc.d) cnc.d = cnc.doc.designs.filter(function (x) { return x.id === cnc.doc.active; })[0] || cnc.doc.designs[0] || tcnDesignNew(1);
            if (typeof tmatLoad === "function" && !tmatLoaded) tmatLoad().then(function () { tzCncTrayRender(cnc, true); });
            tzCncTrayRender(cnc, true);
          });
      }

      function tzCncTraySaveDesign(cnc) {
        if (cnc.doc.readOnly) return cnc.M.set(i18nT('cnc.read_only'), false);
        var i = -1;
        cnc.doc.designs.forEach(function (x, k) { if (x.id === cnc.d.id) i = k; });
        var copy = JSON.parse(JSON.stringify(cnc.d));
        if (i >= 0) cnc.doc.designs[i] = copy; else cnc.doc.designs.push(copy);
        cnc.doc.active = cnc.d.id;
        tzPutText(TCN_FILE, tzCncDesignsText(cnc.doc)).then(
          function () { cnc.M.set(i18nT('cnc.design_saved'), true); },
          function (e) { cnc.M.set(i18nT('cnc.could_not_save', { err: e && e.message ? e.message : e }), false); }
        );
      }

      function tzCncTrayCreateFile(cnc) {
        var pl = tzCncTrayPlan(cnc, true);
        var v = tzCncTrayValidate(cnc, pl);
        if (!pl.ok || !v.ok) return cnc.M.set(i18nT('cnc.fix_errors_first'), false);
        var ruta = TCN_DIR + tcnNameFile(cnc.d.name);
        var key = JSON.stringify(tzCncTrayPlan(cnc, false));
        tzPutText(ruta, tzCncGcode(pl)).then(
          function () {
            cnc.file = { path: ruta, key: key };
            cnc.M.set(i18nT('cnc.file_created', { path: ruta }), true);
          },
          function (e) { cnc.M.set(i18nT('cnc.could_not_create', { err: e && e.message ? e.message : e }), false); }
        );
      }

      function tzCncTrayLaunch(cnc) {
        var s = cnc.ctx.machine.getSt();
        if (!cnc.file || cnc.file.key !== JSON.stringify(tzCncTrayPlan(cnc, false))) return cnc.M.set(i18nT('cnc.file_stale'), false);
        if (!s || s.mode !== "CNC") return cnc.M.set(i18nT('cnc.mode_is_not_cnc'), false);
        if (!cnc.ctx.machine.free()) return cnc.M.set(i18nT('cnc.machine_busy'), false);
        tzStartFile(cnc.file.path).then( // 22-start-file.js
          function () { cnc.M.set(i18nT('cnc.started', { path: cnc.file.path }), true); }
        ).catch(function (e) { cnc.M.set(i18nT('cnc.not_started', { err: e && e.message ? e.message : e }), false); });
      }

      function tzCncTrayNewShape(cnc, kind) {
        var A = tzCncTrayArea(cnc);
        var cx = A ? (A.xmin + A.xmax) / 2 : 0, cy = A ? (A.ymin + A.ymax) / 2 : 0;
        var side = A ? Math.max(5, Math.round(Math.min(A.xmax - A.xmin, A.ymax - A.ymin) * 0.2)) : 20;
        var a = tzCncSettings(tzCncTrayMaterial(cnc), cnc.d.tool);
        var f = { id: "f" + Date.now().toString(36) + (cnc.seq.seq++), name: i18nT('cnc.shape_n', { n: cnc.d.shapes.length + 1 }), kind: kind, depth: a.step || 1, side: "center" };
        if (kind === "line") { f.x1 = Math.round(cx - side); f.y1 = Math.round(cy); f.x2 = Math.round(cx + side); f.y2 = Math.round(cy); }
        else if (kind === "circle") { f.cx = Math.round(cx); f.cy = Math.round(cy); f.r = side / 2; }
        else { f.x = Math.round(cx - side / 2); f.y = Math.round(cy - side / 2); f.w = side; f.h = side; }
        if (kind === "pocket") f.side = "inside";
        cnc.d.shapes.push(f);
        cnc.sel = f.id;
        tzCncTrayChange(cnc);
      }

      function tzCncTrayShapeSel(cnc) {
        var r = null;
        cnc.d.shapes.forEach(function (f) { if (f.id === cnc.sel) r = f; });
        return r;
      }

      // ---- card ----
      function tzCncTrayNum(cnc, valor, alChange, ancho, ph) {
        var i = tzEl("input", "tz-input");
        i.type = "text";
        i.setAttribute("inputmode", "decimal");
        i.value = valor === undefined || valor === null ? "" : valor;
        if (ph !== undefined && ph !== null) i.placeholder = String(ph);
        i.style.width = (ancho || 64) + "px";
        i.addEventListener("change", function () {
          var v = tzEval(i.value);
          if (i.value.trim() === "") alChange(null);
          else if (v !== null) alChange(v);
          else i.value = valor === undefined || valor === null ? "" : valor;
        });
        return i;
      }

      function tzCncTrayField(cnc, label, el, tip) {
        var w = tzEl("label", "tz-muted");
        w.style.cssText = "display:inline-flex;flex-direction:column;gap:2px;margin:0 8px 6px 0;font-size:11px;";
        w.appendChild(tzEl("span", null, label));
        w.appendChild(el);
        return tip ? tzTip(w, tip) : w;
      }

      function tzCncTraySelector(cnc, options, current, alChange) {
        var s = tzEl("select", "tz-input");
        options.forEach(function (o) {
          var op = tzEl("option", null, o[1]);
          op.value = o[0];
          if (o[0] === current) op.selected = true;
          s.appendChild(op);
        });
        s.addEventListener("change", function () { alChange(s.value); });
        return s;
      }

      function tzCncTraySection(cnc, card, title) {
        var h = tzEl("div", null, title);
        h.style.cssText = "font-weight:500;margin:12px 0 6px;";
        card.appendChild(h);
      }

      function tzCncTrayText(cnc, c, p) {
        return i18nT((c.err ? "cnc.err_" : "cnc.warn_") + c.c, p);
      }

