      function tzToolCameraLiveSet(pmt, on) {
        pmt.cameraTool.live = !!on;
        try { localStorage.setItem("workshopCameraLive", on ? "1" : "0"); } catch (e) { /* no critico */ }
        tzToolPaintCameraZ(pmt);
      }

      // What can be seen: resolution, mm per pixel and area at height z
      function tzToolCameraInfo(pmt, cp, z) {
        var r = pmt.camera.map().res ? pmt.camera.map().res() : { w: 0, h: 0 };
        if (!cp || !r.w || !r.h) return null;
        var h = pmt.camera.map().fingerprint(cp.x, cp.y, z);
        if (!h) return null;
        var d = function (a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); };
        var w = (d(h.pts[0], h.pts[1]) + d(h.pts[3], h.pts[2])) / 2;
        var hh = (d(h.pts[0], h.pts[3]) + d(h.pts[1], h.pts[2])) / 2;
        return { rw: r.w, rh: r.h, w: w, h: hh, mmpx: w / r.w };
      }

      function tzToolCameraInfoTxt(pmt, i) {
        return i18nT('zonesPage.px_mm_px_px_mm_sees', { rw: i.rw, rh: i.rh, v: Math.round(i.mmpx * 1000) / 1000, v2: Math.round(1 / i.mmpx * 10) / 10, w: Math.round(i.w), h: Math.round(i.h) });
      }

      // Moves now (live mode). Without homing, busy or with a job: no.
      // 2026-10-10 (BUG: visionpose.g every 2-5 s without anyone touching anything):
      // a drag that stayed "stuck" (the button was released outside the
      // window) sent a movement with every mouse pointermove. Now the
      // machine only moves with a gesture from less than 1.5 s ago.
      function tzToolCameraGesture(pmt) {
        pmt.cameraTool.gestureTs = Date.now();
      }

      // Z being requested with the wheel or the pinch (before sending it)
      function tzToolCameraZPrev(pmt) {
        return pmt.cameraTool.zAcc || pmt.cameraTool.zPinch || 0;
      }

      function tzToolCameraZDestination(pmt, cp, dz) {
        return Math.round(Math.min(Math.max(Math.max(cp.z, pmt.CAMERA_ZMIN) + dz, pmt.CAMERA_ZMIN), cp.zmax) * 10) / 10;
      }

      function tzToolCameraGestureRecent(pmt) {
        return Date.now() - (pmt.cameraTool.gestureTs || 0) < 1500;
      }

      function tzToolCameraIr(pmt, t) {
        var cp = tzToolCameraPose(pmt);
        if (!cp) return;
        if (!tzToolCameraGestureRecent(pmt)) { pmt.cameraTool.sig = null; return; }
        if (!cp.homed || !pmt.data.machineFree()) {
          pmt.cameraTool.msg = !cp.homed ? (cp.carriage ? i18nT('zonesPage.live_x_y_and_z_are') : i18nT('zonesPage.live_y_and_z_are_not')) : i18nT('zonesPage.live_the_machine_is_busy_or');
          // 2026-10-11 ("the animation does not hold, it is removed"): without being able to move, the preview
          // stays a few seconds in red with the reason instead of disappearing abruptly
          pmt.cameraTool.noMoves = { x: t.x, y: t.y, z: t.z, txt: !cp.homed ? i18nT('zonesPage.not_moving_homing_missing') : i18nT('zonesPage.not_moving_the_machine_is_busy'), until: Date.now() + 3500 };
          tzToolPlaceCameraTool(pmt);
          setTimeout(function () { if (pmt.shell.alive()) tzToolPlaceCameraTool(pmt); }, 3600);
          return;
        }
        pmt.cameraTool.liveDest = { x: t.x, y: t.y, z: t.z, ts: Date.now() }; // it is drawn until it arrives
        tzToolPlaceCameraTool(pmt); // without waiting for the next map refresh (2026-10-11)
        if (pmt.cameraTool.inProgress) { pmt.cameraTool.sig = t; return; }
        pmt.cameraTool.inProgress = true;
        pmt.cameraTool.msg = "";
        tzToolPaintCameraZ(pmt);
        tzCode('M98 P"0:/sys/workshop/macros/visionpose.g"' + (cp.carriage ? " X" + t.x : "") + " Y" + t.y + " Z" + t.z)
          .then(function (r) {
            if (/error|abort/i.test(r || "")) throw new Error(String(r).replace(/^\s*(Error:\s*)?/i, ""));
          })
          .catch(function (e) { pmt.cameraTool.msg = i18nT('zonesPage.could_not_move_2', { err: e.message || e }); pmt.cameraTool.sig = null; })
          .then(function () {
            pmt.cameraTool.inProgress = false;
            var n = pmt.cameraTool.sig;
            pmt.cameraTool.sig = null;
            if (n && tzToolCameraGestureRecent(pmt)) tzToolCameraIr(pmt, n);
            else tzToolPaintCameraZ(pmt);
          });
      }

      // 2026-10-10 (Find center with the camera: "drag what the
      // camera sees and have it move there; enlarging or shrinking the image raises or
      // lowers Z, automatic"): the tool also works without choosing it
      // when the layout's module asks for it (Find center, points with camera).
      function tzToolCameraActive(pmt) {
        // in all the sections (2026-10-10: "only in some can the
        // camera be moved"): in the drawing ones, tapping still belongs to the section and the
        // camera is moved by dragging its image, with the wheel or pinching
        if (pmt.mapTool === "camera") return true;
        var lm = pmt.nav.layMod();
        return !!(lm && lm.wantsCamera && lm.wantsCamera());
      }

      // carriage: the camera is on the CARRIAGE (Vision > Settings) and also moves in X
      function tzToolCameraPose(pmt) {
        var ax = pmt.data.st() && pmt.data.st().axes;
        if (!ax || !ax.Y || !ax.Z || !ax.X) return null;
        var carriage = pmt.camera.map().inCarriage();
        return {
          carriage: carriage,
          x: +ax.X.machinePosition, y: +ax.Y.machinePosition, z: +ax.Z.machinePosition,
          xmin: ax.X.min, xmax: ax.X.max, ymin: ax.Y.min, ymax: ax.Y.max, zmax: ax.Z.max,
          homed: !!(ax.Y.homed && ax.Z.homed && (ax.X.homed || !carriage)),
        };
      }

      function tzToolCameraFingerprint(pmt, cp) {
        return cp ? pmt.camera.map().fingerprint(cp.x, cp.y, cp.z) : null;
      }

      function tzToolCameraInside(pmt, pt, pol) {
        var c = false;
        for (var i = 0, j = pol.length - 1; i < pol.length; j = i++) {
          var a = pol[i], b = pol[j];
          if (a[1] > pt.y !== b[1] > pt.y && pt.x < ((b[0] - a[0]) * (pt.y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
        }
        return c;
      }

      // Proposes moving the camera to (x, y, z): notice with what is going to happen and
      // Move / Cancel. x only with the camera on the carriage.
      function tzToolCameraPropose(pmt, x, y, z, ev) {
        var cp = tzToolCameraPose(pmt);
        if (!cp) return;
        var tx = cp.carriage ? Math.round(Math.min(Math.max(x, cp.xmin), cp.xmax) * 10) / 10 : cp.x;
        var ty = Math.round(Math.min(Math.max(y, cp.ymin), cp.ymax) * 10) / 10;
        var tz = Math.round(Math.min(Math.max(z, pmt.CAMERA_ZMIN), cp.zmax) * 10) / 10;
        if (pmt.cameraTool.live) {
          pmt.cameraTool.target = null;
          tzToolClosePosPop(pmt);
          tzToolCameraIr(pmt, { x: tx, y: ty, z: tz });
          return;
        }
        pmt.cameraTool.target = { x: tx, y: ty, z: tz };
        pmt.posPick = null;
        pmt.ptPick = null;
        pmt.posPop.innerHTML = "";
        var t = tzEl("div", null, i18nT('zonesPage.move_the_camera'));
        t.style.cssText = "font-weight:500;color:#80deea;margin-bottom:2px;";
        pmt.posPop.appendChild(t);
        pmt.posPop.appendChild(tzEl("div", "tz-muted", cp.carriage
          ? i18nT('zonesPage.carriage_x_x_y_y_z', { x: tzFmt(cp.x), tx: tzFmt(tx), y: tzFmt(cp.y), ty: tzFmt(ty), z: tzFmt(cp.z), tz: tzFmt(tz) })
          : i18nT('zonesPage.gantry_y_y_z_z', { y: tzFmt(cp.y), ty: tzFmt(ty), z: tzFmt(cp.z), tz: tzFmt(tz) })));
        var ifT = tzToolCameraInfo(pmt, cp, tz);
        if (ifT) pmt.posPop.appendChild(tzEl("div", "tz-muted", "A Z" + tzFmt(tz) + ": " + tzToolCameraInfoTxt(pmt, ifT)));
        if (cp.z < pmt.CAMERA_ZMIN - 0.05) pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('zonesPage.raises_z_to_mm_the_minimum', { zmin: pmt.CAMERA_ZMIN })));
        var reason = !cp.homed ? (cp.carriage ? i18nT('zonesPage.x_y_and_z_need_homing') : i18nT('zonesPage.y_and_z_need_homing')) : !pmt.data.machineFree() ? i18nT('zonesPage.the_machine_is_busy_or_a') : "";
        if (reason) pmt.posPop.appendChild(tzEl("div", "tz-msg err", reason));
        var row = tzEl("div", "tz-row");
        row.style.cssText += "gap:4px;margin-top:6px;flex-wrap:wrap;";
        var bM = tzBtn(i18nT('zonesPage.move'), "primary", function () {
          bM.disabled = true;
          bM.textContent = i18nT('zonesPage.moving');
          tzCode('M98 P"0:/sys/workshop/macros/visionpose.g"' + (cp.carriage ? " X" + tx : "") + " Y" + ty + " Z" + tz)
            .then(function (r) {
              if (/error|abort/i.test(r || "")) throw new Error(String(r).replace(/^\s*(Error:\s*)?/i, ""));
              pmt.cameraTool.target = null;
              pmt.cameraTool.ok = { txt: i18nT('zonesPage.done_the_camera_is_now_at_2', { v: cp.carriage ? " X" + tzFmt(tx) : "", ty: tzFmt(ty), tz: tzFmt(tz) }), until: Date.now() + 6000 };
              tzToolClosePosPop(pmt);
              tzToolPaintCameraZ(pmt);
            })
            .catch(function (e) {
              bM.disabled = false;
              bM.textContent = i18nT('zonesPage.move');
              pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('zonesPage.could_not_move_2', { err: e.message || e })));
            });
        }, i18nT('zonesPage.confirm_moves'), "camera-move");
        bM.disabled = !!reason;
        tzTip(bM, i18nT('zonesPage.asks_for_a_second_tap_moves', { v: cp.carriage ? i18nT('zonesPage.moves_the_carriage_with_the_camera') : i18nT('zonesPage.moves_the_gantry_with_the_camera') }));
        row.appendChild(bM);
        row.appendChild(tzBtn(i18nT('zcal.cancel'), null, function () { pmt.cameraTool.target = null; tzToolClosePosPop(pmt); }));
        pmt.posPop.appendChild(row);
        tzToolPlacePop(pmt, ev);
      }

      function tzToolPaintCameraZ(pmt) {
        // without Vision installed there is no camera: the tool is not even shown
        if (pmt.toolButtons.camera) pmt.toolButtons.camera.style.display = pmt.camera.map().hasVision() === false ? "none" : "";
        if (pmt.mapTool === "camera" && pmt.camera.map().hasVision() === false) tzToolSetTool(pmt, "point");
        var on = tzToolCameraActive(pmt);
        pmt.cameraZBox.style.display = on ? "flex" : "none";
        var liveOn = on && pmt.cameraTool.live;
        pmt.cameraZBox.classList.toggle("live", liveOn);
        pmt.shell.svgBox().classList.toggle("tzm-vivomap", liveOn);
        tzToolPaintTools(pmt);
        if (on !== pmt.cameraZVis) {
          pmt.cameraZVis = on;
          // the map fits the remaining height
          if (typeof pmt.shell.wsTop === "function" && pmt.shell.ws()) setTimeout(pmt.shell.wsTop, 0);
        }
        if (!on) return;
        var cp = tzToolCameraPose(pmt);
        pmt.cameraZBox.innerHTML = "";
        // Level 2 (DESIGN.md 5): with Live the machine moves without a second
        // tap, so the amber notice stays fixed while it lasts
        var dzp = tzToolCameraZPrev(pmt);
        if (dzp && cp) {
          var zt0 = Math.max(cp.z, pmt.CAMERA_ZMIN), zt1 = tzToolCameraZDestination(pmt, cp, dzp);
          var i0 = tzToolCameraInfo(pmt, cp, zt0), i1 = tzToolCameraInfo(pmt, cp, zt1);
          var txt = "Z " + tzFmt(zt0) + " -> " + tzFmt(zt1) + " (" + (zt1 - zt0 > 0 ? "+" : "") + tzFmt(zt1 - zt0) + " mm)";
          if (i0 && i1) txt += i18nT('zonesPage.sees_mm_mm_px', { w: Math.round(i0.w), h: Math.round(i0.h), w2: Math.round(i1.w), h2: Math.round(i1.h), v: Math.round(i0.mmpx * 1000) / 1000, v2: Math.round(i1.mmpx * 1000) / 1000, v3: zt1 < zt0 ? i18nT('zonesPage.more_detail_less_area') : i18nT('zonesPage.more_area_less_detail') });
          if (zt1 === zt0) txt = i18nT('zonesPage.z_is_already_at_the_limit_2', { zt0: tzFmt(zt0) });
          pmt.cameraZBox.appendChild(tzEl("div", "tzm-zprev", txt));
        }
        if (pmt.cameraTool.live) pmt.cameraZBox.appendChild(tzEl("div", "tzm-vivobar", pmt.cameraTool.inProgress ? i18nT('zonesPage.live_moving_the_machine') : i18nT('zonesPage.live_the_machine_follows_the_camera')));
        pmt.cameraZBox.appendChild(tzEl("span", "tzm-camt", cp && cp.carriage ? i18nT('zonesPage.camera_carriage_at_x_y_z', { x: tzFmt(cp.x), y: tzFmt(cp.y), z: tzFmt(cp.z) }) : i18nT('zonesPage.camera_gantry_at_y_z', { v: tzFmt(cp && cp.y), v2: tzFmt(cp && cp.z) })));
        var h = tzToolCameraFingerprint(pmt, cp);
        pmt.cameraZBox.appendChild(tzEl("div", "tz-muted", h ? (pmt.nav.layMod() ? (cp.carriage ? i18nT('zonesPage.drag_the_image_the_machine_goes') : i18nT('zonesPage.drag_the_image_up_down_the')) : cp.carriage ? i18nT('zonesPage.drag_the_image_or_tap_where') : i18nT('zonesPage.drag_the_image_up_down_or')) : pmt.camera.map().notice() || i18nT('zonesPage.no_camera_image_at_this_height')));
        var r = tzEl("div", "tz-row");
        r.style.cssText += "gap:4px;flex-wrap:wrap;margin:0;";
        r.appendChild(tzTip(tzBtn(i18nT('zonesPage.more_area'), null, function () { tzToolCameraGesture(pmt); if (cp) tzToolCameraPropose(pmt, cp.x, cp.y, Math.max(cp.z, pmt.CAMERA_ZMIN) + 30); }), i18nT('zonesPage.raises_z_30_mm_the_camera')));
        r.appendChild(tzTip(tzBtn(i18nT('zonesPage.more_detail'), null, function () { tzToolCameraGesture(pmt); if (cp) tzToolCameraPropose(pmt, cp.x, cp.y, cp.z - 30); }), i18nT('zonesPage.lowers_z_30_mm_never_below', { zmin: pmt.CAMERA_ZMIN })));
        pmt.cameraZBox.appendChild(r);
        var inf = tzToolCameraInfo(pmt, cp, cp ? cp.z : 0);
        if (inf) {
          var it = tzEl("div", "tz-muted", tzToolCameraInfoTxt(pmt, inf));
          tzTip(it, i18nT('zonesPage.resolution_of_the_incoming_video_and'));
          pmt.cameraZBox.appendChild(it);
        }
        // Two modes in view (2026-10-10: "I want two options, the live
        // camera or the other mode")
        var sec = tzEl("span", "tzm-camseg");
        sec.appendChild(tzEl("span", "tz-muted", i18nT('zonesPage.mode_3')));
        var bConf = tzBtn(i18nT('zonesPage.confirm'), pmt.cameraTool.live ? null : "primary", function () { tzToolCameraLiveSet(pmt, false); });
        tzTip(bConf, i18nT('zonesPage.each_move_shows_where_it_goes'));
        sec.appendChild(bConf);
        var bLive = pmt.cameraTool.live
          ? tzBtn(i18nT('zonesPage.live'), "tz-armed", function () { /*  already there */ })
          : tzBtn(i18nT('zonesPage.live'), null, function () { tzToolCameraLiveSet(pmt, true); }, i18nT('zonesPage.move_live'), "camlive");
        tzTip(bLive, pmt.cameraTool.live
          ? i18nT('zonesPage.on_dragging_the_image_the_wheel', { zmin: pmt.CAMERA_ZMIN })
          : i18nT('zonesPage.the_machine_follows_the_image_while'));
        sec.appendChild(bLive);
        pmt.cameraZBox.appendChild(sec);
        if (pmt.cameraTool.ok && Date.now() < pmt.cameraTool.ok.until) pmt.cameraZBox.appendChild(tzEl("div", "tz-msg", pmt.cameraTool.ok.txt));
        if (pmt.cameraTool.msg) pmt.cameraZBox.appendChild(tzEl("div", "tz-msg err", pmt.cameraTool.msg));
        if (pmt.cameraTool.wheelHint && Date.now() < pmt.cameraTool.wheelHint) pmt.cameraZBox.appendChild(tzEl("div", "tz-msg", i18nT('zonesPage.the_wheel_on_the_image_raises')));
      }

      // Huella actual (punteada) y destino (llena) de la camara
      function tzToolPlaceCameraTool(pmt) {
        var old = pmt.shell.svg().querySelector("#tzm-camtool");
        if (old) old.parentNode.removeChild(old);
        tzToolPaintCameraZ(pmt);
        if (!tzToolCameraActive(pmt)) return;
        var cp = tzToolCameraPose(pmt);
        if (!cp) return;
        var h = tzToolCameraFingerprint(pmt, cp);
        if (!h) return;
        var k = (pmt.view.mapView() || pmt.view.mapFull() || { w: 1 }).w / (pmt.shell.svg().clientWidth || 1);
        var g = document.createElementNS(TZ_SVG_NS, "g");
        g.setAttribute("id", "tzm-camtool");
        g.setAttribute("pointer-events", "none");
        function pol(pts, dx, dy, at) {
          var n = document.createElementNS(TZ_SVG_NS, "polygon");
          n.setAttribute("points", pts.map(function (q) { return q[0] + dx + "," + -(q[1] + dy); }).join(" "));
          Object.keys(at).forEach(function (a) { n.setAttribute(a, at[a]); });
          g.appendChild(n);
        }
        pol(h.pts, 0, 0, { fill: "none", stroke: "#80deea", "stroke-width": 2 * k, "stroke-dasharray": 8 * k + " " + 5 * k });
        function arrow(a, b, color) {
          if (Math.hypot(b.cx - a.cx, b.cy - a.cy) < 2) return;
          var ln = document.createElementNS(TZ_SVG_NS, "line");
          [["x1", a.cx], ["y1", -a.cy], ["x2", b.cx], ["y2", -b.cy], ["stroke", color], ["stroke-width", 2 * k], ["stroke-dasharray", 6 * k + " " + 4 * k]].forEach(function (q) { ln.setAttribute(q[0], q[1]); });
          ln.setAttribute("class", "tzm-camdest");
          g.appendChild(ln);
          var dot = document.createElementNS(TZ_SVG_NS, "circle");
          [["cx", b.cx], ["cy", -b.cy], ["r", 5 * k], ["fill", color]].forEach(function (q) { dot.setAttribute(q[0], q[1]); });
          g.appendChild(dot);
        }
        function label(hh, txt, color) {
          var xs = hh.pts.map(function (q) { return q[0]; }), ys = hh.pts.map(function (q) { return q[1]; });
          var tx = document.createElementNS(TZ_SVG_NS, "text");
          [["x", Math.min.apply(null, xs) + 4 * k], ["y", -Math.max.apply(null, ys) - 6 * k], ["fill", color], ["font-size", 13 * k], ["font-weight", "bold"], ["stroke", "#000"], ["stroke-width", 3 * k], ["paint-order", "stroke"]].forEach(function (q) { tx.setAttribute(q[0], q[1]); });
          tx.textContent = txt;
          g.appendChild(tx);
        }
        // live: where it will end up (amber, animated) until it arrives
        var vd = pmt.cameraTool.liveDest;
        if (vd && pmt.cameraTool.live && !pmt.cameraTool.inProgress && !pmt.cameraTool.sig && Math.abs(cp.y - vd.y) < 0.6 && (!cp.carriage || Math.abs(cp.x - vd.x) < 0.6) && Math.abs(cp.z - vd.z) < 0.3) vd = pmt.cameraTool.liveDest = null;
        if (vd && (!pmt.cameraTool.live || Date.now() - vd.ts > 20000)) vd = pmt.cameraTool.liveDest = null;
        var dzp = tzToolCameraZPrev(pmt);
        if (vd) {
          var hd = pmt.camera.map().fingerprint(vd.x, vd.y, vd.z);
          if (hd) {
            pol(hd.pts, 0, 0, { fill: "rgba(255,143,0,0.12)", stroke: "#ff8f00", "stroke-width": 2.5 * k, "stroke-dasharray": 10 * k + " " + 6 * k, class: "tzm-camdest" });
            arrow(h, hd, "#ff8f00");
            label(hd, i18nT('zonesPage.it_will_end_up_here_2', { v: Math.abs(vd.z - cp.z) >= 0.5 ? " (Z" + tzFmt(vd.z) + ")" : "" }), "#ffb74d");
          }
        } else if (!dzp && pmt.cameraTool.noMoves && Date.now() < pmt.cameraTool.noMoves.until) {
          // request that could not be fulfilled (without homing or busy): in red, with the reason
          var nm = pmt.cameraTool.noMoves;
          var hn = pmt.camera.map().fingerprint(nm.x, nm.y, nm.z);
          if (hn) {
            pol(hn.pts, 0, 0, { fill: "rgba(229,57,53,0.1)", stroke: "#e53935", "stroke-width": 2.5 * k, "stroke-dasharray": 10 * k + " " + 6 * k });
            label(hn, nm.txt, "#ef9a9a");
          }
        } else if (dzp) {
          // wheel / pinch: what area it will see at the requested Z
          var zt = tzToolCameraZDestination(pmt, cp, dzp);
          var hz = pmt.camera.map().fingerprint(cp.x, cp.y, zt);
          if (hz) {
            pol(hz.pts, 0, 0, { fill: "rgba(255,143,0,0.1)", stroke: "#ff8f00", "stroke-width": 2.5 * k, "stroke-dasharray": 10 * k + " " + 6 * k, class: "tzm-camdest" });
            var dzr = zt - Math.max(cp.z, pmt.CAMERA_ZMIN);
            label(hz, "Z " + (dzr > 0 ? "+" : "") + tzFmt(dzr) + " mm -> Z" + tzFmt(zt), "#ffb74d");
          }
        } else if (pmt.cameraTool.target) {
          var ht = pmt.camera.map().fingerprint(pmt.cameraTool.target.x, pmt.cameraTool.target.y, pmt.cameraTool.target.z);
          if (ht) {
            pol(ht.pts, 0, 0, { fill: "rgba(128,222,234,0.15)", stroke: "#80deea", "stroke-width": 2.5 * k });
            arrow(h, ht, "#80deea");
          }
        } else if (pmt.cameraTool.drag && (pmt.cameraTool.drag.dx || pmt.cameraTool.drag.dy) && !pmt.cameraTool.live) pol(h.pts, pmt.cameraTool.drag.dx, pmt.cameraTool.drag.dy, { fill: "rgba(128,222,234,0.15)", stroke: "#80deea", "stroke-width": 2.5 * k });
        (pmt.shell.mapRoot() || pmt.shell.svg()).appendChild(g);
        pmt.view.xfUpright(g);
      }

      // Drag the image: changes Y (and X if the camera is on the carriage)
      function tzToolCameraPointerDown(pmt, ev) {
          if (!tzToolCameraActive(pmt) || !pmt.data.st() || ev.button > 0) return;
          var cp = tzToolCameraPose(pmt);
          var h = tzToolCameraFingerprint(pmt, cp);
          var raw = pmt.view.svgRaw(ev);
          if (!h || !raw) return;
          var p0 = { x: raw.x, y: -raw.y };
          // second finger with the first on the image: pinch = Z
          if (pmt.cameraTool.drag && pmt.cameraTool.drag.id !== ev.pointerId) {
            var d0 = Math.hypot(ev.clientX - pmt.cameraTool.drag.cx, ev.clientY - pmt.cameraTool.drag.cy) || 1;
            pmt.cameraTool.pinch = { d0: d0, d: d0, id2: ev.pointerId };
            pmt.cameraTool.drag.dx = pmt.cameraTool.drag.dy = 0;
            ev.stopImmediatePropagation();
            ev.preventDefault();
            return;
          }
          if (!tzToolCameraInside(pmt, p0, h.pts)) return; // outside the image: move the map as always
          pmt.cameraTool.drag = { x0: p0.x, y0: p0.y, dx: 0, dy: 0, carriage: cp.carriage, id: ev.pointerId, cx: ev.clientX, cy: ev.clientY, px: 0, p0: { x: cp.x, y: cp.y, z: cp.z } };
          tzToolCameraGesture(pmt);
          pmt.cameraTool.target = null;
          tzToolClosePosPop(pmt);
          ev.stopImmediatePropagation();
          ev.preventDefault();
          try { pmt.shell.svg().setPointerCapture(ev.pointerId); } catch (e) { /* no critico */ }
        }

      function tzToolCameraPointerMove(pmt, ev) {
          if (!pmt.cameraTool.drag) return;
          if (ev.pointerType === "mouse" && !ev.buttons) {
            // the button was released without the pointerup arriving: the drag ends
            pmt.cameraTool.drag = null;
            pmt.cameraTool.pinch = null;
            pmt.cameraTool.sig = null;
            tzToolPlaceCameraTool(pmt);
            return;
          }
          ev.stopImmediatePropagation();
          tzToolCameraGesture(pmt);
          if (pmt.cameraTool.pinch) {
            if (ev.pointerId === pmt.cameraTool.pinch.id2) {
              pmt.cameraTool.pinch.d = Math.hypot(ev.clientX - pmt.cameraTool.drag.cx, ev.clientY - pmt.cameraTool.drag.cy) || 1;
              var rp = pmt.cameraTool.pinch.d / pmt.cameraTool.pinch.d0;
              pmt.cameraTool.zPinch = Math.abs(rp - 1) > 0.08 ? -Math.round(((rp - 1) * 60) / 5) * 5 : 0;
              tzToolPlaceCameraTool(pmt);
            }
            return;
          }
          if (ev.pointerId !== pmt.cameraTool.drag.id) return;
          var raw = pmt.view.svgRaw(ev);
          if (!raw) return;
          pmt.cameraTool.drag.px = Math.max(pmt.cameraTool.drag.px, Math.hypot(ev.clientX - pmt.cameraTool.drag.cx, ev.clientY - pmt.cameraTool.drag.cy));
          if (pmt.cameraTool.drag.px < 8) return; // todavia es un toque
          pmt.cameraTool.drag.dy = -raw.y - pmt.cameraTool.drag.y0;
          pmt.cameraTool.drag.dx = pmt.cameraTool.drag.carriage ? raw.x - pmt.cameraTool.drag.x0 : 0;
          if (pmt.cameraTool.live && pmt.cameraTool.drag.p0) {
            // en vivo: destino = donde estaba al empezar + lo arrastrado
            var c0 = pmt.cameraTool.drag.p0;
            var cpv = tzToolCameraPose(pmt);
            if (cpv) tzToolCameraIr(pmt, {
              x: cpv.carriage ? Math.round(Math.min(Math.max(c0.x + pmt.cameraTool.drag.dx, cpv.xmin), cpv.xmax) * 10) / 10 : cpv.x,
              y: Math.round(Math.min(Math.max(c0.y + pmt.cameraTool.drag.dy, cpv.ymin), cpv.ymax) * 10) / 10,
              z: Math.round(Math.min(Math.max(c0.z, pmt.CAMERA_ZMIN), cpv.zmax) * 10) / 10,
            });
          }
          tzToolPlaceCameraTool(pmt);
        }

      function tzToolCameraPtrUp(pmt, ev) {
        if (!pmt.cameraTool.drag) return;
        ev.stopImmediatePropagation();
        if (pmt.cameraTool.pinch) {
          // spreading the fingers = bigger image = more detail = lower Z
          var r = pmt.cameraTool.pinch.d / pmt.cameraTool.pinch.d0;
          pmt.cameraTool.pinch = null;
          pmt.cameraTool.zPinch = 0;
          pmt.cameraTool.drag = null;
          pmt.cameraTool.swallow = true;
          var cpz = tzToolCameraPose(pmt);
          if (cpz && Math.abs(r - 1) > 0.08) tzToolCameraPropose(pmt, cpz.x, cpz.y, Math.max(cpz.z, pmt.CAMERA_ZMIN) - Math.round(((r - 1) * 60) / 5) * 5, ev);
          return;
        }
        if (ev.pointerId !== pmt.cameraTool.drag.id) return;
        var dx = pmt.cameraTool.drag.dx, dy = pmt.cameraTool.drag.dy, moved = pmt.cameraTool.drag.px >= 8;
        pmt.cameraTool.drag = null;
        var cp = tzToolCameraPose(pmt);
        if (moved && pmt.cameraTool.live) {
          pmt.cameraTool.swallow = true; // already moved while dragging
          tzToolPlaceCameraTool(pmt);
        } else if (moved && Math.hypot(dx, dy) >= 1 && cp) {
          pmt.cameraTool.swallow = true; // the click that follows is not a tap
          tzToolCameraPropose(pmt, cp.x + dx, cp.y + dy, Math.max(cp.z, pmt.CAMERA_ZMIN), ev);
        } else tzToolPlaceCameraTool(pmt);
      }

      // Wheel over the map: zoom around the cursor, or over the camera image with the Camera tool: more area / more detail (its Z)
      function tzToolMapWheel(pmt, ev) {
        if (ev.ctrlKey || ev.metaKey) return; // Ctrl+rueda = zoom de Chrome, no del mapa
        ev.preventDefault();
        var p = pmt.view.svgRaw(ev);
        if (tzToolCameraActive(pmt) && p) {
          var cpw = tzToolCameraPose(pmt);
          var hw = tzToolCameraFingerprint(pmt, cpw);
          if (hw && tzToolCameraInside(pmt, { x: p.x, y: -p.y }, hw.pts)) {
            // wheel forward = bigger image = more detail = lower Z
            pmt.cameraTool.zAcc += ev.deltaY < 0 ? -10 : 10;
            tzToolCameraGesture(pmt);
            tzToolPlaceCameraTool(pmt); // vista previa: recuadro ambar + cuanto sube o baja
            if (!pmt.cameraTool.wheelView) {
              // first time: so it does not look like the map zoom broke
              pmt.cameraTool.wheelView = true;
              try { localStorage.setItem("workshopCameraWheelView", "1"); } catch (e2) { /* no critico */ }
              pmt.cameraTool.wheelHint = Date.now() + 8000;
              tzToolPaintCameraZ(pmt);
            }
            clearTimeout(pmt.cameraTool.zTimer);
            var evw = ev;
            pmt.cameraTool.zTimer = setTimeout(function () {
              var c2 = tzToolCameraPose(pmt);
              var dz = pmt.cameraTool.zAcc;
              pmt.cameraTool.zAcc = 0;
              if (c2 && dz) tzToolCameraPropose(pmt, c2.x, c2.y, Math.max(c2.z, pmt.CAMERA_ZMIN) + dz, evw);
              // 2026-10-11 ("with the wheel the animation does not hold"): redraw now,
              // so the amber preview passes smoothly to the destination (or to "It will end up here")
              tzToolPlaceCameraTool(pmt);
            }, pmt.cameraTool.live ? 200 : 500);
            return;
          }
        }
        pmt.view.mapZoomAt(ev.deltaY < 0 ? 1.25 : 1 / 1.25, p && p.x, p && p.y);
      }
