      function tzCncTrayRender(cnc, force) {
        var rc = {};
        if (!cnc.ctx.visible() || !cnc.d) return;
        rc.s = cnc.ctx.machine.getSt();
        rc.pl = tzCncTrayPlan(cnc, false);
        rc.v = tzCncTrayValidate(cnc, rc.pl);
        var key = JSON.stringify([cnc.d, cnc.sel, cnc.level, !!cnc.placing, cnc.M.text, cnc.M.ok, !!cnc.ctx.machine.free(), rc.s && rc.s.mode, tzCncTrayArea(cnc), tzCncTrayZRoute(cnc), cnc.file && cnc.file.key === JSON.stringify(rc.pl), cnc.doc.designs.length, typeof tmatItems !== "undefined" ? tmatItems.length : 0]);
        if (!force && key === cnc.before) return;
        cnc.before = key;
        rc.card = cnc.ctx.card;
        rc.card.textContent = "";
        var h = tzEl("div", null, i18nT('cnc.title'));
        h.style.cssText = "font-size:16px;font-weight:500;";
        rc.card.appendChild(h);
        rc.card.appendChild(tzEl("div", "tz-muted", i18nT('cnc.intro')));
        if (rc.s && rc.s.mode && rc.s.mode !== "CNC") {
          rc.card.appendChild(tzEl("div", "tz-msg err", i18nT('cnc.disabled_mode', { mode: rc.s.mode })));
          return;
        }
        // design: choose, name, new, delete
        var row = tzEl("div", "tz-row");
        row.style.alignItems = "flex-end";
        var items = cnc.doc.designs.map(function (x) { return [x.id, x.name]; });
        if (!items.some(function (x) { return x[0] === cnc.d.id; })) items.unshift([cnc.d.id, cnc.d.name + " *"]);
        row.appendChild(tzCncTrayField(cnc, i18nT('cnc.design'), tzCncTraySelector(cnc, items, cnc.d.id, function (id) {
          var x = cnc.doc.designs.filter(function (y) { return y.id === id; })[0];
          if (x) { cnc.d = JSON.parse(JSON.stringify(x)); cnc.sel = null; cnc.file = null; cnc.level = 0; tzCncTrayChange(cnc); }
        })));
        var nm = tzEl("input", "tz-input");
        nm.value = cnc.d.name;
        nm.style.width = "140px";
        nm.addEventListener("change", function () { cnc.d.name = nm.value.trim() || cnc.d.name; tzCncTrayChange(cnc); });
        row.appendChild(tzCncTrayField(cnc, i18nT('cnc.name'), nm));
        row.appendChild(tzBtn(i18nT('cnc.new_design'), null, function () { cnc.d = tcnDesignNew(cnc.doc.designs.length + 2); cnc.sel = null; cnc.file = null; tzCncTrayChange(cnc); }));
        row.appendChild(tzBtn(i18nT('cnc.save_design'), null, tzBind(tzCncTraySaveDesign, cnc)));
        if (cnc.doc.designs.some(function (x) { return x.id === cnc.d.id; }))
          row.appendChild(tzBtn(i18nT('cnc.delete_design'), null, function () {
            cnc.doc.designs = cnc.doc.designs.filter(function (x) { return x.id !== cnc.d.id; });
            if (cnc.doc.active === cnc.d.id) cnc.doc.active = "";
            tzPutText(TCN_FILE, tzCncDesignsText(cnc.doc)).then(function () { cnc.M.set(i18nT('cnc.design_deleted'), true); }, function (e) { cnc.M.set(i18nT('cnc.could_not_save', { err: e && e.message ? e.message : e }), false); });
            cnc.d = cnc.doc.designs[0] ? JSON.parse(JSON.stringify(cnc.doc.designs[0])) : tcnDesignNew(1);
            cnc.sel = null; cnc.file = null; tzCncTrayChange(cnc);
          }, i18nT('cnc.delete_design_confirm'), "cnc-of"));
        rc.card.appendChild(row);
        // material and tool
        tzCncTraySection(cnc, rc.card, i18nT('cnc.tool'));
        var mats = (typeof tmatItems !== "undefined" ? tmatItems : []).filter(function (m) { return m.mode === "CNC"; });
        var mt = tzCncTrayMaterial(cnc);
        var f2 = tzEl("div");
        f2.style.cssText = "display:flex;flex-wrap:wrap;align-items:flex-end;";
        f2.appendChild(tzCncTrayField(cnc, i18nT('cnc.material'), tzCncTraySelector(cnc, [["", i18nT('cnc.no_material')]].concat(mats.map(function (m) { return [m.id, tmatLabel(m)]; })), cnc.d.materialId, function (id) { cnc.d.materialId = id; tzCncTrayChange(cnc); }), i18nT('cnc.material_tip')));
        var a = tzCncSettings(mt, cnc.d.tool);
        var H = cnc.d.tool;
        function hn(k, etq, ph, tip, width) {
          f2.appendChild(tzCncTrayField(cnc, etq, tzCncTrayNum(cnc, H[k], function (x) { if (x === null) delete H[k]; else H[k] = x; tzCncTrayChange(cnc); }, width, ph), tip));
        }
        hn("diameter", i18nT('cnc.diameter'), mt && mt.millingcutter ? mt.millingcutter : "", i18nT('cnc.diameter_tip'));
        hn("feed", i18nT('cnc.feed'), a.feed || "", i18nT('cnc.feed_tip'));
        hn("feedPen", i18nT('cnc.plunge'), a.feedPen || "", i18nT('cnc.plunge_tip'));
        hn("rpm", i18nT('cnc.rpm'), a.rpm || "", i18nT('cnc.rpm_tip'));
        hn("profPass", i18nT('cnc.step'), a.step || "", i18nT('cnc.step_tip'));
        hn("altSafe", i18nT('cnc.safe_z'), a.altSafe || "", i18nT('cnc.safe_z_tip'));
        hn("altApprox", i18nT('cnc.approach_z'), a.altApprox || "", i18nT('cnc.approach_z_tip'));
        hn("overlap", i18nT('cnc.stepover'), a.overlap, i18nT('cnc.stepover_tip'));
        rc.card.appendChild(f2);
        var f3 = tzEl("div");
        f3.style.cssText = "display:flex;flex-wrap:wrap;align-items:flex-end;";
        f3.appendChild(tzCncTrayField(cnc, i18nT('cnc.units'), tzCncTraySelector(cnc, [["mm", "mm (G21)"], ["in", "in (G20)"]], cnc.d.units, function (u) { cnc.d.units = u; tzCncTrayChange(cnc); }), i18nT('cnc.units_tip')));
        f3.appendChild(tzCncTrayField(cnc, i18nT('cnc.direction'), tzCncTraySelector(cnc, [["ccw", i18nT('cnc.dir_ccw')], ["cw", i18nT('cnc.dir_cw')]], cnc.d.direction, function (u) { cnc.d.direction = u; tzCncTrayChange(cnc); }), i18nT('cnc.direction_tip')));
        var man = tzEl("input");
        man.type = "checkbox";
        man.checked = !!H.spindleManual;
        man.addEventListener("change", function () { H.spindleManual = man.checked; tzCncTrayChange(cnc); });
        f3.appendChild(tzTip(tzCncTrayField(cnc, i18nT('cnc.spindle_manual'), man), i18nT('cnc.spindle_manual_tip')));
        rc.card.appendChild(f3);
        // shapes
        tzCncTraySection(cnc, rc.card, i18nT('cnc.shapes'));
        var add = tzEl("div", "tz-row");
        [["line", i18nT('cnc.add_line')], ["rect", i18nT('cnc.add_rect')], ["circle", i18nT('cnc.add_circle')], ["pocket", i18nT('cnc.add_pocket')]].forEach(function (t) {
          add.appendChild(tzBtn(t[1], null, function () { tzCncTrayNewShape(cnc, t[0]); }));
        });
        rc.card.appendChild(add);
        if (!cnc.d.shapes.length) rc.card.appendChild(tzEl("div", "tz-muted", i18nT('cnc.no_shapes')));
        tzCncTrayShapes(cnc, rc, force);
        tzCncTrayFile(cnc, rc, force);
      }


      // ---- map hooks (the same interface as the other tab modules: layMod) ----
      function tzCncTrayDraw(cnc, node, w) {
        if (!cnc.d) return;
        var pl = tzCncTrayPlan(cnc, false);
        var sec = tzCncSegments(pl);
        var sw = w / 350;
        var lim = cnc.level > 0 ? Math.min(cnc.level, sec.length) : sec.length;
        sec.slice(0, lim).forEach(function (e, i) {
          var active = cnc.level === 0 || i === lim - 1;
          var dd = e.secs.map(function (q) { return "M" + q[0].toFixed(2) + " " + (-q[1]).toFixed(2) + "L" + q[2].toFixed(2) + " " + (-q[3]).toFixed(2); }).join("");
          if (dd) node("path", { d: dd, fill: "none", stroke: "#26c6da", "stroke-width": sw * (active ? 1.4 : 1), "stroke-opacity": active ? 0.95 : 0.35, "stroke-linejoin": "round" });
        });
        // the design itself (the line of the part), selected one in amber
        cnc.d.shapes.forEach(function (f) {
          var col = f.id === cnc.sel ? "#ffb300" : "rgba(255,255,255,0.7)";
          var x = tzCncNum(f.x), y = tzCncNum(f.y), ww = tzCncNum(f.w), hh = tzCncNum(f.h);
          var da = { fill: "none", stroke: col, "stroke-width": sw * 1.2, "stroke-dasharray": w / 150 + " " + w / 220 };
          if ((f.kind === "rect" || f.kind === "pocket") && x !== null && y !== null && ww > 0 && hh > 0) node("rect", Object.assign({ x: x, y: -(y + hh), width: ww, height: hh }, da));
          else if (f.kind === "circle" && tzCncNum(f.cx) !== null && tzCncNum(f.cy) !== null && f.r > 0) node("circle", Object.assign({ cx: f.cx, cy: -f.cy, r: f.r }, da));
          else if (f.kind === "line" && [f.x1, f.y1, f.x2, f.y2].every(function (q) { return tzCncNum(q) !== null; })) node("line", Object.assign({ x1: f.x1, y1: -f.y1, x2: f.x2, y2: -f.y2 }, da));
        });
      }

      function tzCncTrayPutPoint(cnc, p) {
        var f = tzCncTrayShapeSel(cnc);
        if (!f || !cnc.placing) return;
        var x = Math.round(p.x * 100) / 100, y = Math.round(p.y * 100) / 100;
        if (f.kind === "circle") { f.cx = x; f.cy = y; cnc.placing = null; }
        else if (f.kind === "line") {
          if (cnc.placing.step === 0) { f.x1 = x; f.y1 = y; cnc.placing.step = 1; }
          else { f.x2 = x; f.y2 = y; cnc.placing = null; }
        } else { f.x = x; f.y = y; cnc.placing = null; }
        tzCncTrayChange(cnc);
      }

      function tzCncTrayShapes(cnc, rc, force) {
        cnc.d.shapes.forEach(function (f) {
          var r = tzEl("div", "tz-row");
          r.style.cssText = "align-items:center;padding:4px 6px;margin-top:4px;border-radius:4px;cursor:pointer;" + (f.id === cnc.sel ? "background:rgba(38,198,218,0.15);border:1px solid #26c6da;" : "border:1px solid rgba(255,255,255,0.12);");
          var t = tzEl("span", null, f.name + " - " + TCN_KINDS_TXT[f.kind]());
          t.style.flex = "1";
          r.appendChild(t);
          r.addEventListener("click", function (ev) {
            if (ev.target.closest && ev.target.closest("button")) return;
            cnc.sel = f.id; cnc.placing = null; tzCncTrayChange(cnc);
          });
          r.appendChild(tzBtn(i18nT('cnc.delete'), null, function () {
            cnc.d.shapes = cnc.d.shapes.filter(function (x) { return x.id !== f.id; });
            if (cnc.sel === f.id) cnc.sel = null;
            tzCncTrayChange(cnc);
          }));
          rc.card.appendChild(r);
        });
        var fs = tzCncTrayShapeSel(cnc);
        if (fs) {
          var e = tzEl("div");
          e.style.cssText = "display:flex;flex-wrap:wrap;align-items:flex-end;margin-top:8px;";
          var nmf = tzEl("input", "tz-input");
          nmf.value = fs.name;
          nmf.style.width = "120px";
          nmf.addEventListener("change", function () { fs.name = nmf.value.trim() || fs.name; tzCncTrayChange(cnc); });
          e.appendChild(tzCncTrayField(cnc, i18nT('cnc.name'), nmf));
          cnc.FIELDS[fs.kind].forEach(function (c) {
            e.appendChild(tzCncTrayField(cnc, c[1].toUpperCase(), tzCncTrayNum(cnc, fs[c[0]], function (x) { if (x !== null) fs[c[0]] = x; tzCncTrayChange(cnc); })));
          });
          e.appendChild(tzCncTrayField(cnc, i18nT('cnc.depth'), tzCncTrayNum(cnc, fs.depth, function (x) { if (x !== null) fs.depth = x; tzCncTrayChange(cnc); }), i18nT('cnc.depth_tip')));
          if (fs.kind !== "line" && fs.kind !== "pocket")
            e.appendChild(tzCncTrayField(cnc, i18nT('cnc.side'), tzCncTraySelector(cnc, [["center", i18nT('cnc.side_center')], ["inside", i18nT('cnc.side_inside')], ["outside", i18nT('cnc.side_outside')]], fs.side || "center", function (x) { fs.side = x; tzCncTrayChange(cnc); }), i18nT('cnc.side_tip')));
          rc.card.appendChild(e);
          var pr = tzEl("div", "tz-row");
          pr.appendChild(tzBtn(cnc.placing ? i18nT('cnc.placing') : i18nT('cnc.place_on_map'), cnc.placing ? "primary" : null, function () {
            cnc.placing = cnc.placing ? null : { step: 0 };
            tzCncTrayRender(cnc, true);
            cnc.ctx.map.redraw();
          }));
          rc.card.appendChild(pr);
        }
        // preview by depth level
        var sec = tzCncSegments(rc.pl);
        if (sec.length) {
          tzCncTraySection(cnc, rc.card, i18nT('cnc.preview'));
          var rg = tzEl("input");
          rg.type = "range";
          rg.min = 0;
          rg.max = sec.length;
          rg.value = Math.min(cnc.level, sec.length);
          rg.style.width = "220px";
          var et = tzEl("span", "tz-muted", cnc.level > 0 && cnc.level <= sec.length ? i18nT('cnc.up_to_level', { n: cnc.level, total: sec.length, z: tzFmt(sec[cnc.level - 1].z) }) : i18nT('cnc.all_levels', { total: sec.length }));
          rg.addEventListener("input", function () { cnc.level = parseInt(rg.value, 10) || 0; cnc.ctx.map.redraw(); et.textContent = cnc.level > 0 ? i18nT('cnc.up_to_level', { n: cnc.level, total: sec.length, z: tzFmt(sec[cnc.level - 1].z) }) : i18nT('cnc.all_levels', { total: sec.length }); });
          rg.addEventListener("change", function () { tzCncTrayRender(cnc, true); });
          var pf = tzEl("div", "tz-row");
          pf.style.alignItems = "center";
          pf.appendChild(rg);
          pf.appendChild(et);
          rc.card.appendChild(pf);
          if (rc.pl.ok) {
            var es = tzCncEstimate(rc.pl);
            rc.card.appendChild(tzEl("div", "tz-muted", i18nT('cnc.summary', { passes: es.passes, length: Math.round(es.length), minutes: Math.max(1, Math.round(es.minutes)) })));
          }
        }
        // errors and warnings: they block the file
        var errs = rc.pl.errors.map(function (c) { return Object.assign({ err: true }, c); }).concat(rc.v.errors.map(function (c) { return Object.assign({ err: true }, c); }));
        var avs = rc.pl.notices.concat(rc.v.notices);
        if (errs.length || avs.length) {
          var bx = tzEl("div");
          bx.style.marginTop = "8px";
          errs.forEach(function (c) { bx.appendChild(tzEl("div", "tz-msg err", tzCncTrayText(cnc, c, c))); });
          avs.forEach(function (c) { bx.appendChild(tzEl("div", "tz-muted", tzCncTrayText(cnc, c, c))); });
          rc.card.appendChild(bx);
        }
        // file and start
        tzCncTraySection(cnc, rc.card, i18nT('cnc.job'));
        rc.card.appendChild(tzEl("div", "tz-muted", i18nT('cnc.job_tip')));
        rc.acc = tzEl("div", "tz-row");
        rc.acc.style.marginTop = "6px";
        var bc = tzBtn(i18nT('cnc.create_file'), "primary", tzBind(tzCncTrayCreateFile, cnc));
        if (!rc.pl.ok || !rc.v.ok) bc.disabled = true;
        rc.acc.appendChild(bc);
      }

      function tzCncTrayFile(cnc, rc, force) {
        var fresh = !!cnc.file && cnc.file.key === JSON.stringify(rc.pl);
        var bs = tzBtn(i18nT('cnc.start'), null, tzBind(tzCncTrayLaunch, cnc), i18nT('cnc.start_confirm'), "cnc-start");
        if (!fresh || !rc.pl.ok || !rc.v.ok || !cnc.ctx.machine.free() || !rc.s || rc.s.mode !== "CNC") bs.disabled = true;
        rc.acc.appendChild(bs);
        rc.card.appendChild(rc.acc);
        if (cnc.file) rc.card.appendChild(tzEl("div", "tz-muted", fresh ? cnc.file.path : i18nT('cnc.file_stale')));
        if (cnc.M.text) rc.card.appendChild(cnc.M.node());
      }
