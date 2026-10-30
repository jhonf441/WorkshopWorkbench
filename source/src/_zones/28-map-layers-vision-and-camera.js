      function tzLayersTzHasVisionNow(ply) { return workshopPathExists("/Plugins/Vision"); }

      function tzLayersPaintLayerButtons(ply) {
        var hasV = tzLayersTzHasVisionNow(ply);
        ply.visionRows.forEach(function (f) { f.style.display = hasV ? "" : "none"; });
        Object.keys(ply.layerButtons).forEach(function (k) {
          var on = ply.layerState.layers()[k];
          var lb = ply.layerButtons[k];
          if (k === "clamps") {
            var vis = typeof ply.layerState.clampsOn() === "undefined" || ply.layerState.clampsOn();
            lb.el.style.display = vis ? "" : "none";
            if (lb.el.nextSibling && lb.el.nextSibling.className === "tzm-ld") lb.el.nextSibling.style.display = vis ? "" : "none";
          }
          lb.el.innerHTML = (on ? ply.TZ_EYE : ply.TZ_EYE_OFF) + " " + lb.label;
          lb.el.style.opacity = on ? "1" : "0.5";
        });
      }

      // Below the Camera layer: why it is not seen (uncalibrated, off in
      // Vision, no homing...) or the normal description.
      function tzLayersPaintCameraDesc(ply) {
        tzLayersPaintLayerButtons(ply); // the Vision rows follow the presence of its route (it can register after this page)
        var lb = ply.layerButtons.camera;
        var ld = lb && lb.el.nextSibling;
        if (!ld || ld.className !== "tzm-ld") return;
        var av = ply.camera.map().notice();
        ld.textContent = "";
        var ldT = tzEl("div", null, av || i18nT('zonesPage.camera_video_under_the_map_it'));
        ldT.style.color = av && ply.layerState.layers().camera ? "#ffb74d" : "";
        ld.appendChild(ldT);
        // calibration in use and what the layer believes the camera sees now
        var ci = ply.camera.map().info ? ply.camera.map().info() : null;
        if (ci) {
          var cap = tzEl("div");
          cap.style.cssText = "opacity:.85;margin-top:2px;";
          cap.appendChild(tzEl("div", null, i18nT('cameraMap.caption_calibration', {
            date: ci.date || "?",
            y: ci.y !== null && ci.y !== undefined ? tzFmt(ci.y) : "?",
            z: ci.z !== null && ci.z !== undefined ? tzFmt(ci.z) : "?",
            size: ci.size ? ci.size[0] + "x" + ci.size[1] : "?",
            ppm: isFinite(ci.ppm) ? (+ci.ppm).toFixed(2) : "?",
            h0: ci.h0 !== null ? tzFmt(ci.h0) : "?",
          })));
          var an = ci.now;
          if (an) cap.appendChild(tzEl("div", null, i18nT('cameraMap.caption_now', {
            w: Math.round(an.w), h: Math.round(an.h),
            ppm: isFinite(an.ppm) ? (+an.ppm).toFixed(2) : "?",
            res: an.iw + "x" + an.ih,
            y: tzFmt(an.y), z: tzFmt(an.z),
          })));
          var hint = tzEl("div", null, i18nT('cameraMap.caption_recalibrate', { date: ci.date || "?" }));
          hint.style.opacity = ".75";
          cap.appendChild(hint);
          ld.appendChild(cap);
        }
      }

      function tzLayersPaintCameraOp(ply) {
        ply.cameraOpBox.innerHTML = "";
        var cur = null;
        try {
          cur = parseFloat(localStorage.getItem("workshopMapCameraOpacity"));
        } catch (e) {
          cur = null;
        }
        [[i18nT('zonesPage.strong'), 0.9], [i18nT('zonesPage.medium'), 0.5], [i18nT('zonesPage.faint'), 0.2]].forEach(function (o) {
          ply.cameraOpBox.appendChild(tzBtn(o[0], cur === o[1] ? "primary" : null, function () {
            try {
              localStorage.setItem("workshopMapCameraOpacity", String(o[1]));
            } catch (e) {
              /* no critico */
            }
            tzLayersPaintCameraOp(ply);
            ply.camera.map().place();
          }));
        });
      }

      function tzLayersPaintCameraAssembles(ply) {
        ply.cameraAssemblesBox.innerHTML = "";
        if (!ply.cameraAssembles.value) return; // without Vision or without a response: it is not shown
        var r = tzEl("div", "tz-row");
        r.style.cssText += "gap:4px;align-items:center;flex-wrap:wrap;";
        r.appendChild(tzEl("span", "tz-muted", i18nT('zonesPage.mounted_on')));
        [["gantry", i18nT('zonesPage.gantry')], ["carriage", i18nT('zonesPage.carriage')]].forEach(function (o) {
          var es = ply.cameraAssembles.value === o[0];
          var b = tzBtn(o[1], es ? "primary" : null, function () {
            if (es) return;
            tzVisionPost("/config", { camera_en: o[0] })
              .then(function (j) {
                if (!j || !j.ok) throw new Error((j && j.error) || i18nT('common.no_response'));
                ply.cameraAssembles.value = j.camera_en || o[0];
                ply.cameraAssembles.notice = j.notice || "";
                tzLayersPaintCameraAssembles(ply);
                ply.camera.map().reload();
              })
              .catch(function (e) {
                var msg = String((e && e.message) || e);
                ply.cameraAssembles.notice = i18nT('zonesPage.could_not_change_it_2', { msg: msg });
                tzLayersPaintCameraAssembles(ply);
              });
          }, es ? null : i18nT('common.confirm'), es ? null : "cam-monta-" + o[0]);
          tzTip(b, es ? i18nT('zonesPage.the_camera_is_mounted_here') : i18nT('zonesPage.changes_where_the_camera_is_mounted'));
          r.appendChild(b);
        });
        ply.cameraAssemblesBox.appendChild(r);
        if (ply.cameraAssembles.notice) ply.cameraAssemblesBox.appendChild(tzEl("div", "tz-msg err", ply.cameraAssembles.notice));
      }

      function tzLayersReadCameraAssembles(ply) {
        tzVisionGet("/state")
          .then(function (j) {
            if (j && (j.camera_en === "gantry" || j.camera_en === "carriage")) {
              ply.cameraAssembles.value = j.camera_en;
              tzLayersPaintCameraAssembles(ply);
            }
          })
          .catch(function () {
            /* without Vision: no selector */
          });
      }

      function tzLayersPaintView(ply) {
        ply.viewBox.innerHTML = "";
        ply.viewBox.appendChild(tzEl("div", "tzm-lg", i18nT('zonesPage.view_this_screen')));
        var r1 = tzEl("div");
        r1.appendChild(tzTip(tzBtn(i18nT('zonesPage.minimap'), ply.view.miniHidden() ? null : "primary", function () {
          ply.view.setMiniHidden(!ply.view.miniHidden());
          tzLayersPaintView(ply);
          if (ply.data.st()) ply.shell.renderMap();
        }), i18nT('zonesPage.show_or_hide_the_small_overview')));
        r1.appendChild(tzTip(tzBtn(i18nT('zonesPage.rotate_90'), ply.view.mapRot() ? "primary" : null, function () { ply.view.setView({ rot: (ply.view.mapRot() + 90) % 360 }); }), i18nT('zonesPage.rotates_the_map_to_match_how')));
        r1.appendChild(tzTip(tzBtn(i18nT('zonesPage.mirror'), ply.view.mapMirror() ? "primary" : null, function () { ply.view.setView({ mirror: !ply.view.mapMirror() }); }), i18nT('zonesPage.mirrors_the_map_left_to_right')));
        if (ply.view.mapRot() || ply.view.mapMirror()) r1.appendChild(tzBtn(i18nT('zonesPage.normal'), null, function () { ply.view.setView({ rot: 0, mirror: false }); }));
        ply.viewBox.appendChild(r1);
        if (ply.view.mapRot() || ply.view.mapMirror()) ply.viewBox.appendChild(tzEl("div", "tzm-ld", i18nT('zonesPage.rotated_the_ruler_shows_which_axis', { mapRot: ply.view.mapRot(), v: ply.view.mapMirror() ? i18nT('zonesPage.mirrored') : "" })));
        ply.viewBox.appendChild(tzEl("div", "tzm-lg", i18nT('zonesPage.theme')));
        var r2 = tzEl("div");
        Object.keys(ply.view.themes()).forEach(function (k) {
          r2.appendChild(tzBtn(ply.view.themes()[k].name, k === ply.view.mapTheme() ? "primary" : null, function () { ply.view.setView({ theme: k }); }));
        });
        ply.viewBox.appendChild(r2);
        ply.viewBox.appendChild(tzEl("div", "tzm-lg", i18nT('zonesPage.bed_background')));
        var r3 = tzEl("div");
        ply.view.beds().forEach(function (b) {
          r3.appendChild(tzBtn(b[1], b[0] === ply.view.mapBed() ? "primary" : null, function () { ply.view.setView({ bed: b[0] }); }));
        });
        ply.viewBox.appendChild(r3);
        ply.presetsBox.innerHTML = "";
        ply.presetsBox.appendChild(tzEl("div", "tzm-lg", i18nT('zonesPage.layer_presets')));
        var r4 = tzEl("div");
        ply.TZ_PRESETS.forEach(function (p) {
          r4.appendChild(tzTip(tzBtn(p[0], null, function () {
            Object.keys(p[2]).forEach(function (k) { ply.layerState.set(k, p[2][k]); });
            ply.layerState.save();
            tzLayersPaintLayerButtons(ply);
            if (ply.data.st()) ply.shell.renderMap();
          }), p[1]));
        });
        ply.presetsBox.appendChild(r4);
        ply.viewBox.appendChild(tzEl("div", "tzm-lg", i18nT('zonesPage.clamps_cnc')));
        ply.viewBox.appendChild(tzTip(tzBtn(ply.layerState.clampsOn() ? i18nT('zonesPage.use_clamps_yes') : i18nT('zonesPage.use_clamps_no'), ply.layerState.clampsOn() ? "primary" : null, function () {
          ply.layerState.setClampsOn(!ply.layerState.clampsOn());
          tzLayersPaintView(ply);
          tzLayersPaintLayerButtons(ply);
          if (ply.data.st()) ply.shell.renderMap();
        }), i18nT('zonesPage.mark_clamps_screws_or_stops_on')));
        if (ply.layerState.clampsOn()) {
          // nothing is drawn until one is marked: say so instead of leaving a switch that seems to do nothing
          var nClamps = ply.data.clamps ? ply.data.clamps().length : 0;
          ply.viewBox.appendChild(tzEl("div", "tz-muted", nClamps ? i18nT('zonesPage.n_clamps_marked', { n: nClamps }) : i18nT('zonesPage.no_clamps_marked_yet')));
        }
        if (ply.rotBtn) {
          ply.rotBtn.classList.toggle("primary", !!ply.view.mapRot() || ply.view.mapMirror());
          var ang = ply.rotBtn.querySelector(".tzm-ang");
          if (ang) ang.textContent = ply.view.mapRot() ? ply.view.mapRot() + "°" : "";
          else ply.rotBtn.textContent = ply.view.mapRot() ? i18nT('zonesPage.rotate', { mapRot: ply.view.mapRot() }) : i18nT('zonesPage.rotate_2');
        }
        if (ply.normBtn) ply.normBtn.style.display = ply.view.mapRot() || ply.view.mapMirror() ? "" : "none";
      }

