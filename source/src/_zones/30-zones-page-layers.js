      function tzPagMapSetup(pz, root, opts) {
        pz.tools.mountPopup();
        pz.layerBar = tzEl("div", "tzm-grp"); // zoom (the buttons are added further below)
        pz.mapBar.appendChild(pz.layerBar);
        pz.viewGrp = tzEl("div", "tzm-grp");
        pz.mapBar.appendChild(pz.viewGrp);
        // Map camera (39-camera-map.js): it is configured and calibrated on the
        // Vision page; here only the Camera layer (eye).
        pz.camera.mount(pz.P, root);
      }

      function tzPagLayersList(pz, root, opts) {
        pz.layers.mountList();
      }

      function tzPagLayersButtons(pz, root, opts) {
        pz.layers.mountBoxes();
        var legend = tzEl(
          "div",
          "tz-muted",
          i18nT('zonesPage.ruler_mm_on_the_edges_of')
        );
        legend.style.marginTop = "6px"; // (the legend now goes in the layers panel)
        // --- editor ---
        // Below the map: Active zone on the left and the editor on the right.
        var zaRow = tzEl("div", "tz-row");
        pz.mainCol.appendChild(zaRow);
        pz.activeCard.style.cssText += "flex:1 1 380px;min-width:290px;";
        zaRow.appendChild(pz.activeCard);
        pz.sideCol = tzEl("div");
        pz.sideCol.style.cssText = "flex:1 1 380px;min-width:290px;display:flex;flex-direction:column;gap:12px;";
        zaRow.appendChild(pz.sideCol);
        var edCard = pz.table.buildEditorCard();
        pz.sideCol.appendChild(edCard);
        // --- table ---
        // Saved positions (before only in the jog): list, go, save the
        // current one, rename, update with the pointer and delete. The same file
        // as the jog (16-positions.js).
        pz.table.buildPositionsCard();
        workshopPosListeners.push(function (list) {
          if (pz.tools.posPick() !== null) pz.tools.closePosPop();
          pz.data.setSavedPos(list);
          pz.table.renderPositions();
          if (pz.data.st()) pz.shell.renderMap();
        });
        pz.tableCard = tzEl("div", "tz-card wf-card");
        pz.tableCard.style.marginTop = "12px";
        pz.page.appendChild(pz.tableCard);
        // title, then the note (what the laser offset is doing), then the buttons: text and controls never share a line
        pz.tableCard.appendChild(tzEl("h3", null, i18nT('common.zones')));
        pz.offsetInfo = tzEl("div", "tz-muted tz-note", "");
        pz.tableCard.appendChild(pz.offsetInfo);
        var tableHead = tzEl("div", "tz-row tz-actions");
        pz.tableCard.appendChild(tableHead);
        tableHead.appendChild(
          tzBtn(i18nT('tzTips.l_new_zone'), "primary", function () {
            pz.table.openEditor("new");
          })
        );
        tableHead.appendChild(tzBtn(i18nT('tzTips.l_export_json'), null, pz.data.exportJson));
        var importInput = document.createElement("input");
        importInput.type = "file";
        importInput.accept = ".json,application/json";
        importInput.style.display = "none";
        importInput.addEventListener("change", function () {
          if (importInput.files && importInput.files[0]) pz.data.importJson(importInput.files[0]);
          importInput.value = "";
        });
        pz.tableCard.appendChild(importInput);
        tableHead.appendChild(
          tzBtn(i18nT('zonesPage.import_json'), null, function () {
            importInput.click();
          })
        );
        pz.tableWrap = pz.table.buildTableWrap();
      }

      function tzPagTable(pz, root, opts) {
        pz.tableCard.appendChild(pz.tableWrap);
        pz.tableCard.appendChild(pz.shell.buildPageMessage());
        // --- cutting area (measure / edit) -- session system32-69 ---
        // The same logic as the jog panel's assistant, via 15-cutarea.js
        // (sole writer of sys/workshop/zones/cutarea.g). Three ways to measure:
        //   pointer: take the POINTER to each corner with the jog and capture
        //   laser:   ditto with the laser spot (converted with the
        //            active zone's correction: point = head - correction)
        //   by hand: release X/Y motors, move by hand, the machine measures
        //            by itself against the end stops (sys/workshop/macros/handcorner.g)
        // and also direct numeric editing. While measuring, the map
        // shows corner 1 and the rectangle up to the head (see
        // drawCutPreview, called from renderMap).
        var cutCard = pz.cutArea.buildCard();
        cutCard.style.marginTop = "12px";
        pz.page.insertBefore(cutCard, pz.tableCard);
        pz.table.positionsCard().style.marginTop = "12px";
        pz.page.insertBefore(pz.table.positionsCard(), cutCard);
        pz.cutsCard = tzEl("div", "tz-card wf-card");
        pz.cutsCard.style.marginTop = "12px";
        pz.page.insertBefore(pz.cutsCard, cutCard);
        pz.centerCard = tzEl("div", "tz-card wf-card");
        pz.centerCard.style.marginTop = "12px";
        pz.page.insertBefore(pz.centerCard, pz.cutsCard);
        pz.nav.setModule("cuts", tcMountCuts(tzCreateCtx(pz.P, "cuts", {
          card: pz.cutsCard,
          centerCard: pz.centerCard,
          map: {
            svgBox: function () { return pz.shell.svgBox(); }, // the box of the map: the drawing tools sit over it (42-cuts-floating.js)
            camera: {
              hasVision: function () { return pz.camera.map().hasVision() === true; },
              // Find center with the camera as an assistant (2026-10-10): calibrated
              // and enabled for Zones / visible now on the map / turn it on
              usable: function () { return !!pz.camera.map().hasCalibration(); },
              shown: function () { return !!pz.layerState.layers().camera && !!pz.camera.map().hasCalibration() && !pz.camera.map().notice(); },
              notice: function () { return pz.camera.map().notice() || ""; },
              turnon: function () {
                if (!pz.layerState.layers().camera && pz.layers.hasLayer("camera")) pz.layers.clickLayer("camera");
              },
            },
          },
          // opens Zones > Positions (the list of saved positions)
          nav: { viewPositions: function () { pz.nav.goLayout("zones"); pz.nav.chooseZSub("positions"); } },
          visible: function () { return pz.nav.layout() === "cuts" || pz.nav.layout() === "center"; },
        })));
        // Layout "Trabajo": recorrido del trabajo en curso (47-job.js).
        pz.jobCard = tzEl("div", "tz-card wf-card");
        pz.jobCard.style.marginTop = "12px";
        pz.page.insertBefore(pz.jobCard, pz.centerCard);
        pz.nav.setModule("job", tjMountJob(tzCreateCtx(pz.P, "job", {
          card: pz.jobCard,
          // also with a job in progress: the focus mode draws the path in
          // any tab
          visible: function () { return pz.nav.layout() === "job" || pz.data.jobRunning(); },
        })));
        // Trabajo > "Ver, simular y enmarcar" a file of 0:/gcodes (49-jobs-view.js)
        pz.tvCard = tzEl("div", "tz-card wf-card");
        pz.tvCard.style.marginTop = "12px";
        pz.page.insertBefore(pz.tvCard, pz.jobCard.nextSibling);
        pz.nav.setModule("tvista", tvMount(tzCreateCtx(pz.P, "simulate", {
          card: pz.tvCard,
          // "Clean the table": the preview and the path of the last job are taken off the map (nothing is deleted)
          nav: { cleanWorkbench: function () { pz.nav.module("job").hide(); pz.nav.module("tvista").remove(); } },
        })));
        // Layout "Materiales" (36-materials.js) y "Preparar" (38-prepare.js).
        pz.materialsCard = tzEl("div", "tz-card wf-card");
        pz.materialsCard.style.marginTop = "12px";
        pz.page.insertBefore(pz.materialsCard, pz.jobCard);
        pz.materials = tmatMountPage(tzCreateCtx(pz.P, "materials", { card: pz.materialsCard }));
        pz.prepareCard = tzEl("div", "tz-card wf-card");
        pz.prepareCard.style.marginTop = "12px";
        pz.page.insertBefore(pz.prepareCard, pz.mainCol.parentNode);
      }
