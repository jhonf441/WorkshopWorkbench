      // ---- Workbench page, part 6: the pop-ups of the map ----
      // A tap on the map opens one: the point (go, Z point, measure, save as position, clamp, offcut, zone origin, measure from
      // here), a saved position, a clamp or an offcut. One box at a time (posPop), placed next to the finger.

      function tzToolClosePosPop(pmt) {
        pmt.posPick = null;
        pmt.ptPick = null;
        pmt.zonePick = null;
        pmt.posPop.style.display = "none";
        if (pmt.data.st()) pmt.shell.renderMap();
      }

      function tzToolPlacePop(pmt, ev) {
        pmt.posPop.style.display = "block";
        var r = pmt.shell.svgBox().getBoundingClientRect();
        var x = (ev ? ev.clientX : r.left + r.width / 2) - r.left + 12;
        var y = (ev ? ev.clientY : r.top + r.height / 2) - r.top + 12;
        // with its real size (the point menu grew): always inside the map
        pmt.posPop.style.maxHeight = Math.max(120, r.height - 8) + "px";
        pmt.posPop.style.overflowY = "auto";
        var pw = pmt.posPop.offsetWidth || 220, ph = pmt.posPop.offsetHeight || 130;
        if (x + pw > r.width - 4) x = Math.max(4, x - pw - 24); // on the other side of the finger
        if (y + ph > r.height - 4) y = r.height - ph - 4;
        pmt.posPop.style.left = Math.max(4, Math.min(x, r.width - pw - 4)) + "px";
        pmt.posPop.style.top = Math.max(4, y) + "px";
        if (pmt.data.st()) pmt.shell.renderMap();
      }

      // Tapping the map (Zones tab) on a place that is not a marker:
      // notice with the point (snapped to a reference if one is near) to go
      // there with the POINTER or save it as a position. Request 2026-10-09.
      function tzToolOpenPointPop(pmt, q, ev) {
        pmt.posPick = null;
        pmt.ptPick = q;
        pmt.posPop.innerHTML = "";
        var t = tzEl("div", null, q.name || i18nT('zonesPage.map_point'));
        t.style.cssText = "font-weight:500;color:#ffe082;margin-bottom:2px;max-width:240px;";
        pmt.posPop.appendChild(t);
        pmt.posPop.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.x_y_where_the_pointer_goes', { x: tzFmt(q.x), y: tzFmt(q.y) })));
        var lim = pmt.data.cutLimits();
        var outside = lim && (q.x < lim.xmin || q.x > lim.xmax || q.y < lim.ymin || q.y > lim.ymax);
        if (outside) pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('zonesPage.outside_the_axes_travel')));
        var row = tzEl("div", "tz-row");
        row.style.cssText += "gap:4px;margin-top:6px;flex-wrap:wrap;";
        var ax = pmt.data.st() && pmt.data.st().axes;
        var homed = !!(ax && ax.X && ax.Y && ax.X.homed && ax.Y.homed);
        var bGo = tzBtn(i18nT('zonesPage.go_here'), "primary", function () {
          tjGoToBed(q.x, q.y)
            .then(function () { tzToolClosePosPop(pmt); })
            .catch(function (e) { pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('prepare.could_not_go', { err: e.message || e }))); });
        }, i18nT('zonesPage.confirm_moves'));
        bGo.disabled = !pmt.data.machineFree() || !homed || outside;
        tzTip(bGo, homed ? i18nT('zonesPage.takes_the_pointer_to_this_point') : i18nT('zonesPage.homes_x_and_y_first'));
        row.appendChild(bGo);
        var zw = pmt.data.st() ? pmt.data.st().wn : 0;
        var bZ = tzBtn(i18nT('zonesPage.z_point_here', { code: TZ_CODES[zw] }), null, function () {
          pmt.data.saveZonePoint(zw, q)
            .then(function () { tzToolClosePosPop(pmt); pmt.nav.module("active").render(); })
            .catch(function (e) { pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('common.not_saved_2', { err: e.message || e }))); });
        });
        bZ.disabled = !pmt.data.zones()[zw] || !pmt.data.machineFree();
        tzTip(bZ, pmt.data.zones()[zw] ? i18nT('zonesPage.z_measuring_point_and_focus_in', { code: TZ_CODES[zw] }) : i18nT('zonesPage.has_no_zone_file_2', { code: TZ_CODES[zw] }));
        row.appendChild(bZ);
        // measure right there, without saving the point: the probe goes over it, touches, and leaves the laser at the focus (or Z0 in the other modes)
        var laserM = !!(pmt.data.st() && pmt.data.st().mode === "Laser");
        var bM = tzBtn(laserM ? i18nT('zonesPage.measure_focus_here') : i18nT('zonesPage.measure_z_here'), null, function () {
          var mat = tmatById(pmt.data.zoneMaterial(zw));
          var h = laserM ? (mat && mat.mode === "Laser" ? tmatH(mat) : tjLaserFocus()) : 5;
          var tT = laserM && mat && mat.mode === "Laser" && mat.thickness > 0 ? " T" + mat.thickness : "";
          var say = tzEl("div", "tz-msg", i18nT('zonesPage.measuring_at', { x: tzFmt(q.x), y: tzFmt(q.y) }));
          pmt.posPop.appendChild(say);
          tzCode('M98 P"0:/sys/workshop/macros/zprobepoint.g" X' + q.x + " Y" + q.y + " H" + h + tT)
            .then(function () { say.className = "tz-msg ok"; say.textContent = i18nT('zonesPage.measured_at', { x: tzFmt(q.x), y: tzFmt(q.y) }); })
            .catch(function (e) { say.className = "tz-msg err"; say.textContent = i18nT('zonesPage.could_not_measure', { err: e.message || e }); });
        }, i18nT('zonesPage.confirm_moves'));
        bM.disabled = !pmt.data.machineFree() || !homed || outside;
        tzTip(bM, homed ? i18nT('zonesPage.measure_here_tip') : i18nT('zonesPage.homes_x_and_y_first'));
        row.appendChild(bM);
        row.appendChild(
          tzTip(
            tzBtn(i18nT('cuts.save_as_position'), null, function () {
              var z = ax && ax.Z ? ax.Z.machinePosition : null;
              workshopPosUpdate(function (list) {
                list.push({ name: q.name ? String(q.name).slice(0, 40) : workshopPosNextName(list), x: q.x, y: q.y, z: z });
                return list;
              }).then(function () { tzToolClosePosPop(pmt); });
            }),
            i18nT('zonesPage.adds_it_to_the_saved_positions')
          )
        );
        if (pmt.layerState.clampsOn()) row.appendChild(
          tzTip(
            tzBtn(i18nT('zonesPage.mark_clamp_here'), null, function () {
              var list = pmt.data.clamps().slice();
              list.push({ name: i18nT('zonesPage.clamp', { n: list.length + 1 }), x: Math.round((q.x - 15) * 10) / 10, y: Math.round((q.y - 10) * 10) / 10, w: 30, h: 20 });
              pmt.data.saveClamps(list)
                .then(function () { tzToolOpenRectPop(pmt, "prensa", list.length - 1, ev); })
                .catch(function (e) { pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('common.not_saved_2', { err: e.message || e }))); });
            }),
            i18nT('zonesPage.marks_a_30_x_20_mm')
          )
        );
        row.appendChild(
          tzTip(
            tzBtn(i18nT('zonesPage.mark_offcut_here'), null, function () {
              var list = pmt.data.offcuts().slice();
              list.push({ name: i18nT('zonesPage.offcut', { n: list.length + 1 }), x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10, w: 100, h: 60 });
              pmt.data.saveOffcuts(list)
                .then(function () { tzToolOpenRectPop(pmt, "offcut", list.length - 1, ev); })
                .catch(function (e) { pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('common.not_saved_2', { err: e.message || e }))); });
            }),
            i18nT('zonesPage.marks_a_leftover_piece_of_material')
          )
        );
        row.appendChild(tzTip(tzBtn(i18nT('zonesPage.zone_origin_here'), null, function () { tzToolClosePosPop(pmt); pmt.table.visionOrigin(q); }), i18nT('zonesPage.opens_the_zones_editor_with_this')));
        row.appendChild(tzTip(tzBtn(i18nT('zonesPage.measure_from_here'), null, function () {
          tzToolClosePosPop(pmt);
          pmt.measure = { a: q, b: null, hover: null };
          tzToolSetTool(pmt, "measure");
          tzToolPlaceMeasure(pmt);
          tzToolPaintStatus(pmt);
        }), i18nT('zonesPage.starts_a_measurement_at_this_point')));
        row.appendChild(tzBtn(i18nT('zcal.close'), null, tzBind(tzToolClosePosPop, pmt)));
        pmt.posPop.appendChild(row);
        tzToolPlacePop(pmt, ev);
      }

      // Datos de una prensa o un retazo: nombre y medida (coords de cama), borrar.
      function tzToolOpenRectPop(pmt, kind, k, ev) {
        var isR = kind === "offcut";
        var cur = isR ? pmt.data.offcuts() : pmt.data.clamps();
        var saveL = isR ? pmt.data.saveOffcuts : pmt.data.saveClamps;
        var q = cur[k];
        if (!q) return;
        pmt.posPick = null;
        pmt.ptPick = null;
        pmt.zonePick = null;
        pmt.posPop.innerHTML = "";
        var t = tzEl("div", null, q.name || (isR ? i18nT('zonesPage.offcut_2') : i18nT('zonesPage.clamp_2')));
        t.style.cssText = "font-weight:500;color:" + (isR ? "#e0c9a0" : "#ff8a80") + ";margin-bottom:4px;";
        pmt.posPop.appendChild(t);
        var f = tzEl("div", "tz-form");
        f.style.cssText = "display:grid;grid-template-columns:auto 1fr auto 1fr;gap:4px 6px;align-items:center;max-width:280px;";
        var ins = {};
        [["name", i18nT('common.name'), "text"], ["x", "X", "number"], ["y", "Y", "number"], ["w", i18nT('cuts.width'), "number"], ["h", i18nT('cuts.height'), "number"]].forEach(function (d) {
          var l = tzEl("span", "tz-muted", d[1]);
          var i = document.createElement("input");
          i.type = d[2];
          i.className = "tz-input";
          i.value = d[0] === "name" ? q.name || "" : tzFmt(q[d[0]]);
          if (d[2] === "number") i.step = "0.5";
          if (d[0] === "name") { i.style.gridColumn = "2 / 5"; i.maxLength = 30; }
          f.appendChild(l);
          f.appendChild(i);
          ins[d[0]] = i;
        });
        pmt.posPop.appendChild(f);
        pmt.posPop.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.x_y_bottom_left_corner_where')));
        var row = tzEl("div", "tz-row");
        row.style.cssText += "gap:4px;margin-top:6px;flex-wrap:wrap;";
        var msg = tzEl("div", "tz-msg", "");
        row.appendChild(tzBtn(i18nT('zcal.save'), "primary", function () {
          var n = { name: String(ins.name.value || "").slice(0, 30), x: tzNum(ins.x.value), y: tzNum(ins.y.value), w: tzNum(ins.w.value), h: tzNum(ins.h.value) };
          if (![n.x, n.y, n.w, n.h].every(isFinite) || !(n.w > 0) || !(n.h > 0)) return tzSetMsg(msg, i18nT('zonesPage.check_the_numbers_width_and_height'), false);
          var list = cur.slice();
          list[k] = n;
          saveL(list).then(function () { tzToolClosePosPop(pmt); }, function (e) { tzSetMsg(msg, i18nT('common.not_saved_2', { err: e.message || e }), false); });
        }));
        var hx = pmt.data.headNow();
        if (hx) {
          row.appendChild(tzTip(tzBtn(i18nT('common.corner_pointer'), null, function () {
            ins.x.value = tzFmt(hx.x);
            ins.y.value = tzFmt(hx.y);
          }), i18nT('zonesPage.sets_x_y_to_where_the')));
        }
        row.appendChild(tzBtn(i18nT('common.delete'), "danger", function () {
          var list = cur.slice();
          list.splice(k, 1);
          saveL(list).then(function () { tzToolClosePosPop(pmt); }, function (e) { tzSetMsg(msg, i18nT('zonesPage.not_deleted', { err: e.message || e }), false); });
        }, i18nT('zonesPage.tap_again_delete'), kind + "-del" + k));
        row.appendChild(tzBtn(i18nT('zcal.close'), null, tzBind(tzToolClosePosPop, pmt)));
        pmt.posPop.appendChild(row);
        pmt.posPop.appendChild(msg);
        tzToolPlacePop(pmt, ev);
      }

      function tzToolOpenPosPop(pmt, i, ev) {
        var q = pmt.data.savedPos()[i];
        if (!q) return;
        pmt.posPick = i;
        pmt.posPop.innerHTML = "";
        var t = tzEl("div", null, q.name || i18nT('zonesPage.position'));
        t.style.cssText = "font-weight:500;color:#ffb74d;margin-bottom:2px;";
        pmt.posPop.appendChild(t);
        pmt.posPop.appendChild(tzEl("div", "tz-muted", "X" + tzFmt(q.x) + " Y" + tzFmt(q.y) + (isFinite(q.z) && q.z !== null ? " Z" + tzFmt(q.z) : "")));
        var row = tzEl("div", "tz-row");
        row.style.cssText += "gap:4px;margin-top:6px;";
        var ax = pmt.data.st() && pmt.data.st().axes;
        var homed = !!(ax && ax.X && ax.Y && ax.X.homed && ax.Y.homed);
        var bGo = tzBtn(i18nT('zonesPage.go_here'), "primary", function () {
          workshopPosGo(q, ax && ax.Z ? ax.Z.machinePosition : NaN)
            .then(function () { tzToolClosePosPop(pmt); })
            .catch(function (e) { pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('prepare.could_not_go', { err: e.message || e }))); });
        }, i18nT('zonesPage.confirm_moves'));
        bGo.disabled = !pmt.data.machineFree() || !homed;
        tzTip(bGo, homed ? i18nT('zonesPage.takes_the_machine_to_this_position') : i18nT('zonesPage.homes_x_and_y_first'));
        row.appendChild(bGo);
        row.appendChild(tzBtn(i18nT('zcal.close'), null, tzBind(tzToolClosePosPop, pmt)));
        pmt.posPop.appendChild(row);
        pmt.ptPick = null;
        tzToolPlacePop(pmt, ev);
      }
