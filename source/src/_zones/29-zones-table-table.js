      function tzTableRenderTable(ptb) {
        var t = tzEl("table", "tz-table");
        var hr = tzEl("tr");
        [i18nT('common.zone'), i18nT('common.name'), i18nT('zonesPage.point_pointer'), i18nT('zonesPage.correction'), i18nT('zonesPage.applied_origin'), i18nT('zonesPage.material_focus'), i18nT('zonesPage.status'), ""].forEach(function (h) {
          hr.appendChild(tzEl("th", null, h));
        });
        t.appendChild(hr);
        var free = ptb.data.machineFree();
        for (var i = 0; i < TZ_CODES.length; i++) { tzTableRow(ptb, i, free, t); }
        ptb.tableWrap.innerHTML = "";
        ptb.tableWrap.appendChild(t);
      }

      function tzTableRow(ptb, i, free, t) {
        var fl = {};

        if (tzTableRowData(ptb, fl, i, free, t)) return;
        tzTableRowActions(ptb, fl, i, free, t);
      }

      function tzTableRowData(ptb, fl, i, free, t) {
        fl.z = ptb.data.zones()[i];
        fl.offX = ptb.data.st().axes.X ? ptb.data.st().axes.X.workplaceOffsets[i] || 0 : 0;
        fl.offY = ptb.data.st().axes.Y ? ptb.data.st().axes.Y.workplaceOffsets[i] || 0 : 0;
        var hasOff = Math.abs(fl.offX) > 0.0005 || Math.abs(fl.offY) > 0.0005;
        if (!fl.z && !hasOff && i !== 0 && i !== ptb.data.st().wn) return true;
        fl.tr = tzEl("tr", (i === ptb.data.st().wn ? "active" : "") + (ptb.nav.selected() === i ? " sel" : ""));
        fl.tr.appendChild(tzEl("td", null, TZ_CODES[i] + (i === ptb.data.st().wn ? i18nT('zonesPage.active_4') : "")));
        // the name opens the editor: the Edit button is in the last column, which a narrow screen scrolls out of sight
        var tdNom = tzEl("td");
        tdNom.appendChild(tzEl("div", null, fl.z ? fl.z.name || i18nT('zonesPage.unnamed') : i === 0 ? i18nT('zonesPage.general_no_file') : i18nT('zonesPage.no_file')));
        // the Edit / Create button sits under the name, on its own line: the action column is the last of eight and a narrow screen scrolls it out of sight
        (function (idx, zone) {
          var bEd = tzBtn(zone ? i18nT('tzTips.l_edit') : i18nT('tzTips.l_create'), null, function () { tzTableOpenEditor(ptb, idx); });
          bEd.style.cssText += "margin-top:4px;";
          tdNom.appendChild(bEd);
        })(i, fl.z);
        fl.tr.appendChild(tdNom);
        fl.tr.appendChild(tzEl("td", null, fl.z ? "X" + tzFmt(fl.z.refX) + " Y" + tzFmt(fl.z.refY) : "--"));
        fl.tr.appendChild(tzEl("td", null, fl.z ? "X" + tzFmt(fl.z.correctionX) + " Y" + tzFmt(fl.z.correctionY) : "--"));
        fl.tr.appendChild(tzEl("td", null, "X" + tzFmt(fl.offX) + " Y" + tzFmt(fl.offY)));
        var f = ptb.data.focusByZone()[i];
        var mz = tmatById(ptb.data.zoneMaterial(i));
        fl.tr.appendChild(tzEl("td", null, (mz ? tmatLabel(mz) + " · " : "") + (f ? f.h + " mm (" + f.macro + ")" : mz ? "" : "--")));
        var stTd = tzEl("td");
        if (fl.z) {
          var chk = ptb.data.zoneChecks(i);
          var cb = ptb.data.checksBadge(chk);
          cb.style.cursor = "pointer";
          (function (idx) {
            cb.addEventListener("click", function () {
              ptb.checksOpen[idx] = !ptb.checksOpen[idx];
              tzTableRenderTable(ptb);
            });
          })(i);
          stTd.appendChild(cb);
          if (ptb.data.st().offsetOn && (Math.abs(fl.offX - (fl.z.refX + fl.z.correctionX)) > 0.01 || Math.abs(fl.offY - (fl.z.refY + fl.z.correctionY)) > 0.01)) {
            stTd.appendChild(tzEl("span", "wf-state tz-badge info", i18nT('zonesPage.not_applied')));
          }
        } else {
          stTd.appendChild(tzEl("span", "wf-state tz-badge info", hasOff ? "volatile" : i18nT('zonesPage.empty')));
          if (hasOff) stTd.title = i18nT('zonesPage.it_has_an_offset_in_memory');
        }
        fl.tr.appendChild(stTd);
        fl.act = tzEl("td");
        fl.act.style.whiteSpace = "nowrap";
      }

      function tzTableRowActions(ptb, fl, i, free, t) {
        (function (idx, zone) {
          var use = tzBtn(idx === ptb.data.st().wn ? i18nT('tzTips.l_active') : i18nT('tzTips.l_use'), null, function () {
            tzCode(TZ_CODES[idx]).then(ptb.data.refreshAll);
          });
          use.disabled = idx === ptb.data.st().wn || !free;
          fl.act.appendChild(use);
          var go = tzBtn(
            i18nT('tzTips.l_go_to_x0_y0'),
            null,
            function () {
              tzCode(TZ_CODES[idx])
                .then(function () {
                  return tzCode('M98 P"0:/sys/workshop/macros/workzero.g"');
                })
                .then(ptb.data.refreshAll);
            },
            i18nT('zonesPage.tap_again_moves_the_machine'),
            "go" + idx
          );
          go.disabled = !free;
          // Where each thing ends up: with the laser offset applied X0 Y0 is
          // where the LASER lands, so the pointer's cross ends up
          // shifted (e.g. 16.5 mm) from the zone's circle on the map. That
          // is expected, not an error: it is said here so it does not surprise.
          var goTip = i18nT('zonesPage.activates_and_moves_the_machine_to', { code: TZ_CODES[idx], offX: tzFmt(fl.offX), offY: tzFmt(fl.offY) });
          if (zone && (zone.correctionX || zone.correctionY)) {
            goTip += ptb.data.st().offsetOn
              ? i18nT('zonesPage.laser_offset_applied_the_laser_hits', { v: tzFmt(fl.offX - zone.correctionX), v2: tzFmt(fl.offY - zone.correctionY) })
              : i18nT('zonesPage.laser_offset_removed_the_pointer_stays');
          }
          go.title = goTip;
          fl.act.appendChild(go);
          if (zone) {
            fl.act.appendChild(
              tzBtn(i18nT('tzTips.l_copy_to'), null, function () {
                tzTableOpenEditor(ptb, "new", { from: idx });
              })
            );
            fl.act.appendChild(
              tzBtn(i18nT('tzTips.l_history'), null, function () {
                tzTableOpenHistory(ptb, idx);
              })
            );
            var del = tzBtn(
              i18nT('tzTips.l_delete'),
              "danger",
              function () {
                ptb.data.deleteZone(idx);
              },
              i18nT('zonesPage.tap_again_delete_2', { code: TZ_CODES[idx] }),
              "del" + idx
            );
            // the ACTIVE zone cannot be deleted: it stays in the list anyway (the active one is always shown), so the
            // row would seem not to be deleted. Activate another zone first.
            var esActive = !!ptb.data.st() && i === ptb.data.st().wn;
            del.disabled = !free || esActive;
            if (esActive) tzTip(del, i18nT('zonesPage.cannot_delete_the_active_zone', { code: TZ_CODES[idx] }));
            fl.act.appendChild(del);
          }
        })(i, fl.z);
        fl.tr.appendChild(fl.act);
        t.appendChild(fl.tr);
        if (fl.z && ptb.checksOpen[i]) {
          var dr = tzEl("tr");
          var dd = tzEl("td");
          dd.colSpan = 8;
          var lst = ptb.data.zoneChecks(i);
          if (!lst.length) dd.appendChild(tzEl("div", "tz-msg ok", i18nT('zonesPage.all_in_order')));
          lst.forEach(function (c) {
            dd.appendChild(tzCheckEl(c));
          });
          dr.appendChild(dd);
          t.appendChild(dr);
        }
      }
