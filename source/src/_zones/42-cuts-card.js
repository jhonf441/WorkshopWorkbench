      function tcRender(tc) {
        var rc = {};
        tcFloatingPaint(tc); // the tools over the map (42-cuts-floating.js)
        tcSelBarPaint(tc); // what to do with the selection, over the map (42-cuts-floating-sel.js)
        rc.card = tc.ctx.card;
        tcCheckCut(tc);
        if (!tc.ctx.visible()) return;
        rc.free = tc.ctx.machine.free();
        var key = JSON.stringify([tc.data, !!tcClipRead(tc), tc.sel, tc.selIds, tc.multiMode, tc.arrayDlg && tc.arrayDlg.kind, tc.undoStack.length, tc.redoStack.length, tc.tool, tc.centerMode, tc.centerPts, tc.centerAim, tc.centerSlot, tc.centerDlgSeen, tc.centerDiam, tc.centerSol, tc.centerW, tc.centerH, tc.centerCorner, tc.jobStep, tc.M.text, rc.free, tc.ctx.machine.getSt() && tc.ctx.machine.getSt().mode, !!tc.ctx.cut.area(), tjLaserWatts, tjNeedsKey(tc.ctx.machine.getSt()), tc.ctx.data.focusList ? tc.ctx.data.focusList() : null, tcZoneBox(tc), tc.ctx.data.clamps ? tc.ctx.data.clamps() : null, tc.ctx.data.pieces ? tc.ctx.data.pieces() : null, tcCutGuard(tcCutGuardInput(tc))]);
        if (key === tc.lastKey) return;
        if (tzEditing(rc.card)) return tzRedrawOnRelease(rc.card, tzBind(tcRender, tc)); // campo con foco: rehacer al soltarlo (14-editing.js)
        tc.lastKey = key;
        rc.card.innerHTML = "";
        tcEnsureCss();
        rc.root = rc.card;
        rc.ssNow = tcSelShapes(tc);
        tcCardHeader(tc, rc);
        tcCardDraw(tc, rc);
        tcCardCenter(tc, rc);
        tcCardLayers(tc, rc);
        tcCardShapes(tc, rc);
        tcCardShapeSel(tc, rc);
        tcCardPlace(tc, rc);
        tcCardCut(tc, rc);
        tcCardMessage(tc, rc);
      }


      function tcCardHeader(tc, rc) {
        // encabezado: nombre + deshacer/rehacer
        var h = tzEl("div", "tz-row");
        h.style.cssText += "align-items:center;gap:6px;";
        var h3 = tzEl("h3", null, "Editor laser");
        h3.style.margin = "0";
        h.appendChild(h3);
        var hs = tzEl("span", "tz-muted", i18nT('cuts.draw_or_import_organize_by_layers'));
        hs.style.fontSize = "12px";
        hs.style.marginRight = "auto";
        h.appendChild(hs);
        var bU = tzTip(tzBtn(i18nT('cuts.undo'), null, tzBind(tcUndo, tc)), i18nT('cuts.undo_ctrl_z_up_to_60'));
        bU.disabled = !tc.undoStack.length;
        h.appendChild(bU);
        var bR = tzTip(tzBtn(i18nT('cuts.redo'), null, tzBind(tcRedo, tc)), i18nT('cuts.redo_ctrl_y'));
        bR.disabled = !tc.redoStack.length;
        h.appendChild(bR);
        var bPeg = tzTip(tzBtn(i18nT('cuts.paste'), null, tzBind(tcPasteSel, tc)), i18nT('cuts.paste_tip'));
        bPeg.disabled = !tcClipRead(tc);
        h.appendChild(bPeg);
        rc.root.appendChild(h);
        // no shapes yet: how it works, in one line (the tools are over the map)
        if (!tc.data.shapes.length) rc.root.appendChild(tzEl("div", "tc-guide", i18nT('cuts.guide_on_map')));
        // mensajes (arriba, siempre a la vista)
        rc.msgBox = tzEl("div");
        rc.root.appendChild(rc.msgBox);
      }

      function tcCardDraw(tc, rc) {
        var dw = {};
          // == DIBUJAR ==
          rc.card = tcSection(rc.root, "draw", i18nT('cuts.draw_2'), tc.tool ? i18nT('cuts.active_tool') : i18nT('cuts.shape_s_2', { n: tc.data.shapes.length }), true, tzBind(tcGo, tc));
        tcDrawBar(tc, dw, rc);
        tcDrawTool(tc, dw, rc);
        tcDrawNotices(tc, dw, rc);
      }


      function tcCardLayers(tc, rc) {
        // == CAPAS ==
        rc.card = tcSection(rc.root, "layers", i18nT('job.layers'), i18nT('cuts.layer_s_cut_in_this_order_2', { n: tc.data.layers.length }), true, tzBind(tcGo, tc), true);
        tcRenderLayers(tc, rc.card);
      }

      function tcCardShapes(tc, rc) {
        // == FORMAS ==
        rc.card = tcSection(rc.root, "shapes", i18nT('cuts.shapes_2'), i18nT('cuts.shape_s_2', { n: tc.data.shapes.length }), tc.data.shapes.length <= 12, tzBind(tcGo, tc), true);
        var tbl = tzEl("table", "tz-table");
        rc.card.appendChild(tbl);
        var hr = tzEl("tr");
        ["#", i18nT('cuts.shape_2'), i18nT('job.layer'), ""].forEach(function (t) { hr.appendChild(tzEl("th", null, t)); });
        tbl.appendChild(hr);
        if (!tc.data.shapes.length) {
          var er = tzEl("tr");
          var td0 = tzEl("td", "tz-muted", i18nT('cuts.no_shapes_use_line_rectangle_circle'));
          td0.colSpan = 4;
          er.appendChild(td0);
          tbl.appendChild(er);
        }
        tc.data.shapes.forEach(function (s, i) {
          var tr = tzEl("tr", tcIsSelId(tc, s.id) ? "sel" : null);
          tr.appendChild(tzEl("td", null, String(i + 1)));
          var tdD = tzEl("td", null, tcDescribe(s));
          tdD.style.cursor = "pointer";
          tdD.addEventListener("click", function () {
            if (tc.multiMode || tcShiftDown) tcToggleSel(tc, s.id);
            else tcSetSel(tc, tcIsSelId(tc, s.id) && tc.selIds.length === 1 ? [] : [s.id]);
            tcGo(tc);
          });
          tr.appendChild(tdD);
          var tdL = tzEl("td");
          tdL.appendChild(tcLayerSelect(tc, s.layer, function (id) { s.layer = id; tcSyncLayers(tc); tcSave(tc); tcGo(tc); }));
          tr.appendChild(tdL);
          var tdA = tzEl("td");
          tdA.appendChild(tzBtn(i18nT('common.edit'), null, function () { tcSetSel(tc, [s.id]); tcGo(tc); }));
          tdA.appendChild(tzBtn(i18nT('common.delete'), "danger", function () {
            tc.data.shapes = tc.data.shapes.filter(function (x) { return x.id !== s.id; });
            tcSetSel(tc, tc.selIds.filter(function (x) { return x !== s.id; }));
            tcSave(tc);
            tcGo(tc);
          }, i18nT('cuts.tap_again')));
          tr.appendChild(tdA);
          tbl.appendChild(tr);
        });
      }

      function tcDrawBar(tc, dw, rc) {
        dw.tb = tzEl("div", "tc-bar");
        rc.card.appendChild(dw.tb);
        var gSel = tzEl("div", "tc-group");
        gSel.appendChild(tzEl("span", "tc-glabel", i18nT('cuts.selection')));
        gSel.appendChild(tzTip(tzBtn("Multiple", tc.multiMode ? "primary" : null, function () { tc.multiMode = !tc.multiMode; tcGo(tc); }), i18nT('cuts.on_each_tap_on_a_shape')));
        gSel.appendChild(tzTip(tzBtn(i18nT('cuts.all'), null, function () { tcSetSel(tc, tc.data.shapes.filter(function (x) { return !tcLayerById(tc, x.layer).locked; }).map(function (x) { return x.id; })); tcGo(tc); }), i18nT('cuts.select_all_shapes_ctrl_a')));
        if (rc.ssNow.length) {
          gSel.appendChild(tzBtn(i18nT('cuts.none'), null, function () { tcSetSel(tc, []); tcGo(tc); }));
          gSel.appendChild(tzTip(tzBtn(i18nT('cuts.delete', { n: rc.ssNow.length, v: rc.ssNow.length === 1 ? i18nT('cuts.shape_3') : i18nT('cuts.shapes_3') }), "danger", tzBind(tcDeleteSel, tc), i18nT('cuts.tap_again_delete', { n: rc.ssNow.length })), i18nT('cuts.deletes_all_the_selected_shapes_at')));
        }
        if (tc.multiMode) gSel.appendChild(tzEl("span", "tz-muted", i18nT('cuts.tap_shapes_or_drag_a_box')));
        dw.tb.appendChild(gSel);
      }

      function tcDrawTool(tc, dw, rc) {
        // options of the active tool in a row of their own
        dw.tb = tzEl("div", "tc-bar");
        rc.card.appendChild(dw.tb);
        if (tc.tool && tc.tool.type === "poly") {
          var np = (tc.tool.pts || []).length;
          dw.tb.appendChild(tzEl("span", "tz-muted", i18nT('cuts.points', { np: np })));
          var bT = tzBtn(i18nT('cuts.finish'), "primary", function () { tcFinishPoly(tc, false); });
          bT.disabled = np < 2;
          dw.tb.appendChild(bT);
          var bC = tzTip(tzBtn(i18nT('cuts.close_outline'), null, function () { tcFinishPoly(tc, true); }), i18nT('cuts.joins_the_last_point_to_the'));
          bC.disabled = np < 3;
          dw.tb.appendChild(bC);
          var bD = tzBtn(i18nT('cuts.remove_last'), null, function () { tc.tool.pts.pop(); tcGo(tc); });
          bD.disabled = !np;
          dw.tb.appendChild(bD);
        }
        if (tc.tool && (tc.tool.type === "line" || tc.tool.type === "poly")) {
          dw.tb.appendChild(tzEl("span", "tz-muted", i18nT('cuts.angle')));
          [[45, "45"], [15, "15"], [0, i18nT('cuts.free')]].forEach(function (it) {
            dw.tb.appendChild(
              tzTip(
                tzBtn(it[1], (tc.data.snap || 0) === it[0] ? "primary" : null, function () { tc.data.snap = it[0]; tcSave(tc); tcGo(tc); }),
                it[0] ? i18nT('cuts.the_line_snaps_to_multiples_of', { deg: it[0] }) : i18nT('cuts.no_snapping_free_angle')
              )
            );
          });
        }
        if (!dw.tb.children.length) dw.tb.remove();
        if (tc.tool || !tc.data.shapes.length) rc.card.appendChild(
          tzEl(
            "div",
            "tc-hint",
            tc.tool && tc.tool.type === "poly"
              ? i18nT('cuts.polyline_tap_the_map_point_by')
              : tc.tool
              ? (tc.tool.type === "line"
                  ? i18nT('cuts.line_drag_on_the_map_from')
                  : tc.tool.type === "rect"
                  ? i18nT('cuts.rectangle_drag_from_one_corner_to')
                  : i18nT('cuts.circle_drag_from_the_centre_to')) +
                (tc.tool.p1 && !tc.drag ? i18nT('cuts.or_tap_the_second_point_the') : i18nT('cuts.or_tap_two_points'))
              : i18nT('cuts.choose_a_shape_and_draw_it')
          )
        );
      }

      // Where to put the drawing in the active zone and where it fits (folded by default; after the shapes)
      function tcCardPlace(tc, rc) {
        // == UBICAR EN LA ZONA ACTIVA ==
        var zbx = tcZoneBox(tc);
        if (zbx && tc.data.shapes.length) {
          var tg = tcPlaceTargets(tc), tb = tcBBox(tg);
          var rdx = tb.xmin - zbx.x, rdy = tb.ymin - zbx.y;
          rc.card = tcSection(rc.root, "place", i18nT('cuts.place_in', { code: zbx.code }), i18nT('cuts.from_0_0_mm', { v: rdx >= 0 ? "+" : "", rdx: tc.fmt(rdx), v2: rdy >= 0 ? "+" : "", rdy: tc.fmt(rdy) }), false, tzBind(tcGo, tc));
          var ub = tzEl("div", "tc-group");
          rc.card.appendChild(ub);
          ub.appendChild(tzTip(tzBtn(i18nT('cuts.to_0_0_of', { code: zbx.code }), null, function () { tcPlaceAt(tc, "00"); }), i18nT('cuts.puts_the_bottom_left_corner_of')));
          var bc = tzBtn(i18nT('cuts.centre_in', { code: zbx.code }), null, function () { tcPlaceAt(tc, "center"); });
          if (!(zbx.w > 0 && zbx.h > 0)) bc.disabled = true;
          ub.appendChild(tzTip(bc, zbx.w > 0 ? i18nT('cuts.centers_the_shapes_the_selection_or') : i18nT('cuts.the_zone_has_no_material_size')));
          rc.card.appendChild(tzEl("div", "tc-hint", i18nT('cuts.when_you_drag_shapes_on_the')));
        }
        // == WHERE IT FITS (material of the active zone and offcuts) ==
        var pzs = tc.ctx.data.pieces ? tc.ctx.data.pieces() : [];
        if (pzs.length && tc.data.shapes.length) {
          var tb2 = tcBBox(tcPlaceTargets(tc));
          var fits = pzs.map(function (pz) { return { pz: pz, f: tcFitIn(tc, pz, tb2) }; });
          var nOk = fits.filter(function (x) { return x.f; }).length;
          rc.card = tcSection(rc.root, "fits", i18nT('cuts.where_it_fits'), tc.fmt(tb2.xmax - tb2.xmin) + " x " + tc.fmt(tb2.ymax - tb2.ymin) + " mm -- " + nOk + " / " + pzs.length, false, tzBind(tcGo, tc));
          fits.forEach(function (x) {
            var r = tzEl("div", "tz-row");
            r.style.cssText += "gap:6px;align-items:center;margin:3px 0;";
            var sw2 = tzEl("span");
            sw2.style.cssText = "width:10px;height:10px;border-radius:4px;flex:none;background:" + (x.f ? "#66bb6a" : "#616161") + ";";
            r.appendChild(sw2);
            var nm = tzEl("span", null, x.pz.name + " (" + tc.fmt(x.pz.w) + " x " + tc.fmt(x.pz.h) + ")");
            nm.style.cssText = "flex:1 1 auto;min-width:0;";
            r.appendChild(nm);
            if (x.f) r.appendChild(tzTip(tzBtn(i18nT('cuts.put_it_there'), null, function () { tcMoveTargetsBy(tc, x.f.dx, x.f.dy); }), i18nT('cuts.moves_the_shapes_the_selection_or')));
            else r.appendChild(tzEl("span", "tz-muted", i18nT('cuts.doesn_t_fit')));
            rc.card.appendChild(r);
          });
        }
      }

      function tcDrawNotices(tc, dw, rc) {
        var prBad = [];
        tc.data.shapes.forEach(function (x, i) {
          var hh = tcClampHits(tc, x);
          if (hh.length) prBad.push(i + 1);
        });
        if (prBad.length) {
          var pw = tzEl("div", "tz-msg err", i18nT('cuts.shape_s_go_over_a_clamp', { list: prBad.join(", ") }));
          rc.root.appendChild(pw);
        }
        // == SELECCION ==
        if (rc.ssNow.length) {
          var sbx = tcSelBox(tc);
          rc.card = tcSection(rc.root, "selection", i18nT('cuts.selection'), i18nT('cuts.shape_s_x_mm', { n: rc.ssNow.length, w: tc.fmt(sbx.xmax - sbx.xmin), h: tc.fmt(sbx.ymax - sbx.ymin) }), true, tzBind(tcGo, tc));
          tcRenderEditBar(tc, rc.card);
        }
      }
