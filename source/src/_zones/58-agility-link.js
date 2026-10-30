      // ---- Agility (stage 5): the link between the page and 52-56 ----
      //
      // 56-agility.js (command palette, shortcuts, global undo, favourites, right-click menu) knows nothing about the page: it gets an adapter A
      // of closures. This file registers it as a module of the page (tzRegisterModule, 20-mode-profile.js): tzMountPage mounts it when
      // everything exists (with the host of the page: the interfaces of its parts) and closes it on destroy; its API is what mount returns. The adapter reads the page at call time (the machine state, the view... change while the page lives).
      tzRegisterModule({
        id: "agility",
        minRole: "technician", // command palette and own shortcuts: not for the Operator / viewer views (20-role-view.js)
        mount: function (host) {
          return tzAgilityAssemble({
            page: host.shell.page(),
            header: host.shell.header(),
            live: function () { return host.shell.alive(); },
            mode: function () { return host.data.st() ? host.data.st().mode : null; },
            layout: function () { return host.nav.layout(); },
            goLayout: function (l) { return host.nav.goLayout(l); },
            steps: function () { return host.nav.pag().groups.map(function (g) { return { label: g[0], tools: g[1] }; }); },
            tools: function () {
              return host.nav.pag().layouts.filter(function (l) { return !!host.nav.tabs()[l]; }).map(function (l) { return { id: l, label: host.nav.tabs()[l][1], help: host.nav.tabs()[l][2] }; });
            },
            free: function () { return host.data.machineFree(); }, // tzMachineFree: the guard of every command that could move the machine
            tool: function () { return host.tools.mapTool(); },
            setTool: function (t) { host.tools.setTool(t); },
            canMeasure: function () { return !host.nav.layMod(); },
            zoneActive: function () { host.nav.chooseZSub("active"); host.nav.goLayout("zones"); },
            zoomin: function () { host.view.mapZoomAt(1.5); },
            zoomout: function () { host.view.mapZoomAt(1 / 1.5); },
            adjust: function () { host.view.setMapView(null); if (host.data.st()) host.shell.renderMap(); host.view.paintZoomLbl(); },
            screen: function () { host.view.fsButton().click(); },
            cancel: function () {
              var hizo = false;
              if (host.tools.popupOpen()) { host.tools.closePosPop(); hizo = true; }
              if (host.tools.mapTool() === "measure" || host.tools.mapTool() === "camera") { host.tools.setTool("point"); hizo = true; }
              return hizo;
            },
            cuts: function () { return host.nav.module("cuts"); },
            repaint: function () { host.dock.paint(); },
            view: {
              read: function () { return { v: host.view.mapView() ? { x: host.view.mapView().x, y: host.view.mapView().y, w: host.view.mapView().w, h: host.view.mapView().h } : null, rot: host.view.mapRot(), mirror: host.view.mapMirror() }; },
              put: function (o) { host.view.restore(o); },
              // only the changes the person makes count: not the map following a job by itself
              active: function () { return !host.view.mapFollow() && !host.view.focusZoom() && !(host.data.st() && tzJobInProgress(host.data.st())); },
            },
            timers: host.shell.timers(),
          });
        },
        destroy: function (host, api) {
          if (api) api.destroy();
        },
      });
