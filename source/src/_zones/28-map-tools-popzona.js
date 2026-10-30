      // ---- Workbench page, part 6: the pop-ups of a zone on the map ----

      function tzToolOpenZonePop(pmt, i, ev) {
        var z = pmt.data.zones()[i];
        if (!z) return;
        pmt.posPick = null;
        pmt.ptPick = null;
        pmt.zonePick = i;
        pmt.posPop.innerHTML = "";
        var t = tzEl("div", null, TZ_CODES[i] + (z.name ? " " + z.name : "") + (i === pmt.data.st().wn ? i18nT('zonesPage.active_3') : ""));
        t.style.cssText = "font-weight:500;color:#90caf9;margin-bottom:2px;max-width:280px;";
        pmt.posPop.appendChild(t);
        var sz = pmt.data.zoneSizes()[i];
        var m = tmatById(pmt.data.zoneMaterial(i));
        var f = pmt.data.focusByZone()[i];
        [
          i18nT('zonesPage.point_x_y', { refX: tzFmt(z.refX), refY: tzFmt(z.refY), v: z.correctionX || z.correctionY ? i18nT('zonesPage.laser_correction_x_y', { correctionX: tzFmt(z.correctionX), correctionY: tzFmt(z.correctionY) }) : "" }),
          sz && sz.w > 0 ? i18nT('zonesPage.material_x_mm', { w: tzFmt(sz.w), h: tzFmt(sz.h) }) : i18nT('zonesPage.no_material_size'),
          m ? tmatLabel(m) + " (" + m.mode + ")" : i18nT('zonesPage.no_material_assigned'),
          f ? i18nT('zonesPage.focus_mm', { h: f.h, macro: f.macro }) : "",
        ].forEach(function (l) { if (l) pmt.posPop.appendChild(tzEl("div", "tz-muted", l)); });
        pmt.data.zoneChecks(i).forEach(function (c) {
          if (c.lvl === "info") return;
          var cl = tzCheckEl(c);
          cl.style.maxWidth = "300px";
          pmt.posPop.appendChild(cl);
        });
        var row = tzEl("div", "tz-row");
        row.style.cssText += "gap:4px;margin-top:6px;flex-wrap:wrap;max-width:300px;";
        var free = pmt.data.machineFree();
        var ax = pmt.data.st().axes;
        var homed = !!(ax.X.homed && ax.Y.homed);
        var done = function () { tzToolClosePosPop(pmt); return pmt.data.refreshAll(); };
        var fail = function (e) { pmt.posPop.appendChild(tzEl("div", "tz-msg err", String(e && e.message ? e.message : e))); };
        if (i !== pmt.data.st().wn) {
          var bA = tzBtn(i18nT('common.turn_on'), "primary", function () { tzCode(TZ_CODES[i]).then(done, fail); });
          bA.disabled = !free;
          tzTip(bA, i18nT('zonesPage.switches_to_does_not_move_the', { code: TZ_CODES[i] }));
          row.appendChild(bA);
        }
        var bG = tzBtn(i18nT('tzTips.l_go_to_x0_y0'), null, function () {
          tzCode(TZ_CODES[i]).then(function () { return tzCode('M98 P"0:/sys/workshop/macros/workzero.g"'); }).then(done, fail);
        }, i18nT('common.tap_again_moves'), "zp-go" + i);
        bG.disabled = !free || !homed;
        tzTip(bG, i18nT('zonesPage.activates_and_goes_to_its_x0', { code: TZ_CODES[i] }));
        row.appendChild(bG);
        if (sz && sz.w > 0) {
          var bF = tzBtn(i18nT('tzTips.l_frame'), null, function () {
            tzCode('M98 P"0:/sys/workshop/macros/framerect.g" A' + z.refX + " B" + (z.refX + sz.w) + " C" + z.refY + " D" + (z.refY + sz.h)).then(done, fail);
          }, i18nT('zonesPage.tap_again_moves_pointer'), "zp-fr" + i);
          bF.disabled = !free || !homed;
          tzTip(bF, i18nT('zonesPage.goes_around_the_edge_of_the'));
          row.appendChild(bF);
        }
        row.appendChild(tzTechOnly(tzBtn(i18nT('common.edit'), null, function () {
          tzToolClosePosPop(pmt);
          if (pmt.nav.layout() !== "zones") pmt.nav.goLayout("zones"); // el editor de zonas vive en esa seccion
          pmt.table.openEditor(i);
          if (pmt.table.editorCard().scrollIntoView) pmt.table.editorCard().scrollIntoView({ block: "start", behavior: "smooth" });
        })));
        row.appendChild(tzBtn(i18nT('zcal.close'), null, tzBind(tzToolClosePosPop, pmt)));
        pmt.posPop.appendChild(row);
        tzToolPlacePop(pmt, ev);
      }

      // Several zones under the tap: which one
      function tzToolOpenZonePickPop(pmt, list, ev) {
        pmt.posPick = null;
        pmt.ptPick = null;
        pmt.zonePick = null;
        pmt.posPop.innerHTML = "";
        var t = tzEl("div", null, i18nT('zonesPage.there_are_overlapping_zones_here', { n: list.length }));
        t.style.cssText = "font-weight:500;color:#90caf9;margin-bottom:4px;";
        pmt.posPop.appendChild(t);
        list.forEach(function (i) {
          var z = pmt.data.zones()[i];
          var b = tzBtn((i === pmt.data.st().wn ? "● " : "") + TZ_CODES[i] + (z.name ? " " + z.name : "") + (i === pmt.data.st().wn ? i18nT('zonesPage.active_4') : ""), "tzm-pick", function (e2) {
            tzToolOpenZonePop(pmt, i, ev);
          });
          b.style.borderLeft = "5px solid " + TZ_ZCOL[i % TZ_ZCOL.length];
          b.style.maxWidth = "280px";
          pmt.posPop.appendChild(b);
        });
        pmt.posPop.appendChild(tzBtn(i18nT('zcal.close'), null, tzBind(tzToolClosePosPop, pmt)));
        tzToolPlacePop(pmt, ev);
      }
