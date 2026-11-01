      // ---- Zones page: export and import of the zones (exchange standard, src/_shared/18-exchange.js) ----
      // Export downloads the envelope of tzZonesExport. Import reads a file, shows a preview (a row per zone, what is wrong, what is new and
      // what it replaces) and writes the zones only after the person presses Apply; the zones it replaces are kept in sys/workshop/zones/history.

      function tzDataExportJson(pzd) {
        var f = tzZonesFileSpec();
        var r = workshopExchangeExportJson({ format: f.format, version: f.version, plugin: f.plugin, data: tzZonesExport(pzd.zones, pzd.focusByZone), model: workshopStateDwc() });
        if (!r.ok) pzd.shell.pageMessage(i18nT("exchange.export_failed"), false);
      }

      // The text of the machine being busy: the zones are rewritten and workplaces.g (G10) runs, never with a job (file, paused or live)
      // (motion audit, finding 5)
      function tzDataImportBusy() {
        var ml = workshopMachineFree(undefined, { purpose: "settings" });
        return ml.free ? "" : i18nT("zonesPage.nothing_was_imported_3", { reason: ml.reason });
      }

      // What the preview shows for the data of a file. It changes nothing.
      function tzDataImportPreview(pzd, data) {
        var items = tzZonesImportItems(data);
        if (!items || !items.length) return { rows: [], blockers: [i18nT("zonesPage.import_no_zones")] };
        var blockers = tzZonesImportProblems(items, pzd.st, tzDataCutCorrection());
        var busy = tzDataImportBusy();
        if (busy) blockers.push(busy);
        return { rows: tzZonesImportRows(items, pzd.zones), warnings: [i18nT("zonesPage.import_keeps_history")], blockers: blockers };
      }

      // One zone of the file: backup of the one it replaces, its file and, if it has one, its focus macro
      function tzDataImportWrite(pzd, it) {
        var idx = it.p - 1;
        var z = { name: tzCleanName(it.name), refX: it.x, refY: it.y };
        return tzDataBackupZone(pzd, idx)
          .then(function () {
            return tzPutText("0:/sys/workshop/zones/p" + it.p + ".g", tzZoneFileText(idx, z, "imported on " + tzLocalTime()));
          })
          .then(function () {
            if (it.focus && tzFocusHeightOk(it.focus.h) && idx <= 5) {
              return tzDataWriteFocusMacro(pzd, idx, z, it.focus.h, tzFocusMacroFile(it.focus.macro, z.name));
            }
          });
      }

      // Writes the zones of the file (the person pressed Apply). The machine is looked at again: it may have started a job while the preview was open.
      function tzDataImportApply(pzd, data) {
        var items = tzZonesImportItems(data) || [];
        var busy = tzDataImportBusy();
        if (busy) return Promise.reject(new Error(busy));
        var chain = Promise.resolve();
        items.forEach(function (it) {
          chain = chain.then(function () {
            return tzDataImportWrite(pzd, it);
          });
        });
        return chain
          .then(function () {
            return tzCode('M98 P"0:/sys/workshop/macros/workplaces.g"');
          })
          .then(tzBind(tzDataRefreshAll, pzd))
          .then(function () {
            pzd.shell.pageMessage(i18nT("zonesPage.imported_zones_the_previous_ones_were", { n: items.length }), true);
          });
      }

      function tzDataImportJson(pzd) {
        return workshopExchangeImport({
          what: i18nT("zonesPage.import_what"),
          spec: tzZonesImportSpec(),
          model: workshopStateDwc(),
          preview: function (data) {
            return tzDataImportPreview(pzd, data);
          },
          apply: function (data) {
            return tzDataImportApply(pzd, data);
          },
          notify: function (text, ok) {
            pzd.shell.pageMessage(text, ok);
          },
        });
      }
