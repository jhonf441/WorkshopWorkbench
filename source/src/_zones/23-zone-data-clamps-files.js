      function tzDataClampsAct(pzd) {
        return pzd.layerState.clampsOn() ? pzd.clamps : [];
      }

      function tzDataSaveOffcuts(pzd, list) {
        return tzPutText(pzd.TZ_OFFCUTS_FILE, JSON.stringify(list, null, 1)).then(function () {
          pzd.offcuts = list;
          pzd.layerState.show("offcuts");
          if (pzd.st) pzd.shell.renderMap();
        });
      }

      function tzDataSaveClamps(pzd, list) {
        return tzPutText(pzd.TZ_CLAMPS_FILE, JSON.stringify(list, null, 1)).then(function () {
          pzd.clamps = list;
          pzd.layerState.show("clamps");
          if (pzd.st) pzd.shell.renderMap();
        });
      }

      // -------- data --------
      // maxAgeMs: the poll every 1 s accepts a recent jog reading
      // (jogFetchStatus, 10-jog.js) instead of asking DSF for another; the
      // calls after an action (capture, etc.) ask for a fresh one.
      function tzDataReadStatus(pzd, maxAgeMs) {
        return (typeof jogFetchStatus === "function" ? jogFetchStatus(maxAgeMs || 0) : tzFetchStatus(maxAgeMs || 0))
          .then(function (s) {
            var axes = {};
            ((s.move && s.move.axes) || []).forEach(function (a) {
              if (a && a.letter) axes[a.letter] = a;
            });
            var g = s.global || {};
            var mode = g.selectedMode || (s.state && s.state.machineMode); // without the workshop's global: RRF's mode
            var area = TZ_WORK_MODES.indexOf(mode) >= 0 ? g["cutArea" + mode] : null; // a mode the Workbench does not serve has no area here
            pzd.st = {
              axes: axes,
              wn: typeof s.move.workplaceNumber === "number" ? s.move.workplaceNumber : 0,
              offsetOn: g.laserOffsetOn !== false,
              mode: mode || "?",
              machineMode: (s.state && s.state.machineMode) || "", // RRF's (decides whether G1 turns the laser on)
              cutArea: Array.isArray(area) && area.length === 4 ? area : null,
              status: s.state && s.state.status,
              globals: g, // the cutting area of every mode (cutAreaLaser/CNC/FFF)
              comp: s.move && s.move.compensation, // malla activa (Mesh)
              probes: (s.sensors && s.sensors.probes) || [], // offsets G31 (Mesh)
              job: s.job || {}, // trabajo en curso / ultimo (tiempo real del Mesh)
              om: s, // object model completo: Offsets > Nivelar Z (46-level.js) lee motores de Z, M671 y move.calibration
              // LIVE job (a program through the bridge): see jogLiveJob in 10-jog.js
              liveJob: (function () {
                var p = workshopPluginOf(s.plugins, "service");
                var lj = p && p.data && p.data.liveJob;
                return lj && lj.active ? lj : null;
              })(),
            };
            tzFocusAppliedSettle(pzd.st);
          });
      }

      function tzDataReadFiles(pzd) {
        var rf = {};

        tzDataReadZones(pzd, rf);
        tzDataReadPointsZ(pzd, rf);
        return Promise.all([rf.pZones, rf.pFocus, rf.pPos, rf.pSizes, rf.pZpt, rf.pExtra, tmatLoad(), rf.pPren, rf.pRet]).then(function (res) {
          pzd.clamps = res[7];
          pzd.offcuts = res[8];
          pzd.zonePts = res[4];
          pzd.zoneExtra = res[5];
          pzd.zones = rf.newZones;
          pzd.focusByZone = rf.newFocus;
          pzd.savedPos = res[2];
          pzd.positionListeners.forEach(function (fn) { fn(); });
          pzd.zoneSizes = res[3];
        });
      }


      function tzDataRefreshAll(pzd) {
        return Promise.all([tzDataReadStatus(pzd), tzDataReadFiles(pzd)]).then(pzd.shell.render, function (e) {
          pzd.shell.pageMessage(i18nT('zonesPage.error_reading_data', { e: e }), false);
        });
      }

      function tzDataMachineFree(pzd) {
        return tzMachineFree(pzd.st, pzd.machineMemo, Date.now(), workshopMotionBlock([PLUGIN_ID])); // owner of the movement (2026-10-13)
      }

      function tzDataJobRunning(pzd) {
        return tzJobInProgress(pzd.st);
      }

      // G31 offset of the active mode's probe K0 (BLTouch).
      function tzDataProbeOffset(pzd) {
        var pr = pzd.st && pzd.st.probes && pzd.st.probes[0];
        var o = pr && pr.offsets;
        return o && isFinite(o[0]) && isFinite(o[1]) ? { x: o[0], y: o[1] } : null;
      }

      // Z measuring point of zone i, in map coords (where the probe
      // touches). src: "elegido" (file), "macro" (X/Y of the material
      // macro) or "defecto" (X30 Y30 of laserfocus.g). With the laser offset
      // applied the work zero is point + correction, which is why laserfocus.g's X/Y
      // is shifted by the correction.
      function tzDataZonePoint(pzd, i) {
        var z = pzd.zones[i];
        if (!z) return null;
        var cx = z.correctionX || 0, cy = z.correctionY || 0;
        var r2 = function (v) { return Math.round(v * 100) / 100; };
        var d = pzd.zonePts[i];
        var f = pzd.focusByZone[i];
        if (d && isFinite(d.dx) && isFinite(d.dy)) {
          var pt = { x: r2(z.refX + d.dx), y: r2(z.refY + d.dy), dx: d.dx, dy: d.dy, src: "chosen" };
          // the material macro measures where ITS X/Y say (X30 Y30 when it has none): when that is not the chosen point the map lies about where it measures
          if (f && i <= 5) {
            var mdx = cx + (isFinite(f.px) ? f.px : 30), mdy = cy + (isFinite(f.py) ? f.py : 30);
            if (Math.abs(mdx - d.dx) > 0.05 || Math.abs(mdy - d.dy) > 0.05) pt.macro = { x: r2(z.refX + mdx), y: r2(z.refY + mdy) };
          }
          return pt;
        }
        var px = f && isFinite(f.px) ? f.px : 30, py = f && isFinite(f.py) ? f.py : 30;
        return { x: r2(z.refX + cx + px), y: r2(z.refY + cy + py), dx: r2(cx + px), dy: r2(cy + py), src: f && isFinite(f.px) ? "macro" : "defaultValue" };
      }

      // Saves the point (map coords) for zone i and, if it has a material
      // macro, writes X/Y in the laserfocus.g line.
      function tzDataSaveZonePoint(pzd, i, p) {
        var z = pzd.zones[i];
        if (!z) return Promise.reject(new Error(i18nT('zonesPage.has_no_zone_file', { code: TZ_CODES[i] })));
        var r2 = function (v) { return Math.round(v * 100) / 100; };
        var next = JSON.parse(JSON.stringify(pzd.zonePts || {}));
        next[i] = { dx: r2(p.x - z.refX), dy: r2(p.y - z.refY) };
        return tzPutText(pzd.TZ_ZPT_FILE, JSON.stringify(next, null, 1))
          .then(function () {
            pzd.zonePts = next;
            return tzDataSetFocusLine(pzd, i, { X: r2(next[i].dx - (z.correctionX || 0)), Y: r2(next[i].dy - (z.correctionY || 0)) });
          })
          .then(function () { return tzDataRefreshAll(pzd); });
      }

      // Calibrate > Laser<->pointer: sets the correction (cx, cy) in the zone i
      // file WITHOUT moving its point (origin) nor its Z point: the Z point is
      // saved again in map coords, so the material macro's X/Y
      // (relative to the origin WITH correction) are recomputed.
      function tzDataSetZoneCorrection(pzd, i, cx, cy) {
        var z = pzd.zones[i];
        if (!z || !z.file) return Promise.reject(new Error(i18nT('zonesPage.has_no_zone_file', { code: TZ_CODES[i] })));
        if (!tzDataMachineFree(pzd)) return Promise.reject(new Error(i18nT('zonesPage.there_is_a_job_running_zones')));
        var keepPt = tzDataZonePoint(pzd, i);
        var nz = Object.assign({}, z, { correctionX: cx, correctionY: cy });
        var errs = tzValidate(nz, pzd.st);
        if (errs.length) return Promise.reject(new Error(TZ_CODES[i] + ": " + errs.join(" ")));
        return tzDataBackupZone(pzd, i)
          .then(function () { return tzPutText("0:/sys/workshop/zones/p" + (i + 1) + ".g", tzZoneFileText(i, nz, "laser correction from Calibrate on " + tzLocalTime())); })
          .then(function () { return tzCode('M98 P"0:/sys/workshop/macros/workplaces.g"'); })
          .then(function () { return tzDataRefreshAll(pzd); })
          .then(function () { return keepPt ? tzDataSaveZonePoint(pzd, i, { x: keepPt.x, y: keepPt.y }) : null; });
      }

      function tzDataReadZones(pzd, rf) {
        rf.newZones = [];
        rf.newFocus = {};
        rf.pZones = tzList("0:/sys/workshop/zones").then(function (list) {
          var files = list.filter(function (f) {
            return f && f.type === "f" && /^p[1-9]\.g$/.test(f.name);
          });
          return Promise.all(
            files.map(function (f) {
              var idx = parseInt(f.name.charAt(1), 10) - 1;
              return tzGetText("0:/sys/workshop/zones/" + f.name)
                .then(function (txt) {
                  var z = tzParseZoneFile(txt);
                  if (z) {
                    z.file = true;
                    rf.newZones[idx] = z;
                  }
                })
                .catch(function () {});
            })
          );
        });
        rf.pFocus = tzList("0:/macros/laser").then(function (list) {
          pzd.laserFiles = list.filter(function (f) { return f && f.type === "f" && /\.g$/i.test(f.name); }).map(function (f) { return f.name; });
          return Promise.all(
            list
              .filter(function (f) {
                return f && f.type === "f" && /\.g$/i.test(f.name);
              })
              .map(function (f) {
                return tzGetText("0:/macros/laser/" + f.name)
                  .then(function (txt) {
                    // H or T (thickness rule) + optional X/Y of the measuring point: see tzFocusReadLine (57-focus-rule.js)
                    var lf = tzFocusReadLine(txt);
                    if (lf) {
                      var fo = { macro: f.name, h: lf.h, name: lf.name || f.name };
                      if (lf.px !== undefined) { fo.px = lf.px; fo.py = lf.py; }
                      if (lf.ask) fo.ask = true;
                      rf.newFocus[lf.zone - 1] = fo;
                    }
                  })
                  .catch(function () {});
              })
          );
        });
        rf.pPos = workshopPosRead();
        rf.pSizes = tzGetText(pzd.TZ_SIZES_FILE)
          .then(function (txt) {
            var o = JSON.parse(txt);
            return o && typeof o === "object" ? o : {};
          })
          .catch(function () {
            return {}; // todavia no hay medidas
          });
      }

      function tzDataReadPointsZ(pzd, rf) {
        rf.pZpt = tzGetText(pzd.TZ_ZPT_FILE)
          .then(function (txt) {
            var o = JSON.parse(txt);
            return o && typeof o === "object" ? o : {};
          })
          .catch(function () {
            return {}; // todavia no hay puntos elegidos
          });
        rf.pExtra = tzGetText(pzd.TZ_EXTRA_FILE)
          .then(function (txt) {
            var o = JSON.parse(txt);
            return o && typeof o === "object" ? o : {};
          })
          .catch(function () {
            return {};
          });
        rf.pPren = tzGetText(pzd.TZ_CLAMPS_FILE)
          .then(function (txt) {
            var arr = JSON.parse(txt);
            return Array.isArray(arr) ? arr.filter(function (q) { return q && isFinite(q.x) && isFinite(q.y) && q.w > 0 && q.h > 0; }) : [];
          })
          .catch(function () {
            return []; // todavia no hay prensas marcadas
          });
        rf.pRet = tzGetText(pzd.TZ_OFFCUTS_FILE)
          .then(function (txt) {
            var arr = JSON.parse(txt);
            return Array.isArray(arr) ? arr.filter(function (q) { return q && isFinite(q.x) && isFinite(q.y) && q.w > 0 && q.h > 0; }) : [];
          })
          .catch(function () {
            return [];
          });
      }
