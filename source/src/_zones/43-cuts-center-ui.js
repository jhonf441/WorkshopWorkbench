      function tcCardCenter(tc, rc) {
        var ct = {};
          // Find center: its OWN card (ctx.centerCard), not one more button of
          // the shapes bar -- it is a MEASURING tool with the
          // pointer; it is mostly useful to place a cut relative to something
          // that already exists (a hole, a part).
          ct.cc = tc.ctx.centerCard;
          ct.cc.innerHTML = "";
          ct.cc.style.borderColor = TC_CENTER_COLOR;
          var chh = tzEl("div", "tz-row");
          chh.style.alignItems = "center";
          var ch3 = tzEl("h3", null, i18nT('cuts.find_centre'));
          ch3.style.marginRight = "auto";
          chh.appendChild(ch3);
          // whatever Find center has drawn on the map can always be removed, in every mode (camera included)
          if (tcCenterHasDrawing(tc)) chh.appendChild(tzTip(tzBtn(i18nT('cuts.remove_drawing'), null, function () { tcCenterClearDrawing(tc); tcGo(tc); }), i18nT('cuts.remove_drawing_tip')));
          ct.cc.appendChild(chh);
        tcCenterDefs(tc, ct, rc);
        if (!tc.centerMode) return tcCenterChoose(tc, ct);
        tcCenterMethod(tc, ct, rc);
        tcCenterProgress(tc, ct, rc);
        tcCenterPoints(tc, ct, rc);
        tcCenterMeasure(tc, ct, rc);
        tcCenterActions(tc, ct, rc);
        tcCenterResultFor(tc, ct, rc);
      }

      function tcCenterDefs(tc, ct, rc) {
        // Redesign 2026-10-10 ("it looks too cramped, make it more intuitive"):
        // 1) what do you want to measure, 2) how (cards with a drawing of where to touch),
        // 3) measuring: the drawing marks the next point.
        ct.hasCamera = !!(tc.ctx.map.camera.hasVision && tc.ctx.map.camera.hasVision());
        ct.choose = function choose(m) { tc.centerMode = m; tc.centerPts = []; tc.centerSlot = null; tc.centerAim = null; tc.centerSol = 0; tc.tool = null; tcGo(tc); };
        ct.tile = function tile(svgEl, title, desc, chips, fn) {
          var b = tzEl("button", "tc-tile");
          b.type = "button";
          if (svgEl) b.appendChild(svgEl);
          b.appendChild(tzEl("div", "tc-tile-t", title));
          if (desc) b.appendChild(tzEl("div", "tc-tile-d", desc));
          if (chips && chips.length) {
            var cw = tzEl("div", "tc-chips");
            chips.forEach(function (c) { cw.appendChild(tzEl("span", "tc-chip" + (c === "recommended" ? " rec" : ""), c)); });
            b.appendChild(cw);
          }
          b.addEventListener("click", fn);
          return b;
        };
        // 2026-10-11 ("there should be no finish buttons or choose another method:
        // when I choose the type of center I want, the other options should
        // appear above as smaller buttons"): the first time what to measure is chosen
        // with the cards; afterwards type and method stay at the top.
        var TC_KIND_DEF = { round: "circle", rect: "rect", middle: "mid" };
        ct.chooseKind = function chooseKind(k) {
          tc.centerKind = k;
          ct.choose(TC_KIND_DEF[k]);
        };
        if (!tc.centerMode && tc.centerKind) tc.centerMode = TC_KIND_DEF[tc.centerKind] || null;
      }

      function tcCenterChoose(tc, ct) {
        ct.cc.appendChild(tzEl("div", "tz-muted", i18nT('cuts.measure_an_existing_hole_or_part')));
        ct.cc.appendChild(tzEl("div", "tc-sec-title", i18nT('cuts.what_do_you_want_to_measure')));
        var pk = tzEl("div", "tc-pick");
        pk.appendChild(ct.tile(tcCenterSvg("circle", -1), i18nT('cuts.hole_or_round_part'), i18nT('cuts.center_and_diameter'), null, function () { ct.chooseKind("round"); }));
        pk.appendChild(ct.tile(tcCenterSvg("rect", -1), i18nT('cuts.rectangular_part'), i18nT('cuts.center_size_and_rotation'), null, function () { ct.chooseKind("rect"); }));
        pk.appendChild(ct.tile(tcCenterSvg("mid", -1), i18nT('cuts.between_two_points'), i18nT('cuts.the_midpoint_a_slot_between_two'), null, function () { ct.chooseKind("middle"); }));
        ct.cc.appendChild(pk);
      }

      function tcCenterMethod(tc, ct, rc) {
        // tipo y metodo: botones chicos, cambiar es un toque
        ct.md0 = TC_CENTER_METHODS[tc.centerMode] || { t: tc.centerMode };
        var kindNow = ct.md0.kind === "*" ? tc.centerKind || "round" : ct.md0.kind;
        var tb0 = tzEl("div", "tc-chipbar");
        [["round", i18nT('cuts.round')], ["rect", i18nT('cuts.rectangular')], ["middle", i18nT('cuts.between_two_points')]].forEach(function (k) {
          var b0 = tzEl("button", "tc-chipb" + (kindNow === k[0] ? " on" : ""), k[1]);
          b0.type = "button";
          b0.addEventListener("click", function () { if (kindNow !== k[0]) ct.chooseKind(k[0]); });
          tb0.appendChild(b0);
        });
        ct.cc.appendChild(tb0);
        if (kindNow !== "middle") {
          var mb0 = tzEl("div", "tc-chipbar metodos");
          Object.keys(TC_CENTER_METHODS).forEach(function (m) {
            var md = TC_CENTER_METHODS[m];
            if (md.kind !== kindNow && md.kind !== "*") return;
            if (m === "camera" && !ct.hasCamera) return; // without Vision installed there is no camera
            var b1 = tzEl("button", "tc-chipb" + (tc.centerMode === m ? " on" : ""), md.c || md.t);
            b1.type = "button";
            b1.title = md.d;
            b1.addEventListener("click", function () { if (tc.centerMode !== m) { tc.centerKind = kindNow; ct.choose(m); } });
            mb0.appendChild(b1);
          });
          ct.cc.appendChild(mb0);
        }
      }

      function tcCenterProgress(tc, ct, rc) {
        // measuring: the drawing marks the point being captured; tapping a number chooses it
        var nPts = tcCenterFilled(tc).length;
        var iSig = tcCenterSig(tc);
        var run = tzEl("div", "tc-run");
        if (tc.centerMode !== "camera")
          run.appendChild(tcCenterSvg(tc.centerMode, nPts, {
            done: tc.centerPts.map(Boolean),
            sig: iSig,
            pick: function (i) { tc.centerSlot = i; tc.centerAim = null; tcGo(tc); },
          }));
        var rt = tzEl("div");
        rt.style.flex = "1";
        rt.appendChild(tzEl("div", "tc-run-t", ct.md0.kind === "middle" ? i18nT('cuts.between_two_points') : ct.md0.t));
        var EDGES = [i18nT('cuts.the_left_edge'), i18nT('cuts.the_right_edge'), i18nT('cuts.the_bottom_edge'), i18nT('cuts.the_top_edge')];
        var sig =
          tc.centerMode === "camera"
            ? i18nT('cuts.put_the_part_in_view_and')
            : tc.centerMode === "circle"
            ? tc.centerSlot !== null || nPts < 3 ? i18nT('cuts.capture_point_of_the_edge', { n: iSig + 1 }) : i18nT('cuts.done_more_well_spread_points_more')
            : tc.centerMode === "circle2"
            ? !(tcNum(tc, tc.centerDiam) > 0) ? i18nT('cuts.type_the_diameter') : iSig < 2 ? i18nT('cuts.capture_point_of_2_of_the', { n: iSig + 1 }) : i18nT('common.done')
            : tc.centerMode === "rect"
            ? iSig < 3 ? i18nT('cuts.capture_corner_of_3_any_order', { n: iSig + 1 }) : i18nT('common.done')
            : tc.centerMode === "rect2"
            ? iSig < 2 ? (iSig === 0 ? i18nT('cuts.capture_one_corner') : i18nT('cuts.now_the_opposite_corner')) : i18nT('common.done')
            : tc.centerMode === "edges"
            ? iSig < 4 ? i18nT('cuts.tap_anywhere_on_that_side', { edge: EDGES[iSig] }) : i18nT('common.done')
            : tc.centerMode === "rect1"
            ? iSig < 1 ? i18nT('cuts.type_width_and_height_pick_the') : i18nT('common.done')
            : tc.centerMode === "mid"
            ? iSig < 2 ? i18nT('cuts.capture_point_of_2', { n: iSig + 1 }) : i18nT('common.done')
            : "";
        rt.appendChild(tzEl("div", "tc-next", sig));
        var tot = { circle: Math.max(3, tc.centerPts.length), circle2: 2, rect: 3, rect2: 2, edges: 4, rect1: 1, mid: 2 }[tc.centerMode];
        if (tot) {
          var dots = tzEl("div", "tc-dots");
          for (var di = 0; di < tot; di++) dots.appendChild(tzEl("span", "tc-dot" + (tc.centerPts[di] ? " on" : "")));
          rt.appendChild(dots);
        }
        if (tc.centerMode !== "camera") rt.appendChild(tzEl("div", "tz-muted", i18nT('cuts.tap_a_number_in_the_drawing')));
        run.appendChild(rt);
        ct.cc.appendChild(run);
      }

      function tcCenterPoints(tc, ct, rc) {
        if (tc.centerMode !== "camera") {
          // where the points come from: machine / camera / automatic
          var hasCameraC = !!(tc.ctx.map.camera.hasVision && tc.ctx.map.camera.hasVision());
          if (hasCameraC) {
            var fr = tzEl("div", "tz-row");
            fr.style.cssText += "gap:4px;align-items:center;flex-wrap:wrap;";
            fr.appendChild(tzEl("span", "tz-muted", i18nT('cuts.take_the_points')));
            [["machine", i18nT('cuts.with_the_machine')], ["camera", i18nT('cuts.with_the_camera')], ["auto", i18nT('cuts.automatic')]].forEach(function (o) {
              fr.appendChild(tzBtn(o[1], tc.centerSource === o[0] ? "primary" : null, function () {
                tc.centerSource = o[0];
                try {
                  localStorage.setItem(tc.TC_SOURCE_KEY, o[0]);
                } catch (e) {
                  /* no critico */
                }
                if (tcCenterUsesCamera(tc) && tc.ctx.map.camera.turnon) tc.ctx.map.camera.turnon();
                tcGo(tc);
              }));
            });
            ct.cc.appendChild(fr);
          }
          if (hasCameraC && tc.centerSource === "auto")
            ct.cc.appendChild(tzEl("div", "tz-muted", tcCenterUsesCamera(tc)
              ? (tc.ctx.map.camera.shown && tc.ctx.map.camera.shown() ? i18nT('cuts.automatic_using_the_camera_it_is') : i18nT('cuts.automatic_using_the_camera_it_is_2'))
              : i18nT('cuts.automatic_using_the_machine_the_camera')));
          if (tcCenterUsesCamera(tc)) {
            if (tc.ctx.map.camera.shown && tc.ctx.map.camera.shown()) {
              var nCand = tcCenterCands(tc).length;
              var now = tzEl("div", "tc-next");
              now.style.fontSize = "13px";
              now.textContent = tc.centerCamera.busy
                ? i18nT('cuts.searching_the_image')
                : nCand
                ? i18nT('cuts.tap_an_orange_point_to_use')
                : i18nT('cuts.nothing_useful_in_view_here_drag');
              ct.cc.appendChild(now);
              var photoRow = tzEl("div", "tz-row");
              photoRow.style.cssText += "gap:4px;align-items:center;";
              var bPhoto = tzTip(tzBtn(tc.centerCamera.busy ? i18nT('cuts.searching') : i18nT('cuts.high_res_photo_more_detail'), null, function () { tcCenterCameraDetect(tc, true, true); }),
                i18nT('cuts.the_camera_already_searches_by_itself'));
              bPhoto.disabled = tc.centerCamera.busy;
              photoRow.appendChild(bPhoto);
              ct.cc.appendChild(photoRow);
              ct.cc.appendChild(tzEl("div", "tz-muted", i18nT('cuts.drag_the_camera_image_on_the')));
            } else {
              var cw = tzEl("div", "tz-row");
              cw.style.cssText += "gap:6px;align-items:center;flex-wrap:wrap;";
              cw.appendChild(tzEl("span", "tz-muted", (tc.ctx.map.camera.notice && tc.ctx.map.camera.notice()) || i18nT('cuts.the_camera_image_is_not_visible')));
              cw.appendChild(tzBtn(i18nT('cuts.show_the_camera'), "primary", function () { if (tc.ctx.map.camera.turnon) tc.ctx.map.camera.turnon(); setTimeout(tzBind(tcGo, tc), 800); }));
              ct.cc.appendChild(cw);
            }
          } else {
            if (hasCameraC && tc.centerSource !== "machine")
              ct.cc.appendChild(tzEl("div", "tz-muted", i18nT('cuts.the_camera_is_not_ready_for')));
            ct.cc.appendChild(tzEl("div", "tz-muted", i18nT('cuts.for_each_point_tap_the_map')));
            var correctionA = tcCenterCorrection(tc);
            var fa = tzEl("div", "tz-row");
            fa.style.cssText += "gap:4px;align-items:center;flex-wrap:wrap;";
            fa.appendChild(tzEl("span", "tz-muted", i18nT('cuts.capture_with')));
            [["pointer", i18nT('cuts.aim_pointer')], ["laser", i18nT('cuts.aim_laser_spot')]].forEach(function (o) {
              var bA = tzBtn(o[1], tcCenterPointsAct(tc) === o[0] ? "primary" : null, function () {
                tc.centerPoints = o[0];
                try {
                  localStorage.setItem(tc.TC_POINTS_KEY, o[0]);
                } catch (e) {
                  /* no critico */
                }
                tcGo(tc);
              });
              if (o[0] === "laser" && !correctionA) bA.disabled = true;
              fa.appendChild(bA);
            });
            ct.cc.appendChild(fa);
            ct.cc.appendChild(tzEl("div", "tz-muted", tcCenterPointsAct(tc) === "laser"
              ? i18nT('cuts.aim_laser_note', { x: tc.fmt(correctionA.cx), y: tc.fmt(correctionA.cy) })
              : correctionA ? i18nT('cuts.aim_pointer_note', { x: tc.fmt(correctionA.cx), y: tc.fmt(correctionA.cy) }) : i18nT('cuts.aim_pointer_note_no_correction')));
          }
        }
      }

      function tcCenterMeasure(tc, ct, rc) {
        if (tc.centerMode === "rect1") {
          var crw = tzEl("div", "tz-row");
          crw.style.cssText += "gap:6px;align-items:center;flex-wrap:wrap;";
          [[i18nT('cuts.width_mm'), "w"], [i18nT('cuts.height_mm'), "h"]].forEach(function (f) {
            crw.appendChild(tzEl("span", null, f[0]));
            var inp = document.createElement("input");
            inp.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
            inp.min = "0";
            inp.step = "0.1";
            inp.className = "tz-input";
            inp.style.width = "80px";
            inp.value = f[1] === "w" ? tc.centerW : tc.centerH;
            inp.addEventListener("change", function () {
              if (f[1] === "w") tc.centerW = inp.value;
              else tc.centerH = inp.value;
              tcGo(tc);
            });
            crw.appendChild(inp);
          });
          var csel = document.createElement("select");
          csel.className = "tz-input";
          [["bl", i18nT('cuts.bottom_left_corner')], ["br", i18nT('cuts.bottom_right_corner')], ["tl", i18nT('cuts.top_left_corner')], ["tr", i18nT('cuts.top_right_corner')]].forEach(function (o) {
            var op = document.createElement("option");
            op.value = o[0];
            op.textContent = o[1];
            if (o[0] === tc.centerCorner) op.selected = true;
            csel.appendChild(op);
          });
          csel.addEventListener("change", function () { tc.centerCorner = csel.value; tcGo(tc); });
          crw.appendChild(csel);
          ct.cc.appendChild(crw);
        }
        if (tc.centerMode === "circle2") {
          var crd = tzEl("div", "tz-row");
          crd.style.cssText += "gap:6px;align-items:center;";
          crd.appendChild(tzEl("span", null, i18nT('cuts.diameter_mm')));
          var din = document.createElement("input");
          din.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
          din.min = "0";
          din.step = "0.1";
          din.className = "tz-input";
          din.value = tc.centerDiam;
          din.style.width = "90px";
          din.addEventListener("change", function () {
            tc.centerDiam = din.value;
            tcGo(tc);
          });
          crd.appendChild(din);
          ct.cc.appendChild(crd);
          var P2 = tcCenterFilled(tc);
          if (P2.length === 2 && !tcCenterResult(tc)) {
            var dd = Math.hypot(P2[1].x - P2[0].x, P2[1].y - P2[0].y);
            ct.cc.appendChild(tzEl("div", "tz-msg err", tcNum(tc, tc.centerDiam) > 0 ? i18nT('cuts.the_2_points_are_mm_apart', { dd: tc.fmt(dd) }) : i18nT('cuts.the_diameter_is_missing')));
          }
        }
        if (tc.centerMode === "camera") {
          var ccm = tzEl("div", "tz-row");
          ccm.style.cssText += "gap:4px;align-items:center;flex-wrap:wrap;";
          ct.cc.appendChild(ccm);
          var bF = tzTip(tzBtn(tc.centerCamera.busy ? i18nT('cuts.taking_photo') : i18nT('cuts.take_photo_and_detect'), "primary", function () { tcCenterCameraDetect(tc, true); }),
            i18nT('cuts.high_resolution_measuring_photo_where_the'));
          bF.disabled = tc.centerCamera.busy;
          ccm.appendChild(bF);
          var bV = tzTip(tzBtn(i18nT('cuts.detect_in_the_video'), null, function () { tcCenterCameraDetect(tc, false); }), i18nT('cuts.faster_using_the_video_image_less'));
          bV.disabled = tc.centerCamera.busy;
          ccm.appendChild(bV);
          if (tc.centerCamera.notice) ct.cc.appendChild(tzEl("div", "tz-msg err", tc.centerCamera.notice));
          if (tc.centerCamera.items.length) {
            var lst = tzEl("div");
            lst.style.cssText = "display:flex;flex-direction:column;gap:3px;margin-top:4px;max-height:220px;overflow-y:auto;";
            tc.centerCamera.items.forEach(function (it) {
              var b = tzBtn(tcCenterCameraName(tc, it), it.id === tc.centerCamera.sel ? "primary" : null, function () { tc.centerCamera.sel = it.id; tcGo(tc); });
              b.style.textAlign = "left";
              lst.appendChild(b);
            });
            ct.cc.appendChild(lst);
          }
        }
      }

      function tcCenterActions(tc, ct, rc) {
        var cra = tzEl("div", "tz-row");
        cra.style.gap = "4px";
        cra.style.alignItems = "center";
        if (tc.centerMode !== "camera") ct.cc.appendChild(cra);
        if (tc.centerAim) {
          cra.appendChild(tzEl("span", "tz-muted", i18nT('cuts.point_target_x_y', { n: tcCenterSig(tc) + 1, x: tc.fmt(tc.centerAim.x), y: tc.fmt(tc.centerAim.y) })));
          var area = tc.ctx.cut.area();
          var outA = area && (tc.centerAim.x < area.xmin || tc.centerAim.x > area.xmax || tc.centerAim.y < area.ymin || tc.centerAim.y > area.ymax);
          var goA = tzBtn(i18nT('common.go_there'), null, function () {
            tcCenterIr(tc, tc.centerAim.x, tc.centerAim.y)
              .then(function () { tcSetMsg(tc, i18nT('cuts.pointer_going_to_the_target_adjust'), true); })
              .catch(function (e) { tcSetMsg(tc, i18nT('common.could_not_go', { e: e }), false); });
          }, i18nT('common.tap_again_moves'));
          goA.disabled = !rc.free;
          tzTip(goA, i18nT('cuts.takes_the_pointer_to_the_target', { v: outA ? i18nT('cuts.careful_the_target_is_outside_the') : "" }));
          cra.appendChild(goA);
          cra.appendChild(
            tzTip(
              tzBtn(i18nT('cuts.add_approximate'), null, function () {
                tcCenterPush(tc, tc.centerAim);
                tc.centerAim = null;
                tcGo(tc);
              }),
              i18nT('cuts.use_the_point_tapped_on_the')
            )
          );
          if (outA) cra.appendChild(tzEl("span", "wf-state tz-badge err", i18nT('common.outside_the_cut_area')));
        } else cra.appendChild(tzEl("span", "tz-muted", i18nT('cuts.tap_the_map_to_set_a')));
        var cr1 = tzEl("div", "tz-row");
        cr1.style.gap = "4px";
        if (tc.centerMode !== "camera") ct.cc.appendChild(cr1);
        var capB = tzBtn(i18nT('cuts.capture_point'), "primary", function () {
          tc.ctx.machine.read().then(function () {
            var head = tcHeadPoint(tc);
            if (!head) return tcSetMsg(tc, i18nT('cuts.x_y_not_homed_homes_before'), false);
            var ap = tcCenterPointsAct(tc);
            var hp = tcCaptureBed(head, ap, tcCenterCorrection(tc));
            if (!hp) return tcSetMsg(tc, i18nT('cuts.x_y_not_homed_homes_before'), false);
            if (ap === "laser") hp.laser = true;
            tcCenterPush(tc, hp);
            tc.centerAim = null;
            tcGo(tc);
          });
        });
        cr1.appendChild(capB);
        capB.textContent = i18nT('cuts.capture_point_2', { n: tcCenterSig(tc) + 1 });
        cr1.appendChild(tzBtn(i18nT('cuts.clear_points'), null, function () { tc.centerPts = []; tc.centerSlot = null; tcGo(tc); }));
        if (tc.centerMode !== "camera") ct.cc.appendChild(
          tzEl("div", "tz-muted", i18nT('cuts.points_2', { v: tcCenterFilled(tc).length ? tc.centerPts.map(function (q, i) { return "P" + (i + 1) + ") " + (q ? "X" + tc.fmt(q.x) + " Y" + tc.fmt(q.y) + (q.camera ? i18nT('cuts.camera_paren') : q.laser ? i18nT('cuts.laser_spot_paren') : "") : i18nT('cuts.missing')); }).join("   ") : i18nT('cuts.none_2') }))
        );
        tcCenterDlg(tc);
      }

      function tcCenterResultFor(tc, ct, rc) {
        var rs = {};
          rs.cr = tcCenterResult(tc);
          if (!rs.cr) return;
        tcResultText(tc, rs, ct, rc);
        tcResultUse(tc, rs, ct, rc);
        tcResultCreate(tc, rs, ct, rc);
        tcResultSave(tc, rs, ct, rc);
      }

      function tcResultText(tc, rs, ct, rc) {
        ct.cc.appendChild(
          tzEl(
            "div",
            "tz-msg ok",
            i18nT('cuts.centre_x_y', { cx: tc.fmt(rs.cr.cx), cy: tc.fmt(rs.cr.cy), v: rs.cr.r
                ? i18nT('cuts.diameter_mm_radius', { v: tc.fmt(rs.cr.r * 2), r: tc.fmt(rs.cr.r), v2: "" })
                : tc.centerMode === "mid"
                ? i18nT('cuts.distance_between_the_points_mm', { dist: tc.fmt(rs.cr.dist) })
                : i18nT('cuts.x_mm_rotation_degrees', { w: tc.fmt(rs.cr.w), h: tc.fmt(rs.cr.h), angle: tc.fmt(rs.cr.angle), v: rs.cr.squareErr > 2 && !rs.cr.de3 ? i18nT('cuts.careful_the_corners_do_not_form', { squareErr: tc.fmt(rs.cr.squareErr) }) : "" }) })
          )
        );
        var desvT = tcCenterDeviation(tc, rs.cr);
        if (desvT) ct.cc.appendChild(tzEl("div", rs.cr.de3 && rs.cr.squareErr > 2 ? "tz-msg err" : "tz-muted", desvT));
        var asT = { circle: "cuts.how_circle", circle2: "cuts.how_circle2", rect: "cuts.how_rect3", rect2: "cuts.how_rect2", edges: "cuts.how_edges", rect1: "cuts.how_rect1", mid: "cuts.how_mid" }[tc.centerMode];
        if (asT) ct.cc.appendChild(tzEl("div", "tz-muted", i18nT(asT)));
      }

      function tcResultUse(tc, rs, ct, rc) {
        var cr2 = tzEl("div", "tz-row");
        cr2.style.gap = "4px";
        ct.cc.appendChild(cr2);
        if (tc.centerMode === "circle2")
          cr2.appendChild(
            tzTip(
              tzBtn(i18nT('cuts.use_the_other_circle'), null, function () { tc.centerSol = tc.centerSol ? 0 : 1; tcGo(tc); }),
              i18nT('cuts.with_2_points_and_the_diameter')
            )
          );
        // Use the result (2026-10-10: "it does not allow capturing the center or the
        // circle to be able to cut or move the machine", "fix the center
        // so it does not move and the shape can be edited")
        ct.cc.insertBefore(tzEl("div", "tc-glabel", i18nT('cuts.use_this_center')), cr2);
        var correctionC = tc.ctx.cut.correction ? tc.ctx.cut.correction() : null;
        var goC = tzBtn(i18nT('cuts.pointer_to_center'), null, function () {
          tjGoToBed(rs.cr.cx, rs.cr.cy).catch(function (e) { tcSetMsg(tc, i18nT('common.could_not_go', { e: e }), false); });
        }, i18nT('cuts.tap_again_the_pointer_goes_to'));
        goC.disabled = !rc.free;
        tzTip(goC, i18nT('cuts.moves_the_machine_so_the_red'));
        cr2.appendChild(goC);
        if (correctionC) {
          var goL = tzBtn(i18nT('cuts.laser_to_center'), null, function () {
            tjGoToBed(rs.cr.cx + correctionC.cx, rs.cr.cy + correctionC.cy).catch(function (e) { tcSetMsg(tc, i18nT('common.could_not_go', { e: e }), false); });
          }, i18nT('cuts.tap_again_the_beam_sits_on'));
          goL.disabled = !rc.free;
          tzTip(goL, i18nT('cuts.moves_the_machine_so_the_spot'));
          cr2.appendChild(goL);
        }
        rs.cr2b = tzEl("div", "tz-row");
        rs.cr2b.style.cssText += "gap:4px;margin-top:4px;";
        ct.cc.appendChild(rs.cr2b);
      }

      function tcResultCreate(tc, rs, ct, rc) {
        // shape to cut, fixed at the measured center (edited without moving)
        function crearForma() {
          var f = { x: rs.cr.cx, y: rs.cr.cy };
          if (rs.cr.r) tcAddShape(tc, { type: "circle", cx: rs.cr.cx, cy: rs.cr.cy, r: rs.cr.r, fixed: f });
          else if (rs.cr.de3 && Math.abs(rs.cr.angle || 0) < 0.05 && rs.cr.squareErr < 0.05) tcAddShape(tc, { type: "rect", x: rs.cr.cx - rs.cr.w / 2, y: rs.cr.cy - rs.cr.h / 2, w: rs.cr.w, h: rs.cr.h, fixed: f });
          else if (rs.cr.poly && rs.cr.poly.length >= 3) tcAddShape(tc, { type: "path", pts: rs.cr.poly.map(function (q) { return { x: q[0] !== undefined ? q[0] : q.x, y: q[1] !== undefined ? q[1] : q.y }; }), closed: true, fixed: f });
          else if (Math.abs(rs.cr.angle || 0) >= 0.05) {
            // rectangulo girado: sus 4 esquinas
            var a = ((rs.cr.angle || 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
            var pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (k) {
              var x = (k[0] * rs.cr.w) / 2, y = (k[1] * rs.cr.h) / 2;
              return { x: rs.cr.cx + x * ca - y * sa, y: rs.cr.cy + x * sa + y * ca };
            });
            tcAddShape(tc, { type: "path", pts: pts, closed: true, fixed: f });
          } else tcAddShape(tc, { type: "rect", x: rs.cr.cx - rs.cr.w / 2, y: rs.cr.cy - rs.cr.h / 2, w: rs.cr.w, h: rs.cr.h, fixed: f });
          tcSave(tc);
          tcGo(tc);
          tcSetMsg(tc, i18nT('cuts.created_in_layer_fixed_at_the', { v: rs.cr.r ? i18nT('cuts.circle') : i18nT('cuts.rectangle'), name: tcLayerById(tc, tc.data.activeLayer).name }), true);
        }
        if (tc.centerMode !== "mid")
          rs.cr2b.appendChild(tzTip(tzBtn(rs.cr.r ? i18nT('cuts.create_circle_to_cut') : i18nT('cuts.create_rectangle_to_cut'), "primary", crearForma),
            i18nT('cuts.creates_the_measured_shape_in_the')));
        var s0 = tcShapeById(tc, tc.sel);
        if (s0)
          rs.cr2b.appendChild(
            tzTip(tzBtn(i18nT('cuts.fix_the_selected_shape_here'), null, function () {
              tcMoveCenterTo(s0, rs.cr.cx, rs.cr.cy);
              s0.fixed = { x: rs.cr.cx, y: rs.cr.cy };
              tcSave(tc);
              tcGo(tc);
              tcSetMsg(tc, i18nT('cuts.shape_centred_and_fixed_at_x', { cx: tc.fmt(rs.cr.cx), cy: tc.fmt(rs.cr.cy) }), true);
            }), i18nT('cuts.puts_the_selected_shape_in_the'))
          );
      }

      function tcResultSave(tc, rs, ct, rc) {
        // Save with a name (position) and copy the G-code
        rc.cr3 = tzEl("div", "tz-row");
        rc.cr3.style.cssText += "gap:4px;align-items:center;margin-top:4px;";
        ct.cc.appendChild(rc.cr3);
        var nin = document.createElement("input");
        nin.type = "text";
        nin.className = "tz-input";
        nin.placeholder = i18nT('cuts.name_e_g_hole_1');
        nin.value = tc.centerName;
        nin.style.width = "170px";
        nin.addEventListener("input", function () { tc.centerName = nin.value; });
        rc.cr3.appendChild(nin);
        rc.cr3.appendChild(
          tzTip(
            tzBtn(i18nT('cuts.save_as_position'), null, function () {
              tcCenterSaveYNotify(tc, rs.cr, tc.centerName);
            }),
            i18nT('cuts.adds_it_to_the_saved_positions')
          )
        );
        rc.cr3.appendChild(
          tzTip(
            tzBtn(i18nT('cuts.copy_g_code'), null, function () {
              tcCenterCopy(tc, rs.cr);
            }),
            i18nT('cuts.copies_a_line_to_go_to')
          )
        );
        // always at hand: where the saved positions are listed
        if (tc.ctx.nav && tc.ctx.nav.viewPositions)
          rc.cr3.appendChild(tzTip(tzBtn(i18nT('cuts.see_positions'), null, function () { tc.ctx.nav.viewPositions(); }), i18nT('cuts.see_positions_tip')));
        // saved just now: say it here too (the message above can go unnoticed) and link to the list
        var sv = tc.centerSaved;
        if (sv && Math.abs(sv.cx - rs.cr.cx) < 1e-6 && Math.abs(sv.cy - rs.cr.cy) < 1e-6) {
          var rn = tzEl("div", "tz-row");
          rn.style.cssText += "gap:6px;align-items:center;margin-top:4px;";
          rn.appendChild(tzEl("span", "tz-msg ok", i18nT('cuts.saved_position_row', { nm: sv.nm })));
          ct.cc.appendChild(rn);
        }
      }
