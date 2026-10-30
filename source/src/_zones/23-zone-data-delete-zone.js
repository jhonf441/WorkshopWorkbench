      function tzDataDeleteZone(pzd, idx) {
        if (pzd.st && idx === pzd.st.wn) {
          // the active zone is always listed: deleting it would look like nothing happened (and it is the one in use)
          pzd.shell.pageMessage(i18nT('zonesPage.cannot_delete_the_active_zone', { code: TZ_CODES[idx] }), false);
          return;
        }
        tzDataBackupZone(pzd, idx)
          .then(function () {
            return tzDelete("0:/sys/workshop/zones/p" + (idx + 1) + ".g");
          })
          .then(function () {
            return tzCode("G10 L2 P" + (idx + 1) + " X0 Y0 Z0");
          })
          .then(function () {
            if (pzd.nav.selected() === idx) pzd.nav.setSelected(null);
            return tzDataRefreshAll(pzd);
          })
          .then(function () {
            var f = pzd.focusByZone[idx];
            pzd.shell.pageMessage(
              i18nT('zonesPage.deleted_backup_in_sys_workshop_zones', { code: TZ_CODES[idx], v: f ? i18nT('zonesPage.its_macro_macros_laser_was_not', { macro: f.macro }) : "" }),
              true
            );
          })
          .catch(function (e) {
            pzd.shell.pageMessage(String(e), false);
          });
      }

      function tzDataExportJson(pzd) {
        var out = tzZonesExport(pzd.zones, pzd.focusByZone);
        var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "zonas-" + tzStamp() + ".json";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 1000);
      }

      function tzDataImportJson(pzd, file) {
        var reader = new FileReader();
        reader.onload = function () {
          var data;
          try {
            data = JSON.parse(reader.result);
          } catch (e) {
            return pzd.shell.pageMessage(i18nT('zonesPage.the_file_is_not_valid_json'), false);
          }
          var items = tzZonesImportItems(data);
          if (!items) {
            return pzd.shell.pageMessage(i18nT('zonesPage.it_is_not_a_zones_export'), false);
          }
          var problems = [];
          items.forEach(function (it) {
            var errs = tzValidate({ refX: it.x, refY: it.y, correctionX: it.cx, correctionY: it.cy }, pzd.st);
            if (errs.length) problems.push(TZ_CODES[it.p - 1] + ": " + errs.join("; "));
          });
          if (problems.length) return pzd.shell.pageMessage(i18nT('zonesPage.nothing_was_imported_2', { list: problems.join("\n") }), false);
          // rewrites the zones and runs workplaces.g (G10): never with a job
          // (file, paused or live) (motion audit, finding 5)
          var ml = workshopMachineFree(undefined, { purpose: "settings" });
          if (!ml.free) return pzd.shell.pageMessage(i18nT('zonesPage.nothing_was_imported_3', { reason: ml.reason }), false);
          var chain = Promise.resolve();
          items.forEach(function (it) {
            chain = chain.then(function () {
              var idx = it.p - 1;
              var z = { name: tzCleanName(it.name), refX: it.x, refY: it.y, correctionX: it.cx, correctionY: it.cy };
              return tzDataBackupZone(pzd, idx)
                .then(function () {
                  return tzPutText("0:/sys/workshop/zones/p" + it.p + ".g", tzZoneFileText(idx, z, "imported on " + tzLocalTime()));
                })
                .then(function () {
                  if (it.focus && isFinite(it.focus.h) && idx <= 5) {
                    return tzDataWriteFocusMacro(pzd, idx, z, it.focus.h, String(it.focus.macro || tzSlug(z.name) + ".g").replace(/[^A-Za-z0-9_.-]/g, ""));
                  }
                });
            });
          });
          chain
            .then(function () {
              return tzCode('M98 P"0:/sys/workshop/macros/workplaces.g"');
            })
            .then(tzBind(tzDataRefreshAll, pzd))
            .then(function () {
              pzd.shell.pageMessage(i18nT('zonesPage.imported_zones_the_previous_ones_were', { n: items.length }), true);
            })
            .catch(function (e) {
              pzd.shell.pageMessage(String(e), false);
            });
        };
        reader.readAsText(file);
      }

      function tzDataPhotoBedRead(pzd) {
        return tzGetText("0:/sys/workshop/data/vision-bed.json")
          .then(function (txt) {
            var j = JSON.parse(txt);
            var ok = [j.x0, j.y0, j.x1, j.y1].every(isFinite) && j.x1 > j.x0 && j.y1 > j.y0;
            var nuevo = ok ? j : null;
            var change = JSON.stringify(nuevo) !== JSON.stringify(pzd.photoBed.info);
            pzd.photoBed.info = nuevo;
            if (change && pzd.st) pzd.shell.renderMap();
          })
          .catch(function () {
            if (pzd.photoBed.info) {
              pzd.photoBed.info = null;
              if (pzd.st) pzd.shell.renderMap();
            }
          });
      }

