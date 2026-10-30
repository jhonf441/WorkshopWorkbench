      // ---- Workbench page, part 6: the elements and handlers of the tools that the page puts in place ----
      // The page calls the mounts where it used to make each element (the order of the DOM does not change) and registers the handlers.

      // The pop-up of the map. Tapping a DIAMOND (saved position) in the Zones tab: notice with
      // "Go to <name>" (asks for a second tap). Request 2026-10-09.
      function tzToolMountPopup(pmt) {
        pmt.posPick = null; // indice en savedPos
        pmt.ptPick = null; // {x, y, name} punto tocado en el mapa (referencia o libre)
        pmt.posPop = tzEl("div");
        pmt.posPop.style.cssText =
          "position:absolute;z-index:5;display:none;background:#263238;border:1px solid #ffcc80;border-radius:8px;padding:8px;box-shadow:0 4px 14px rgba(0,0,0,0.6);min-width:180px;";
        pmt.shell.svgBox().appendChild(pmt.posPop);
      }

      // The buttons of the tools (see / point / measure / camera) and the point assistant, in the tool group of the map bar
      function tzToolMountButtons(pmt) {
        // ---- Herramientas del mapa ----
        pmt.TZM_TOOL_KEY = "workshopMapTool";
        pmt.mapTool = "point";
        try {
          var lt = localStorage.getItem(pmt.TZM_TOOL_KEY);
          if (lt === "see" || lt === "point" || lt === "measure" || lt === "camera") pmt.mapTool = lt;
        } catch (e) {
          /* default */
        }
        pmt.measure = null;
        pmt.toolButtons = {};
        var toolBefore = null;
        [
          ["see", i18nT('common.view'), i18nT('zonesPage.tapping_the_map_does_nothing_only')],
          ["point", i18nT('common.point'), i18nT('zonesPage.tapping_the_map_opens_that_point')],
          ["measure", i18nT('common.measure'), i18nT('zonesPage.tap_two_points_distance_dx_dy')],
          ["camera", i18nT('cuts.camera'), i18nT('zonesPage.shows_the_camera_and_its_panel')],
        ].forEach(function (t) {
          var b = tzBtn(t[1], null, function () {
            // Camera: one tap opens it and another closes it (back to the previous tool)
            if (t[0] === "camera" && pmt.mapTool === "camera") tzToolSetTool(pmt, toolBefore && toolBefore !== "camera" ? toolBefore : "see");
            else {
              if (t[0] === "camera") toolBefore = pmt.mapTool;
              tzToolSetTool(pmt, t[0]);
            }
          });
          tzTip(b, t[2]);
          pmt.toolButtons[t[0]] = b;
          pmt.shell.toolGrp().appendChild(b);
        });
        var asistBtn = tzTip(tzBtn(i18nT('zonesPage.points_assistant'), null, function () {
          pmt.wizardPoints = !pmt.wizardPoints;
          asistBtn.classList.toggle("primary", pmt.wizardPoints);
          if (!pmt.wizardPoints) tzToolClosePosPop(pmt);
        }), i18nT('zonesPage.points_assistant_tip'));
        pmt.shell.toolGrp().appendChild(asistBtn);
        // true while the camera layer is on only because the Camera tool needed it: leaving the tool turns it off again
        pmt.cameraLayerByTool = false;
        // ---- Camera tool (2026-10-10: "I want to be able to drag the camera
        // image over the work zones; if necessary move the
        // machine"). The camera is on the BRIDGE: it only moves in Y (drag or
        // tap) and in Z (more area / more detail). Always with confirmation and
        // through sys/workshop/macros/visionpose.g (Z goes up first, S0, never below Z40).
        pmt.CAMERA_ZMIN = 40;
        pmt.cameraTool = { target: null, drag: null, swallow: false, msg: "", pinch: null, zAcc: 0, zTimer: null, wheelView: false };
        // Live (2026-10-10): drag / wheel / tap move the machine
        // directly, without the Move notice. One order at a time; if more arrive
        // while moving, the last one goes.
        pmt.cameraTool.live = false;
        try { pmt.cameraTool.live = localStorage.getItem("workshopCameraLive") === "1"; } catch (e) { /* no */ }
        pmt.cameraTool.inProgress = false;
        pmt.cameraTool.sig = null;
        try { pmt.cameraTool.wheelView = localStorage.getItem("workshopCameraWheelView") === "1"; } catch (e) { /* no critico */ }
      }

      // Z buttons (more area / more detail), top left of the map
      // Camera panel (2026-10-10, "its block covers a lot of work
      // area"): it no longer floats over the map, it is a strip under the work
      // bar that appears only with the Camera open.
      function tzToolMountCameraStrip(pmt) {
        pmt.cameraZBox = tzEl("div", "tzm-camstrip");
      }

      // The capture of a drag was lost without a pointerup: the drag is cancelled
      function tzToolLostDrag(pmt) {
        if (pmt.dragEdit) {
          pmt.dragEdit = null;
          if (pmt.data.st()) pmt.shell.renderMap();
        }
      }

      function tzToolCameraLostCapture(pmt, ev) {
        if (pmt.cameraTool.drag && ev.pointerId === pmt.cameraTool.drag.id) {
          pmt.cameraTool.drag = null;
          pmt.cameraTool.pinch = null;
          pmt.cameraTool.sig = null;
          tzToolPlaceCameraTool(pmt);
        }
      }

      // Escape cancels the measure
      function tzToolEscape(pmt, ev) {
        if (!pmt.shell.alive()) return;
        if (ev.key === "Escape" && pmt.measure) {
          pmt.measure = null;
          tzToolPlaceMeasure(pmt);
          tzToolPaintStatus(pmt);
        }
      }

      // The person turned layer k on or off
      function tzToolLayerToggled(pmt, k) {
        if (k !== "camera") return;
        pmt.cameraLayerByTool = false; // the user chose it: the tool no longer owns it
        // the Camera tool needs the image: with the layer off the tool (and its strip) goes away too
        if (!pmt.layerState.layers().camera && pmt.mapTool === "camera") tzToolSetTool(pmt, "point");
      }
