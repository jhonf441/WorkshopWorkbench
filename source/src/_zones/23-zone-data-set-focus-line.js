      // Changes parameters of the laserfocus.g line in the zone's
      // material macro i. H is replaced IN PLACE (the parsers
      // expect "W<n> H<h>" together); X/Y/T are removed and added at the end
      // (null = remove). What is inside N"..." is not touched.
      function tzDataSetFocusLine(pzd, i, params) {
        var f = pzd.focusByZone[i];
        if (!f) return Promise.resolve(false);
        var mp = "0:/macros/laser/" + f.macro;
        return tzGetText(mp).then(function (txt) {
          var out = txt.replace(/^(\s*M98\s+P"0:\/sys\/(?:workshop\/macros\/|taller\/)?laserfocus\.g"[^\n]*)$/m, function (ln) {
            var cm = "";
            var ci = ln.indexOf(";");
            if (ci >= 0 && ci > ln.lastIndexOf('"')) {
              cm = " " + ln.slice(ci).trim();
              ln = ln.slice(0, ci);
            }
            var keys = Object.keys(params).filter(function (k) { return k !== "H"; });
            var parts = ln.split(/([NP]"[^"]*")/);
            ln = parts
              .map(function (t, k) {
                if (k % 2) return t;
                if (params.H) t = t.replace(/(W\d\s+H)[\d.]+/, "$1" + params.H);
                else if (params.H === null) t = t.replace(/(W\d)\s+H-?[\d.]+/, "$1");   // H null: take the height from T (the thickness rule)
                keys.forEach(function (K) { t = t.replace(new RegExp("\\s+" + K + "-?[\\d.]+", "g"), ""); });
                return t;
              })
              .join("")
              .replace(/\s+$/, "");
            keys.forEach(function (K) {
              if (params[K] !== null && params[K] !== undefined && isFinite(params[K])) ln += " " + K + params[K];
            });
            return ln + cm;
          });
          return out === txt ? false : tzPutText(mp, out).then(function () { return true; });
        });
      }

      // ---- Check of a zone (request 2026-10-09: problems were
      // discovered only when using it, e.g. G55's measuring point that the
      // probe could not reach and laserfocus.g ran without warning). Returns
      // [{lvl: "err"|"warn"|"info", txt}]. Used by the table (State column,
      // tap to see the detail), Active zone and Prepare.
      function tzDataZoneChecks(pzd, i) {
        var out = [];
        var z = pzd.zones[i];
        if (!z || !pzd.st || !pzd.st.axes || !pzd.st.axes.X) return out;
        var ax = pzd.st.axes;
        var laser = pzd.st.mode === "Laser";
        tzValidate(z, pzd.st).forEach(function (t) { out.push({ lvl: "err", txt: t }); });
        var f = pzd.focusByZone[i];
        var m = tmatById(tzDataZoneMaterial(pzd, i));
        if (laser && i <= 5 && !f) out.push({ lvl: "warn", txt: i18nT('zonesPage.no_material_macro_measure_and_focus') });
        if (!m) out.push({ lvl: "info", txt: i18nT('zonesPage.no_material_assigned_the_thickness_cannot') });
        else {
          if (m.mode !== pzd.st.mode && !(m.mode === "Laser" && !laser && pzd.st.mode === "?")) out.push({ lvl: "warn", txt: i18nT('zonesPage.the_material_is_for_and_the', { name: m.name, materialMode: m.mode, mode: pzd.st.mode }) });
          if (m.mode === "Laser" && f && m.focus >= 1 && Math.abs(f.h - m.focus) > 0.001) out.push({ lvl: "warn", txt: i18nT('zonesPage.the_macro_focuses_at_mm_but', { macro: f.macro, h: f.h, focus: m.focus }) });
        }
        var zp = tzDataZonePoint(pzd, i);
        var po = tzDataProbeOffset(pzd);
        if (zp && po) {
          var hx = zp.x - po.x, hy = zp.y - po.y;
          if (hx < ax.X.min || hx > ax.X.max || hy < ax.Y.min || hy > ax.Y.max) {
            // Explained in simple words (request 2026-10-09: "I do not understand
            // the warning") + one-tap fix: the closest point the
            // probe CAN reach (and inside the cutting area if there is one).
            var fixc = null;
            var rx0 = ax.X.min + po.x + 1, rx1 = ax.X.max + po.x - 1, ry0 = ax.Y.min + po.y + 1, ry1 = ax.Y.max + po.y - 1;
            var ca = pzd.st.cutArea;
            if (ca) {
              rx0 = Math.max(rx0, ca[0]); rx1 = Math.min(rx1, ca[1]);
              ry0 = Math.max(ry0, ca[2]); ry1 = Math.min(ry1, ca[3]);
            }
            if (rx0 <= rx1 && ry0 <= ry1) {
              var np = { x: Math.round(Math.min(Math.max(zp.x, rx0), rx1) * 10) / 10, y: Math.round(Math.min(Math.max(zp.y, ry0), ry1) * 10) / 10 };
              fixc = {
                label: i18nT('zonesPage.use_the_nearest_point_the_probe_2', { x: tzFmt(np.x), y: tzFmt(np.y) }),
                tip: i18nT('zonesPage.moves_the_z_point_of_and', { code: TZ_CODES[i] }),
                run: function () { return tzDataSaveZonePoint(pzd, i, np); },
                ok: i18nT('zonesPage.z_point_moved'),
              };
            }
            out.push({
              lvl: "warn",
              txt: i18nT('zonesPage.the_probe_bltouch_is_beside_the', { x: tzFmt(po.x), y: tzFmt(po.y), x2: tzFmt(zp.x), y2: tzFmt(zp.y), hx: tzFmt(hx), hy: tzFmt(hy) }),
              fix: fixc,
            });
          }
        }
        var a = pzd.st.cutArea;
        if (zp && a && (zp.x < a[0] || zp.x > a[1] || zp.y < a[2] || zp.y > a[3])) out.push({ lvl: "warn", txt: i18nT('zonesPage.the_z_point_is_outside_the', { mode: pzd.st.mode }) });
        var sz = pzd.zoneSizes[i];
        if (!sz || !(sz.w > 0)) out.push({ lvl: "info", txt: i18nT('zonesPage.no_material_size_there_is_no') });
        else if (a && (z.refX < a[0] - 0.01 || z.refY < a[2] - 0.01 || z.refX + sz.w > a[1] + 0.01 || z.refY + sz.h > a[3] + 0.01))
          out.push({ lvl: "warn", txt: i18nT('zonesPage.the_material_x_mm_from_the', { w: tzFmt(sz.w), h: tzFmt(sz.h), mode: pzd.st.mode }) });
        // clamps on top of the material or the Z point
        tzDataClampsAct(pzd).forEach(function (q) {
          var nm = q.name || i18nT('common.a_clamp');
          if (sz && sz.w > 0 && q.x < z.refX + sz.w && q.x + q.w > z.refX && q.y < z.refY + sz.h && q.y + q.h > z.refY)
            out.push({ lvl: "warn", txt: i18nT('zonesPage.the_clamp_is_over_the_material', { nm: nm }) });
          if (zp && zp.x >= q.x && zp.x <= q.x + q.w && zp.y >= q.y && zp.y <= q.y + q.h)
            out.push({ lvl: "warn", txt: i18nT('zonesPage.the_z_point_falls_on_the', { nm: nm }) });
        });
        return out;
      }

      function tzDataChecksBadge(pzd, list) {
        var e = list.filter(function (c) { return c.lvl === "err"; }).length;
        var w = list.filter(function (c) { return c.lvl === "warn"; }).length;
        var b = tzEl("span", "wf-state tz-badge " + (e ? "err" : w ? "warn" : "ok"), e ? i18nT('zonesPage.attention') : w ? w + (w === 1 ? i18nT('zonesPage.warning') : i18nT('zonesPage.warnings')) : "OK");
        b.title = list.map(function (c) { return (c.lvl === "err" ? i18nT('zonesPage.error') : c.lvl === "warn" ? i18nT('zonesPage.warning_2') : i18nT('zonesPage.info')) + c.txt; }).join("\n") || i18nT('zonesPage.all_in_order');
        return b;
      }

      // ---- material de cada zona ----
      function tzDataZoneMaterial(pzd, i) {
        var e = pzd.zoneExtra[i];
        return e && e.material ? e.material : null;
      }

      // Writes the material's focus (H) and thickness (T) in the zone's
      // macro (Laser, G54..G59). Without a macro and with focus: it creates it.
      function tzDataApplyMaterialToZone(pzd, i) {
        var m = tmatById(tzDataZoneMaterial(pzd, i));
        var z = pzd.zones[i];
        if (!m || m.mode !== "Laser" || !z || i > 5) return Promise.resolve();
        var p = Promise.resolve();
        var h = tmatH(m);
        if (!pzd.focusByZone[i]) p = tzDataWriteFocusMacro(pzd, i, z, h, tzSlug(z.name) + ".g").then(function () { return tzDataReadFiles(pzd); });
        return p.then(function () {
          // with a thickness the macro carries T and no H: laserfocus.g takes the height from the thickness rule
          var par = m.thickness > 0 ? { H: null, T: m.thickness } : { H: h, T: null };
          var zp = tzDataZonePoint(pzd, i);
          if (zp && zp.macro) { par.X = Math.round((zp.dx - (z.correctionX || 0)) * 100) / 100; par.Y = Math.round((zp.dy - (z.correctionY || 0)) * 100) / 100; }   // keep the macro measuring at the chosen point
          return tzDataSetFocusLine(pzd, i, par);
        });
      }

      function tzDataSaveZoneMaterial(pzd, i, id) {
        var next = JSON.parse(JSON.stringify(pzd.zoneExtra || {}));
        next[i] = next[i] || {};
        if (id) next[i].material = id;
        else delete next[i].material;
        if (!Object.keys(next[i]).length) delete next[i];
        return tzPutText(pzd.TZ_EXTRA_FILE, JSON.stringify(next, null, 1))
          .then(function () {
            pzd.zoneExtra = next;
            return tzDataApplyMaterialToZone(pzd, i);
          })
          .then(function () { return tzDataRefreshAll(pzd); });
      }

      // I change the lens focus (Offsets): H of each zone macro = lens -
      // what its material focuses inside (without material: the lens).
      function tzDataSyncFocus(pzd) {
        var p = Promise.resolve();
        pzd.zones.forEach(function (z, i) {
          if (!z || i > 5 || !pzd.focusByZone[i]) return;
          var m = tmatById(tzDataZoneMaterial(pzd, i));
          if (m && m.mode === "Laser" && m.thickness > 0) return;   // its macro has T, not H: the lens does not change it
          var h = m && m.mode === "Laser" ? tmatH(m) : tjLaserFocus();
          p = p.then(function () { return tzDataSetFocusLine(pzd, i, { H: h }); });
        });
        return p.then(function () { return tzDataRefreshAll(pzd); });
      }

      // Un material cambio en la biblioteca: actualizar sus zonas.
      function tzDataSyncMaterialZones(pzd, id) {
        var p = Promise.resolve();
        pzd.zones.forEach(function (z, i) {
          if (z && (!id || tzDataZoneMaterial(pzd, i) === id)) p = p.then(function () { return tzDataApplyMaterialToZone(pzd, i); });
        });
        return p.then(function () { return tzDataRefreshAll(pzd); });
      }

      // Material measure of a zone (empty = removed).
      function tzDataSaveZoneSize(pzd, idx, w, h) {
        var next = JSON.parse(JSON.stringify(pzd.zoneSizes || {}));
        if (w > 0 && h > 0) next[idx] = { w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100 };
        else delete next[idx];
        if (JSON.stringify(next) === JSON.stringify(pzd.zoneSizes || {})) return Promise.resolve();
        return tzPutText(pzd.TZ_SIZES_FILE, JSON.stringify(next, null, 1)).then(function () {
          pzd.zoneSizes = next;
          if (pzd.st) pzd.shell.renderMap();
        });
      }

      // Guarda zona + (opcional) macro de foco, con respaldo previo.
      function tzDataSaveZone(pzd, idx, z, focusVal, macroName, msgThe) {
        if (!tzDataMachineFree(pzd)) {
          tzSetMsg(msgThe, i18nT('zonesPage.there_is_a_job_running_zones'), false);
          return Promise.resolve(false);
        }
        var errs = tzValidate(z, pzd.st);
        if (errs.length) {
          tzSetMsg(msgThe, errs.join("\n"), false);
          return Promise.resolve(false);
        }
        var h = parseFloat(focusVal);
        var wantFocus = String(focusVal).trim() !== "" && isFinite(h);
        if (wantFocus && idx > 5) {
          tzSetMsg(msgThe, i18nT('zonesPage.measure_and_focus_laserfocus_g_only', { code: TZ_CODES[idx] }), false);
          return Promise.resolve(false);
        }
        macroName = String(macroName || "").trim().replace(/[^A-Za-z0-9_.-]/g, "");
        if (wantFocus && !/\.g$/i.test(macroName)) macroName = (macroName || tzSlug(z.name)) + ".g";
        var file = "0:/sys/workshop/zones/p" + (idx + 1) + ".g";
        tzSetMsg(msgThe, i18nT('common.saving'), true);
        return tzDataBackupZone(pzd, idx)
          .then(function () {
            return tzPutText(file, tzZoneFileText(idx, z, "edited on the Zones page on " + tzLocalTime()));
          })
          .then(function () {
            return wantFocus ? tzDataWriteFocusMacro(pzd, idx, z, h, macroName) : null;
          })
          .then(function () {
            return tzCode('M98 P"0:/sys/workshop/macros/workplaces.g"');
          })
          .then(function () {
            return tzDataRefreshAll(pzd);
          })
          .then(function () {
            tzSetMsg(
              msgThe,
              i18nT('zonesPage.saved', { code: TZ_CODES[idx], v: wantFocus ? i18nT('zonesPage.macro_macros_laser_focus_mm', { macroName: macroName, h: h }) : "" }),
              true
            );
            return true;
          })
          .catch(function (e) {
            tzSetMsg(msgThe, String(e), false);
            return false;
          });
      }

      // Creates or updates the zone's material macro. If a
      // macro that calls laserfocus.g with this zone already exists, only the
      // laserfocus line is changed (the rest of the macro stays the same).
      function tzDataFocusMacroBody(pzd, idx, z, h, macroName) {
        var line = 'M98 P"0:/sys/workshop/macros/laserfocus.g" W' + (idx + 1) + " H" + h + ' N"' + (z.name || TZ_CODES[idx]) + '"';
        return (
          "; " + macroName + " -- " + (z.name || TZ_CODES[idx]) + " (created on the Work zones page)\n" +
          "; Selects " + TZ_CODES[idx] + ", measures the sheet with the BLTouch at the Z point of the zone\n" +
          "; and leaves the laser " + h + "mm above the surface. It can be run by hand, from \"Measure and\n" +
          '; focus" of the jog or from the "Start GCode" of the program that sends the live job.\n' +
          line + "\n" +
          "; Last line: tells the G-code bridge about a LIVE job (does nothing when the job is a G-code file)\n" +
          'M98 P"0:/sys/workshop/macros/livemark.g" N"' + (z.name || TZ_CODES[idx]) + '"\n'
        );
      }

      function tzDataWriteFocusMacro(pzd, idx, z, h, macroName) {
        var existing = pzd.focusByZone[idx];
        if (existing) {
          // Only that line's height H is changed (the name N and the
          // rest of the macro stay as the user left them).
          var p = "0:/macros/laser/" + existing.macro;
          return tzGetText(p).then(function (txt) {
            return tzPutText(
              p,
              // sets H; a macro that only had T (thickness) gets an H, which wins over T
              txt.replace(/^(\s*M98\s+P"0:\/sys\/(?:workshop\/macros\/|taller\/)?laserfocus\.g"\s+W\d)(?:\s+H-?[\d.]+)?/m, function (all, pre) {
                return pre + " H" + h;
              })
            );
          });
        }
        if (pzd.laserFiles.indexOf(macroName) !== -1) return Promise.reject(new Error(i18nT('zonesPage.macros_laser_already_exists_and_is', { macroName: macroName })));
        return tzPutText("0:/macros/laser/" + macroName, tzDataFocusMacroBody(pzd, idx, z, h, macroName));
      }

      function tzDataBackupZone(pzd, idx) {
        var file = "0:/sys/workshop/zones/p" + (idx + 1) + ".g";
        return tzGetText(file).then(
          function (txt) {
            return tzPutText("0:/sys/workshop/zones/history/p" + (idx + 1) + "-" + tzStamp() + ".g", txt);
          },
          function () {
            /*  without a previous file: nothing to back up */
          }
        );
      }

