      // ---- Workbench page, base part: the shell (step 6 of the restructuring, docs-internal/INTERFACES.md) ----
      // What every part of the page draws into and the life of the page: the page and its header, the map card (svg, its box, the
      // layers column, the status line), the workspace (map | side panel), the floating tooltip of the map, the page message under
      // the zones table, alive and the timers. And the two redraw requests: renderMap() is answered by the map drawing
      // (31-map-render.js) and render() by the page (every card): the parts below ask for a redraw without depending on the parts
      // that draw (one listener each, subscribed when the page is put together).
      var TZ_SVG_NS = "http://www.w3.org/2000/svg";

      function tzShellCreate() {
        var psh = {
          alive: true,
          timers: [], // setInterval ids of the page (cleared on destroy)
          page: null,
          header: null,
          mapCard: null,
          toolGrp: null,
          svg: null,
          svgBox: null,
          layerPanel: null,
          mapStatus: null,
          ws: null,
          wsMap: null,
          wsSide: null,
          mapTip: null,
          pageMsg: null,
          mapRoot: null, // group of the drawn map (renderMap redoes it)
          renderMapListeners: [],
          renderListeners: [],
        };
        return {
          alive: function () { return psh.alive; },
          close: function () { psh.alive = false; },
          timers: function () { return psh.timers; },
          page: function () { return psh.page; },
          header: function () { return psh.header; },
          mapCard: function () { return psh.mapCard; },
          toolGrp: function () { return psh.toolGrp; },
          svg: function () { return psh.svg; },
          svgBox: function () { return psh.svgBox; },
          layerPanel: function () { return psh.layerPanel; },
          mapStatus: function () { return psh.mapStatus; },
          ws: function () { return psh.ws; },
          wsMap: function () { return psh.wsMap; },
          wsSide: function () { return psh.wsSide; },
          mapTip: function () { return psh.mapTip; },
          mapRoot: function () { return psh.mapRoot; },
          setMapRoot: function (g) { psh.mapRoot = g; },
          buildPage: tzBind(tzShellBuildPage, psh),
          buildMap: tzBind(tzShellBuildMap, psh),
          buildWorkspace: tzBind(tzShellBuildWorkspace, psh),
          buildTip: function () { psh.mapTip = tzEl("div"); return psh.mapTip; },
          buildPageMessage: function () { psh.pageMsg = tzEl("div", "tz-msg", ""); return psh.pageMsg; },
          pageMessage: function (text, ok) { tzSetMsg(psh.pageMsg, text, ok); },
          wsTop: tzBind(tzShellWsTop, psh),
          renderMap: function () { psh.renderMapListeners.forEach(function (fn) { fn(); }); },
          onRenderMap: function (fn) { psh.renderMapListeners.push(fn); },
          render: function () { psh.renderListeners.forEach(function (fn) { fn(); }); },
          onRender: function (fn) { psh.renderListeners.push(fn); },
        };
      }

      // The page and its header inside the root of the route
      function tzShellBuildPage(psh, root) {
        root.innerHTML = "";
        psh.page = tzEl("div", "tz-page workshop-theme");
        root.appendChild(psh.page);
        psh.header = tzEl("div", "wf-bar tz-hd");
        psh.page.appendChild(psh.header);
      }

      // The map card in col: its top bar (returned: the page adds its groups), the svg in its box, the layers column and the status line
      function tzShellBuildMap(psh, col) {
        psh.mapCard = tzEl("div", "tzm-card"); // the map is a dark canvas: it keeps its own look (not a family card)
        col.appendChild(psh.mapCard);
        // Redesign 2026-10-09 ("the zones chart more advanced and better
        // organized"): top bar (View/Point/Measure tools, zoom,
        // follow head, layers, full screen), the map with the grouped
        // LAYERS panel on the side (with its legend), minimap with zoom and a
        // status bar below (cursor, head, laser, zone, measure).
        var mapBar = tzEl("div", "tzm-bar");
        psh.mapCard.appendChild(mapBar);
        mapBar.appendChild(tzEl("h3", "tzm-title", i18nT('zonesPage.bed_map')));
        psh.toolGrp = tzEl("div", "tzm-grp");
        mapBar.appendChild(psh.toolGrp);
        var mapRow = tzEl("div", "tzm-row");
        psh.mapCard.appendChild(mapRow);
        psh.svg = document.createElementNS(TZ_SVG_NS, "svg");
        psh.svg.style.cssText = "width:100%;height:auto;max-height:70vh;background:#121212;border-radius:4px;display:block;";
        // relative container: the "Go to ..." notice of a position is placed
        // over the map, next to the tapped diamond
        psh.svgBox = tzEl("div");
        psh.svgBox.style.position = "relative";
        psh.svgBox.appendChild(psh.svg);
        psh.svgBox.style.cssText += "flex:1 1 auto;min-width:0;";
        mapRow.appendChild(psh.svgBox);
        psh.layerPanel = tzEl("div", "tzm-layers");
        mapRow.appendChild(psh.layerPanel);
        psh.mapStatus = tzEl("div", "tzm-status");
        psh.mapCard.appendChild(psh.mapStatus);
        return mapBar;
      }

      // The workspace (map | side panel) of the page, before `before`; the map card moves into it
      function tzShellBuildWorkspace(psh, before) {
        psh.page.classList.add("tz-wsp");
        psh.ws = tzEl("div", "tz-ws");
        psh.wsMap = tzEl("div", "tz-ws-map");
        psh.wsSide = tzEl("div", "tz-ws-side");
        psh.ws.appendChild(psh.wsMap);
        psh.ws.appendChild(psh.wsSide);
        psh.page.insertBefore(psh.ws, before);
        psh.wsMap.appendChild(psh.mapCard);
      }

      function tzShellWsTop(psh) {
        var hb = document.querySelector("header.v-app-bar") || document.querySelector(".v-app-bar");
        var b = hb ? hb.getBoundingClientRect().bottom : 64;
        psh.ws.style.setProperty("--tz-top", Math.max(0, Math.round(b)) + "px");
        // 2026-10-10 ("make the map fit the screen height"): with zoom
        // x1 the map was workshop than what is visible (it starts below DWC's
        // panels) and was cut off at the bottom. Height = what is left of the window
        // below the map WITHOUT scrolling the page, minus the map's
        // status bar. If very little is left (small screen), the old way: the map stays
        // fixed at the top when scrolling the page and fits entirely there.
        var sr = psh.svg.getBoundingClientRect(), mr = psh.wsMap.getBoundingClientRect(), wr = psh.ws.getBoundingClientRect();
        if (!sr.height || !mr.height) return;
        var up = wr.top + (window.scrollY || 0) + (sr.top - mr.top); // where the map starts with the page at the very top
        var down = mr.bottom - sr.bottom; // barra de estado y bordes debajo del mapa
        var fit = Math.floor(window.innerHeight - up - down - 16);
        if (fit >= 320) psh.ws.style.setProperty("--tz-fit", fit + "px");
        else psh.ws.style.removeProperty("--tz-fit");
      }

      // A message line: text, class ok / err (no text: no class)
      function tzSetMsg(el, text, ok) {
        el.textContent = text || "";
        el.className = "tz-msg" + (text ? (ok ? " ok" : " err") : "");
      }
