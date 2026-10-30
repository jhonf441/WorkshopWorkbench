      // ---- Active zone: the Z point (where the probe touches), under Advanced ----
      // The row of the point, the macro that measures somewhere else, the choice from references / positions / where the head is, and the
      // exact coordinate. Changing the point here changes the zone's point and the macros that carry it.
      function tzActPointRow(za, pm, zr) {
        var lp = tzActLine(za, zr.adv);
        lp.appendChild(tzEl("span", "za-lbl", i18nT('zoneActive.z_point')));
        lp.appendChild(tzEl("b", null, tzActFmtXY(za, zr.zp.x, zr.zp.y)));
        lp.appendChild(tzEl("span", "tz-muted", i18nT('zoneActive.from_the_zone_point', { v: zr.zp.dx >= 0 ? "+" : "", dx: tzFmt(zr.zp.dx), v2: zr.zp.dy >= 0 ? "+" : "", dy: tzFmt(zr.zp.dy) })));
        lp.appendChild(tzEl("span", "wf-state tz-badge " + (zr.zp.src === "defaultValue" ? "info" : "ok"), zr.zp.src === "defaultValue" ? i18nT('zoneActive.default_x30_y30') : zr.zp.src === "macro" ? i18nT('zoneActive.from_the_macro') : i18nT('zoneActive.chosen')));
        if (zr.zp.macro) {
          var lm = tzActLine(za, zr.adv);
          lm.appendChild(tzEl("span", "wf-state tz-badge warn", i18nT('zoneActive.the_macro_measures_elsewhere', { xy: tzActFmtXY(za, zr.zp.macro.x, zr.zp.macro.y) })));
          var eq = tzBtn(i18nT('zoneActive.make_the_macro_measure_here'), null, function () {
            za.ctx.data.savePoint(zr.wn, { x: zr.zp.x, y: zr.zp.y })
              .then(function () { tzActSetMsg(za, i18nT('zoneActive.macro_now_measures_at', { xy: tzActFmtXY(za, zr.zp.x, zr.zp.y) }), true); })
              .catch(function (e) { tzActSetMsg(za, i18nT('common.not_saved_2', { err: e && e.message ? e.message : e }), false); });
          });
          eq.disabled = !zr.free;
          tzTip(eq, i18nT('zoneActive.measure_and_focus_runs_the_macro'));
          lm.appendChild(eq);
        }
        if (zr.po) {
          var hx = zr.zp.x - zr.po.x, hy = zr.zp.y - zr.po.y;
          var reach = hx >= zr.ax.X.min && hx <= zr.ax.X.max && hy >= zr.ax.Y.min && hy <= zr.ax.Y.max;
          var nn = tzActNote(za, zr.adv, i18nT('zoneActive.the_probe_touches_there_the_head', { xy: tzActFmtXY(za, hx, hy), x: tzFmt(zr.po.x), y: tzFmt(zr.po.y), mode: zr.s.mode }));
          if (!reach) nn.appendChild(tzEl("span", "wf-state tz-badge err", i18nT('zoneActive.the_head_does_not_reach_it')));
        }
        // choose from references / positions / where it is now
        pm.lr = tzActLine(za, zr.adv);
        pm.ps = document.createElement("select");
        pm.ps.className = "tz-input za-sel";
        pm.ps.style.maxWidth = "260px";
        var picks = [];
        var addOpt = function (label, p, grp) {
          var o = document.createElement("option");
          o.value = String(picks.length);
          o.textContent = label;
          picks.push(p);
          (grp || pm.ps).appendChild(o);
        };
        var o0 = document.createElement("option");
        o0.value = "";
        o0.textContent = i18nT('zoneActive.move_the_point_to');
        pm.ps.appendChild(o0);
        var gNow = document.createElement("optgroup");
        gNow.label = i18nT('zoneActive.where_it_is_now');
        pm.ps.appendChild(gNow);
        if (zr.homedXY) {
          addOpt(i18nT('zoneActive.the_pointer_white_cross'), { x: zr.ax.X.machinePosition, y: zr.ax.Y.machinePosition }, gNow);
          if (zr.po) addOpt(i18nT('zoneActive.the_probe_without_moving'), { x: zr.ax.X.machinePosition + zr.po.x, y: zr.ax.Y.machinePosition + zr.po.y }, gNow);
        }
        if (zr.z) addOpt(i18nT('zoneActive.default_x30_y30_of_the_zone'), { x: zr.z.refX + (zr.z.correctionX || 0) + 30, y: zr.z.refY + (zr.z.correctionY || 0) + 30 }, gNow);
        var refs = za.ctx.data.pointsRef();
        if (refs.length) {
          var gR = document.createElement("optgroup");
          gR.label = i18nT('zoneActive.map_references');
          pm.ps.appendChild(gR);
          refs.forEach(function (q) { addOpt(q.name, q, gR); });
        }
        var sp = za.ctx.data.posSaved();
        if (sp.length) {
          var gP = document.createElement("optgroup");
          gP.label = i18nT('zoneActive.saved_positions');
          pm.ps.appendChild(gP);
          sp.forEach(function (q) { addOpt(q.name + " (" + tzActFmtXY(za, q.x, q.y) + ")", q, gP); });
        }
        pm.ps.disabled = !zr.free;
        pm.ps.addEventListener("change", function () {
          var p = picks[parseInt(pm.ps.value, 10)];
          if (!p) return;
          var r = { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
          za.ctx
            .data.savePoint(zr.wn, r)
            .then(function () { tzActSetMsg(za, i18nT('zoneActive.z_point_of', { code: TZ_CODES[zr.wn], xy: tzActFmtXY(za, r.x, r.y), v: zr.f ? i18nT('zoneActive.also_in_macros_laser', { macro: zr.f.macro }) : "" }), true); })
            .catch(function (e) { tzActSetMsg(za, i18nT('common.not_saved_2', { err: e && e.message ? e.message : e }), false); });
        });
      }

      function tzActPointButtons(za, pm, zr) {
        pm.lr.appendChild(pm.ps);
        // coordenada exacta del mapa
        var lx = tzActLine(za, zr.adv);
        lx.appendChild(tzEl("span", "za-lbl", i18nT('zoneActive.coordinate')));
        var mkIn = function (v) {
          var i = document.createElement("input");
          i.type = "number";
          i.className = "tz-input";
          i.style.width = "78px";
          i.step = "0.1";
          i.value = String(v);
          return i;
        };
        var xIn = mkIn(za.ptDraft && za.ptDraft.wn === zr.wn ? za.ptDraft.x : zr.zp.x);
        var yIn = mkIn(za.ptDraft && za.ptDraft.wn === zr.wn ? za.ptDraft.y : zr.zp.y);
        var keep = function () { za.ptDraft = { wn: zr.wn, x: xIn.value, y: yIn.value }; };
        xIn.addEventListener("input", keep);
        yIn.addEventListener("input", keep);
        lx.appendChild(tzEl("span", "tz-muted", "X"));
        lx.appendChild(xIn);
        lx.appendChild(tzEl("span", "tz-muted", "Y"));
        lx.appendChild(yIn);
        var sv = tzBtn(i18nT('common.use'), null, function () {
          var r = { x: parseFloat(xIn.value), y: parseFloat(yIn.value) };
          if (!isFinite(r.x) || !isFinite(r.y)) return tzActSetMsg(za, i18nT('zoneActive.type_x_and_y'), false);
          if (r.x < zr.ax.X.min || r.x > zr.ax.X.max || r.y < zr.ax.Y.min || r.y > zr.ax.Y.max) return tzActSetMsg(za, i18nT('zoneActive.outside_the_bed_x_y', { min: zr.ax.X.min, max: zr.ax.X.max, min2: zr.ax.Y.min, max2: zr.ax.Y.max }), false);
          za.ctx
            .data.savePoint(zr.wn, r)
            .then(function () { za.ptDraft = null; tzActSetMsg(za, i18nT('zoneActive.z_point_of_2', { code: TZ_CODES[zr.wn], xy: tzActFmtXY(za, r.x, r.y) }), true); })
            .catch(function (e) { tzActSetMsg(za, i18nT('common.not_saved_2', { err: e && e.message ? e.message : e }), false); });
        });
        sv.disabled = !zr.free;
        tzTip(sv, i18nT('zoneActive.map_coordinates_machine_coordinates_where'));
        lx.appendChild(sv);
        var see = tzBtn(i18nT('zoneActive.see_with_the_pointer'), null, function () {
          za.ctx.nav.goPointer(zr.zp.x, zr.zp.y).then(
            function () { tzActSetMsg(za, i18nT('zoneActive.pointer_over_the_z_point_the', { xy: tzActFmtXY(za, zr.zp.x, zr.zp.y) }), true); },
            function (e) { tzActSetMsg(za, i18nT('prepare.could_not_go', { err: e && e.message ? e.message : e }), false); }
          );
        }, i18nT('common.tap_again_moves'), "az-seez");
        see.disabled = !zr.free || !zr.homedXY;
        tzTip(see, zr.homedXY ? i18nT('zoneActive.takes_the_pointer_to_the_z') : i18nT('zoneActive.home_first'));
        lx.appendChild(see);
        tzActNote(za, zr.adv, i18nT('zoneActive.tip_tap_the_map_anywhere_or'));
      }
