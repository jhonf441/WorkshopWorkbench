      function tcCutsStart(tc) {
        var it = {};
        /* ctx: contract (21-contract.js): card, centerCard, visible(), maquina.*, mapa.*, corte.*, datos.*, ui.fmt */
        tc.fmt = tc.ctx.ui.fmt;
        tcStartData(tc, it);
        tcStartEditing(tc, it);
        tcStartCenter(tc, it);
        tcInitJob(tc, it);
        tcStartShortcuts(tc, it);
        tcStartVision(tc, it);
      }

      function tcStartData(tc, it) {
        tc.data = { shapes: [], defaults: { power: 30, speed: 1000, passes: 1 }, air: true, nextId: 1, snap: 45 };
        // in the card too (17-sd-saving.js): another screen sees them and they go into the backups
        tc.tcSd = tzSdStore(TC_STORE_KEY, "0:/sys/workshop/data/laser-designs.json", function (sv) {
          if (!sv || !Array.isArray(sv.shapes)) return;
          Object.assign(tc.data, sv);
          tc.lastSnap = tcSnapOf(tc);
          tc.undoStack = [];
          tc.redoStack = [];
          tcRender(tc);
          tc.ctx.map.redraw();
        });
        var sv = tc.tcSd.local;
        if (sv && Array.isArray(sv.shapes)) tc.data = Object.assign(tc.data, sv);
        // -- capas --
        if (!Array.isArray(tc.data.layers) || !tc.data.layers.length) {
          // no layers yet: one layer for each power/speed/passes combination used
          tc.data.layers = [];
          tc.combos = {};
          var base = tc.data.shapes.length ? tc.data.shapes : [{ power: tc.data.defaults.power, speed: tc.data.defaults.speed, passes: tc.data.defaults.passes }];
          base.forEach(function (sh) {
            var k = [sh.power, sh.speed, sh.passes].join("|");
            if (!tc.combos[k]) {
              var L = { id: tc.data.layers.length + 1, name: i18nT('cuts.layer_2', { n: tc.data.layers.length + 1 }), color: TC_LAYER_COLORS[tc.data.layers.length % TC_LAYER_COLORS.length], power: sh.power, speed: sh.speed, passes: sh.passes, air: tc.data.air !== false };
              tc.data.layers.push(L);
              tc.combos[k] = L.id;
            }
            if (sh.id) sh.layer = tc.combos[k];
          });
          tc.data.activeLayer = tc.data.layers[0].id;
        }
        tcSyncLayers(tc);
      }

      function tcStartEditing(tc, it) {
        tc.sel = null; // id de la forma "principal" (editor numerico)
        tc.selIds = []; // ALL the selected ones (handles, duplicate, arrays...)
        tc.multiMode = false; // touch: each tap adds/removes from the selection
        tc.arrayDlg = null; // null | {kind:"grid"|"circ", ...campos}
        tc.undoStack = [], tc.redoStack = [];
        tc.lastSnap = JSON.stringify({ shapes: tc.data.shapes, nextId: tc.data.nextId, archived: tc.data.archived || [] }); // formas al ultimo save() (base de Deshacer)
        tc.lastW = 300; // width of the map view (for the handles' size)
        tc.tool = null; // null | {type, p1} -- creating a shape by tapping the map
        tc.centerMode = null; // null | "circle" | "rect" | "circ2" | "rect2" | "mid"
        tc.centerKind = null; // what is measured: null | "redondo" | "rect" (the method is chosen afterwards)
      }

      function tcStartCenter(tc, it) {
        // Where the points come from (request 2026-10-10: "let the camera be the
        // assistant of the existing modes; I choose or automatic"):
        //   maquina = tap the map, Go there, jog, Capture (the usual)
        //   camara  = tap the point in the camera image (on the map)
        //   auto    = camera if it is calibrated and enabled for Zones
        tc.TC_SOURCE_KEY = "workshopCenterSource";
        tc.centerSource = "auto";
        try {
          tc.centerSource = localStorage.getItem(tc.TC_SOURCE_KEY) || "auto";
        } catch (e) {
          /* no critico */
        }
        // With the machine as source: what is placed on the edge, the pointer
        // (default, bed coordinates) or the laser spot (head - correction).
        tc.TC_POINTS_KEY = "workshopCenterPoints";
        tc.centerPoints = "pointer";
        try {
          tc.centerPoints = localStorage.getItem(tc.TC_POINTS_KEY) === "laser" ? "laser" : "pointer";
        } catch (e) {
          /* default: pointer */
        }
        tc.centerDiam = ""; // circ2: known diameter (mm), text of the field
        tc.centerSol = 0; // circ2: cual de los dos circulos posibles
        tc.centerName = ""; // name to save the center as a position
        tc.centerW = "", tc.centerH = ""; // rect1: medida conocida (mm)
        tc.centerCorner = "bl"; // rect1: which corner was tapped (bl, br, tl, tr)"
        tc.centerPts = [];
        tc.view = "cuts"; // pestana activa: "cuts" (formas) o "centro" (Hallar centro)
        tc.centerAim = null; // {x,y}: point tapped on the map to take the pointer to (Find center)
        // 2026-10-11 ("being able to stand on a number to choose which point I am
        // capturing"): centerPts can have gaps (null); centerSlot = the
        // one chosen in the drawing (null = the first one missing).
        tc.centerSlot = null;
        tc.centerDlgSeen = false; // the tap's box on the map is already closed for this destination
        tc.centerDlgEl = null;
        tc.centerXY = { x: 0, y: 0 }; // where the last tap was (to place the box)
        document.addEventListener("pointerdown", function (ev) { tc.centerXY = { x: ev.clientX, y: ev.clientY }; }, true);
        // Find center with the camera (2026-10-10): Vision (vision.py, through the API)
        // takes the photo and detects circles/rectangles/pieces in bed coords.
        tc.centerCamera = { busy: false, items: [], photo: null, sel: null, notice: "" };
        // Camera suggestions (2026-10-10: "the camera searches and paints them and
        // I decide whether to use any"): with the points by camera, on entering the
        // method and every time the camera stays still in another place, Vision
        // searches by itself (video, fast) and the useful points are painted numbered.
        tc.centerAuto = { key: "", seen: "", since: 0, state: "" };
      }

      function tcInitJob(tc, it) {
        tc.jobStep = null; // null | {step:"cut"|"laserframe", ack, pct}
        tc.border = { shape: "outline", repeat: "once", n: 2, st: null, timer: null }; // the frame of the shapes (43-cuts-frame.js)
        tc.M = tzMsg(function () { tc.lastKey = ""; tcRender(tc); }, true);
        tc.lastKey = "";
        tc.drag = null; // {kind:"create"|"move"|"scale"|"rotate", start, moved, ...}
        tjLaserCfgListeners.push(function () {
          tc.lastKey = "";
          tcRender(tc);
        });
      }

      function tcStartShortcuts(tc, it) {
        // Keyboard shortcuts (only with the Cuts tab visible and when not
        // typing): Del deletes, Ctrl+Z / Ctrl+Y, Ctrl+D duplicates, Ctrl+A
        // all, arrows move 1 mm (with Shift 10 mm), R / Shift+R rotate 90 right / left.
        document.addEventListener("keydown", function (ev) {
          if (ev.key === "Shift") tcShiftDown = true;
          if (!tc.ctx.visible() || tc.view !== "cuts") return;
          var t = ev.target && ev.target.tagName;
          if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
          var k = ev.key, ctl = ev.ctrlKey || ev.metaKey;
          if (ctl && (k === "z" || k === "Z")) { ev.preventDefault(); return tcUndo(tc); }
          if (ctl && (k === "y" || k === "Y")) { ev.preventDefault(); return tcRedo(tc); }
          if (ctl && (k === "v" || k === "V")) { ev.preventDefault(); return tcPasteSel(tc); }
          if (ctl && (k === "c" || k === "C") && tc.selIds.length) { ev.preventDefault(); return tcCopySel(tc); }
          if (ctl && (k === "a" || k === "A")) { ev.preventDefault(); tcSetSel(tc, tc.data.shapes.filter(function (x) { return !tcLayerById(tc, x.layer).locked; }).map(function (x) { return x.id; })); return tcGo(tc); }
          if (!tc.selIds.length) return;
          if (ctl && (k === "d" || k === "D")) { ev.preventDefault(); return tcDuplicateSel(tc, 5, 5); }
          if (k === "Delete" || k === "Backspace") { ev.preventDefault(); return tcDeleteSel(tc); }
          if (tcRotKey(tc, ev)) return ev.preventDefault(); // R / Shift+R: 90 degrees right / left (41-cuts-rotate.js)
          var st = ev.shiftKey ? 10 : 1;
          var mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[k];
          if (mv) { ev.preventDefault(); tcTransformSel(tc, tcMoveFn(mv[0], mv[1]), { move: true }); }
        });
        document.addEventListener("keyup", function (ev) {
          if (ev.key === "Shift") tcShiftDown = false;
        });
      }

      function tcStartVision(tc, it) {
        // Copy / paste of shapes (Ctrl+C / Ctrl+V or the buttons). The clip is kept in the browser, so it also pastes in another
        // session of the editor; each paste goes 10 mm further than the one before so the copies can be told apart.
        tc.TC_CLIP_KEY = "workshopCutsClip";
        tc.tcPasteN = 0;
        // Layers (redesign 2026-10-10, "cleaner and easier layers and shapes"): one
        // row per layer with what matters at a glance (power, speed,
        // passes, air, view, lock, order); the rest in "More".
        tc.layerOpen = null; // id of the layer with "More" open
        tcTakeVisionShape(tc);
        tc.visionView = false; // the card has already been on the page (afterwards, if it leaves, it is cut off)
        tc.visionTimer = setInterval(function () {
          if (document.body.contains(tc.ctx.card)) tc.visionView = true;
          else if (tc.visionView) return clearInterval(tc.visionTimer);
          tcTakeVisionShape(tc);
        }, 1000);
      }
