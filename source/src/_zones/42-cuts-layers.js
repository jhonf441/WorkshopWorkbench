      function tcMoveSelA(tc, id) {
        var n = 0;
        tc.data.shapes.forEach(function (x) { if (tcIsSelId(tc, x.id) && x.layer !== id) { x.layer = id; n++; } });
        tcSyncLayers(tc);
        tcSave(tc);
        tcGo(tc);
        tcSetMsg(tc, n + (n === 1 ? i18nT('cuts.shape_moved_to') : i18nT('cuts.shapes_moved_to')) + tcLayerById(tc, id).name + ".", true);
      }

      function tcRenderLayers(tc, card) {
        var lc = card;
        var lh = tzEl("div", "tz-row");
        lh.style.cssText += "align-items:center;gap:6px;margin-bottom:4px;";
        var h4 = tzEl("span", "tz-muted", i18nT('cuts.they_are_cut_from_top_to'));
        h4.style.cssText = "margin-right:auto;flex:1 1 200px;";
        lh.appendChild(h4);
        lh.appendChild(tzTip(tzBtn(tc.data.viewOrder ? i18nT('cuts.hide_order') : i18nT('cuts.show_cut_order'), tc.data.viewOrder ? "primary" : null, function () {
          tc.data.viewOrder = !tc.data.viewOrder;
          tcSave(tc, true);
          tcGo(tc);
          tc.ctx.map.redraw();
        }), i18nT('cuts.numbers_the_shapes_on_the_map')));
        lh.appendChild(tzTip(tzBtn(i18nT('cuts.layer'), null, function () {
          var id = tc.data.layers.reduce(function (m, L) { return Math.max(m, L.id); }, 0) + 1;
          var used = tc.data.layers.map(function (L) { return L.color; });
          var color = TC_LAYER_COLORS.filter(function (c) { return used.indexOf(c) < 0; })[0] || TC_LAYER_COLORS[id % TC_LAYER_COLORS.length];
          var last = tc.data.layers[tc.data.layers.length - 1];
          tc.data.layers.push({ id: id, name: i18nT('cuts.layer_3', { id: id }), color: color, power: last.power, speed: last.speed, passes: last.passes, air: last.air });
          tc.data.activeLayer = id;
          tcSave(tc);
          tcGo(tc);
        }), i18nT('cuts.new_layer_color_with_its_own')));
        lc.appendChild(lh);
        var has = tc.selIds.length;
        var t = tzEl("div", "tc-layers");
        lc.appendChild(t);
        var cab = tzEl("div", "tc-layer tc-layer-cab");
        ["", i18nT('job.layer'), i18nT('cuts.power'), "mm/min", i18nT('common.passes'), ""].forEach(function (x) { cab.appendChild(tzEl("span", null, x)); });
        t.appendChild(cab);
        tc.data.layers.forEach(function (L, li) { return tcLayerRow(tc, t, has, L, li); });
      }

      function tcLayerRow(tc, t, has, L, li) {
        var ly = {};
          ly.active = L.id === tc.data.activeLayer;
          ly.cnt = tc.data.shapes.filter(function (sh) { return sh.layer === L.id; }).length;
          ly.row = tzEl("div", "tc-layer" + (ly.active ? i18nT('common.active_suffix') : "") + (L.hidden ? " apagada" : ""));
          t.appendChild(ly.row);
        tcLayerRowFields(tc, ly, t, has, L, li);
        tcLayerRowActions(tc, ly, t, has, L, li);
        tcLayerRowMore(tc, ly, t, has, L, li);
      }

      function tcLayerRowFields(tc, ly, t, has, L, li) {
        var ci = document.createElement("input");
        ci.type = "color";
        ci.value = L.color;
        ci.className = "tc-color";
        ci.title = i18nT('cuts.layer_color');
        ci.addEventListener("change", function () { L.color = ci.value; tcSave(tc); tcGo(tc); });
        ly.row.appendChild(ci);
        var nm = tzEl("div", "tc-layer-nom");
        var nb = tzEl("button", "tc-layer-nb", L.name);
        nb.type = "button";
        nb.title = ly.active ? i18nT('cuts.active_layer') : i18nT('cuts.tap_new_shapes_go_to_this');
        nb.addEventListener("click", function () { tc.data.activeLayer = L.id; tcSave(tc, true); tcGo(tc); });
        nm.appendChild(nb);
        nm.appendChild(tzEl("span", "tz-muted", (ly.cnt === 1 ? i18nT('cuts.1_shape') : i18nT('cuts.shapes_4', { cnt: ly.cnt })) + (L.locked ? i18nT('cuts.locked') : "") + (L.hidden ? i18nT('cuts.not_cut') : "")));
        ly.row.appendChild(nm);
        [["power", 1, 100], ["speed", 1, 30000], ["passes", 1, 20]].forEach(function (f) {
          var inp = document.createElement("input");
          inp.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
          inp.className = "tz-input";
          inp.min = String(f[1]);
          inp.max = String(f[2]);
          inp.value = String(L[f[0]]);
          if (f[0] === "power") inp.title = L.power + " % ~ " + tjPctToW(L.power) + " W";
          inp.addEventListener("change", function () {
            var v = tcNum(tc, inp.value);
            if (v === null || v < f[1] || v > f[2]) return tcSetMsg(tc, i18nT('cuts.value_out_of_range_to', { f: f[1], f2: f[2] }), false);
            L[f[0]] = f[0] === "passes" ? Math.round(v) : v;
            tcSyncLayers(tc);
            tcSave(tc);
            tcGo(tc);
          });
          ly.row.appendChild(inp);
        });
      }

      function tcLayerRowActions(tc, ly, t, has, L, li) {
        var acc = tzEl("div", "tc-layer-acc");
        ly.row.appendChild(acc);
        acc.appendChild(tzTip(tzBtn(L.air ? i18nT('job.air') : i18nT('cuts.no_air_2'), L.air ? "primary" : null, function () { L.air = !L.air; tcSave(tc); tcGo(tc); }), i18nT('cuts.air_assist_m42_p7_while_this')));
        acc.appendChild(tzTip(tzBtn(L.hidden ? i18nT('cuts.off') : i18nT('common.view'), L.hidden ? "warn" : null, function () { L.hidden = !L.hidden; tcSave(tc); tcGo(tc); }), i18nT('cuts.off_shown_faint_on_the_map')));
        acc.appendChild(tzTip(tzBtn(L.locked ? i18nT('cuts.locked_2') : i18nT('cuts.free_2'), L.locked ? "warn" : null, function () {
          L.locked = !L.locked;
          if (L.locked) tcSetSel(tc, tc.selIds.filter(function (id) { var x = tcShapeById(tc, id); return x && x.layer !== L.id; }));
          tcSave(tc, true);
          tcGo(tc);
        }), i18nT('cuts.locked_its_shapes_can_t_be')));
        var up = tzTip(tzBtn(i18nT('cuts.up'), null, function () {
          if (li === 0) return;
          tc.data.layers.splice(li - 1, 0, tc.data.layers.splice(li, 1)[0]);
          tcSave(tc);
          tcGo(tc);
        }), i18nT('cuts.cut_this_layer_earlier_e_g'));
        up.disabled = li === 0;
        acc.appendChild(up);
        if (has && !L.locked) {
          var all = tcSelShapes(tc).every(function (x) { return x.layer === L.id; });
          if (!all) acc.appendChild(tzTip(tzBtn(i18nT('cuts.move_here'), "primary", function () { tcMoveSelA(tc, L.id); }), i18nT('cuts.moves_the_selected_shapes_to_this')));
        }
        acc.appendChild(tzBtn(tc.layerOpen === L.id ? i18nT('cuts.less') : i18nT('cuts.more'), null, function () { tc.layerOpen = tc.layerOpen === L.id ? null : L.id; tcGo(tc); }));
      }

      function tcLayerRowMore(tc, ly, t, has, L, li) {
        if (tc.layerOpen === L.id) {
          var more = tzEl("div", "tc-layer-more");
          t.appendChild(more);
          var ni = document.createElement("input");
          ni.type = "text";
          ni.className = "tz-input";
          ni.value = L.name;
          ni.title = i18nT('cuts.layer_name');
          ni.addEventListener("change", function () { L.name = ni.value.trim() || L.name; tcSave(tc); tcGo(tc); });
          more.appendChild(ni);
          // "Usar material" (biblioteca, 36-materials.js): potencia, velocidad y pasadas
          var mats = (window.__workshopMaterials || []).filter(function (m) { return m.mode === "Laser"; });
          if (mats.length) {
            var msel = document.createElement("select");
            msel.className = "tz-input";
            var mo0 = document.createElement("option");
            mo0.value = "";
            mo0.textContent = i18nT('cuts.use_material');
            msel.appendChild(mo0);
            mats.forEach(function (m) {
              [["cut", i18nT('cuts.cut_4')], ["engraving", i18nT('cuts.engrave')]].forEach(function (k) {
                var o = m[k[0]];
                if (!o || !(o.power >= 0) || !(o.speed > 0)) return;
                var op = document.createElement("option");
                op.value = m.id + "|" + k[0];
                op.textContent = i18nT('cuts.mm_min_x_2', { mat: tmatLabel(m), k: k[1], power: o.power, speed: o.speed, n: o.passes || 1 });
                msel.appendChild(op);
              });
            });
            msel.addEventListener("change", function () {
              var parts = msel.value.split("|");
              var m = tmatById(parts[0]);
              var o = m && m[parts[1]];
              if (!o) return;
              L.power = Math.min(100, Math.max(1, o.power));
              L.speed = o.speed;
              L.passes = Math.max(1, Math.round(o.passes || 1));
              tcSyncLayers(tc);
              tcSave(tc);
              tcGo(tc);
              tcSetMsg(tc, i18nT('cuts.layer_of_mm_min_x', { name: L.name, parts: parts[1], material: m.name, power: L.power, speed: L.speed, passes: L.passes }), true);
            });
            tzTip(msel, i18nT('cuts.loads_power_speed_and_passes_from'));
            more.appendChild(msel);
          } else more.appendChild(tzEl("span", "tz-muted", i18nT('cuts.no_laser_materials_in_the_library')));
          more.appendChild(tzTip(tzBtn(i18nT('cuts.select_its_shapes'), null, function () {
            tcSetSel(tc, tc.data.shapes.filter(function (sh) { return sh.layer === L.id; }).map(function (sh) { return sh.id; }));
            tcGo(tc);
            tc.ctx.map.redraw();
          }), i18nT('cuts.selects_all_the_shapes_of_this')));
          var dn = tzBtn(i18nT('cuts.down'), null, function () {
            if (li >= tc.data.layers.length - 1) return;
            tc.data.layers.splice(li + 1, 0, tc.data.layers.splice(li, 1)[0]);
            tcSave(tc);
            tcGo(tc);
          });
          dn.disabled = li >= tc.data.layers.length - 1;
          more.appendChild(dn);
          if (tc.data.layers.length > 1)
            more.appendChild(tzBtn(i18nT('cuts.delete_layer'), "danger", function () {
              var dest = tc.data.layers[li === 0 ? 1 : 0].id;
              tc.data.shapes.forEach(function (sh) { if (sh.layer === L.id) sh.layer = dest; });
              tc.data.layers.splice(li, 1);
              if (tc.data.activeLayer === L.id) tc.data.activeLayer = dest;
              tc.layerOpen = null;
              tcSyncLayers(tc);
              tcSave(tc);
              tcGo(tc);
            }, i18nT('cuts.tap_again_delete_its_shapes_move')));
        }
      }
