      // Layer "ruler" of the map (2026-10-08: "an option to see a ruler to have a reference"): marks in mm on the top and left edge of
      // the VIEW (they stay visible with zoom/pan) + a faint grid at the major marks. The step is chosen from what is visible
      // (1/2/5 x 10^n), so zooming in shows marks every 10, 5, 1 mm. Drawn in view coords, in the svg after the root (never rotated).
      // Kept while only the view PANS (2026-10-24, "follow the head", docs-internal/MESA-RENOVADA.md 9.4): the group is built again when
      // the zoom, the size of the visible region, the rotation, the theme or the language change (tzMapSigRuler); a pan only moves the
      // two bands, the two edge groups (a translate) and the corner letters, and adds / removes the marks that enter / leave the view
      // (31-map-render-ruler-ticks.js). State (explicit, in pmr.ruler, the one of the kept group):
      //   { R: {minor, tickL, rfs, rStroke, w, h}, bandT, bandL, top: edge, left: edge, letterT, letterL }
      //   edge = { g, horiz, ax, s, ticks: [{ ix, pos, els }] in ascending ix }

      // The ruler group of this redraw (kept or built again) with its marks where the view is now.
      function tzMapRulerLayer(pmr, mp) {
        // Region REALLY visible (in VIEW coords): the map's box almost never has the viewBox's proportion and the browser adds strips
        // (preserveAspectRatio "meet").
        var vr = tzMapRulerRegion(pmr, mp);
        var g = tzMapLayerGroup(pmr, mp, "ruler", tzMapSigRuler(pmr, mp, vr), function () { tzMapRulerBuild(pmr, mp, vr); }, false);
        tzMapRulerUpdate(pmr, vr);
        return g;
      }

      // The fixed part of the ruler (into mp.into): the two bands, the two edge groups (empty: the marks come with tzMapRulerUpdate) and,
      // with the map rotated or mirrored, the axis letter of each edge at the corner.
      function tzMapRulerBuild(pmr, mp, vr) {
        var raw = Math.max(vr.w, vr.h) / 8;
        var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
        var major = [1, 2, 5, 10].map(function (k) { return k * mag; }).filter(function (v) { return v >= raw; })[0] || 10 * mag;
        var R = { minor: major / 5, tickL: Math.min(vr.w, vr.h) * 0.03, rfs: mp.fs * 0.8, rStroke: mp.w / 600, w: vr.w, h: vr.h };
        R.bandT = R.tickL + R.rfs * 1.5;
        R.bandL = R.tickL + R.rfs * 3.6;
        var st = { R: R, letterT: null, letterL: null };
        st.bandT = mp.node("rect", { x: vr.x, y: vr.y, width: vr.w, height: R.bandT, fill: mp.TH.bg, "fill-opacity": 0.92 });
        st.bandL = mp.node("rect", { x: vr.x, y: vr.y, width: R.bandL, height: vr.h, fill: mp.TH.bg, "fill-opacity": 0.92 });
        st.top = tzMapRulerEdgeCreate(pmr, mp, true);
        st.left = tzMapRulerEdgeCreate(pmr, mp, false);
        if (!pmr.view.xfId()) {
          var at = { fill: "#ffe082", "font-size": R.rfs, "font-weight": "bold" };
          st.letterT = mp.node("text", Object.assign(tzMapRulerLetterPos(R, vr, true), at));
          st.letterT.textContent = st.top.ax + " →";
          st.letterL = mp.node("text", Object.assign(tzMapRulerLetterPos(R, vr, false), at));
          st.letterL.textContent = st.left.ax + " ↓";
        }
        pmr.ruler = st;
      }

      function tzMapRulerLetterPos(R, vr, top) {
        return top ? { x: vr.x + R.bandL + R.rfs * 0.4, y: vr.y + R.bandT - R.rfs * 0.25 } : { x: vr.x + R.rfs * 0.3, y: vr.y + R.bandT + R.rfs * 1.4 };
      }

      // One edge (horiz: the top one): which machine axis it covers and in which direction, and its group of marks.
      function tzMapRulerEdgeCreate(pmr, mp, horiz) {
        // direction in unrotated map coords (x, -y) of a view direction
        var d = horiz ? pmr.view.xfInvP(1, 0) : pmr.view.xfInvP(0, 1);
        var al = Math.abs(d.x) > 0.5 ? { ax: "X", s: d.x } : { ax: "Y", s: -d.y };
        return { g: mp.node("g", {}), horiz: horiz, ax: al.ax, s: al.s, ticks: [] };
      }

      // Where the view is now: the bands, the letters and the edges follow it, writing only what changed.
      function tzMapRulerUpdate(pmr, vr) {
        var st = pmr.ruler;
        tzSvgSetChanged(st.bandT, { x: vr.x, y: vr.y });
        tzSvgSetChanged(st.bandL, { x: vr.x, y: vr.y });
        if (st.letterT) tzSvgSetChanged(st.letterT, tzMapRulerLetterPos(st.R, vr, true));
        if (st.letterL) tzSvgSetChanged(st.letterL, tzMapRulerLetterPos(st.R, vr, false));
        tzMapRulerEdgeUpdate(pmr, st.R, st.top, vr);
        tzMapRulerEdgeUpdate(pmr, st.R, st.left, vr);
      }

      function tzMapRulerRegion(pmr, mp) {
        var vr = mp.vbv;
        var svg = pmr.shell.svg();
        var ctmR = svg.getScreenCTM();
        if (!ctmR) return vr;
        var brR = svg.getBoundingClientRect();
        var invR = ctmR.inverse();
        var pA = svg.createSVGPoint();
        pA.x = brR.left;
        pA.y = brR.top;
        pA = pA.matrixTransform(invR);
        var pB = svg.createSVGPoint();
        pB.x = brR.right;
        pB.y = brR.bottom;
        pB = pB.matrixTransform(invR);
        return pB.x > pA.x && pB.y > pA.y ? { x: pA.x, y: pA.y, w: pB.x - pA.x, h: pB.y - pA.y } : vr;
      }
