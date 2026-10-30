      // ---- Camera over the map (request 2026-10-09, redone 2026-10-10) ----
      //
      // 2026-10-10: "the map camera shows up in every part and there should be only
      // one place to configure it; if it is already configured in Vision, just leave
      // a switch that allows using it in Work zones". The camera is
      // configured ONCE, in the Vision page (0:/sys/workshop/config/vision.json:
      // address, calibration per resolution and lens height). Here it is only
      // read: Vision > Camera > "Use in Work zones" (mapa.use) and the
      // opacity (mapa.opacity); on the map the Camera layer (eye) remains.
      //
      // The camera is on the GANTRY (it follows Y, rises with Z): the calibration's
      // image -> machine homography is corrected with the current position
      // like vision.py (mover_pose), so the image stays under the map
      // in its place while the gantry moves. The video is only downloaded
      // while the layer is on and the page open.

      var TCM_FILE = "0:/sys/workshop/config/vision.json";
      var TCM_DEFAULT_URL = "http://127.0.0.1:8090/stream"; // it is read by the system: in the browser the DWC host goes

      function tcmMul(A, B) {
        var R = [];
        for (var i = 0; i < 3; i++)
          for (var j = 0; j < 3; j++) R.push(A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]);
        return R;
      }
      function tcmT(dx, dy) { return [1, 0, dx, 0, 1, dy, 0, 0, 1]; }
      function tcmS(sx, sy) { return [sx, 0, 0, 0, sy, 0, 0, 0, 1]; }

      // Vision calibration for a w x h image: the one for that resolution or
      // one of the same proportion scaled (like Config.calib_para).
      function tcmCalibrationFor(vcfg, w, h) {
        var cs = Object.assign({}, vcfg.calibs || {});
        if (vcfg.calibration && vcfg.calibration.size) cs[vcfg.calibration.size.join("x")] = cs[vcfg.calibration.size.join("x")] || vcfg.calibration; // formato 1.0
        var flat = function (c) { return [].concat(c.H[0], c.H[1], c.H[2]); };
        var c = cs[w + "x" + h];
        if (c && c.H) return { c: c, H: flat(c) };
        var ks = Object.keys(cs);
        for (var i = 0; i < ks.length; i++) {
          var o = cs[ks[i]];
          if (!o || !o.H || !o.size) continue;
          if (Math.abs(o.size[0] / o.size[1] - w / h) < 0.01) return { c: o, H: tcmMul(flat(o), tcmS(o.size[0] / w, o.size[1] / h)) };
        }
        return { err: ks.length ? i18nT('cameraMap.vision_has_no_calibration_for_there', { w: w, h: h, sizes: ks.join(", ") }) : i18nT('cameraMap.the_camera_is_not_calibrated_calibrate') };
      }

      // Port of mover_pose from vision.py: Y shifts the image dY; Z scales it
      // around the nadir N by k = (z + h0) / (z_cal + h0). With the camera on the
      // CARRIAGE (sys/workshop/config/vision.json camera_en "carro", 2026-10-10) X shifts it dX.
      function tcmPose(H, c, height, y, z, x, carriage) {
        if (c.y === null || c.y === undefined || c.z === null || c.z === undefined) return { H: H };
        if (carriage && (c.x === null || c.x === undefined)) return { err: i18nT('cameraMap.the_camera_is_on_the_carriage') };
        var dx = carriage && x !== null && x !== undefined ? x - c.x : 0;
        var dy = y - c.y, dz = z - c.z, k = 1, N = [0, 0];
        if (Math.abs(dz) >= 0.05) {
          if (!height || height.h0 === undefined || !height.N_rel) return { err: i18nT('cameraMap.not_possible_with_z_at_the', { z: z.toFixed(1), z2: c.z }) };
          var h0 = +height.h0;
          if (c.z + h0 <= 0 || z + h0 <= 0) return { err: i18nT('cameraMap.invalid_lens_height_in_the_vision') };
          k = (z + h0) / (c.z + h0);
          // same as vision.py mover_pose: rel_x (set when the height was
          // calibrated with the camera on the carriage) alone decides
          N = [+height.N_rel[0] + (height.rel_x && c.x !== null && c.x !== undefined ? +c.x : 0), +height.N_rel[1] + c.y];
        }
        var S = tcmMul(tcmMul(tcmT(N[0] + dx, N[1] + dy), tcmS(k, k)), tcmT(-N[0], -N[1]));
        return { H: tcmMul(S, H) };
      }

      // Field of view (mm) of a w x h image through the homography H (image ->
      // bed): mean length of the opposite edges. -> {w, h, ppm} (ppm = px/mm).
      function tcmFieldMm(H, w, h) {
        var ap = function (u, v) {
          var q = H[6] * u + H[7] * v + H[8];
          return [(H[0] * u + H[1] * v + H[2]) / q, (H[3] * u + H[4] * v + H[5]) / q];
        };
        var a = ap(0, 0), b = ap(w, 0), c = ap(w, h), d = ap(0, h);
        var dist = function (p1, p2) { return Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); };
        var fw = (dist(a, b) + dist(d, c)) / 2, fh = (dist(a, d) + dist(b, c)) / 2;
        return { w: fw, h: fh, ppm: fw > 0 ? w / fw : null };
      }
      // 2026-10-13: without homing the positions are not real, so the image
      // would land anywhere: it is not drawn. Axes that move the camera: Y and Z
      // (gantry) plus X on the carriage. -> list of missing axes ("" = all homed)
      function tcmMissingHoming(ax, carriage) {
        var f = [];
        if (carriage && !(ax.X && ax.X.homed)) f.push("X");
        if (!(ax.Y && ax.Y.homed)) f.push("Y");
        if (!(ax.Z && ax.Z.homed)) f.push("Z");
        return f.join("/");
      }

      function tcmMount(ctx) {
        var tcm = { ctx: ctx };
        tcmStart(tcm);
        return tcmApi(tcm);
      }
