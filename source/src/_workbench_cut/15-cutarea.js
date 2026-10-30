      // ---- Cutting area: shared logic (jog panel + Zones page) ----
      //
      // Each mode's useful cutting area lives in sys/workshop/zones/cutarea.g as
      //   global.cutAreaLaser|CNC|FFF = {Xmin, Xmax, Ymin, Ymax}   (or null)
      // in BED coords (= where the POINTER lands; the same as the zones
      // sys/workshop/zones/p<N>.g store). It is loaded by sys/workshop/macros/workplaces.g at startup and
      // sys/workshop/macros/saveworkplace.g uses it to not save an origin outside.
      //
      // Measuring, drawing, walking AND saving the area is done by the service (machine.workarea.*, shown in Machine > Work area): it is the only
      // writer of this file (WorkshopVision saves its "use the material as the cutting area" through it too). What stays here are the laser power
      // helpers; the by-hand macros (handfree.g, handcorner.g, gotobed.g, framecutarea.g) are called by the service and live in this package's sd folder.

      // ---- Laser power (the laser frame job moved away with the work area: Machine > Work area walks the area) ----
      // 10 W diode laser (M452 R255 -> S0..255). Limits agreed with
      // the user 2026-10-08: 4 % by default, warning above 3 %,
      // hard cap 10 % (repeated in sys/workshop/macros/laserguard.g, which is the one in charge).
      // It runs as a JOB (M32 of a generated .gcode), not as a macro: this way
      // Pause/Cancel of DWC work and the jog stays blocked while
      // it lasts. The 1st line calls sys/workshop/macros/laserguard.g: if something does not comply, its
      // abort cancels the whole job before turning on the laser
      // (verified live 2026-10-08: not even the next line runs).
      // NOMINAL power of the diode in W: configurable (request 2026-10-08: "my
      // diode is 20 W but it should be configurable"). It lives in
      // 0:/sys/workshop/config/laser.json ({"watts": 20}) so that all the screens
      // use the same value. It is only informative (text "4 % ~ 0.8 W"): the
      // limits are in % and do not change with the watts.
      // Every write of laser.json goes through the settings store with revision (workshopSettings, 02-settings.js): the mutator
      // is applied over the CURRENT file (not over this page's cache), so another screen's change is never erased; if someone
      // saved at the same moment it is applied again, and if that conflicts too the error says so (show e.message).
      function tjLaserCfgSave(mutator) {
        return workshopSettings
          .save("laser", function (cfg) {
            mutator(cfg);
            if (!(cfg.watts > 0)) cfg.watts = tjLaserWatts;
          })
          .then(function (r) {
            tjLaserCfgAll = r.value;
            tjLaserCfgListeners.forEach(function (fn) { fn(); });
            return r.value;
          });
      }
      function tjSaveLaserCfg(watts) {
        watts = Number(watts);
        if (!(watts > 0 && watts <= 200)) return Promise.reject(new Error(i18nT('cutarea.invalid_laser_power_1_to_200')));
        return tjLaserCfgSave(function (cfg) { cfg.watts = watts; }).then(function () {
          tjLaserWatts = watts;
        });
      }
      // The laser <-> pointer correction and the lens focus of laser.json are WRITTEN by Machine (Offsets) since 2026-10-21; the Workbench
      // only reads them (tjLaserFocus below, the correction through 14-laser-cfg.js of _workbench_base).
      // LENS focus (2026-10-10, "a zone only has one focus; the sensor
      // offset does not change"): focus distance above the surface, ONE for
      // the machine. Each material can focus a few mm INSIDE (Materials); each
      // zone's macro carries H = lens focus - its material's.
      function tjLaserFocus() {
        var f = tjLaserCfgAll && Number(tjLaserCfgAll.focus);
        return f >= 1 && f <= 60 ? f : 7;
      }
      function tjPctToW(pct) {
        return Math.round(((pct / 100) * tjLaserWatts) * 100) / 100;
      }

      var TJ_LASER_FRAME_DEFAULT_PCT = 4;
      var TJ_LASER_FRAME_WARN_PCT = 3;
      var TJ_LASER_FRAME_MAX_PCT = 10;
      // Takes the POINTER to a bed point (sys/workshop/macros/gotobed.g: G53, laser
      // off, raises Z 5 and lowers it on arrival). "From the map" mode.
      function tjGoToBed(x, y) {
        return postCode('M98 P"0:/sys/workshop/macros/gotobed.g" X' + Number(x).toFixed(2) + " Y" + Number(y).toFixed(2));
      }

