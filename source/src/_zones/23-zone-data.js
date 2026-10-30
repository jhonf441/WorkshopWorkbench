      // ---- Workbench page, part 1 (stage 3 of the redesign): reading and writing zones and their config ----
      // State and files of the machine: status and file reads, points, corrections, focus macros, materials per zone,
      // zone files, import/export, scraps, clamps, the bed photo and the geometry of the cut area. The state is pzd (step 6 of the
      // restructuring, docs-internal/INTERFACES.md): only these files touch it; the rest of the page uses the interface below.
      // deps: shell (redraws, page message), nav (zone in the editor), layerState (clamps used, layers turned on when saving).
      // onPositions(fn): fn runs when the file read has just taken the saved positions (the table repaints its list there).

      function tzDataCreate(deps) {
        var pzd = { shell: deps.shell, nav: deps.nav, layerState: deps.layerState };
        tzDataStart(pzd);
        return {
          st: function () { return pzd.st; },
          zones: function () { return pzd.zones; },
          zoneSizes: function () { return pzd.zoneSizes; },
          focusByZone: function () { return pzd.focusByZone; },
          clamps: function () { return pzd.clamps; },
          offcuts: function () { return pzd.offcuts; },
          savedPos: function () { return pzd.savedPos; },
          setSavedPos: function (list) { pzd.savedPos = list; },
          photoBed: function () { return pzd.photoBed; },
          onPositions: function (fn) { pzd.positionListeners.push(fn); },
          readStatus: tzBind(tzDataReadStatus, pzd),
          refreshAll: tzBind(tzDataRefreshAll, pzd),
          machineFree: tzBind(tzDataMachineFree, pzd),
          jobRunning: tzBind(tzDataJobRunning, pzd),
          clampsAct: tzBind(tzDataClampsAct, pzd),
          probeOffset: tzBind(tzDataProbeOffset, pzd),
          areaProbeOffset: tzBind(tzDataAreaProbeOffset, pzd),
          cutCorrection: tzBind(tzDataCutCorrection, pzd),
          cutLimits: tzBind(tzDataCutLimits, pzd),
          headNow: tzBind(tzDataHeadNow, pzd),
          zonePoint: tzBind(tzDataZonePoint, pzd),
          saveZonePoint: tzBind(tzDataSaveZonePoint, pzd),
          setZoneCorrection: tzBind(tzDataSetZoneCorrection, pzd),
          zoneChecks: tzBind(tzDataZoneChecks, pzd),
          checksBadge: tzBind(tzDataChecksBadge, pzd),
          zoneMaterial: tzBind(tzDataZoneMaterial, pzd),
          saveZoneMaterial: tzBind(tzDataSaveZoneMaterial, pzd),
          syncFocus: tzBind(tzDataSyncFocus, pzd),
          syncMaterialZones: tzBind(tzDataSyncMaterialZones, pzd),
          saveZoneSize: tzBind(tzDataSaveZoneSize, pzd),
          saveZone: tzBind(tzDataSaveZone, pzd),
          focusMacroBody: tzBind(tzDataFocusMacroBody, pzd),
          setFocusLine: tzBind(tzDataSetFocusLine, pzd),
          writeFocusMacro: tzBind(tzDataWriteFocusMacro, pzd),
          backupZone: tzBind(tzDataBackupZone, pzd),
          deleteZone: tzBind(tzDataDeleteZone, pzd),
          exportJson: tzBind(tzDataExportJson, pzd),
          importJson: tzBind(tzDataImportJson, pzd),
          photoBedRead: tzBind(tzDataPhotoBedRead, pzd),
          saveOffcuts: tzBind(tzDataSaveOffcuts, pzd),
          saveClamps: tzBind(tzDataSaveClamps, pzd),
        };
      }
