      function tcmMapCfg(tcm) {
        var m = (tcm.vcfg && tcm.vcfg.map) || {};
        return { use: !!m.use, opacity: m.opacity >= 0.1 && m.opacity <= 1 ? m.opacity : 0.75 };
      }

      function tcmCalibrated(tcm) {
        return !!tcm.vcfg && (Object.keys(tcm.vcfg.calibs || {}).length > 0 || !!(tcm.vcfg.calibration && tcm.vcfg.calibration.size));
      }

      function tcmUsable(tcm) {
        return tcmMapCfg(tcm).use && tcmCalibrated(tcm);
      }

      function tcmInCarriage(tcm) {
        return !!tcm.vcfg && tcm.vcfg.camera_en === "carriage";
      }

      function tcmUrl(tcm) {
        var u = String((tcm.vcfg && tcm.vcfg.url) || TCM_DEFAULT_URL);
        return u.replace("[HOSTNAME]", location.hostname).replace(/^(https?:\/\/)(127\.0\.0\.1|localhost)(?=[:/])/i, "$1" + location.hostname);
      }

      function tcmReload(tcm) {
        return tzGetText(TCM_FILE)
          .then(function (t) {
            var o = JSON.parse(t.replace(/^﻿/, ""));
            tcm.vcfg = o && typeof o === "object" ? o : {};
          }, function () {
            tcm.vcfg = null;
          })
          .then(function () {
            if (!tcmAlive(tcm)) return;
            tcmSync(tcm);
            tcmPlace(tcm);
          });
      }

      function tcmAlive(tcm) { return tcm.ctx.visible(); }

      // Turns the video download on/off according to the layer, Vision's
      // switch and the page.
      function tcmSync(tcm) {
        var want = tcmUsable(tcm) && tcm.ctx.map.layerActive() && tcm.ctx.visible();
        if (want) {
          if (tcm.imgBase !== tcmUrl(tcm)) {
            tcm.imgBase = tcmUrl(tcm);
            tcm.img.src = tcm.imgBase;
          }
        } else if (tcm.img.getAttribute("src")) {
          tcm.imgBase = "";
          clearTimeout(tcm.imgRetry);
          // A tiny image first: it aborts the open video request for sure (removing the attribute alone may leave the
          // stream running); then the attribute goes. Without a request the relay in the Pi closes the camera.
          tcm.img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAACAkQBADs=";
          tcm.img.removeAttribute("src");
          tcm.img.style.display = "none";
        }
      }

      // Places the image under the map (each renderMap: zoom, pan and
      // gantry position).
      function tcmPlace(tcm) {
        if (!tcm.img.getAttribute("src") || !tcmUsable(tcm)) {
          tcm.now = null;
          return (tcm.img.style.display = "none");
        }
        var nw = tcm.img.naturalWidth, nh = tcm.img.naturalHeight;
        var m = tcm.ctx.map.ctm ? tcm.ctx.map.ctm() : tcm.ctx.map.svg.getScreenCTM(); // incluye giro/espejo de la vista
        if (!nw || !nh || !m) return;
        var cp = tcmCalibrationFor(tcm.vcfg, nw, nh);
        if (cp.err) {
          tcm.poseErr = cp.err;
          tcm.now = null;
          return (tcm.img.style.display = "none");
        }
        var st = tcm.ctx.machine.getSt();
        var ax = st && st.axes;
        if (!ax || !ax.Y || !ax.Z || (tcmInCarriage(tcm) && !ax.X)) {
          tcm.now = null;
          return (tcm.img.style.display = "none");
        }
        // 2026-10-13: without homing it is NOT drawn any more (before it was
        // drawn "with the position the machine believes", which is not real
        // and made the image look misplaced / wrongly sized); the layer
        // caption says why.
        var missing = tcmMissingHoming(ax, tcmInCarriage(tcm));
        if (missing) {
          tcm.poseErr = i18nT('cameraMap.not_homed_not_drawn', { axes: missing });
          tcm.now = null;
          return (tcm.img.style.display = "none");
        }
        var p = tcmPose(cp.H, cp.c, tcm.vcfg.height, +ax.Y.machinePosition, +ax.Z.machinePosition, ax.X ? +ax.X.machinePosition : null, tcmInCarriage(tcm));
        if (p.err) {
          tcm.poseErr = p.err;
          tcm.now = null;
          return (tcm.img.style.display = "none");
        }
        tcm.poseErr = "";
        var field = tcmFieldMm(p.H, nw, nh);
        tcm.now = { w: field.w, h: field.h, ppm: field.ppm, x: ax.X ? +ax.X.machinePosition : null, y: +ax.Y.machinePosition, z: +ax.Z.machinePosition, iw: nw, ih: nh, c: cp.c };
        var box = tcm.ctx.map.svgBox.getBoundingClientRect();
        // maquina (x, y) -> SVG (x, -y) -> pantalla -> caja del mapa
        var M = [m.a, m.c, m.e - box.left, m.b, m.d, m.f - box.top, 0, 0, 1];
        var h = tcmMul(tcmMul(M, tcmS(1, -1)), p.H);
        tcm.img.style.width = nw + "px";
        tcm.img.style.height = nh + "px";
        tcm.img.style.transform = "matrix3d(" + [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, h[8]].join(",") + ")";
        var opScreen = NaN;
        try {
          opScreen = parseFloat(localStorage.getItem("workshopMapCameraOpacity"));
        } catch (e) {
          opScreen = NaN;
        }
        tcm.img.style.opacity = String(opScreen >= 0.1 && opScreen <= 1 ? opScreen : tcmMapCfg(tcm).opacity);
        tcm.img.style.display = "block";
      }

      // Text for the layer: why it is not seen (or null if all is well).
      function tcmNotice(tcm) {
        if (!tcm.vcfg) return i18nT('cameraMap.set_it_up_on_the_vision');
        if (!tcmCalibrated(tcm)) return i18nT('cameraMap.calibrate_it_in_vision_calibrate');
        if (!tcmMapCfg(tcm).use) return i18nT('cameraMap.off_turn_it_on_in_vision');
        return tcm.cameraErr || tcm.poseErr || null;
      }

      // What the camera sees with the machine at (x, y, z): 4 corners of the image
      // in bed coords + center (the map's Camera tool). x only counts
      // with the camera on the carriage.
      function tcmFingerprint(tcm, x, y, z) {
        var nw = tcm.img.naturalWidth, nh = tcm.img.naturalHeight;
        if (!tcmUsable(tcm) || !tcm.img.getAttribute("src") || !nw || !nh) return null;
        var cp = tcmCalibrationFor(tcm.vcfg, nw, nh);
        if (cp.err) return null;
        var p = tcmPose(cp.H, cp.c, tcm.vcfg.height, y, z, x, tcmInCarriage(tcm));
        if (p.err) return null;
        var H = p.H;
        var ap = function (u, v) {
          var w = H[6] * u + H[7] * v + H[8];
          return [(H[0] * u + H[1] * v + H[2]) / w, (H[3] * u + H[4] * v + H[5]) / w];
        };
        var pts = [ap(0, 0), ap(nw, 0), ap(nw, nh), ap(0, nh)];
        return {
          pts: pts,
          cx: (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4,
          cy: (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4,
        };
      }

      // Caption of the layer (2026-10-13, "the camera image looks far too
      // big, especially close to the bed"): the calibration in use and the
      // field the layer believes the camera sees now, to compare with reality.
      // -> null without a calibration.
      function tcmInfo(tcm) {
        if (!tcmCalibrated(tcm)) return null;
        var cs = Object.assign({}, tcm.vcfg.calibs || {});
        if (tcm.vcfg.calibration && tcm.vcfg.calibration.size) cs[tcm.vcfg.calibration.size.join("x")] = cs[tcm.vcfg.calibration.size.join("x")] || tcm.vcfg.calibration;
        var c = tcm.now && tcm.now.c;
        if (!c) {
          var ks = Object.keys(cs);
          c = ks.length ? cs[ks[0]] : null;
        }
        if (!c) return null;
        var alt = tcm.vcfg.height || null;
        return {
          date: c.date || "",
          y: c.y, z: c.z, x: c.x,
          size: c.size || null,
          ppm: c.px_per_mm,
          h0: alt && alt.h0 !== undefined ? +alt.h0 : null,
          now: tcm.now,
        };
      }

