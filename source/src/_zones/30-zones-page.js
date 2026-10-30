      // ---- Page "Mesa de trabajo" (WorkshopWorkbench): orchestrator (header, tabs, layout, life cycle) ----
      // Stage 3 of the redesign (docs-internal/PLAN-EJECUCION-REDESIGN.md) split this file. tzMountPage keeps what ties the page
      // together; the rest is in parts, each one with its own state and an interface made by tz<Part>Create(deps) (step 6 of the
      // restructuring, docs-internal/INTERFACES.md). tzPagParts creates them bottom up, so a part only depends on the ones made before:
      //   22-page-shell.js        containers, alive, timers, redraw requests   22-page-nav.js        open tab, tab modules, layMod
      //   22-page-layer-state.js  which layers are seen                        23-zone-data.js       data and files of the machine
      //   24-map-camera.js        camera layer of the map                      26-map-view.js        matrix, zoom, minimap, size
      //   28-map-snap.js          references and magnet                        25-job-focus.js       the running job on the map
      //   29-zones-table.js       zone table, editor, positions                24-cut-area.js        cut area card
      //   28-map-layers.js        layers panel                                 28-map-tools.js       tools, pop-ups and taps of the map
      //   27-map-dock.js          icon toolbar of the map                      33-space.js           step bar, status bar, inspector
      //   31-map-render.js        drawing of the map
      //   23-zone-format.js zone file format (pure); 22-ui-style.js / 22-ui-base.js CSS and UI helpers
      // The page itself is the state pz of this file and 30-zones-page-*.js: it keeps the interfaces of the parts and what is its own.

      // The pages built on the bed map, one per plugin: title, route, menu key, saved layout key and the tabs grouped by function.
      // Every group is [label, tabs, step] (step = TZ_STEPS_TOOLS of 20-mode-profile.js). Both plugins carry this table, so a
      // tab of the other page is known even when its code is not loaded: goLayout to it opens that page (tzGoOtherPage).
      //   zones   -> WorkshopWorkbench: work zone, design and cut (the code of every tab is in src/_zones)
      //   machine -> WorkshopMachine (a Vue plugin since 2026-10-21; the old tabs are gone from here): kept only so that the
      //              Workbench knows its route and opens it (tzGoOtherPage), e.g. from the active zone card
      var TZ_PAGES = {
        zones: {
          title: i18nT('zonesPage.workbench'),
          titleKey: 'zonesPage.workbench', // the menu caption is an i18n KEY (DWC translates it; a literal text made vue-i18n warn on 3.7)
          path: "/Plugins/Workbench",
          menuKey: "WorkshopZones",
          key: "workshopZonesLayout",
          defaultValue: "zones", // fallback; the page opens on initial.idle / initial.job (tzInitialTab, 34-steps.js)
          initial: { idle: "prepare", job: "job" },
          plugin: "WorkshopWorkbench",
          // 2026-10-18: the tabs are grouped by function (work zone / design and cut) and each one exists only in the modes
          // that have it (20-mode-profile.js)
          groups: [
            [i18nT('profile.group_area'), ["prepare", "zones", "materials", "area", "center"], 1],
            [i18nT('profile.group_design'), ["cuts", "large", "simulate", "job"], 2],
          ],
        },
        machine: {
          title: i18nT('profile.group_machine'),
          titleKey: 'profile.group_machine',
          path: "/Plugins/Machine",
          menuKey: "WorkshopMachine",
          key: "workshopMachineLayout",
          defaultValue: "calibrate",
          minRole: "technician", // the whole page is the technician's: another role sees a message (30-zones-page-role.js)
          plugin: "WorkshopMachine",
          groups: [
            [i18nT('profile.group_machine'), ["calibrate", "level", "mesh"], 3],
          ],
        },
      };
      Object.keys(TZ_PAGES).forEach(function (k) {
        var pg = TZ_PAGES[k];
        pg.layouts = [].concat.apply([], pg.groups.map(function (g) { return g[1]; }));
      });

      // The page (key of TZ_PAGES) that has the tab l, other than the page `own`; null if none.
      function tzPageOfTab(l, own) {
        var ks = Object.keys(TZ_PAGES);
        for (var i = 0; i < ks.length; i++) {
          if (TZ_PAGES[ks[i]] !== own && TZ_PAGES[ks[i]].layouts.indexOf(l) !== -1) return ks[i];
        }
        return null;
      }

      // Mounts the page inside `root` (called by the route's Vue component).
      // Returns {destroy} for when the user leaves the page.
      function tzMountPage(root, opts) {
        var pz = {};
        opts = opts || {};
        // the parts of the page (docs-internal/INTERFACES.md): the shell first, the others bottom up in tzPagParts
        pz.shell = tzShellCreate();
        pz.tzAddTab = function (it) { return tzAddTab(pz, it); };
        pz.tzMarkGroups = function (mode) { return tzMarkGroups(pz, mode); };
        // shows the cards of the open tab (nav.apply() and every change of tab call it)
        pz.applyLayout = function () { return tzApplyLayout(pz); };
        // Vision saved something (calibration, detections): the camera layer rereads its config and the map is drawn again
        pz.onVision = function () { pz.camera.map().reload(); if (pz.data.st()) pz.shell.renderMap(); };
        // height of DWC's bar (the map sticks right below it)
        pz.wsTop = pz.shell.wsTop;
        pz.wsLayout = function () { return tzWsLayout(pz); };
        // the page is built in this order (each step uses what the ones before left in pz)
        [
          tzPagParts,
          tzPagHeader,
          tzPagTabs,
          tzPagAccesores,
          tzPagMapSetup,
          tzPagLayersList,
          tzPagLayersButtons,
          tzPagTable,
          tzPagModules,
          tzPagOtherMode,
          tzPagHelpTexts,
          tzPagHelpPaint,
          tzPagApplyLayout,
          tzPagPanelZones,
          tzPagMap,
          tzPagMapEvents,
          tzPagCamera,
          tzPagButtonsMap,
          tzPagDock,
          tzPagPointers,
          tzPagTimers,
          tzPagRole,
          tzPagGate,
        ].forEach(function (part) {
          part(pz, root, opts);
        });
        // the stored last view is a tab of the other plugin's page (tzPagHeader): open it there once this page is mounted
        if (pz.openOther) setTimeout(function () { if (pz.shell.alive()) pz.nav.goLayout(pz.openOther); }, 0);
        return {
          destroy: function () {
            pz.shell.close();
            TZ_MODULES_EXTRA.forEach(function (m) {
              if (pz.moduleOn && !pz.moduleOn[m.id]) return; // the view never had it
              try {
                if (typeof m.destroy === "function") m.destroy(pz.host, pz.moduleApis[m.id]);
              } catch (e) {
                console.error("[Workbench] the module " + m.id + " failed while closing", e);
              }
              pz.moduleApis[m.id] = null; // a right click after leaving the page reaches no module
            });
            if (pz.unRole) pz.unRole();
            window.removeEventListener("workshop-vision", pz.onVision);
            pz.camera.map().sync(); // cuts the map camera's video
            pz.timers.forEach(clearInterval);
            var tip = pz.shell.mapTip();
            if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
          },
        };
      }

      // Route registration in DWC: the same API the compiled plugins use
      // (WorkshopService does registerRoute the same way). Minimal Vue component with a
      // render function (DWC's Vue runtime build does not compile templates)
      // that mounts the page in its div. Each plugin calls it with its page
      // Own try/catch: if DWC
      // changed this API, the rest of the plugin has to keep working.
      function tzRegisterPage(page, icono) {
        var pg = TZ_PAGES[page];
        pg.icon = icono; // also in the page header
        var key = pg.menuKey;
        try {
          var menu = { Plugins: {} };
          menu.Plugins[key] = { icon: icono, caption: "plugins." + PLUGIN_ID + "." + pg.titleKey, path: pg.path };
          workshopHostRegisterPage(
            {
              name: key + "Page",
              mount: function (el, router) { return tzMountPage(el, { page: page, router: router }); },
              destroy: function (handle) { handle.destroy(); },
            },
            menu
          );
        } catch (e) {
          console.error("[" + PLUGIN_ID + "] could not register the page " + pg.title + ":", e);
        }
      }

