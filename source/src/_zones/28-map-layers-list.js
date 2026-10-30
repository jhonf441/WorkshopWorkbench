      // ---- Workbench page, part 9: the rows of the layers panel, made when the page builds the map ----
      // The page calls these where it used to make the elements (the order of the DOM does not change).

      function tzLayersMountList(ply) {
        var TZ_LAYER_GROUPS = [
          [i18nT('zonesPage.machine'), [
            ["head", i18nT('common.head'), "#ffffff", i18nT('zonesPage.cross_pointer_red_dot_where_the')],
            ["probe", i18nT('common.probe_bltouch'), "#66bb6a", i18nT('zonesPage.where_the_probe_touches_head_g31')],
            ["travel", i18nT('zonesPage.travel'), "#9e9e9e", i18nT('zonesPage.how_far_the_axes_reach_m208')],
            ["photoBed", i18nT('zonesPage.bed_photo'), "#a1887f", i18nT('zonesPage.the_photo_of_the_whole_bed')],
            ["ruler", i18nT('zonesPage.ruler'), "#bdbdbd", i18nT('zonesPage.mm_on_the_edges_adapts_to')],
          ]],
          [i18nT('zonesPage.cut_areas'), [
            ["areaLaser", "Laser", TZ_AREA_COLORS.Laser, ""],
            ["areaCNC", "CNC", TZ_AREA_COLORS.CNC, i18nT('zonesPage.the_one_of_the_active_mode')],
          ]],
          [i18nT('common.zones'), [
            ["zones", i18nT('common.zones'), "#90caf9", i18nT('zonesPage.rectangle_material_if_it_has_a')],
            ["zpoint", i18nT('zonesPage.z_point'), "#e040fb", i18nT('zonesPage.where_the_probe_measures_in_the')],
            ["clamps", i18nT('zonesPage.clamps'), "#ef5350", i18nT('zonesPage.clamps_screws_or_stops_warns_if')],
            ["offcuts", i18nT('zonesPage.offcuts'), "#c8a878", i18nT('zonesPage.leftover_material_pieces_the_laser_editor')],
            ["refs", i18nT('zonesPage.references'), "#80cbc4", i18nT('zonesPage.centres_and_corners_the_taps_snap')],
            ["positions", i18nT('zonesPage.positions'), "#ffcc80", i18nT('zonesPage.saved_positions_of_the_jog')],
          ]],
          [i18nT('zonesPage.image'), [
            ["camera", i18nT('cuts.camera'), "#b39ddb", i18nT('zonesPage.camera_video_under_the_map_it')],
            ["vision", "Vision", "#76ff03", i18nT('zonesPage.what_the_vision_page_detected_pieces')],
          ]],
        ];
        var TZ_LAYER_LIST = [];
        // the camera, the bed photo and the Vision detections come from the Vision plugin. The rows are always built and
        // shown or hidden live (paintLayerBtns): the page can be built before the Vision plugin registers its route, and
        // then the camera stayed on from the saved layers with no button to turn it off (2026-10-15).
        var TZ_VISION_LAYERS = ["camera", "photoBed", "vision"];
        ply.visionRows = [];
        TZ_LAYER_GROUPS.forEach(function (gr) {
          TZ_LAYER_LIST.push({ group: gr[0], vision: gr[1].every(function (it) { return TZ_VISION_LAYERS.indexOf(it[0]) >= 0; }) });
          gr[1].forEach(function (it) { TZ_LAYER_LIST.push({ it: it }); });
        });
        TZ_LAYER_LIST.forEach(function (row) {
          if (row.group) {
            var gThe = tzEl("div", "tzm-lg", row.group);
            if (row.vision) ply.visionRows.push(gThe);
            return ply.shell.layerPanel().appendChild(gThe);
          }
          var it = row.it;
          var b = tzEl("button", "tzm-layer");
          b.type = "button";
          b.title = i18nT('zonesPage.show_hide_on_the_map', { it: it[1] });
          b.style.borderLeft = "4px solid " + it[2];
          b.addEventListener("click", function () {
            ply.layerState.set(it[0], !ply.layerState.layers()[it[0]]);
            ply.layerState.save();
            tzLayersPaintLayerButtons(ply);
            if (it[0] === "camera") {
              ply.camera.setForced(!!ply.layerState.layers().camera && ply.data.jobRunning());
              ply.camera.map().sync();
            }
            ply.toggleListeners.forEach(function (fn) { fn(it[0]); }); // the person chose it (the tools let go of the Camera tool)
            if (ply.data.st()) ply.shell.renderMap();
          });
          ply.layerButtons[it[0]] = { el: b, label: it[1] };
          ply.shell.layerPanel().appendChild(b);
          var itDesc = it[3] ? tzEl("div", "tzm-ld", it[3]) : null;
          if (itDesc) ply.shell.layerPanel().appendChild(itDesc);
          if (TZ_VISION_LAYERS.indexOf(it[0]) >= 0) {
            ply.visionRows.push(b);
            if (itDesc) ply.visionRows.push(itDesc);
          }
        });
        tzLayersPaintLayerButtons(ply);
        // Quick transparency of the camera video (2026-10-10: "the camera
        // appears very big and covers a lot of area"): per screen, it takes precedence over
        // Vision's.
        ply.cameraOpBox = tzEl("div", "tz-row");
        ply.cameraOpBox.style.cssText += "gap:4px;margin:2px 0 6px 22px;flex-wrap:wrap;";
        // Where the camera is mounted (bridge or carriage), 2026-10-10: saved by the
        // Vision service (vision.post /config); changing it asks for recalibration.
        ply.cameraAssemblesBox = tzEl("div");
        ply.cameraAssemblesBox.style.cssText = "margin:0 0 8px 22px;";
      }

      function tzLayersMountBoxes(ply) {
        if (ply.layerButtons.camera) {
          var cameraLd = ply.layerButtons.camera.el.nextSibling;
          ply.shell.layerPanel().insertBefore(ply.cameraOpBox, cameraLd ? cameraLd.nextSibling : ply.layerButtons.camera.el.nextSibling);
          ply.shell.layerPanel().insertBefore(ply.cameraAssemblesBox, ply.cameraOpBox.nextSibling);
          tzLayersPaintCameraOp(ply);
          tzLayersReadCameraAssembles(ply);
        }
        // 2026-10-11 ("layers has other things; there should be something apart for
        // the style settings"): Layers = only what is seen (with the layers listed
        // at the top); view, theme, background and presses go to the Map settings button.
        ply.viewBox = tzEl("div");
        ply.presetsBox = tzEl("div");
        ply.shell.layerPanel().insertBefore(ply.presetsBox, ply.shell.layerPanel().firstChild);
        ply.TZ_PRESETS = [
          [i18nT('job.job'), i18nT('zonesPage.just_what_you_need_to_cut'), { ruler: true, travel: true, areaLaser: true, areaCNC: true, zones: true, clamps: true, positions: false, refs: false, zpoint: true, head: true }],
          [i18nT('zonesPage.calibration'), i18nT('zonesPage.everything_useful_for_measuring_references'), { ruler: true, travel: true, areaLaser: true, areaCNC: true, zones: true, clamps: true, positions: true, refs: true, zpoint: true, head: true }],
          [i18nT('zonesPage.clean'), i18nT('zonesPage.bed_zones_head_probe_z_point'), TZ_LAYERS_CLEAN],
          [i18nT('zonesPage.minimal'), i18nT('zonesPage.only_zones_and_head_small_screens'), { ruler: false, travel: true, areaLaser: false, areaCNC: false, zones: true, clamps: true, positions: false, refs: false, zpoint: false, head: true }],
        ];
        ply.rotBtn = null;
        ply.normBtn = null;
      }

      // Rotate and normal view, in the view group of the map bar before `before`
      function tzLayersMountViewButtons(ply, grp, before) {
        ply.rotBtn = tzBtn(i18nT('zonesPage.rotate_2'), null, function () { ply.view.setView({ rot: (ply.view.mapRot() + 90) % 360 }); });
        tzTip(ply.rotBtn, i18nT('zonesPage.rotates_the_map_90_per_tap'));
        grp.insertBefore(ply.rotBtn, before);
        // with the map rotated/mirrored: a clearly visible button to go back
        ply.normBtn = tzBtn(i18nT('zonesPage.normal_view'), "warn", function () { ply.view.setView({ rot: 0, mirror: false }); });
        tzTip(ply.normBtn, i18nT('zonesPage.puts_the_map_back_to_the'));
        grp.insertBefore(ply.normBtn, before);
        tzLayersPaintView(ply);
      }
