      // ---- Workbench page, base part: navigation (step 6 of the restructuring, docs-internal/INTERFACES.md) ----
      // Which tab is open (and the remembered last view), the inner tab of Zones, the zone in the editor, the modules of the tabs
      // (cuts, job, large, prepare, active, tvista: created by the page, registered here), the APIs of the registered tools and the
      // map module of the open tab (layMod). apply() is answered by the page (applyLayout: show the cards of the open tab).
      // pag = the entry of TZ_PAGES of this page; router = the router of DWC (other pages of the app).
      function tzNavCreate(pag, router) {
        var pnv = {
          pag: pag,
          router: router,
          notice: {}, // holder of the page notice (tzAgilityNotice)
          layoutKey: pag.key, // localStorage key of the last view of this page
          zSubKey: "workshopZonesSub",
          layout: pag.defaultValue,
          zSub: "active",
          selected: null, // index of the zone in the editor (or "new")
          tabs: {}, // id -> [id, name, tip] (filled by the page)
          tabButtons: {}, // id -> button of the tab (filled by the page)
          modules: {},
          toolApis: {},
          applyListeners: [],
          guard: null, // fn(tab id) -> bool, set by the page: a tab the role does not have cannot be opened (30-zones-page-role.js)
        };
        try {
          var zs0 = localStorage.getItem(pnv.zSubKey);
          if (zs0 === "zones" || zs0 === "positions") pnv.zSub = zs0;
        } catch (e) {
          /* por defecto Zona activa */
        }
        return {
          pag: function () { return pnv.pag; },
          layout: function () { return pnv.layout; },
          setLayout: function (l) { pnv.layout = l; },
          goLayout: tzBind(tzNavGoLayout, pnv),
          // tab asked for in the route query of this page (?layout=..), valid only if this page has it and the role may open it
          queryLayout: function () {
            var q = workshopHostCurrentQuery();
            var l = q && q.layout;
            return typeof l === "string" && pnv.pag.layouts.indexOf(l) !== -1 && !(pnv.guard && !pnv.guard(l)) ? l : null;
          },
          setGuard: function (fn) { pnv.guard = fn; },
          notice: function () { return pnv.notice; },
          apply: function () { pnv.applyListeners.forEach(function (fn) { fn(); }); },
          onApply: function (fn) { pnv.applyListeners.push(fn); },
          zSub: function () { return pnv.zSub; },
          setZSub: function (k) { pnv.zSub = k; },
          chooseZSub: tzBind(tzNavChooseZSub, pnv),
          selected: function () { return pnv.selected; },
          setSelected: function (i) { pnv.selected = i; },
          tabs: function () { return pnv.tabs; },
          setTabs: function (t) { pnv.tabs = t; },
          tabButtons: function () { return pnv.tabButtons; },
          setTabButtons: function (b) { pnv.tabButtons = b; },
          goPath: function (path) { if (pnv.router) pnv.router.push(path); }, // other pages of the app (e.g. Vision, to build the bed photo)
          module: function (name) { return pnv.modules[name]; },
          setModule: function (name, m) { pnv.modules[name] = m; },
          toolApi: function (id) { return pnv.toolApis[id]; },
          setToolApi: function (id, api) { pnv.toolApis[id] = api; },
          layMod: tzBind(tzNavLayMod, pnv),
        };
      }

      // Changes tab. false if the page has no such tab (a tab of the other plugin's page opens that page: tzNavGoOtherPage).
      // query: extra route query parameters for a tab that lives on the other plugin's page (e.g. {x, y} for Machine > Height)
      function tzNavGoLayout(pnv, l, query) {
        if (pnv.pag.layouts.indexOf(l) !== -1) {
          if (pnv.guard && !pnv.guard(l)) return false;
          pnv.layout = l;
          try {
            localStorage.setItem(pnv.layoutKey, l);
          } catch (e) {
            /* no critico */
          }
          pnv.applyListeners.forEach(function (fn) { fn(); });
          return true;
        }
        return tzNavGoOtherPage(pnv, l, query);
      }

      // A tab that lives on the page of the other plugin (TZ_PAGES, 30-zones-page.js): that page opens through the router with the
      // tab stored as its last view; if its plugin is not installed or is off, a notice says which one. false: this page did not change.
      // The tab (and any extra data) travels as ROUTE QUERY parameters of the other page: ?layout=<tab>&x=..&y=.. (review #12), so the
      // other plugin reads route.query and no undeclared localStorage key is a contract between the two plugins.
      function tzNavGoOtherPage(pnv, l, query) {
        var k = tzPageOfTab(l, pnv.pag);
        if (!k) return false;
        var other = TZ_PAGES[k];
        if (!workshopPathExists(other.path)) {
          tzAgilityNotice(pnv.notice, i18nT('zonesPage.needs_other_plugin', { title: other.title, plugin: other.plugin }));
          return false;
        }
        try {
          localStorage.setItem(other.key, l); // TRANSITIONAL: WorkshopMachine still reads its last view from here; delete when it reads route.query.layout
        } catch (e) {
          /* the other page opens on its last tab */
        }
        var p = pnv.router ? pnv.router.push({ path: other.path, query: Object.assign({ layout: l }, query || {}) }) : null;
        if (p && typeof p.catch === "function") p.catch(function () {});
        return false;
      }

      // The inner tab of Zones chosen by the person: remembered (except the editor, which needs a zone) and shown
      function tzNavChooseZSub(pnv, k) {
        pnv.zSub = k;
        try {
          if (k !== "editor") localStorage.setItem(pnv.zSubKey, k);
        } catch (e) {
          /* no critico */
        }
        pnv.applyListeners.forEach(function (fn) { fn(); });
      }

      // Module of the open tab that receives the map's touches / drags and draws on top (null in Zones)
      function tzNavLayMod(pnv) {
        var api = pnv.toolApis[pnv.layout];
        // HOOK etapa 7: a registered tool that draws on the map (mapModule() when it depends on the tool's state, e.g. Offsets > Probe)
        var mm = api ? (typeof api.mapModule === "function" ? api.mapModule() : api.modMap) : null;
        if (mm) return mm;
        return pnv.layout === "cuts" || pnv.layout === "center" ? pnv.modules.cuts : pnv.layout === "job" ? pnv.modules.job : pnv.layout === "large" ? pnv.modules.large : null;
      }
