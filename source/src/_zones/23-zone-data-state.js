      function tzDataStart(pzd) {
        // Material measure of each zone (optional): {index: {w, h}} in
        // sys/workshop/config/zone-sizes.json. The zone files (sys/workshop/zones/p<N>.g)
        // are not touched: macros read them. Used for the map's "center of
        // the zone" reference (request 2026-10-08).
        pzd.TZ_SIZES_FILE = "0:/sys/workshop/config/zone-sizes.json"; // 0..8 -> {macro, h, name, px?, py?}
        pzd.laserFiles = []; // all the .g of macros/laser (so as not to overwrite one that is not a material)
        // Z measuring point of each zone (request 2026-10-09: "see and
        // adjust the focus position to reference points or to a
        // map coordinate"): {index: {dx, dy}} = where the probe TOUCHES,
        // relative to the zone's point (it moves with it). Valid for the 3
        // modes (sys/workshop/macros/zprobepoint.g); in Laser it is also written as X/Y in
        // the laserfocus.g line of the material macro (live jobs).
        pzd.TZ_ZPT_FILE = "0:/sys/workshop/config/zone-zpoints.json";
        pzd.zonePts = {};
        // Extras per zone (request 2026-10-09): {index: {material: id}} --
        // the material comes from the library (36-materials.js).
        pzd.TZ_EXTRA_FILE = "0:/sys/workshop/config/zone-extra.json";
        pzd.zoneExtra = {};
        // Clamps / obstacles (request 2026-10-09, map redesign): places
        // where one must not pass (clamps, screws, stops). Bed coords
        // (where the pointer lands). [{name, x, y, w, h}]. They warn if a zone or the
        // path of a job touches them.
        pzd.TZ_CLAMPS_FILE = "0:/sys/workshop/config/clamps.json";
        // Offcuts (leftover material on the bed): [{name, x, y, w, h}].
        // The laser Editor says in which ones the shapes fit and can take them there.
        pzd.TZ_OFFCUTS_FILE = "0:/sys/workshop/data/scraps.json";
        pzd.machineMemo = { liveBusyTs: 0 };
        pzd.st = null; // ultimo estado resumido de /machine/status
        pzd.zones = []; // 0..8 -> {name, refX, refY, corrX, corrY, file:bool}
        // Saved jog positions (sys/workshop/data/positions.json, machine coords =
        // where the pointer lands): cutting area corners, origin
        // of a zone and markers on the map (request 2026-10-08).
        pzd.savedPos = [];
        pzd.zoneSizes = {};
        pzd.focusByZone = {};
        pzd.clamps = [];
        pzd.offcuts = [];
        // Vision's photo of the bed: 0:/sys/workshop/data/vision-bed.json says where
        // the image goes {x0, y0, x1, y1, ts}; it is reloaded when ts changes.
        pzd.photoBed = { info: null, opacity: 0.7 };
        try {
          var fop = parseFloat(localStorage.getItem("workshopMapPhotoOpacity"));
          if (fop >= 0.1 && fop <= 1) pzd.photoBed.opacity = fop;
        } catch (e) {
          /* por defecto */
        }
        pzd.positionListeners = [];
      }
