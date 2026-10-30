      // The signatures of the fixed layers of the map: EVERYTHING a layer is drawn from, and nothing that moves. A layer is built again
      // only when its signature changes (26-map-layer-cache.js). The head position, the job and the status of the machine are not here:
      // that is what the 1 s status read changes while the machine moves.

      function tzMapLanguage() {
        return typeof workshopDwcLanguage === "function" ? workshopDwcLanguage() : "";
      }

      // What every layer depends on: the zoom (mp.w and mp.fs size the strokes and the texts), the language of the texts, the rotation /
      // mirror (upright texts), the focus mode of a running job, how the other zones are shown, the active zone, the mode and the layers.
      function tzMapSigCommon(pmr, mp) {
        var st = pmr.data.st();
        return [mp.w, mp.fs, tzMapLanguage(), pmr.view.mapRot(), pmr.view.mapMirror(), mp.focus, mp.other, st.wn, st.mode,
          pmr.layerState.layers(), pmr.layerState.clampsOn()];
      }

      function tzMapSigBed(pmr, mp) {
        var pb = pmr.layerState.layers().photoBed ? pmr.data.photoBed() : null;
        return tzLayerSig([mp.common, mp.bounds, mp.themeKey, mp.TH, pmr.view.mapBed(), mp.cameraShown, pb ? [pb.info, pb.opacity] : null]);
      }

      function tzMapSigAreas(pmr, mp) {
        var gl = pmr.data.st().globals || {};
        return tzLayerSig([mp.common, TZ_WORK_MODES.map(function (m) { return gl["cutArea" + m] || null; })]);
      }

      // after tzMapZonesPlan: what is shown is in the plan (rectangles, markers, warnings, material)
      function tzMapSigZones(pmr, mp) {
        return tzLayerSig([mp.common, pmr.data.zones(), pmr.data.zoneSizes(), pmr.tools.zonePick(), mp.rectZone, mp.gList, mp.zoneNw, mp.activeMaterial]);
      }

      // Also leaves in mp what the layer draws from: pHit (clamps the job passes over), vision (the recent detection), refPoints, zPoint.
      function tzMapSigMarks(pmr, mp) {
        var L = pmr.layerState.layers(), st = pmr.data.st(), full = !mp.focus;
        mp.pHit = mp.focus ? pmr.nav.module("job").hits(pmr.data.clampsAct()) : [];
        var tv = window.__workshop && window.__workshop.vision;
        mp.vision = L.vision && full && tv && tv.items && Date.now() - tv.ts < 30 * 60000 ? tv : null;
        mp.refPoints = L.refs && full ? pmr.snap.refPoints() : [];
        mp.zPoint = (L.zpoint && full && pmr.data.zonePoint(st.wn)) || null;
        return tzLayerSig([mp.common, pmr.tools.ptPick() || null,
          L.offcuts && full ? pmr.data.offcuts() : null,
          mp.vision ? [mp.vision.ts, mp.vision.items] : null,
          pmr.data.clamps(), mp.pHit,
          L.positions && full ? [pmr.data.savedPos(), pmr.tools.posPick(), !pmr.nav.layMod()] : null,
          L.refs && full ? [L.zones ? null : [pmr.data.zones(), pmr.data.zoneSizes()], mp.refPoints] : null,
          mp.zPoint ? [mp.zPoint, pmr.data.probeOffset()] : null]);
      }

      function tzMapSigOrigin(pmr, mp) {
        var wn = pmr.data.st().wn, az = pmr.data.zones()[wn];
        return tzLayerSig([mp.common, az ? [az.refX, az.refY] : null, !!mp.rectZone[wn]]);
      }

      // the ruler is drawn for the SIZE of the visible region (vr: the view box and the strips of "meet"), the svg on screen and the
      // theme; not for where the view is: a pan (follow the head) moves the kept ruler (31-map-render-ruler.js). The size is rounded so
      // that the float noise of the screen matrix does not build it again.
      function tzMapSigRuler(pmr, mp, vr) {
        var svg = pmr.shell.svg();
        return tzLayerSig([mp.common, Number(vr.w.toPrecision(9)), Number(vr.h.toPrecision(9)), svg.clientWidth, svg.clientHeight, mp.TH.bg]);
      }
