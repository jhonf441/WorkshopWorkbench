      function tgGrRender(tg, force) {
        var rn = {};
        if (!tg.ctx.visible()) return;
        var key = JSON.stringify([tg.data, tg.counts && tg.counts.missing_mm, tg.files && tg.files.length, tg.M.text, tg.busy, !!tg.preview, tg.choosingOrigin, tg.touching, !!tgGrArea(tg), !!tg.ctx.machine.free(), tzSafetyKey()]);
        if (!force && key === tg.beforeRender) return;
        tg.beforeRender = key;
        tg.card.textContent = "";
        // 2026-10-10 ("a better name is missing, explain what it is for, and arranging the piece is complicated")
        // 2026-10-11: the user asked for another name: "Cut in parts"
        var h = tzEl("div", null, i18nT('large.cut_in_parts_assistant_laser'));
        h.style.cssText = "font-size:16px;font-weight:500;";
        tg.card.appendChild(h);
        tg.card.appendChild(tzEl("div", "tz-muted", i18nT('large.cuts_in_parts_a_design_larger')));
        var stM = tg.ctx.machine.getSt();
        if (stM && stM.mode && stM.mode !== "Laser") {
          tg.card.appendChild(tzEl("div", "tz-msg err", i18nT('large.disabled_the_machine_is_in_mode', { mode: stM.mode })));
          return;
        }
        if (!tgGrArea(tg)) {
          tg.card.appendChild(tzEl("div", "tz-msg err", i18nT('large.first_measure_the_cutting_area_of')));
          return;
        }
        // 1. archivo
        var p1 = tgGrStep(tg, 1, i18nT('large.choose_the_g_code'), !tg.data.file, !!tg.data.file);
        if (tg.data.file && tg.data.summary) {
          var r = tg.data.summary;
          var w = r.bbox[2] - r.bbox[0], hh = r.bbox[3] - r.bbox[1];
          var A = tgGrArea(tg);
          var enters = w <= A.xmax - A.xmin && hh <= A.ymax - A.ymin;
          p1.appendChild(tzEl("div", null, tg.data.file.replace(/^0:\/gcodes\//, "")));
          p1.appendChild(tzEl("div", "tz-muted", i18nT('large.size_x_mm_m_of_cut', { w: tzFmt(w), hh: tzFmt(hh), m: Math.round(r.length / 10) / 100, pct_max: r.pct_max, v2: enters ? i18nT('large.fits_whole_in_the_area_this') : "" })));
        }
        var row = tzEl("div", "tz-row");
        row.style.alignItems = "center";
        if (tg.files) {
          var sel = tzEl("select", "tz-input");
          sel.style.maxWidth = "260px";
          var o0 = tzEl("option", null, tg.files.length ? i18nT('large.choose_a_file') : i18nT('large.no_g_code_in_the_gcodes'));
          o0.value = "";
          sel.appendChild(o0);
          tg.files.forEach(function (f) {
            var o = tzEl("option", null, f.path.replace(/^0:\/gcodes\//, ""));
            o.value = f.path;
            if (f.path === tg.data.file) o.selected = true;
            sel.appendChild(o);
          });
          row.appendChild(sel);
          row.appendChild(tgGrButton(tg, i18nT('large.read'), "", function () {
            if (sel.value) tgGrRead(tg, sel.value);
          }));
        } else {
          row.appendChild(tgGrButton(tg, tg.data.file ? i18nT('large.choose_another_file') : i18nT('large.find_files'), "", tzBind(tgGrListItems, tg)));
        }
        if (tg.data.file)
          row.appendChild(tgGrButton(tg, i18nT('large.start_over'), "", function () {
            tg.data = { pct: tg.data.pct, speed: tg.data.speed, done: [] };
            tg.preview = tg.counts = null;
            tgGrSave(tg);
            tg.M.text = "";
            tgGrRender(tg, true);
            tg.ctx.map.redraw();
          }, i18nT('large.confirm_clears_the_progress'), "tg-reset"));
        p1.appendChild(row);
        if (!tg.data.file) return tgGrFoot(tg);
        // 2. locate (only for the first part; afterwards the marks measure it)
        rn.first = !tg.data.done.length;
        rn.p2 = tgGrStep(tg, 2, i18nT('large.place_the_piece_part_1'), rn.first && tg.data.step === "place", !rn.first || tg.data.step !== "place");
        tgGrPlace(tg, rn, force);
        tgGrStepCut(tg, rn, force);
      }


      function tgGrFoot(tg) {
        if (tg.M.text) tg.card.appendChild(tg.M.node());
      }

      function tgGrPlace(tg, rn, force) {
        if (rn.first && tg.data.step === "place") {
          rn.p2.appendChild(tzEl("div", null, i18nT('large.mark_2_points_of_your_piece')));
          var P = tg.data.pts || {};
          [["corner", i18nT('large.a_the_front_left_corner')], ["edge", i18nT('large.b_another_point_of_the_front')]].forEach(function (it) {
            var fp = tzEl("div", "tz-row");
            fp.style.alignItems = "center";
            var v = P[it[0]];
            fp.appendChild(tzEl("span", null, it[1]));
            fp.appendChild(tzEl("span", "tz-muted", v ? "X" + tzFmt(v[0]) + " Y" + tzFmt(v[1]) : i18nT('large.not_marked')));
            fp.appendChild(tgGrButton(tg, i18nT('large.pointer_here'), v ? "" : "primary", function () { tgGrPutPoint(tg, it[0], tgGrPointPointer(tg)); }));
            fp.appendChild(tgGrButton(tg, tg.touching === it[0] ? i18nT('common.tap_the_map') : i18nT('large.tap_on_the_map'), tg.touching === it[0] ? "primary" : "", function () {
              tg.touching = tg.touching === it[0] ? null : it[0];
              tg.choosingOrigin = false;
              tgGrRender(tg, true);
            }));
            rn.p2.appendChild(fp);
          });
          var fmg = tzEl("div", "tz-row");
          fmg.style.alignItems = "center";
          fmg.appendChild(tzEl("span", "tz-muted", i18nT('large.distance_from_the_design_to_the')));
          fmg.appendChild(tgGrNumber(tg, tzFmt(tg.data.margin == null ? 5 : tg.data.margin), function (v) { tg.data.margin = Math.max(0, Math.min(100, v)); tgGrSave(tg); tgGrPlaceByPoints(tg); }, 54));
          fmg.appendChild(tzEl("span", "tz-muted", "mm"));
          rn.p2.appendChild(fmg);
          rn.p2.appendChild(tzEl("div", "tz-muted", i18nT('large.with_the_pointer_bring_the_red')));
          var o2 = tzEl("div", null, i18nT('large.or_drag_the_design_on_the'));
          o2.style.marginTop = "8px";
          rn.p2.appendChild(o2);
          rn.p2.appendChild(tzEl("div", "tz-muted", i18nT('large.green_what_is_cut_now_dashed')));
          var f2 = tzEl("div", "tz-row");
          f2.style.alignItems = "center";
          var z = tg.ctx.data.active();
          if (z)
            f2.appendChild(tgGrButton(tg, i18nT('large.to_0_0_of_zone', { code: z.code }), "", function () {
              tg.data.T.tx = z.x;
              tg.data.T.ty = z.y;
              tgGrMoved(tg);
            }));
          f2.appendChild(tgGrButton(tg, i18nT('large.center_in_the_area'), "", function () {
            var A = tgGrArea(tg), c = tgGrCenterDesign(tg);
            var b = tgApply(tg.data.T, c[0], c[1]);
            tg.data.T.tx += (A.xmin + A.xmax) / 2 - b[0];
            tg.data.T.ty += (A.ymin + A.ymax) / 2 - b[1];
            tgGrMoved(tg);
          }));
          f2.appendChild(tgGrButton(tg, i18nT('common.rotate_90'), "", function () {
            // rotates around the design's center (it stays in the same place)
            var c = tgGrCenterDesign(tg);
            var b = tgApply(tg.data.T, c[0], c[1]);
            tg.data.T.rotation = (((tg.data.T.rotation || 0) + 90) % 360 + 360) % 360;
            var b2 = tgApply(tg.data.T, c[0], c[1]);
            tg.data.T.tx += b[0] - b2[0];
            tg.data.T.ty += b[1] - b2[1];
            tgGrMoved(tg);
          }));
          rn.p2.appendChild(f2);
          // ajuste fino (numeros), plegado
          var det = tzEl("details");
          var sum = tzEl("summary", null, i18nT('large.fine_adjustment_numbers'));
          sum.style.cssText = "cursor:pointer;font-size:12px;margin:4px 0;";
          det.appendChild(sum);
          var f3 = tzEl("div", "tz-row");
          f3.style.alignItems = "center";
          f3.appendChild(tzEl("span", "tz-muted", i18nT('large.design_0_0_at_x')));
          f3.appendChild(tgGrNumber(tg, tzFmt(tg.data.T.tx), function (v) { tg.data.T.tx = v; tgGrMoved(tg); }));
          f3.appendChild(tzEl("span", "tz-muted", "Y"));
          f3.appendChild(tgGrNumber(tg, tzFmt(tg.data.T.ty), function (v) { tg.data.T.ty = v; tgGrMoved(tg); }));
          f3.appendChild(tgGrButton(tg, tg.choosingOrigin ? i18nT('common.tap_the_map') : i18nT('large.tap_where_the_0_0_goes'), tg.choosingOrigin ? "primary" : "", function () {
            tg.choosingOrigin = !tg.choosingOrigin;
            tg.touching = null;
            tgGrRender(tg, true);
          }));
          det.appendChild(f3);
          rn.p2.appendChild(det);
          if (tg.counts) rn.p2.appendChild(tzEl("div", "tz-muted", i18nT('large.part_1_mm_of_cut_mm', { this_mm: Math.round(tg.counts.this_mm), missing_mm: Math.round(tg.counts.missing_mm) })));
          rn.p2.appendChild(tgGrButton(tg, i18nT('large.the_piece_is_there_continue'), "primary", function () {
            tg.data.step = "cut";
            tgGrSave(tg);
            tgGrRender(tg, true);
          }));
        } else if (tg.data.T) {
          rn.p2.appendChild(tzEl("div", "tz-muted", i18nT('large.part_rotation_degrees_0_0_of', { n: tgGrN(tg), rotation: tzFmt(tg.data.T.rotation), tx: tzFmt(tg.data.T.tx), ty: tzFmt(tg.data.T.ty) })));
        }
        // 3. marcar y cortar
        rn.missing = tg.counts ? tg.counts.missing_mm : null;
      }

      function tgGrStepCut(tg, rn, force) {
        var inCut = tg.data.step === "cut" || tg.data.step === "cutting";
        var p3 = tgGrStep(tg, 3, i18nT('large.cut_part', { n: tgGrN(tg) }), inCut, tg.data.step === "move" || tg.data.step === "measure" || tg.data.step === "end");
        if (inCut) {
          var free = tg.ctx.machine.free();
          if (tg.counts) p3.appendChild(tzEl("div", "tz-muted", i18nT('large.this_part_cuts_mm', { this_mm: Math.round(tg.counts.this_mm), v: rn.missing > 0.5 ? i18nT('large.then_mm_remain', { missing: Math.round(rn.missing) }) : i18nT('large.it_is_the_last_part') })));
          tzSafetyRender(p3, function () { tgGrRender(tg, true); }, "Laser"); // glasses, lid, extraction, area clear: needed to burn the marks or cut
          if (rn.missing > 0.5) {
            var hasMarks = tg.data.marks && tg.data.marks.part === tgGrN(tg);
            var fm = tzEl("div", "tz-row");
            fm.style.alignItems = "center";
            fm.appendChild(tzEl("span", null, hasMarks ? i18nT('large.marks_burned') : i18nT('large.a_registration_marks')));
            fm.appendChild(tzEl("span", "tz-muted", i18nT('large.power')));
            fm.appendChild(tgGrNumber(tg, tg.data.pct, function (v) { tg.data.pct = Math.max(1, Math.min(30, v)); tgGrSave(tg); }, 54));
            fm.appendChild(tzEl("span", "tz-muted", i18nT('large.at')));
            fm.appendChild(tgGrNumber(tg, tg.data.speed, function (v) { tg.data.speed = Math.max(100, Math.min(6000, Math.round(v))); tgGrSave(tg); }, 64));
            fm.appendChild(tzEl("span", "tz-muted", "mm/min"));
            var bm = tgGrButton(tg, hasMarks ? i18nT('large.mark_again') : i18nT('large.burn_the_marks'), hasMarks ? "" : "primary", tzBind(tgGrMark, tg));
            if (!free) bm.disabled = true;
            fm.appendChild(bm);
            p3.appendChild(fm);
            p3.appendChild(tzEl("div", "tz-muted", i18nT('large.3_crosses_of_5_mm_on')));
          }
          var fc = tzEl("div", "tz-row");
          fc.style.alignItems = "center";
          var bc = tgGrButton(tg, i18nT('large.cut_part_2', { v: rn.missing > 0.5 ? "b) " : "", n: tgGrN(tg) }), "primary", tzBind(tgGrCut, tg));
          if (!free || (rn.missing > 0.5 && !(tg.data.marks && tg.data.marks.part === tgGrN(tg)))) bc.disabled = true;
          fc.appendChild(bc);
          if (tg.data.step === "cutting")
            fc.appendChild(tgGrButton(tg, i18nT('large.the_part_came_out_fine'), "", tzBind(tgGrPartFinished, tg), i18nT('large.confirm_part_finished', { n: tgGrN(tg) }), "tg-ok"));
          p3.appendChild(fc);
          if (!free) p3.appendChild(tzEl("div", "tz-muted", i18nT('large.the_machine_is_busy_wait_for')));
        }
        // 4. mover y medir
        var inMove = tg.data.step === "move";
        var p4 = tgGrStep(tg, 4, i18nT('large.move_the_piece_and_locate_it'), inMove, false);
        if (inMove) {
          var S = tgGrSuggested(tg);
          if (S) {
            var txt = [];
            if (Math.abs(S.dx) > 2) txt.push(i18nT('large.mm_towards', { dx: Math.round(Math.abs(S.dx)), v: S.dx < 0 ? i18nT('large.x_left') : i18nT('large.x_right') }));
            if (Math.abs(S.dy) > 2) txt.push(i18nT('large.mm_towards_2', { dy: Math.round(Math.abs(S.dy)), v: S.dy < 0 ? "Y-" : "Y+" }));
            p4.appendChild(tzEl("div", null, i18nT('large.shift_the_piece_roughly_without_rotating', { v: txt.join(i18nT('large.and_sep')) || i18nT('large.as_needed') })));
          }
          if (tg.data.marks) {
            var items = tzEl("div");
            items.style.cssText = "display:flex;flex-direction:column;gap:4px;margin-top:6px;";
            tg.data.marks.design.forEach(function (m, i) {
              var fl = tzEl("div", "tz-row");
              fl.style.alignItems = "center";
              var med = tg.data.measures && tg.data.measures[i];
              fl.appendChild(tzEl("span", null, i18nT('large.mark', { n: i + 1, v2: med ? "X" + tzFmt(med[0]) + " Y" + tzFmt(med[1]) : i18nT('common.not_measured') })));
              fl.appendChild(tgGrButton(tg, i18nT('large.capture_here_pointer'), "", function () { tgGrCapture(tg, i); }));
              items.appendChild(fl);
            });
            p4.appendChild(items);
            p4.appendChild(tzEl("div", "tz-muted", i18nT('large.with_the_pointer_bring_the_red_2')));
            var fb = tzEl("div", "tz-row");
            // the camera is the Vision plugin: no button without it
            if (workshopPathExists("/Plugins/Vision")) fb.appendChild(tgGrButton(tg, i18nT('large.find_with_the_camera'), "", tzBind(tgGrSearchCamera, tg), i18nT('large.confirm_the_machine_moves_the_camera'), "tg-camera"));
            var lists = (tg.data.measures || []).filter(Boolean).length;
            var bcal = tgGrButton(tg, i18nT('large.calculate'), "primary", tzBind(tgGrCompute, tg));
            if (lists < 2) bcal.disabled = true;
            fb.appendChild(bcal);
            p4.appendChild(fb);
            if (tg.data.newT) {
              p4.appendChild(tzEl("div", "tz-msg " + (tg.data.errorMax <= TG_ERROR_OK ? "ok" : "err"), i18nT('large.rotation_degrees_differences_mm', { rotation: tzFmt(tg.data.newT.rotation), list: tg.data.errors.map(tzFmt).join(" / ") })));
              p4.appendChild(tgGrButton(tg, i18nT('large.use_this_location'), tg.data.errorMax <= TG_ERROR_OK ? "primary" : "", tzBind(tgGrUseMeasure, tg)));
            }
          } else {
            p4.appendChild(tzEl("div", "tz-msg err", i18nT('large.this_part_was_cut_without_marks')));
          }
        }
        if (tg.data.step === "end") {
          var end = tgGrStep(tg, 5, i18nT('large.finished'), true, true);
          end.appendChild(tzEl("div", "tz-msg ok", i18nT('large.the_parts_of_the_design_were', { n: tg.data.done.length })));
        }
        tgGrFoot(tg);
      }
