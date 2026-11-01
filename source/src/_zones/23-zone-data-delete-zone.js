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

