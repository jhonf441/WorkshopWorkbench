      // ---- Workbench page, part 7: the backups of a zone file, in the zone editor card ----
      // Every save keeps the previous p<N>.g in sys/workshop/zones/history; this lists them and restores one.

      function tzTableOpenHistory(ptb, idx) {
        ptb.nav.setSelected(idx);
        ptb.nav.setZSub("editor");
        setTimeout(ptb.nav.apply, 0);
        tzTableRenderTable(ptb);
        ptb.edCard.innerHTML = "";
        ptb.edCard.appendChild(tzEl("h3", null, i18nT('zonesPage.history_of', { code: TZ_CODES[idx] })));
        var list = tzEl("div", null, i18nT('common.loading'));
        ptb.edCard.appendChild(list);
        var msg = tzEl("div", "tz-msg", "");
        ptb.edCard.appendChild(msg);
        tzList("0:/sys/workshop/zones/history").then(function (files) {
          var mine = files
            .filter(function (f) {
              return f.type === "f" && f.name.indexOf("p" + (idx + 1) + "-") === 0;
            })
            .map(function (f) {
              return f.name;
            })
            .sort()
            .reverse();
          list.innerHTML = "";
          if (!mine.length) {
            list.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.no_backups_yet_they_are_created')));
          }
          mine.slice(0, 30).forEach(function (name) {
            var row = tzEl("div");
            row.style.cssText = "border-bottom:1px solid rgba(255,255,255,0.08);padding:4px 0;";
            var m = name.match(/-(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)\.g$/);
            var when = m ? m[3] + "/" + m[2] + "/" + m[1] + " " + m[4] + ":" + m[5] + ":" + m[6] : name;
            var desc = tzEl("div", "tz-muted", i18nT('zonesPage.loading', { when: when }));
            row.appendChild(desc);
            tzGetText("0:/sys/workshop/zones/history/" + name)
              .then(function (txt) {
                var z = tzParseZoneFile(txt);
                desc.textContent =
                  when + " -- " + (z ? i18nT('zonesPage.point_x_y_correction_x', { v: z.name || i18nT('zonesPage.unnamed'), refX: tzFmt(z.refX), refY: tzFmt(z.refY), correctionX: tzFmt(z.correctionX) }) : i18nT('zonesPage.not_understood'));
                if (!z) return;
                row.appendChild(
                  tzBtn(
                    i18nT('tzTips.l_restore'),
                    null,
                    function () {
                      // rewrites p<N>.g and runs workplaces.g (G10): never with a
                      // job (file, paused or live), runs the origin
                      // (motion audit, finding 5)
                      var ml = workshopMachineFree(undefined, { purpose: "settings" });
                      if (!ml.free) return tzSetMsg(msg, i18nT('zonesPage.not_restored_2', { reason: ml.reason }), false);
                      ptb.data.backupZone(idx)
                        .then(function () {
                          return tzPutText("0:/sys/workshop/zones/p" + (idx + 1) + ".g", txt);
                        })
                        .then(function () {
                          return tzCode('M98 P"0:/sys/workshop/macros/workplaces.g"');
                        })
                        .then(ptb.data.refreshAll)
                        .then(function () {
                          tzSetMsg(msg, i18nT('zonesPage.restored_the_backup_of', { when: when }), true);
                        })
                        .catch(function (e) {
                          tzSetMsg(msg, String(e), false);
                        });
                    },
                    i18nT('zonesPage.tap_again_restore')
                  )
                );
              })
              .catch(function () {});
            list.appendChild(row);
          });
        });
        ptb.edCard.appendChild(
          tzBtn(i18nT('zcal.close'), null, function () {
            ptb.nav.setSelected(null);
            tzTableRenderEditorEmpty(ptb);
            tzTableRenderTable(ptb);
          })
        );
      }

      // -------- exportar / importar --------
