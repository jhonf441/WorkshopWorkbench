      function tzViewMapSizeName(pvw, id) {
        return id === "small" ? i18nT('zonesPage.small') : id === "large" ? i18nT('zonesPage.large') : id === "hidden" ? i18nT('zonesPage.hidden') : i18nT('zonesPage.medium_2');
      }

      function tzViewPaintMapSize(pvw) {
        var s = pvw.MAP_SIZES.filter(function (q) { return q[0] === pvw.mapSize; })[0];
        pvw.mapSizeBtn.style.display = pvw.wsNarrow ? "" : "none";
        var capT = pvw.mapSizeBtn.querySelector(".tzm-cap");
        if (capT) { capT.textContent = tzViewMapSizeName(pvw, pvw.mapSize); pvw.mapSizeBtn.title = i18nT('zonesPage.map', { mapSize: tzViewMapSizeName(pvw, pvw.mapSize) }); }
        else pvw.mapSizeBtn.textContent = i18nT('zonesPage.map', { mapSize: tzViewMapSizeName(pvw, pvw.mapSize) });
        pvw.shell.ws().classList.toggle("maphide", pvw.mapSize === "hidden");
        if (s[1]) pvw.shell.ws().style.setProperty("--tz-maph", s[1]);
      }

      function tzViewSaveView(pvw) {
        try {
          localStorage.setItem(pvw.TZ_VIEW_KEY, JSON.stringify({ rot: pvw.mapRot, mirror: pvw.mapMirror, theme: pvw.mapTheme, bed: pvw.mapBed }));
        } catch (e) {
          /* no critico */
        }
      }

      function tzViewMapThemeKey(pvw) {
        if (pvw.mapTheme !== "auto") return pvw.mapTheme;
        return document.querySelector("." + workshopHostThemeLightClass()) ? "bright" : "dark";
      }

      function tzViewXfId(pvw) { return pvw.mapRot === 0 && !pvw.mapMirror; }

      // matriz lineal: primero espejo (x -> -x), despues giro horario
      function tzViewXfMat(pvw) { return tzXfMat(pvw.mapRot, pvw.mapMirror); }

      function tzViewXfP(pvw, x, y) { var M = tzViewXfMat(pvw); return { x: M.a * x + M.c * y, y: M.b * x + M.d * y }; }

      function tzViewXfInvP(pvw, x, y) { var M = tzViewXfMat(pvw); return { x: M.a * x + M.b * y, y: M.c * x + M.d * y }; }

      function tzViewXfBox(pvw, r) {
        var cs = [tzViewXfP(pvw, r.x, r.y), tzViewXfP(pvw, r.x + r.w, r.y), tzViewXfP(pvw, r.x, r.y + r.h), tzViewXfP(pvw, r.x + r.w, r.y + r.h)];
        var xs = cs.map(function (q) { return q.x; }), ys = cs.map(function (q) { return q.y; });
        var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
        return { x: x0, y: y0, w: Math.max.apply(null, xs) - x0, h: Math.max.apply(null, ys) - y0 };
      }

      // Straightens the texts of an already transformed group (once each).
      function tzViewXfUpright(pvw, root) {
        if (!root || tzViewXfId(pvw)) return;
        var M = tzViewXfMat(pvw);
        var inv = "matrix(" + [M.a, M.c, M.b, M.d, 0, 0].join(" ") + ")";
        root.querySelectorAll("text").forEach(function (t) {
          if (t.getAttribute("data-up")) return;
          var x = parseFloat(t.getAttribute("x")) || 0, y = parseFloat(t.getAttribute("y")) || 0;
          t.setAttribute("transform", "translate(" + x + " " + y + ") " + inv + " translate(" + -x + " " + -y + ") " + (t.getAttribute("transform") || ""));
          t.setAttribute("data-up", "1");
        });
      }

      // viewBox units per screen pixel (preserveAspectRatio meet)
      function tzViewMapUnitsPerPx(pvw) {
        var v = tzViewXfBox(pvw, pvw.mapView || pvw.mapFull || { x: 0, y: 0, w: 1, h: 1 });
        return Math.max(v.w / (pvw.shell.svg().clientWidth || 1), v.h / (pvw.shell.svg().clientHeight || 1));
      }

      function tzViewSetView(pvw, ch) {
        if ("rot" in ch) pvw.mapRot = ch.rot;
        if ("mirror" in ch) pvw.mapMirror = ch.mirror;
        if ("theme" in ch) pvw.mapTheme = ch.theme;
        if ("bed" in ch) pvw.mapBed = ch.bed;
        tzViewSaveView(pvw);
        if ("rot" in ch || "mirror" in ch) { pvw.mapView = null; tzViewPaintZoomLbl(pvw); }
        pvw.viewSetListeners.forEach(function (fn) { fn(); });
        if (pvw.data.st()) pvw.shell.renderMap();
      }

      // A view saved by the command palette (rotation, mirror and window) is put back
      function tzViewRestore(pvw, o) {
        pvw.mapRot = o.rot;
        pvw.mapMirror = o.mirror;
        pvw.mapView = o.v ? tzViewMapClampView(pvw, o.v) : null;
        pvw.focusZoom = false;
        tzViewSaveView(pvw);
        pvw.viewSetListeners.forEach(function (fn) { fn(); });
        tzViewPaintZoomLbl(pvw);
        if (pvw.data.st()) pvw.shell.renderMap();
      }

      function tzViewSetMiniHidden(pvw, hidden) {
        pvw.miniHidden = hidden;
        try {
          localStorage.setItem("workshopMapMiniHidden", pvw.miniHidden ? "1" : "0");
        } catch (e) {
          /* no critico */
        }
      }

      function tzViewMapClampView(pvw, v) { return tzClampView(v, pvw.mapFull, pvw.MAP_MAX_ZOOM, pvw.MAP_MIN_ZOOM); }

      function tzViewMapZoomAt(pvw, f, sx, sy) {
        if (!pvw.mapFull) return;
        var v = pvw.mapView || pvw.mapFull;
        var nw = v.w / f;
        var nh = nw * (pvw.mapFull.h / pvw.mapFull.w);
        var cx = sx === undefined ? v.x + v.w / 2 : sx;
        var cy = sy === undefined ? v.y + v.h / 2 : sy;
        pvw.mapView = tzViewMapClampView(pvw, { x: cx - (cx - v.x) * (nw / v.w), y: cy - (cy - v.y) * (nh / v.h), w: nw, h: nh });
        pvw.focusZoom = false; // the user took the view: the map no longer fits itself to the job
        if (pvw.data.st()) pvw.shell.renderMap();
        tzViewPaintZoomLbl(pvw);
      }

      function tzViewPaintZoomLbl(pvw) {
        pvw.zoomLbl.textContent = i18nT('zonesPage.zoom_x_2', { v: pvw.mapView && pvw.mapFull ? (pvw.mapFull.w / pvw.mapView.w).toFixed(1) : "1" });
      }

      function tzViewSetFollow(pvw, on) {
        pvw.mapFollow = !!on;
        pvw.followBtn.classList.toggle("primary", pvw.mapFollow);
        if (pvw.mapFollow && !pvw.mapView && pvw.mapFull) pvw.mapView = tzViewMapClampView(pvw, { x: pvw.mapFull.x, y: pvw.mapFull.y, w: pvw.mapFull.w / 3, h: pvw.mapFull.h / 3 });
        if (pvw.data.st()) pvw.shell.renderMap();
        tzViewPaintZoomLbl(pvw);
      }

      function tzViewPaintLayersOpen(pvw) {
        var ab = pvw.layersCol ? pvw.layersOpen : pvw.layersFloating;
        pvw.shell.layerPanel().style.display = ab ? "" : "none";
        pvw.layersBtn.classList.toggle("primary", ab);
      }

      function tzViewOnFsChange(pvw) {
        var on = document.fullscreenElement === pvw.shell.mapCard() || (pvw.shell.ws() && document.fullscreenElement === pvw.shell.ws());
        pvw.shell.mapCard().classList.toggle("tzm-fs", on);
        if (pvw.shell.ws()) pvw.shell.ws().classList.toggle("tz-ws-fs", on && document.fullscreenElement === pvw.shell.ws());
        pvw.fsPanelBtn.style.display = on ? "" : "none";
        pvw.fsBtn.classList.toggle("primary", on);
        pvw.fsBtn.title = (on ? i18nT('zonesPage.exit_full_screen') : i18nT('zonesPage.full_screen'));
        (on ? document.fullscreenElement : document.body).appendChild(pvw.shell.mapTip()); // the tooltip has to be inside to be seen
        if (pvw.data.st()) pvw.shell.renderMap();
        // Chrome termina de agrandar despues del evento: otra vez al acomodarse
        setTimeout(function () { if (pvw.shell.alive() && pvw.data.st()) pvw.shell.renderMap(); }, 350);
      }

      function tzViewMiniClick(pvw, ev) {
        ev.stopPropagation();
        var m = pvw.miniSvg.getScreenCTM();
        if (!m || !pvw.mapView) return;
        var pt = pvw.miniSvg.createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        var q = pt.matrixTransform(m.inverse());
        q = tzViewXfInvP(pvw, q.x, q.y);
        if (pvw.mapFollow) tzViewSetFollow(pvw, false);
        pvw.mapView = tzViewMapClampView(pvw, { x: q.x - pvw.mapView.w / 2, y: q.y - pvw.mapView.h / 2, w: pvw.mapView.w, h: pvw.mapView.h });
        pvw.focusZoom = false; // the user took the view
        if (pvw.data.st()) pvw.shell.renderMap();
      }

      function tzViewDrawMinimap(pvw) {
        // Hidden from Layers > View (2026-10-10). When on it is ALWAYS seen, also
        // without zoom (2026-10-11: "the minimap is not shown when activated": before it
        // only appeared when zooming in, and the normal view has no zoom)
        if (pvw.miniHidden || !pvw.mapFull || !pvw.data.st() || !pvw.data.st().axes.X) {
          pvw.miniBox.style.display = "none";
          return;
        }
        pvw.miniBox.style.display = "block";
        var mfv = tzViewXfBox(pvw, pvw.mapFull);
        tzSvgSetChanged(pvw.miniSvg, { viewBox: mfv.x + " " + mfv.y + " " + mfv.w + " " + mfv.h });
        // the bed, the area and the zones are a kept group (built again only when they change); the head and the view are moved
        var st = pvw.data.st(), ax = st.axes, W = pvw.mapFull.w;
        var sig = tzLayerSig([pvw.mapFull, pvw.mapRot, pvw.mapMirror, [ax.X.min, ax.X.max, ax.Y.min, ax.Y.max], st.cutArea, st.mode, st.wn, pvw.data.zones(), pvw.data.zoneSizes()]);
        var fixed = tzLayerGet(pvw.miniCache, "fixed", sig, function (g) { tzViewMinimapFixed(pvw, g); });
        var moving = tzLayerGet(pvw.miniCache, "moving", tzLayerSig([W, pvw.mapRot, pvw.mapMirror]), function (g) { tzViewMinimapMoving(pvw, g); });
        tzSvgSetChanged(pvw.miniHead, { cx: ax.X.machinePosition, cy: -ax.Y.machinePosition });
        var vv = pvw.mapView || pvw.mapFull; // without zoom: the view is the whole map
        tzSvgSetChanged(pvw.miniView, { x: vv.x, y: vv.y, width: vv.w, height: vv.h });
        if (pvw.miniSvg.firstChild !== fixed || pvw.miniSvg.lastChild !== moving || pvw.miniSvg.childNodes.length !== 2) {
          while (pvw.miniSvg.firstChild) pvw.miniSvg.removeChild(pvw.miniSvg.firstChild);
          pvw.miniSvg.appendChild(fixed);
          pvw.miniSvg.appendChild(moving);
        }
      }

      // the rotation / mirror of the map on a minimap group
      function tzViewMinimapTransform(pvw, g) {
        var Mm = tzViewXfMat(pvw);
        if (!tzViewXfId(pvw)) g.setAttribute("transform", "matrix(" + [Mm.a, Mm.b, Mm.c, Mm.d, 0, 0].join(" ") + ")");
      }

      function tzViewMinimapFixed(pvw, g) {
        tzViewMinimapTransform(pvw, g);
        var st = pvw.data.st(), ax = st.axes, W = pvw.mapFull.w;
        function n(tag, at) {
          var e = document.createElementNS(TZ_SVG_NS, tag);
          Object.keys(at).forEach(function (q) { e.setAttribute(q, at[q]); });
          g.appendChild(e);
        }
        n("rect", { x: pvw.mapFull.x, y: pvw.mapFull.y, width: pvw.mapFull.w, height: pvw.mapFull.h, fill: "#0d0d0d" });
        n("rect", { x: ax.X.min, y: -ax.Y.max, width: ax.X.max - ax.X.min, height: ax.Y.max - ax.Y.min, fill: "#1b1b1b", stroke: "#616161", "stroke-width": W / 200 });
        var a = st.cutArea;
        if (a) n("rect", { x: a[0], y: -a[3], width: a[1] - a[0], height: a[3] - a[2], fill: "none", stroke: TZ_AREA_COLORS[st.mode] || "#ff7043", "stroke-width": W / 200 });
        pvw.data.zones().forEach(function (z, i) {
          if (!z) return;
          var sz = pvw.data.zoneSizes()[i];
          if (sz && sz.w > 0) n("rect", { x: z.refX, y: -(z.refY + sz.h), width: sz.w, height: sz.h, fill: i === st.wn ? "rgba(30,136,229,0.5)" : "rgba(144,202,249,0.25)" });
          else n("circle", { cx: z.refX, cy: -z.refY, r: W / 80, fill: i === st.wn ? "#1e88e5" : "#78909c" });
        });
      }

      // the head (pvw.miniHead) and the visible window (pvw.miniView): only their position is written on each redraw
      function tzViewMinimapMoving(pvw, g) {
        tzViewMinimapTransform(pvw, g);
        var W = pvw.mapFull.w;
        pvw.miniHead = document.createElementNS(TZ_SVG_NS, "circle");
        pvw.miniHead.setAttribute("r", W / 60);
        pvw.miniHead.setAttribute("fill", "#fff");
        g.appendChild(pvw.miniHead);
        pvw.miniView = document.createElementNS(TZ_SVG_NS, "rect");
        pvw.miniView.setAttribute("fill", "rgba(255,224,130,0.12)");
        pvw.miniView.setAttribute("stroke", "#ffe082");
        pvw.miniView.setAttribute("stroke-width", W / 120);
        g.appendChild(pvw.miniView);
      }
