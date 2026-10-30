      // ---- Active zone: the folded "Advanced" block ----
      // What is needed now and then, not every job: the Z point (where the probe touches), Z by hand, and the calibration of the probe.
      // Closed it costs one line; open it holds three small sub-headings, one idea each.
      function tzActAdvanced(za, zr) {
        zr.adv = tzActFold(za, zr.card, "advanced", i18nT('zoneActive.advanced'), i18nT('zoneActive.advanced_summary'));
        if (!zr.adv) return;
        if (zr.z) {
          zr.adv.appendChild(tzEl("div", "za-sub", i18nT('zoneActive.z_point_title')));
          tzActPointSection(za, zr);
        }
        zr.adv.appendChild(tzEl("div", "za-sub", i18nT('zoneActive.z_by_hand_title')));
        tzActManualZ(za, zr);
        zr.adv.appendChild(tzEl("div", "za-sub", i18nT('zoneActive.probe_calibration_title')));
        tzActCalibration(za, zr);
      }

      function tzActPointSection(za, zr) {
        if (!zr.zp) return tzActNote(za, zr.adv, i18nT('zoneActive.has_no_zone_file_create_it', { code: TZ_CODES[zr.wn] }));
        var pm = {};
        tzActPointRow(za, pm, zr);
        tzActPointButtons(za, pm, zr);
      }

      // Z by hand: take the surface under the head as Z0 (G92 Z0), or measure Z with the probe where the head is. Reading the probe
      // without changing anything is the "Probe" button of the Jog.
      function tzActManualZ(za, zr) {
        var why = tzActBlockedWhy({ signedOut: tzActSignedOut(), free: zr.free, homedXY: true, homedAll: true, needAll: true, needPoint: false, hasPoint: true });
        var whyAny = tzActBlockedWhy({ signedOut: tzActSignedOut(), free: zr.free, homedXY: true, homedAll: true, needAll: false, needPoint: false, hasPoint: true }); // G92 Z0 needs no homing
        var l = tzActLine(za, zr.adv);
        var pz = tzBtn(i18nT('zoneActive.probe_z_here'), null, function () {
          tzActRun(za, 'M98 P"0:/macros/probe/homezhere.g"', i18nT('zoneActive.z_measured_with_the_bltouch_here'));
        });
        pz.disabled = !!why;
        tzTip(pz, i18nT('zoneActive.raises_5_mm_and_measures_z'));
        l.appendChild(pz);
        var zz = tzBtn(i18nT('zoneActive.z0_here'), null, function () {
          tzActRun(za, 'M98 P"0:/sys/workshop/macros/zhere0.g"', i18nT('zoneActive.z_0_at_the_current_position'));
        }, i18nT('zoneActive.tap_again_z_0_here'), "az-zz");
        zz.disabled = !!whyAny;
        tzTip(zz, i18nT('zoneActive.g92_z0_the_current_position_becomes', { v: zr.cncMode ? i18nT('zoneActive.you_touched_the_material_with_the') : i18nT('zoneActive.you_touched_the_surface_by_hand') }));
        l.appendChild(zz);
        tzActWhy(za, zr.adv, why ? i18nT('zoneActive.' + why) : "");
      }

      // The height the mode works with (34-zcal.js): only a summary here; the calibration is in Machine > Height, which opens with this zone's Z point.
      // Without the Machine plugin (or its page) the person is told which one is missing instead of getting a dead button.
      function tzActCalibration(za, zr) {
        tzActNote(za, zr.adv, i18nT('zoneActive.calibration_note'));
        if (typeof workshopPathExists !== "function" || !workshopPathExists(TZ_PAGES.machine.path)) return tzActNote(za, zr.adv, i18nT('zonesPage.needs_other_plugin', { title: TZ_PAGES.machine.title, plugin: TZ_PAGES.machine.plugin }));
        tzcRender(zr.adv, {
          s: zr.s, zp: zr.zp, line: tzBind(tzActLine, za), goMachine: function (query) { za.ctx.nav.go("calibrate", query); },
          rerender: function () { za.lastKey = ""; tzActRender(za); },
        });
      }
