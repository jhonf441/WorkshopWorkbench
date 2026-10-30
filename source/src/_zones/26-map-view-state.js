      function tzViewStart(pvw) {
        pvw.MAP_MAX_ZOOM = 25;
        // Zoom out to x0.5 (2026-10-10, request: "a large mesh zone ends up
        // under the ruler because less zoom is not allowed; everything must always
        // be visible"): with the view larger than the bed, the ruler and
        // the labels fall in the outer margin and cover nothing.
        pvw.MAP_MIN_ZOOM = 0.5;
        // ---- Map view: rotation, mirror, theme and bed background ----
        // Request 2026-10-09: "the workshop's chart more customizable and
        // advanced". The map is always drawn in bed coordinates (x, -y)
        // inside a group (mapRoot) with the view's transform; the
        // texts are straightened one by one (xfUpright) so that they never end up
        // rotated nor mirrored. Taps are converted back (xfInvP).
        // It is saved per screen (localStorage): the kiosk beside the
        // machine can see it rotated and the phone not.
        pvw.TZ_VIEW_KEY = "workshopMapView";
        // Light theme (2026-10-10): the same colors as Dark drawn with a
        // filter that inverts the brightness and keeps the hue (class tzm-inv);
        // this way all the layers (cuts, mesh, job) adapt without
        // rewriting each color. Auto = Light with DWC's light theme.
        pvw.TZ_THEMES = {
          auto: { name: i18nT('zonesPage.auto_dwc') },
          bright: { name: i18nT('zonesPage.light'), bg: "#1a1a1a", bed: "#050505", pat: "rgba(255,255,255,0.10)", inv: true },
          dark: { name: i18nT('zonesPage.dark'), bg: "#121212", bed: "#1b1b1b", pat: "rgba(255,255,255,0.08)" },
          blue: { name: i18nT('zonesPage.blueprint'), bg: "#0b2340", bed: "#0f2c50", pat: "rgba(156,195,236,0.20)" },
          black: { name: i18nT('zonesPage.black'), bg: "#000000", bed: "#0a0a0a", pat: "rgba(255,255,255,0.11)" },
        };
        pvw.TZ_BEDS = [["plain", i18nT('zonesPage.plain')], ["honeycomb", i18nT('zonesPage.honeycomb')], ["battens", i18nT('zonesPage.slats')]];
        pvw.mapRot = 0;
        pvw.mapMirror = false;
        pvw.mapTheme = "auto";
        pvw.mapBed = "plain";
        try {
          var vs0 = JSON.parse(localStorage.getItem(pvw.TZ_VIEW_KEY) || "{}") || {};
          if ([0, 90, 180, 270].indexOf(vs0.rot) !== -1) pvw.mapRot = vs0.rot;
          pvw.mapMirror = !!vs0.mirror;
          if (pvw.TZ_THEMES[vs0.theme]) pvw.mapTheme = vs0.theme;
          if (pvw.TZ_BEDS.some(function (b) { return b[0] === vs0.bed; })) pvw.mapBed = vs0.bed;
        } catch (e) {
          /* default */
        }
        // ---- Map zoom and pan ----
        // Mouse wheel = zoom around the cursor; drag = move;
        // two-finger pinch = zoom (touch screen); buttons + / - /
        // Fit. A drag does NOT count as a tap (it does not open zones nor set
        // the destination in "From the map").
        pvw.mapFull = null; // the whole bed (with its margin) in map coords, set by every drawing
        pvw.mapView = null; // the visible window in map coords, null = everything
        pvw.focusZoom = false; // the map zoomed in on the running job by itself
        pvw.mapFollow = false;
        pvw.wsNarrow = null;
        pvw.TZ_MAPSIZE_KEY = "workshopZonesMapSize";
        pvw.MAP_SIZES = [["small", "30vh"], ["middle", "42vh"], ["large", "62vh"], ["hidden", ""]];
        pvw.mapSize = "middle";
        try {
          var lsSize = localStorage.getItem(pvw.TZ_MAPSIZE_KEY);
          if (pvw.MAP_SIZES.some(function (s) { return s[0] === lsSize; })) pvw.mapSize = lsSize;
        } catch (e) {
          /* default */
        }
        pvw.viewSetListeners = [];
        pvw.miniCache = tzLayerCacheCreate(); // the kept groups of the minimap (26-map-layer-cache.js)
        pvw.miniHead = null; // its head and visible window: the two nodes moved on each redraw
        pvw.miniView = null;
      }
