      // Selection bar of the laser editor: copy and fix, transform, layer and delete, align, rotate (41-cuts-rotate.js), the numbers of the
      // selection and the copies dialog. Each group is built by its own function (2026-10-24: the buttons used to be sorted into groups by
      // comparing their translated label).
      function tcRenderEditBar(tc, card) {
        var eb = {};
        eb.ss = tcSelShapes(tc);
        if (!eb.ss.length) return;
        eb.b = tcSelBox(tc);
        eb.sr = tzEl("div", "tc-bar");
        card.appendChild(eb.sr);
        tcEditBarCopy(tc, eb);
        tcEditBarTransform(tc, eb);
        tcEditBarLayer(tc, eb);
        tcEditBarAlign(tc, eb, card);
        tcEditBarRotate(tc, eb, card);
        tcEditBarMeasures(tc, eb, card);
        tcEditBarArray(tc, eb, card);
      }

      function tcEditBarCopy(tc, eb) {
        var gA = tzEl("div", "tc-group");
        eb.sr.appendChild(gA);
        gA.appendChild(tzTip(tzBtn(i18nT('cuts.duplicate'), null, function () { tcDuplicateSel(tc, 5, 5); }), i18nT('cuts.copies_the_selection_shifted_5_mm')));
        gA.appendChild(tzTip(tzBtn(i18nT('cuts.copy'), null, tzBind(tcCopySel, tc)), i18nT('cuts.copy_tip')));
        var fixedSel = eb.ss.filter(function (x) { return x.fixed; });
        if (!fixedSel.length) return;
        var f0 = fixedSel[0].fixed;
        gA.appendChild(tzEl("span", "wf-state tz-badge warn", i18nT('cuts.fixed_at_x_y', { x: tc.fmt(f0.x), y: tc.fmt(f0.y) })));
        gA.appendChild(tzTip(tzBtn(i18nT('cuts.release'), null, function () {
          tc.data.shapes.forEach(function (x) { if (tcIsSelId(tc, x.id)) delete x.fixed; });
          tcSave(tc);
          tcGo(tc);
          tcSetMsg(tc, i18nT('cuts.released_it_can_be_moved_now'), true);
        }), i18nT('cuts.removes_the_fixed_center_the_shape')));
      }

      function tcEditBarTransform(tc, eb) {
        var gT = tzEl("div", "tc-group");
        eb.sr.appendChild(gT);
        gT.appendChild(tzBtn(i18nT('cuts.mirror_h'), null, function () { tcTransformSel(tc, tcScaleFn(-1, 1, (eb.b.xmin + eb.b.xmax) / 2, 0), { scale: [-1, 1] }); }));
        gT.appendChild(tzBtn(i18nT('cuts.mirror_v'), null, function () { tcTransformSel(tc, tcScaleFn(1, -1, 0, (eb.b.ymin + eb.b.ymax) / 2), { scale: [1, -1] }); }));
        gT.appendChild(tzTip(tzBtn(i18nT('cuts.move_by'), tc.arrayDlg && tc.arrayDlg.kind === "move" ? "primary" : null, function () {
          tc.arrayDlg = tc.arrayDlg && tc.arrayDlg.kind === "move" ? null : { kind: "move", mx: "10", my: "0" };
          tcGo(tc);
        }), i18nT('cuts.move_by_tip')));
        gT.appendChild(tzTip(tzBtn(i18nT('cuts.array'), tc.arrayDlg && tc.arrayDlg.kind !== "move" ? "primary" : null, function () {
          tc.arrayDlg = tc.arrayDlg && tc.arrayDlg.kind !== "move" ? null : { kind: "grid", cols: 3, rows: 2, gx: tc.fmt(eb.b.xmax - eb.b.xmin + 3), gy: tc.fmt(eb.b.ymax - eb.b.ymin + 3), n: 6, cx: tc.fmt((eb.b.xmin + eb.b.xmax) / 2 + (eb.b.xmax - eb.b.xmin) + 10), cy: tc.fmt((eb.b.ymin + eb.b.ymax) / 2), total: 360, rot: true };
          tcGo(tc);
        }), i18nT('cuts.copies_in_a_grid_rows_x')));
      }

      function tcEditBarLayer(tc, eb) {
        var gL = tzEl("div", "tc-group");
        eb.sr.appendChild(gL);
        gL.appendChild(tzEl("span", "tz-muted", i18nT('cuts.layer_4')));
        gL.appendChild(tcLayerSelect(tc, eb.ss[eb.ss.length - 1].layer, function (id) {
          tc.data.shapes.forEach(function (x) { if (tcIsSelId(tc, x.id)) x.layer = id; });
          tcSyncLayers(tc);
          tcSave(tc);
          tcGo(tc);
        }));
        gL.appendChild(tzBtn(i18nT('common.delete'), "danger", tzBind(tcDeleteSel, tc), i18nT('common.tap_again_delete')));
      }

      function tcEditBarAlign(tc, eb, card) {
        if (eb.ss.length < 2) return;
        var ar = tzEl("div", "tc-group");
        ar.style.marginBottom = "6px";
        card.appendChild(ar);
        ar.appendChild(tzEl("span", "tc-glabel", i18nT('cuts.align')));
        [["l", i18nT('cuts.left')], ["cx", i18nT('cuts.center_h')], ["r", i18nT('cuts.right')], ["t", i18nT('cuts.top')], ["cy", i18nT('cuts.center_v')], ["b", i18nT('cuts.bottom')]].forEach(function (it) {
          ar.appendChild(tzBtn(it[1], null, function () { tcAlignSel(tc, it[0]); }));
        });
        if (eb.ss.length < 3) return;
        ar.appendChild(tzEl("span", "tz-muted", i18nT('cuts.distribute')));
        ar.appendChild(tzBtn(i18nT('cuts.horizontal'), null, function () { tcDistributeSel(tc, "x"); }));
        ar.appendChild(tzBtn(i18nT('cuts.vertical'), null, function () { tcDistributeSel(tc, "y"); }));
      }

      function tcEditBarMeasures(tc, eb, card) {
        // position and size of the selection, as numbers (the rotation has its own group: tcEditBarRotate)
        var nf = tzEl("div", "tz-form");
        var pr = tzEl("div", "tc-inline");
        nf.appendChild(pr);
        card.appendChild(nf);
        var kr = tzTip(tzBtn(i18nT('cuts.proportional'), tc.data.keepRatio !== false ? "primary" : null, function () { tc.data.keepRatio = tc.data.keepRatio === false; tcSave(tc, true); tcGo(tc); }), i18nT('cuts.when_scaling_handles_or_width_height'));
        function field(lbl, val, onSet) {
          var d = tzEl("div");
          d.appendChild(tzEl("label", null, lbl));
          var inp = document.createElement("input");
          inp.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
          inp.step = "0.1";
          inp.value = tc.fmt(val);
          inp.addEventListener("change", function () { var v = tcNum(tc, inp.value); if (v !== null) onSet(v); });
          d.appendChild(inp);
          pr.appendChild(d);
        }
        field(i18nT('cuts.cx_field'), (eb.b.xmin + eb.b.xmax) / 2, function (v) { tcTransformSel(tc, tcMoveFn(v - (eb.b.xmin + eb.b.xmax) / 2, 0), { move: true }); });
        field(i18nT('cuts.cy_field'), (eb.b.ymin + eb.b.ymax) / 2, function (v) { tcTransformSel(tc, tcMoveFn(0, v - (eb.b.ymin + eb.b.ymax) / 2), { move: true }); });
        field(i18nT('cuts.x_left'), eb.b.xmin, function (v) { tcTransformSel(tc, tcMoveFn(v - eb.b.xmin, 0), { move: true }); });
        field(i18nT('cuts.y_bottom'), eb.b.ymin, function (v) { tcTransformSel(tc, tcMoveFn(0, v - eb.b.ymin), { move: true }); });
        field(i18nT('cuts.width'), eb.b.xmax - eb.b.xmin, function (v) {
          var w0 = eb.b.xmax - eb.b.xmin;
          if (!(v > 0) || !(w0 > 0)) return;
          var k = v / w0;
          tcTransformSel(tc, tcScaleFn(k, tc.data.keepRatio !== false ? k : 1, eb.b.xmin, eb.b.ymin), { scale: [k, tc.data.keepRatio !== false ? k : 1] });
        });
        field(i18nT('cuts.height'), eb.b.ymax - eb.b.ymin, function (v) {
          var h0 = eb.b.ymax - eb.b.ymin;
          if (!(v > 0) || !(h0 > 0)) return;
          var k = v / h0;
          tcTransformSel(tc, tcScaleFn(tc.data.keepRatio !== false ? k : 1, k, eb.b.xmin, eb.b.ymin), { scale: [tc.data.keepRatio !== false ? k : 1, k] });
        });
        pr.appendChild(kr);
        nf.appendChild(tzEl("div", "tz-muted", i18nT('cuts.units_note')));
      }

      function tcEditBarArray(tc, eb, card) {
        var ar = {};
        if (!tc.arrayDlg) return;
        tcArrayFields(tc, ar, eb, card);
        tcArrayOptions(tc, ar, eb, card);
        tcArrayButtons(tc, ar, eb, card);
      }

      function tcArrayFields(tc, ar, eb, card) {
        ar.ad = tzEl("div", "tz-card wf-card tz-form");
        ar.ad.style.marginTop = "6px";
        card.appendChild(ar.ad);
        var at = tzEl("div", "tz-row");
        at.style.gap = "4px";
        ar.ad.appendChild(at);
        if (tc.arrayDlg.kind !== "move") {
          at.appendChild(tzBtn(i18nT('cuts.grid'), tc.arrayDlg.kind === "grid" ? "primary" : null, function () { tc.arrayDlg.kind = "grid"; tcGo(tc); }));
          at.appendChild(tzBtn(i18nT('cuts.linear'), tc.arrayDlg.kind === "lin" ? "primary" : null, function () {
            if (tc.arrayDlg.n === undefined || tc.arrayDlg.n === 6) tc.arrayDlg.n = 3;
            if (tc.arrayDlg.lx === undefined) { tc.arrayDlg.lx = tc.arrayDlg.gx; tc.arrayDlg.ly = "0"; }
            tc.arrayDlg.kind = "lin";
            tcGo(tc);
          }));
          at.appendChild(tzBtn("Circular", tc.arrayDlg.kind === "circular" ? "primary" : null, function () { tc.arrayDlg.kind = "circular"; tcGo(tc); }));
        } else {
          at.appendChild(tzEl("span", null, i18nT('cuts.move_by_title')));
        }
        var ap = tzEl("div", "pair");
        ar.ad.appendChild(ap);
        ar.af = function af(lbl, key) {
          var d = tzEl("div");
          d.appendChild(tzEl("label", null, lbl));
          var inp = document.createElement("input");
          inp.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
          inp.step = "0.1";
          inp.value = String(tc.arrayDlg[key]);
          inp.addEventListener("input", function () { tc.arrayDlg[key] = inp.value; });
          d.appendChild(inp);
          ap.appendChild(d);
        };
      }

      function tcArrayOptions(tc, ar, eb, card) {
        if (tc.arrayDlg.kind === "move") {
          ar.af(i18nT('cuts.move_x'), "mx");
          ar.af(i18nT('cuts.move_y'), "my");
        } else if (tc.arrayDlg.kind === "lin") {
          ar.af(i18nT('cuts.lin_count'), "n");
          ar.af(i18nT('cuts.lin_step_x'), "lx");
          ar.af(i18nT('cuts.lin_step_y'), "ly");
        } else if (tc.arrayDlg.kind === "grid") {
          ar.af(i18nT('cuts.columns'), "cols");
          ar.af(i18nT('cuts.rows'), "rows");
          ar.af(i18nT('cuts.step_x_mm_from_one_copy'), "gx");
          ar.af(i18nT('cuts.step_y_mm'), "gy");
        } else {
          ar.af(i18nT('cuts.total_quantity'), "n");
          ar.af(i18nT('cuts.center_x'), "cx");
          ar.af(i18nT('cuts.center_y'), "cy");
          ar.af(i18nT('cuts.total_angle_360_full_turn'), "total");
          var rl = tzEl("label");
          rl.style.cssText = "display:flex;gap:6px;align-items:center;font-size:12px;";
          var rc = document.createElement("input");
          rc.type = "checkbox";
          rc.checked = !!tc.arrayDlg.rot;
          rc.addEventListener("change", function () { tc.arrayDlg.rot = rc.checked; });
          rl.appendChild(rc);
          rl.appendChild(document.createTextNode(i18nT('cuts.rotate_each_copy_like_the_spokes')));
          ar.ad.appendChild(rl);
        }
      }

      function tcArrayButtons(tc, ar, eb, card) {
        var ab = tzEl("div", "tz-row");
        ab.style.gap = "4px";
        ar.ad.appendChild(ab);
        if (tc.arrayDlg.kind === "move") {
          ab.appendChild(tzBtn(i18nT('cuts.move_do'), "primary", function () {
            var mx = tcNum(tc, tc.arrayDlg.mx), my = tcNum(tc, tc.arrayDlg.my);
            if (mx === null || my === null) return tcSetMsg(tc, i18nT('cuts.move_bad'), false);
            tc.arrayDlg = null;
            tcMoveBy(tc, mx, my, false);
          }));
          ab.appendChild(tzBtn(i18nT('cuts.move_copy'), null, function () {
            var mx = tcNum(tc, tc.arrayDlg.mx), my = tcNum(tc, tc.arrayDlg.my);
            if (mx === null || my === null) return tcSetMsg(tc, i18nT('cuts.move_bad'), false);
            tc.arrayDlg = null;
            tcMoveBy(tc, mx, my, true);
          }));
        } else ab.appendChild(tzBtn(i18nT('cuts.create_copies'), "primary", function () {
          var d = tc.arrayDlg;
          if (d.kind === "lin") {
            var nl_ = Math.round(tcNum(tc, d.n));
            var lx = tcNum(tc, d.lx), ly = tcNum(tc, d.ly);
            if (!(nl_ >= 2 && nl_ <= 400) || lx === null || ly === null) return tcSetMsg(tc, i18nT('cuts.lin_bad'), false);
            tc.arrayDlg = null;
            tcArrayLin(tc, nl_, lx, ly);
          } else if (d.kind === "grid") {
            var cols = Math.round(tcNum(tc, d.cols)), rows = Math.round(tcNum(tc, d.rows));
            if (!(cols >= 1 && rows >= 1 && cols * rows <= 400)) return tcSetMsg(tc, i18nT('cuts.columns_x_rows_between_1_and'), false);
            tc.arrayDlg = null;
            tcArrayGrid(tc, cols, rows, tcNum(tc, d.gx) || 0, tcNum(tc, d.gy) || 0);
          } else {
            var n = Math.round(tcNum(tc, d.n));
            if (!(n >= 2 && n <= 200)) return tcSetMsg(tc, i18nT('cuts.quantity_between_2_and_200'), false);
            tc.arrayDlg = null;
            tcArrayCircle(tc, n, tcNum(tc, d.cx) || 0, tcNum(tc, d.cy) || 0, tcNum(tc, d.total) || 360, !!d.rot);
          }
        }));
        ab.appendChild(tzBtn(i18nT('zcal.cancel'), null, function () { tc.arrayDlg = null; tcGo(tc); }));
      }
