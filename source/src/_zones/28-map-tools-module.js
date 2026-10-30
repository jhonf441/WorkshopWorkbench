      // ---- Workbench page, part 6: the taps for the map module of the open tab (Laser editor, Mesh, Simulate ...) ----
      // Listened to in capture (before the tools of the map): the module takes the press, the drag and the tap when it wants them
      // (layMod(), 22-page-nav.js). A press it took swallows the click that follows.

      function tzToolModuleDown(pmt, ev) {
        if (!pmt.nav.layMod() || !pmt.data.st() || ev.button > 0) return;
        var p = pmt.view.svgPoint(ev);
        if (!p) return;
        var tolC = 10 * ((pmt.view.mapView() || pmt.view.mapFull() || { w: 1 }).w / (pmt.shell.svg().clientWidth || 1));
        if (pmt.nav.layMod().pointerDown(pmt.snap.mapPick(p), tolC)) {
          ev.stopImmediatePropagation(); // no panear el mapa
          ev.preventDefault();
          pmt.cutsSwallowClick = true;
          try {
            pmt.shell.svg().setPointerCapture(ev.pointerId);
          } catch (e) {
            /* no critico */
          }
        }
      }

      function tzToolModuleMove(pmt, ev) {
        if (!pmt.nav.layMod() || !pmt.nav.layMod().dragging()) return;
        var p = pmt.view.svgPoint(ev);
        if (!p) return;
        ev.stopImmediatePropagation();
        pmt.nav.layMod().pointerMove(pmt.snap.mapPick(p));
      }

      function tzToolModuleUp(pmt, ev) {
        if (!pmt.nav.layMod() || !pmt.nav.layMod().dragging()) return;
        var p = pmt.view.svgPoint(ev);
        ev.stopImmediatePropagation();
        pmt.nav.layMod().pointerUp(p ? pmt.snap.mapPick(p) : null);
      }

      function tzToolModuleClick(pmt, ev) {
        if (pmt.cutsSwallowClick) {
          // the tap was already resolved by pointerdown/up (draw or move)
          pmt.cutsSwallowClick = false;
          ev.stopImmediatePropagation();
          ev.preventDefault();
          return;
        }
        if (!pmt.nav.layMod() || !pmt.nav.layMod().wantsClick() || !pmt.data.st()) return;
        ev.stopPropagation();
        ev.preventDefault();
        var p = pmt.view.svgPoint(ev);
        if (!p) return;
        pmt.nav.layMod().onClick(pmt.snap.mapPick(p));
      }
