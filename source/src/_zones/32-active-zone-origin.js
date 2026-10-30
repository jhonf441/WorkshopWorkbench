      // ---- Active zone: the "Origin and zero" block ----
      // Where X0 Y0 lands (the laser or the pointer), going there, and setting the origin of the zone from where the head is.
      // Moving ONE axis to its zero and lowering to Z0 are in the Jog (position card); they are not repeated here.
      function tzActOrigin(za, zr) {
        var ob = tzActBlock(za, zr.card, i18nT('zoneActive.origin_and_zero'));
        if (zr.correction && zr.laserMode) tzActOffsetToggle(za, zr, ob);
        else if (zr.laserMode) tzActNote(za, ob, i18nT('zoneActive.has_no_laser_correction_x0_y0', { code: TZ_CODES[zr.wn] }));
        var why = tzActBlockedWhy({ signedOut: tzActSignedOut(), free: zr.free, status: zr.s.status, homedXY: zr.homedXY, homedAll: zr.allHomed, needAll: false, needPoint: false, hasPoint: true });
        var target = zr.laserMode && zr.correction && zr.s.offsetOn ? "laser" : "pointer";
        var l2 = tzActLine(za, ob);
        var go = tzBtn(i18nT('zoneActive.go_to_x0_y0_target', { target: target === "laser" ? "laser" : i18nT('zoneActive.pointer_lc') }), "primary big", function () {
          tzActRun(za, 'M98 P"0:/sys/workshop/macros/workzero.g"', i18nT('zoneActive.over_the_point_of', { v: target === "laser" ? "Laser" : i18nT('zoneActive.pointer'), code: TZ_CODES[zr.wn], v2: zr.z ? " (" + tzActFmtXY(za, zr.z.refX, zr.z.refY) + ")" : "" }));
        }, i18nT('common.tap_again_moves'), "az-g0");
        go.disabled = !!why;
        tzTip(go, i18nT('zoneActive.raises_z_goes_to_x0_y0', { code: TZ_CODES[zr.wn], xy: tzActFmtXY(za, zr.offX, zr.offY), target: target === "laser" ? "LASER" : i18nT('zoneActive.pointer_uc') }));
        l2.appendChild(go);
        tzActOriginSet(za, zr, l2, why);
        tzActWhy(za, ob, why ? i18nT('zoneActive.' + why) : "");
        tzActNote(za, ob, i18nT('zoneActive.single_axis_in_the_jog'));
      }

      // Laser with a correction: choose where X0 Y0 lands (laser = how it cuts, pointer = to check). It does not move the machine.
      function tzActOffsetToggle(za, zr, ob) {
        var l1 = tzActLine(za, ob);
        l1.appendChild(tzEl("span", "za-lbl", i18nT('zoneActive.x0_y0_lands_where')));
        var seg = tzEl("div", "za-seg");
        var blocked = !zr.free || tzActSignedOut();
        var onB = tzBtn("Laser", zr.s.offsetOn ? "primary" : null, function () {
          tzActRun(za, 'M98 P"0:/sys/workshop/macros/laseroffset.g" S1', i18nT('zoneActive.laser_offset_applied_x0_y0_where'));
        });
        onB.disabled = zr.s.offsetOn || blocked;
        tzTip(onB, i18nT('zoneActive.offset_applied_how_it_cuts_the', { xy: tzActFmtXY(za, zr.z.refX + zr.correction.cx, zr.z.refY + zr.correction.cy), xy2: tzActFmtXY(za, zr.z.refX, zr.z.refY) }));
        seg.appendChild(onB);
        var offB = tzBtn(i18nT('zoneActive.pointer'), !zr.s.offsetOn ? "primary" : null, function () {
          tzActRun(za, 'M98 P"0:/sys/workshop/macros/laseroffset.g" S0', i18nT('zoneActive.laser_offset_removed_x0_y0_where'));
        });
        offB.disabled = !zr.s.offsetOn || blocked;
        tzTip(offB, i18nT('zoneActive.offset_removed_to_locate_check_x0', { xy: tzActFmtXY(za, zr.z.refX, zr.z.refY) }));
        seg.appendChild(offB);
        l1.appendChild(seg);
        tzActNote(za, ob, i18nT('zoneActive.laser_pointer_correction_of_x_y', { code: TZ_CODES[zr.wn], cx: tzFmt(zr.correction.cx), cy: tzFmt(zr.correction.cy), v: "" }));
      }

      // "Set the origin here": the head position becomes the point of the zone (opens the editor with it loaded to review before saving)
      function tzActOriginSet(za, zr, line, why) {
        var head = { x: zr.ax.X.machinePosition, y: zr.ax.Y.machinePosition };
        var fix = function (aim) {
          var c = aim === "laser" && zr.correction ? zr.correction : { cx: 0, cy: 0 };
          var p = { x: Math.round((head.x - c.cx) * 1000) / 1000, y: Math.round((head.y - c.cy) * 1000) / 1000 };
          za.aimAsk = false;
          za.ctx.nav.openEditorAt(zr.wn, p);
          tzActSetMsg(za, i18nT('zoneActive.point_loaded_in_the_editor_over', { v: aim === "laser" ? i18nT('zoneActive.the_laser_2') : i18nT('zoneActive.the_pointer_2'), xy: tzActFmtXY(za, p.x, p.y) }), true);
        };
        if (!za.aimAsk) {
          var fb = tzBtn(i18nT('zoneActive.set_origin_here'), null, function () {
            if (zr.correction) {
              za.aimAsk = true;
              za.lastKey = "";
              tzActRender(za);
            } else fix("pointer");
          });
          fb.disabled = !!why;
          tzTip(fb, i18nT('zoneActive.uses_the_current_position_as_the_2', { code: TZ_CODES[zr.wn] }) + " " + i18nT('zoneActive.head_now', { xy: tzActFmtXY(za, head.x, head.y), v: zr.correction ? i18nT('zoneActive.the_laser_hits', { xy: tzActFmtXY(za, head.x - zr.correction.cx, head.y - zr.correction.cy) }) : "" }));
          line.appendChild(fb);
          return;
        }
        var ask = tzActLine(za, line.parentNode);
        ask.appendChild(tzEl("span", "za-lbl", i18nT('zoneActive.what_is_over_the_point_now')));
        ask.appendChild(tzTip(tzBtn(i18nT('zoneActive.the_laser'), "primary", function () { fix("laser"); }), i18nT('zoneActive.the_point_the_laser_marks_point_2', { xy: tzActFmtXY(za, head.x - zr.correction.cx, head.y - zr.correction.cy) })));
        ask.appendChild(tzTip(tzBtn(i18nT('zoneActive.the_pointer'), "primary", function () { fix("pointer"); }), i18nT('zoneActive.the_pointer_reference_point_head_2', { xy: tzActFmtXY(za, head.x, head.y) })));
        ask.appendChild(tzBtn(i18nT('zcal.cancel'), null, function () { za.aimAsk = false; za.lastKey = ""; tzActRender(za); }));
      }
