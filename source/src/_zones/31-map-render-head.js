      // The origin of the active zone (a fixed layer), the head (a kept group moved by its transform: the only thing written while the
      // machine moves), the job (its own kept group) and what is drawn again on every redraw after them (tzMapLive: the drag, the open
      // tool, the markers).

      // Layer "origin": 0,0 of the active zone, X/Y arrows (the job starts there)
      function tzMapOrigin(pmr, mp) {
        var wn = pmr.data.st().wn;
        var az = pmr.data.zones()[wn];
        if (!az || !pmr.layerState.layers().zones) return;
        var oc = TZ_ZCOL[wn % TZ_ZCOL.length];
        var oL = mp.w / 16, osw = mp.w / 260;
        var og = mp.node("g", { "pointer-events": "none" }); // it does not cover the marker's tap
        mp.node("line", { x1: az.refX, y1: -az.refY, x2: az.refX + oL, y2: -az.refY, stroke: oc, "stroke-width": osw }, og);
        mp.node("line", { x1: az.refX, y1: -az.refY, x2: az.refX, y2: -(az.refY + oL), stroke: oc, "stroke-width": osw }, og);
        mp.node("polygon", { points: [az.refX + oL, -az.refY, az.refX + oL - oL * 0.18, -az.refY - oL * 0.09, az.refX + oL - oL * 0.18, -az.refY + oL * 0.09].join(" "), fill: oc }, og);
        mp.node("polygon", { points: [az.refX, -(az.refY + oL), az.refX - oL * 0.09, -(az.refY + oL - oL * 0.18), az.refX + oL * 0.09, -(az.refY + oL - oL * 0.18)].join(" "), fill: oc }, og);
        var ox = mp.node("text", { x: az.refX + oL + mp.fs * 0.3, y: -az.refY + mp.fs * 0.35, fill: oc, "font-size": mp.fs * 0.8, "font-weight": "bold" }, og);
        ox.textContent = "X";
        var oy = mp.node("text", { x: az.refX - mp.fs * 0.3, y: -(az.refY + oL + mp.fs * 0.3), fill: oc, "font-size": mp.fs * 0.8, "font-weight": "bold", "text-anchor": "middle" }, og);
        oy.textContent = "Y";
        if (mp.rectZone[wn]) {
          var o0 = mp.node("text", { x: az.refX + mp.fs * 0.4, y: -az.refY + mp.fs * 1.15, fill: oc, "font-size": mp.fs * 0.72 }, og);
          o0.textContent = i18nT('zonesPage.0_0_of_2', { code: TZ_CODES[wn] });
        }
      }

      // Head: cross = pointer / reference; red dot = laser (position - correction); green ring = probe. Drawn around 0,0 once per
      // signature (zoom, layers, correction, probe offset); the position is the group's transform.
      function tzMapHead(pmr, mp) {
        var L = pmr.layerState.layers();
        var hcorr = L.head && pmr.data.st().mode === "Laser" ? pmr.data.cutCorrection() : null; // one correction for the machine (Offsets)
        var pso = L.probe ? pmr.data.areaProbeOffset() : null;
        var g = tzMapLayer(pmr, mp, "head", tzLayerSig([mp.w, !!L.head, hcorr, pso]), function () {
          tzMapHeadDraw(mp, !!L.head, hcorr, pso);
        });
        tzSvgSetChanged(g, { transform: "translate(" + mp.ax.X.machinePosition + " " + -mp.ax.Y.machinePosition + ")" });
      }

      function tzMapHeadDraw(mp, head, hcorr, pso) {
        var c = mp.w / 70;
        if (head) {
          mp.node("line", { x1: -c, y1: 0, x2: c, y2: 0, stroke: "#fff", "stroke-width": mp.w / 400 });
          mp.node("line", { x1: 0, y1: -c, x2: 0, y2: c, stroke: "#fff", "stroke-width": mp.w / 400 });
        }
        if (head && hcorr) mp.node("circle", { cx: -hcorr.cx, cy: hcorr.cy, r: mp.w / 140, fill: "#ef5350" });
        if (pso) {
          var sr = mp.w / 110;
          mp.node("circle", { cx: pso.x, cy: -pso.y, r: sr, fill: "none", stroke: "#66bb6a", "stroke-width": mp.w / 380 });
          mp.node("line", { x1: pso.x - sr * 0.6, y1: -pso.y, x2: pso.x + sr * 0.6, y2: -pso.y, stroke: "#66bb6a", "stroke-width": mp.w / 500 });
          mp.node("line", { x1: pso.x, y1: -pso.y - sr * 0.6, x2: pso.x, y2: -pso.y + sr * 0.6, stroke: "#66bb6a", "stroke-width": mp.w / 500 });
        }
      }

      // The job on the map: its own tab open, or a job in progress (the path in any tab; in Simulate only with a tool of a tab open,
      // otherwise Simulate shows only the chosen file). The job keeps its group (plan, samples or live trail, 47-job-plan-ctx.js): it is
      // the last fixed layer, so a redraw while the job runs leaves it where it is.
      function tzMapJob(pmr, mp) {
        var lay = pmr.nav.layMod(), job = pmr.nav.module("job");
        if (lay !== job && !(mp.focus && (lay || pmr.nav.layout() !== "simulate"))) return;
        var g = job.layer(mp.w);
        if (g) mp.fixed.push(g);
      }

      // Drawn again on every redraw, after the fixed layers (into the root).
      function tzMapLive(pmr, mp) {
        tzMapDrag(pmr, mp);
        var lay = pmr.nav.layMod();
        if (lay && lay !== pmr.nav.module("job")) lay.draw(mp.node, mp.w); // shapes / centres (Cuts) or region / mesh (Mesh)
        if (pmr.nav.layout() === "simulate") pmr.nav.module("tvista").draw(mp.node, mp.w); // the file chosen in "View, simulate and frame"
        pmr.jobFocus.paintBanner();
        pmr.snap.placeSnapMarker(); // snap ring (the redraw empties the live part of the root)
        pmr.camera.map().place(); // camera image below (follows the zoom/pan and the bridge)
        pmr.layers.paintCameraDesc();
        pmr.tools.placeMeasure();
        pmr.tools.placeCameraTool(); // Camera tool: what the camera sees and the destination
        pmr.view.drawMinimap();
        pmr.tools.paintStatus();
        pmr.tools.paintTools();
        pmr.view.paintZoomLbl();
        pmr.view.xfUpright(pmr.shell.mapRoot()); // upright texts even if the map is rotated (the kept ones are skipped: data-up)
      }

      // A drag of the map (a zone, a corner of the area, a point) being done: the line, the ring, the new rectangle and the coordinates.
      function tzMapDrag(pmr, mp) {
        var de = pmr.tools.dragEdit();
        if (!de || !de.moved) return;
        var dd0 = de.since, dd1 = de.until;
        var dcol = de.kind === "zone" ? "#90caf9" : "#ffffff";
        mp.node("line", { x1: dd0.x, y1: -dd0.y, x2: dd1.x, y2: -dd1.y, stroke: dcol, "stroke-width": mp.w / 400, "stroke-dasharray": mp.w / 90 + " " + mp.w / 140 });
        mp.node("circle", { cx: dd1.x, cy: -dd1.y, r: mp.w / 120, fill: "none", stroke: dcol, "stroke-width": mp.w / 300 });
        var dtx = mp.node("text", { x: dd1.x + mp.w / 80, y: -dd1.y - mp.w / 80, fill: dcol, "font-size": mp.fs * 0.85 });
        dtx.textContent = "X" + tzFmt(dd1.x) + " Y" + tzFmt(dd1.y);
      }
