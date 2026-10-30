      function tzToolSetTool(pmt, t) {
        var before = pmt.mapTool;
        pmt.mapTool = t;
        try {
          localStorage.setItem(pmt.TZM_TOOL_KEY, t);
        } catch (e) {
          /* no critico */
        }
        var dec = tzChooseTool(TZ_TOOLS_MAP, before, t, { layerCamera: !!pmt.layerState.layers().camera, hasButtonLayer: pmt.layers.hasLayer("camera"), layerByTool: pmt.cameraLayerByTool });
        if (dec.cleanMeasure) pmt.measure = null;
        pmt.cameraTool.target = null;
        pmt.cameraTool.drag = null;
        // the Camera tool needs to see the image: it turns the layer on
        if (dec.layerCamera === "turnon") {
          pmt.layers.clickLayer("camera");
          pmt.cameraLayerByTool = true;
        } else if (dec.layerCamera === "restore") {
          pmt.cameraLayerByTool = false;
          pmt.layers.clickLayer("camera");
        }
        tzToolClosePosPop(pmt);
        tzToolPaintTools(pmt);
        if (pmt.data.st()) pmt.shell.renderMap();
      }

      function tzToolPaintTools(pmt) {
        var dis = !!pmt.nav.layMod();
        Object.keys(pmt.toolButtons).forEach(function (k) {
          pmt.toolButtons[k].classList.toggle("primary", k === pmt.mapTool && !(k === "camera" && pmt.cameraTool && pmt.cameraTool.live));
          pmt.toolButtons[k].classList.toggle("tzm-live", k === "camera" && k === pmt.mapTool && !!(pmt.cameraTool && pmt.cameraTool.live));
          pmt.toolButtons[k].disabled = dis && k !== "camera";
        });
        pmt.shell.toolGrp().title = dis ? i18nT('zonesPage.in_this_tab_the_map_taps') : "";
      }

