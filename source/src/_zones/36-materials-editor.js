      function tmatSetMsg(tm2, t, ok) {
        tm2.M.set(t, ok);
      }

      function tmatZonesUsing(tm2, id) {
        var out = [];
        tm2.ctx.data.zones().forEach(function (z, i) {
          if (z && tm2.ctx.data.material(i) === id) out.push(TZ_CODES[i]);
        });
        return out;
      }

      function tmatNum(tm2, v) {
        var x = parseFloat(String(v).replace(",", "."));
        return isFinite(x) ? x : null;
      }

      function tmatRender(tm2) {
        if (!tm2.ctx.visible()) return;
        var card = tm2.ctx.card;
        card.innerHTML = "";
        var hd = tzEl("div", "tz-row");
        hd.style.alignItems = "center";
        hd.appendChild(tzEl("h3", null, i18nT('materials.materials')));
        var sp = tzEl("span");
        sp.style.flex = "1";
        hd.appendChild(sp);
        hd.appendChild(tzTip(tzBtn(i18nT('materials.new_laser'), "primary", function () { tmatOpenEditor(tm2, { mode: "Laser" }); }), i18nT('materials.material_to_cut_engrave_with_the')));
        hd.appendChild(tzTip(tzBtn(i18nT('materials.new_cnc'), null, function () { tmatOpenEditor(tm2, { mode: "CNC" }); }), i18nT('materials.material_for_milling_thickness_safe_height')));
        var fz = tm2.ctx.data.focusPerZone();
        var macros = Object.keys(fz).map(function (k) { return fz[k]; });
        if (macros.length) {
          hd.appendChild(
            tzTip(
              tzBtn(i18nT('materials.import_from_the_macros'), null, function () {
                var list = tmatItems.slice();
                var added = 0;
                macros.forEach(function (f) {
                  if (list.some(function (m) { return m.name.toLowerCase() === String(f.name).toLowerCase(); })) return;
                  list.push({ id: tmatNewId(list), name: f.name, mode: "Laser", thickness: tmatGuessThickness(f.name || f.macro), inside: Math.max(0, Math.round((tjLaserFocus() - f.h) * 100) / 100), cut: {}, engraving: {}, notes: i18nT('materials.imported_from_macros_laser', { macro: f.macro }) });
                  added++;
                });
                if (!added) return tmatSetMsg(tm2, i18nT('materials.the_material_macros_are_already_in'), true);
                tmatSave(list).then(function () { tm2.ctx.nav.onChange(); tmatSetMsg(tm2, i18nT('materials.material_s_imported_from_the_macros', { added: added }), true); });
              }),
              i18nT('materials.creates_one_material_for_each_material')
            )
          );
        }
        card.appendChild(hd);
        card.appendChild(
          tzEl(
            "div",
            "tz-muted",
            i18nT('materials.each_zone_can_have_its_material')
          )
        );
        if (tm2.M.text) card.appendChild(tm2.M.node());

        if (!tmatItems.length) {
          card.appendChild(tzEl("div", "tz-muted", i18nT('materials.no_materials_yet', { tip: macros.length ? i18nT('materials.tap_import_from_the_macros_to') : "" })));
        } else {
          var wrap = tzEl("div");
          wrap.style.overflowX = "auto";
          var t = tzEl("table", "tz-table");
          var hr = tzEl("tr");
          ["Material", i18nT('common.mode'), i18nT('materials.thickness'), i18nT('materials.focus_inside_safe_height'), i18nT('materials.cut'), i18nT('materials.engrave_bit'), i18nT('common.zones'), ""].forEach(function (h) { hr.appendChild(tzEl("th", null, h)); });
          t.appendChild(hr);
          tmatItems.forEach(function (m) {
            var tr = tzEl("tr", tm2.editing && tm2.editing.id === m.id ? "sel" : null);
            tr.appendChild(tzEl("td", null, m.name));
            tr.appendChild(tzEl("td", null, m.mode));
            tr.appendChild(tzEl("td", null, m.thickness ? m.thickness + " mm" : "--"));
            tr.appendChild(tzEl("td", null, m.mode === "CNC" ? (m.altSafe ? m.altSafe + " mm" : "--") : (tmatInside(m) ? i18nT('materials.mm_inside', { d: tmatInside(m) }) : i18nT('materials.at_the_surface')) + " (H " + tmatH(m) + ")"));
            var pv = function (o) { return o && o.power ? o.power + " % · " + (o.speed || "?") + " mm/min" + (o.passes > 1 ? " · x" + o.passes : "") : "--"; };
            tr.appendChild(tzEl("td", null, m.mode === "CNC" ? (m.feed ? m.feed + " mm/min" + (m.profPass ? i18nT('materials.mm_pass', { profPass: m.profPass }) : "") : "--") : pv(m.cut)));
            tr.appendChild(tzEl("td", null, m.mode === "CNC" ? (m.millingcutter || "--") + (m.rpm ? " · " + m.rpm + " rpm" : "") : pv(m.engraving)));
            var uz = tmatZonesUsing(tm2, m.id);
            tr.appendChild(tzEl("td", null, uz.length ? uz.join(", ") : "--"));
            var act = tzEl("td");
            act.style.whiteSpace = "nowrap";
            act.appendChild(tzBtn(i18nT('common.edit'), null, function () { tmatOpenEditor(tm2, m); }));
            act.appendChild(tzBtn(i18nT('common.copy'), null, function () {
              var c = JSON.parse(JSON.stringify(m));
              delete c.id;
              c.name = i18nT('materials.copy', { name: m.name });
              tmatOpenEditor(tm2, c);
            }));
            var del = tzBtn(i18nT('common.delete'), "danger", function () {
              tmatSave(tmatItems.filter(function (x) { return x.id !== m.id; })).then(function () {
                if (tm2.editing && tm2.editing.id === m.id) tm2.editing = null;
                tm2.ctx.nav.onChange();
                tmatSetMsg(tm2, i18nT('materials.deleted', { name: m.name, v: uz.length ? i18nT('materials.zones_are_left_without_material', { join: uz.join(", ") }) : "" }), true);
              });
            }, i18nT('common.tap_again_delete'), "tmdel" + m.id);
            act.appendChild(del);
            tr.appendChild(act);
            t.appendChild(tr);
          });
          wrap.appendChild(t);
          card.appendChild(wrap);
        }
        if (tm2.editing) tmatDrawEditor(tm2, card);
      }

      function tmatOpenEditor(tm2, m) {
        tm2.editing = JSON.parse(JSON.stringify(m));
        tm2.editing.cut = tm2.editing.cut || {};
        tm2.editing.engraving = tm2.editing.engraving || {};
        tm2.M.text = "";
        tmatRender(tm2);
      }

      function tmatDrawEditor(tm2, card) {
        var e = tm2.editing;
        var box = tzEl("div", "tz-card wf-card");
        box.style.cssText += "margin-top:10px;background:rgba(255,255,255,0.03);";
        box.appendChild(tzEl("h3", null, (e.id ? i18nT('materials.edit') : i18nT('materials.new_material')) + "(" + e.mode + ")"));
        var grid = tzEl("div");
        grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;";
        box.appendChild(grid);
        function fld(label, get, set, type, hint) {
          var w = tzEl("label");
          w.style.cssText = "display:flex;flex-direction:column;gap:2px;font-size:12px;";
          w.appendChild(tzEl("span", "tz-muted", label));
          var i = document.createElement("input");
          i.className = "tz-input";
          i.type = type || "number";
          i.step = "any";
          var v = get();
          i.value = v === undefined || v === null ? "" : String(v);
          i.addEventListener("input", function () { set(type === "text" ? i.value : tmatNum(tm2, i.value)); });
          if (hint) i.title = hint;
          w.appendChild(i);
          grid.appendChild(w);
        }
        fld(i18nT('common.name'), function () { return e.name; }, function (v) { e.name = v; }, "text");
        fld(i18nT('materials.thickness_mm'), function () { return e.thickness; }, function (v) { e.thickness = v; }, null, i18nT('materials.compared_with_what_the_probe_measures'));
        if (e.mode === "CNC") {
          fld(i18nT('materials.safe_height_mm'), function () { return e.altSafe; }, function (v) { e.altSafe = v; }, null, i18nT('materials.how_high_the_bit_rises_after'));
          fld(i18nT('materials.bit'), function () { return e.millingcutter; }, function (v) { e.millingcutter = v; }, "text");
          fld("RPM", function () { return e.rpm; }, function (v) { e.rpm = v; });
          fld(i18nT('materials.feed_mm_min'), function () { return e.feed; }, function (v) { e.feed = v; });
          fld(i18nT('materials.depth_per_pass_mm'), function () { return e.profPass; }, function (v) { e.profPass = v; });
        } else {
          if (e.inside === undefined) { e.inside = tmatInside(e); delete e.focus; }
          fld(i18nT('materials.focus_inside_the_material_mm'), function () { return e.inside; }, function (v) { e.inside = v; }, null, i18nT('materials.0_at_the_surface_the_focus', { f: tjLaserFocus() }));
          [["cut", i18nT('materials.cut')], ["engraving", i18nT('materials.engrave')]].forEach(function (k) {
            fld(i18nT('materials.power', { k: k[1] }), function () { return e[k[0]].power; }, function (v) { e[k[0]].power = v; });
            fld(i18nT('materials.speed_mm_min', { k: k[1] }), function () { return e[k[0]].speed; }, function (v) { e[k[0]].speed = v; });
            fld(i18nT('materials.passes', { k: k[1] }), function () { return e[k[0]].passes; }, function (v) { e[k[0]].passes = v; });
          });
        }
        fld(i18nT('common.notes'), function () { return e.notes; }, function (v) { e.notes = v; }, "text");
        var row = tzEl("div", "tz-row");
        row.style.cssText += "gap:6px;margin-top:8px;";
        row.appendChild(tzBtn(i18nT('zcal.save'), "primary", function () {
          var errs = [];
          if (!e.name || !String(e.name).trim()) errs.push(i18nT('materials.the_name_is_missing'));
          if (e.thickness !== undefined && e.thickness !== null && !(e.thickness > 0 && e.thickness <= 100)) errs.push(i18nT('materials.thickness_between_0_and_100_mm'));
          if (e.mode === "Laser" && e.inside !== undefined && e.inside !== null && e.inside !== "" && !(e.inside >= 0 && e.inside < tjLaserFocus())) errs.push(i18nT('materials.focus_inside_between_0_and_mm', { f: tjLaserFocus() }));
          if (e.mode === "CNC" && e.altSafe !== undefined && e.altSafe !== null && !(e.altSafe >= 1 && e.altSafe <= 60)) errs.push(i18nT('materials.safe_height_between_1_and_60'));
          ["cut", "engraving"].forEach(function (k) {
            var o = e[k] || {};
            if (o.power !== undefined && o.power !== null && !(o.power >= 0 && o.power <= 100)) errs.push(k === "cut" ? i18nT('materials.power_of_cut_range') : i18nT('materials.power_of_engrave_range'));
            if (o.passes !== undefined && o.passes !== null) o.passes = Math.max(1, Math.round(o.passes));
          });
          if (errs.length) return tmatSetMsg(tm2, errs.join(" "), false);
          e.name = String(e.name).trim();
          var list = tmatItems.slice();
          if (!e.id) {
            e.id = tmatNewId(list);
            list.push(e);
          } else {
            list = list.map(function (x) { return x.id === e.id ? e : x; });
          }
          tmatSave(list).then(function () {
            var uz = tmatZonesUsing(tm2, e.id);
            tm2.editing = null;
            tm2.ctx.nav.onChange(e.id);
            tmatSetMsg(tm2, i18nT('materials.saved', { name: e.name, v: uz.length && e.mode === "Laser" ? i18nT('materials.zones_are_updated_with_the_new', { join: uz.join(", ") }) : "" }), true);
          }, function (er) { tmatSetMsg(tm2, i18nT('common.not_saved_2', { err: er.message }), false); });
        }));
        row.appendChild(tzBtn(i18nT('zcal.cancel'), null, function () { tm2.editing = null; tmatRender(tm2); }));
        box.appendChild(row);
        card.appendChild(box);
      }

