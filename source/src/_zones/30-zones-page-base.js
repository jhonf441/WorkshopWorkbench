      function tzPagParts(pz, root, opts) {
        pz.pag = TZ_PAGES[opts.page] || TZ_PAGES.zones;
        // HOOK etapa 6/7: the tools registered by later stages (tzRegisterTool, 20-mode-profile.js) join the group of their step;
        // a page with no group of that step does not get the tool
        TZ_TOOLS_EXTRA.forEach(function (d) {
          var g = pz.pag.groups.filter(function (gr) { return gr[2] === d.step; })[0];
          if (!g) return;
          if (g[1].indexOf(d.id) < 0) g[1].push(d.id);
          if (pz.pag.layouts.indexOf(d.id) < 0) pz.pag.layouts = pz.pag.layouts.concat([d.id]);
        });
        pz.extraTools = TZ_TOOLS_EXTRA.filter(function (d) { return pz.pag.layouts.indexOf(d.id) !== -1; }); // the registered tools of this page
        pz.nav = tzNavCreate(pz.pag, opts.router || null);
        pz.nav.onApply(pz.applyLayout);
        pz.layerState = tzLayerStateCreate();
        pz.data = tzDataCreate({ shell: pz.shell, nav: pz.nav, layerState: pz.layerState });
        pz.camera = tzCameraCreate({ shell: pz.shell, layerState: pz.layerState, data: pz.data });
        pz.view = tzViewCreate({ shell: pz.shell, data: pz.data });
        pz.snap = tzSnapCreate({ shell: pz.shell, nav: pz.nav, layerState: pz.layerState, data: pz.data, view: pz.view });
        pz.jobFocus = tzFocusCreate({ shell: pz.shell, nav: pz.nav, layerState: pz.layerState, data: pz.data, camera: pz.camera, view: pz.view });
        pz.table = tzTableCreate({ nav: pz.nav, data: pz.data });
        pz.cutArea = tzAreaCreate({ shell: pz.shell, nav: pz.nav, data: pz.data, snap: pz.snap });
        pz.layers = tzLayersCreate({ shell: pz.shell, layerState: pz.layerState, data: pz.data, camera: pz.camera, view: pz.view });
        pz.tools = tzToolCreate({ shell: pz.shell, nav: pz.nav, layerState: pz.layerState, data: pz.data, camera: pz.camera, view: pz.view, snap: pz.snap, table: pz.table, cutArea: pz.cutArea, layers: pz.layers });
        pz.dock = tzDockCreate({ shell: pz.shell, nav: pz.nav, layerState: pz.layerState, data: pz.data, view: pz.view, layers: pz.layers, tools: pz.tools });
        pz.space = tzSpaceCreate({ shell: pz.shell, nav: pz.nav, data: pz.data });
        tzMapCreate({ shell: pz.shell, nav: pz.nav, layerState: pz.layerState, data: pz.data, camera: pz.camera, view: pz.view, snap: pz.snap, jobFocus: pz.jobFocus, cutArea: pz.cutArea, layers: pz.layers, tools: pz.tools });
        pz.shell.onRender(function () { tzPagRender(pz); });
        tzInjectStyle();
      }

      function tzPagHeader(pz, root, opts) {
        pz.timers = pz.shell.timers();
        pz.moduleApis = {}; // what the registered modules returned (agility, stage 5: palette, shortcuts, undo, command menu: 58-agility-link.js)
        pz.shell.buildPage(root);
        pz.page = pz.shell.page();
        pz.header = pz.shell.header();
        // the page bar of the family (wf-bar): badge with the icon of the Plugins menu, title, one line that says what the page is for, and
        // on the right the mode and the live state of the machine
        var badge = tzEl("span", "wf-badge");
        badge.appendChild(tzEl("span", "wf-badge-icon mdi mdi-" + String(pz.pag.icon || "vector-square").replace(/^mdi-/, "")));
        pz.header.appendChild(badge);
        var txt = tzEl("div", "wf-bar-txt");
        var title = tzEl("div", "wf-title", pz.pag.title);
        title.setAttribute("role", "heading"); // QA-11: the page title was a plain div (no headings in the page)
        title.setAttribute("aria-level", "1");
        txt.appendChild(title);
        txt.appendChild(tzEl("div", "wf-lead", i18nT('zonesPage.workbench_lead')));
        pz.header.appendChild(txt);
        pz.headRight = tzEl("div", "wf-bar-right");
        pz.header.appendChild(pz.headRight);
        pz.modeChip = tzEl("span", "wf-pill tz-chip-mode", "");
        pz.modeChip.style.display = "none";
        pz.headRight.appendChild(pz.modeChip);
        // Layout: "zonas" (editor + table + cutting area) or "cuts" (simple
        // shapes and find centers). The map is the same in both.
        pz.TZ_LAYOUT_KEY = pz.pag.key;
        pz.nav.setLayout(tzInitialTab(pz.pag, "?", null, null));
        pz.layoutRemembered = false; // true when the last view stored is valid: it wins over the state of the machine
        try {
          var lsLay = localStorage.getItem(pz.TZ_LAYOUT_KEY);
          if (pz.pag.layouts.indexOf(lsLay) !== -1) { pz.nav.setLayout(lsLay); pz.layoutRemembered = true; }
          else if (tzPageOfTab(lsLay, pz.pag)) {
            // the stored view is a tab of the other plugin's page (e.g. the Machine tabs that were here until 2026-10-21, or a link
            // that stored it): this page keeps its default and that page is opened once this one is mounted (tzMountPage)
            localStorage.setItem(pz.TZ_LAYOUT_KEY, pz.nav.layout());
            pz.openOther = lsLay;
          }
        } catch (e) {
          /* default */
        }
        // review #12: another plugin sent the person here with ?layout=<tab> (route query): it wins over the remembered view
        var qLay = pz.nav.queryLayout();
        if (qLay) { pz.nav.setLayout(qLay); pz.layoutRemembered = true; }
        // Vision sent a shape "To the Laser editor" (window.__workshop.visionForma, taken
        // by 40-cuts.js): the Editor is opened so that it is seen
        if (window.__workshop && window.__workshop.visionShape && pz.pag.layouts.indexOf("cuts") !== -1) pz.nav.setLayout("cuts");
        // Window-like tabs (request: "that they look like windows, like the
        // BtnCmd layouts"). Find center has its own.
        pz.layoutButtons = {};
        pz.nav.setTabButtons(pz.layoutButtons);
        pz.tabBar = tzEl("div", "wf-nav tz-tabs");
        pz.TZ_TABS = {};
        pz.nav.setTabs(pz.TZ_TABS); // for the command palette (58-agility-link.js)
        [
          ["prepare", i18nT('common.prepare'), i18nT('zonesPage.step_by_step_to_get_a')],
          ["zones", i18nT('common.zones'), i18nT('zonesPage.work_zones_g55_editor_table_and')],
          ["area", i18nT('zonesPage.cut_area'), i18nT('zonesPage.the_cut_area_of_each_mode')],
          ["cuts", "Editor laser", i18nT('zonesPage.draw_or_import_svg_shapes_sort')],
          ["center", i18nT('cuts.find_centre'), i18nT('zonesPage.measure_a_hole_or_a_piece')],
          ["job", i18nT('zonesPage.job_in_progress'), i18nT('zonesPage.what_is_being_cut_now_or')],
          ["simulate", i18nT('tv.tab'), i18nT('tv.tab_tip')],
          ["materials", i18nT('materials.materials'), i18nT('zonesPage.materials_library_thickness_focus_powers')],
          ["large", i18nT('zonesPage.cut_in_parts'), i18nT('zonesPage.assistant_laser_only_cuts_in_parts')],
        ].forEach(function (it) {
          pz.TZ_TABS[it[0]] = it;
        });
        pz.TZ_TAB_ICONS = {
          prepare: "clipboard-check-outline", zones: "vector-square", area: "crosshairs-gps", cuts: "draw",
          center: "bullseye", job: "progress-clock", simulate: "play-circle-outline", materials: "flask-outline", large: "arrow-expand-all",
        };
        // HOOK etapa 6/7: name, tip and icon of the registered tools
        TZ_TOOLS_EXTRA.forEach(function (d) {
          pz.TZ_TABS[d.id] = [d.id, i18nT(d.name), i18nT(d.tip)];
          pz.TZ_TAB_ICONS[d.id] = d.icon || "puzzle-outline";
        });
        pz.tabGroupEls = {};
      }

      function tzPagTabs(pz, root, opts) {
        pz.pag.groups.forEach(function (gr, gi) {
          var et = tzEl("div", "wf-nav-group tzn-group", gr[0]);
          et.setAttribute("data-group", gi);
          pz.tabBar.appendChild(et);
          pz.tabGroupEls[gi] = et;
          gr[1].map(function (k) { return pz.TZ_TABS[k]; }).filter(Boolean).forEach(function (it) {
            pz.tzAddTab(it);
            pz.layoutButtons[it[0]].setAttribute("data-group", gi);
          });
        });
        // The tabs shown depend on the mode of the machine (20-mode-profile.js): a tool of another mode is simply not there.
        // 2026-10-16: no message about what was hidden and no buttons to change mode here (the bar has the mode buttons).
        pz.modeSeen = null;
        pz.headInfo = pz.space.createHead(); // live state of the machine: state, zone, position, homing (33-space-head.js)
        pz.header.appendChild(pz.headInfo);
        pz.page.appendChild(pz.tabBar);
        // 2026-10-16: the step bar is not shown any more (the user did not like it on top); it is still built, detached, because
        // it keeps the remembered tool of each step (33-space.js)
        pz.space.createSteps();
      }

      function tzPagAccesores(pz, root, opts) {
        // "Active zone" card (32-active-zone.js): everything from the jog for the
        // active zone (laser offset, go to zero, measure Z, set origin) and more.
        // It goes below the map, beside the editor (zaRow).
        // Accessors of the page for tzCreateCtx (21-contract.js): every module gets its ctx from here.
        pz.P = {
          st: function () { return pz.data.st(); },
          zones: function () { return pz.data.zones(); },
          zoneSizes: function () { return pz.data.zoneSizes(); },
          focusByZone: function () { return pz.data.focusByZone(); },
          layout: function () { return pz.nav.layout(); },
          renderMap: function () { pz.shell.renderMap(); },
          viewMat: function () { return pz.view.xfMat ? pz.view.xfMat() : null; },
          refreshAll: function () { return pz.data.refreshAll(); },
          readStatus: function () { return pz.data.readStatus(); },
          machineFree: function () { return pz.data.machineFree(); },
          jobRunning: function () { return pz.data.jobRunning(); },
          cutCorrection: function () { return pz.data.cutCorrection(); },
          cutLimits: function () { return pz.data.cutLimits(); },
          clamps: function () { return pz.data.clampsAct(); },
          offcuts: function () { return pz.data.offcuts(); },
          zonePoint: function (i) { return pz.data.zonePoint(i); },
          saveZonePoint: function (i, p) { return pz.data.saveZonePoint(i, p); },
          zoneMaterial: function (i) { return pz.data.zoneMaterial(i); },
          saveZoneMaterial: function (i, id) { return pz.data.saveZoneMaterial(i, id); },
          // Focus height of zone i saved in its material macro (writeFocusMacro: changes the H or creates the macro). Returns the macro name.
          saveFocus: function (i, h) {
            var z = pz.data.zones()[i];
            if (!z) return Promise.reject(new Error(i18nT('zonesPage.has_no_zone_file', { code: TZ_CODES[i] })));
            var macro = pz.data.focusByZone()[i] ? pz.data.focusByZone()[i].macro : tzSlug(z.name) + ".g";
            return pz.data.writeFocusMacro(i, z, h, macro)
              .then(function () { return pz.data.refreshAll(); })
              .then(function () { return macro; });
          },
          zoneChecks: function (i) { return pz.data.zoneChecks(i); },
          refPoints: function () { return pz.snap.refPoints(); },
          savedPos: function () { return pz.data.savedPos(); },
          probeOffset: function () { return pz.data.probeOffset(); },
          setZoneCorrection: function (i, cx, cy) { return pz.data.setZoneCorrection(i, cx, cy); },
          syncFocus: function () { return pz.data.syncFocus(); },
          openEditor: function (i, o) { pz.table.openEditor(i, o); },
          goLayout: function (l) { pz.nav.goLayout(l); },
          syncMaterialZones: function (id) { pz.data.syncMaterialZones(id); },
        };
        pz.activeCard = tzEl("div", "tz-card wf-card");
        pz.nav.setModule("active", tzMountActive(tzCreateCtx(pz.P, "zones", { card: pz.activeCard })));
        pz.topRow = tzEl("div", "tz-row");
        pz.page.appendChild(pz.topRow);
        // --- map ---
        // Full-width map and, below, Active zone and the editor side by side
        // (request 2026-10-09: "the editor beside active zone and the
        // chart taking all the space").
        pz.mainCol = tzEl("div");
        pz.mainCol.style.cssText = "flex:1 1 100%;min-width:300px;display:flex;flex-direction:column;gap:12px;";
        pz.topRow.appendChild(pz.mainCol);
        pz.mapBar = pz.shell.buildMap(pz.mainCol);
      }

      function tzPagModules(pz, root, opts) {
        pz.nav.setModule("prepare", tpMountPrepare(tzCreateCtx(pz.P, "prepare", {
          card: pz.prepareCard,
          map: { show: function () { pz.shell.mapCard().scrollIntoView({ behavior: "smooth", block: "start" }); } },
        })));
        // the start-up chip (the Workbench start-up: hardware, cut area, zones, materials) only on the page that has Prepare
        if (pz.pag.layouts.indexOf("prepare") !== -1) pz.header.insertBefore(pz.nav.module("prepare").startupEl, pz.headInfo || null); // in the header, in every section
        // "Big piece" layout (48-large.js): cut in parts what does not fit.
        pz.largeCard = tzEl("div", "tz-card wf-card");
        pz.largeCard.style.marginTop = "12px";
        pz.page.insertBefore(pz.largeCard, pz.mainCol.parentNode);
        pz.nav.setModule("large", tgMountLarge(tzCreateCtx(pz.P, "large", { card: pz.largeCard })));
        // "Ready to cut" card of the Run section (46-ready.js): above the job card
        pz.readyCard = tzEl("div", "tz-card wf-card");
        pz.readyCard.style.marginTop = "12px";
        pz.page.insertBefore(pz.readyCard, pz.mainCol.parentNode);
        pz.nav.setModule("ready", tzMountReady(tzCreateCtx(pz.P, "ready", { card: pz.readyCard, visible: function () { return pz.nav.layout() === "job"; } }), {
          designErrors: function () { var c = pz.nav.module("cuts"); return c && c.validate ? c.validate() : []; },
        }));
        // HOOK etapa 5/6/7: what a tool or a module registered by a later stage gets (docs-internal/ENGANCHES.md, INTERFACES.md)
        pz.host = {
          createCtx: function (id, extra) { return tzCreateCtx(pz.P, id, extra); }, // the ctx of the contract (21-contract.js)
          goLayout: pz.nav.goLayout,
          layout: pz.nav.layout,
          tool: pz.nav.toolApi, // what the mount of another registered tool of this page returned
          shell: pz.shell,
          nav: pz.nav,
          layerState: pz.layerState,
          data: pz.data,
          view: pz.view,
          tools: pz.tools,
          dock: pz.dock,
        };
        tzPagTools(pz);
      }

      // HOOK etapa 6/7: the card of every tool registered with tzRegisterTool (20-mode-profile.js) that this page has; it lives in the
      // side panel (inspector). def.bar: a bar right above the card (the Mesh steps). The api a tool returns may have render (the tool
      // is opened or the state is known), tick (every machine state, open or not), refresh (the files of the page were reread),
      // enable (the tool was just opened), modMap / mapModule() (its map module while open) and help() ({title, steps, notes}).
      function tzPagTools(pz) {
        pz.extraCards = {};
        pz.extraBars = {};
        pz.extraApi = {};
        pz.extraActive = "";
        pz.extraTools.forEach(function (d) {
          var card = tzEl("div", "tz-card wf-card");
          card.style.marginTop = "12px";
          card.style.display = "none";
          pz.page.insertBefore(card, pz.mainCol.parentNode);
          pz.extraCards[d.id] = card;
          if (d.bar) {
            pz.extraBars[d.id] = tzEl("div");
            pz.extraBars[d.id].style.cssText = "display:none;margin:0;";
          }
          try {
            pz.extraApi[d.id] = d.mount(pz.host, card, { bar: pz.extraBars[d.id] || null }) || {};
          } catch (e) {
            console.error("[Workbench] the tool " + d.id + " could not be mounted", e);
            pz.extraApi[d.id] = {};
          }
          pz.nav.setToolApi(d.id, pz.extraApi[d.id]);
        });
        function each(name, onlyOpen) {
          Object.keys(pz.extraApi).forEach(function (k) {
            var api = pz.extraApi[k];
            if (typeof api[name] === "function" && (!onlyOpen || pz.nav.layout() === k)) api[name]();
          });
        }
        pz.toolsTick = function () { each("tick", false); };
        pz.toolsRefresh = function () { each("refresh", true); };
      }

      function tzAddTab(pz, it) {
        var b = tzEl("button", "wf-nav-item tz-tab");
        b.appendChild(tzEl("span", "tz-tab-txt", it[1]));
        var ic = tzEl("span", "wf-nav-icon mdi mdi-" + pz.TZ_TAB_ICONS[it[0]]);
        ic.setAttribute("aria-hidden", "true");
        b.insertBefore(ic, b.firstChild);
        b.setAttribute("data-tip", it[2]);
        b.type = "button";
        b.addEventListener("click", function () {
          pz.nav.setLayout(it[0]);
          try {
            localStorage.setItem(pz.TZ_LAYOUT_KEY, pz.nav.layout());
          } catch (e) {
            /* no critico */
          }
          pz.applyLayout();
          if (pz.navBar) pz.navBar.afterChoice(); // not pinned: the bar folds to its icons after the choice (22-page-nav-bar.js)
        });
        pz.layoutButtons[it[0]] = b;
        pz.tabBar.appendChild(b);
      }

      function tzMarkGroups(pz, mode) {
        var view = pz.roleViewName || tzViewNow();
        if (mode === pz.modeSeen && view === pz.viewSeen) return;
        var firstMode = !pz.modeSeen;
        pz.modeSeen = mode;
        pz.viewSeen = view;
        // first time the mode and the state are known: without a remembered view the page opens on Prepare or on the running job
        if (firstMode && !pz.layoutRemembered) pz.nav.setLayout(tzInitialTab(pz.pag, mode, pz.data.st(), null));
        var profile = tzProfileOf(mode);
        pz.page.style.setProperty("--tz-accent", profile.accent);
        var known = TZ_PROFILES[mode] || tzModeElsewhere(mode);
        pz.modeChip.textContent = known ? profile.label : "";
        pz.modeChip.style.display = known ? "" : "none";
        // the groups and the tabs of the mode AND of the view (Operator: three sections; Technician: the groups of the page)
        tzPaintTabs(pz, mode, view);
        // a mode another plugin serves: no tab to open, the inspector shows the card that sends there (30-zones-page-other-mode.js);
        // coming back from one, the cards of the open tab are shown again
        var away = !!tzModeElsewhere(mode), wasAway = !!pz.otherModeOn;
        pz.otherModeOn = away;
        if (away) return pz.applyLayout();
        if (wasAway) pz.applyLayout();
        // if the open tab does not exist in this mode or view, go back to the first tab of the page (Zones on the Workbench)
        if (!tzTabAllowed(pz.pag, view, pz.nav.layout(), mode)) {
          var want = tzInitialTab(pz.pag, mode, pz.data.st(), null);
          if (!tzTabAllowed(pz.pag, view, want, mode)) {
            var plan = tzTabPlan(pz.pag, view, mode);
            if (plan.length) want = plan[0].tools[0];
          }
          pz.nav.goLayout(want);
        }
      }
