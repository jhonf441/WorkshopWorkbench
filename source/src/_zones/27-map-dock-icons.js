      function tzDockIconize(pdk, b, key, cap, tip) {
        b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="' + pdk.TZ_ICONS[key] + '"/></svg><span class="tzm-cap"></span>';
        b.querySelector(".tzm-cap").textContent = cap;
        b.classList.add("tzm-ib");
        b.setAttribute("aria-label", (tip || cap));
        if (tip && !b.getAttribute("data-tip")) tzTip(b, tip);
        return b;
      }

      function tzDockDockGap(pdk) {
        pdk.barD.appendChild(tzEl("span", "tzm-gap"));
      }

      // blocks: several buttons of the same function stuck together in one
      // (request: "zoom + and - in a single button")
      function tzDockPair(pdk, parent, list) {
        var p = tzEl("div", "tzm-pair");
        list.forEach(function (b) { p.appendChild(b); });
        parent.appendChild(p);
        return p;
      }

      function tzDockDockPopClose(pdk) {
        if (pdk.dockPopBtn) pdk.dockPopBtn.classList.remove("tzm-open");
        pdk.dockPopKey = pdk.dockPopBtn = pdk.dockPopBuild = null;
        pdk.dockPop.style.display = "none";
        pdk.dockPop.innerHTML = "";
      }

      function tzDockDockPopPlace(pdk) {
        if (!pdk.dockPopBtn) return;
        var mr = pdk.shell.mapCard().getBoundingClientRect(), br = pdk.dockPopBtn.getBoundingClientRect();
        var w = pdk.dockPop.offsetWidth, h = pdk.dockPop.offsetHeight;
        if (pdk.dockPopPos) { // the user dragged it out of the way: keep it there (inside the map)
          pdk.dockPop.style.left = Math.max(4, Math.min(pdk.dockPopPos.x, mr.width - w - 4)) + "px";
          pdk.dockPop.style.top = Math.max(4, Math.min(pdk.dockPopPos.y, mr.height - h - 4)) + "px";
          return;
        }
        var x = Math.max(4, Math.min(br.left - mr.left, mr.width - w - 4));
        var y = br.top - mr.top - h - 6;
        if (y < 4) y = br.bottom - mr.top + 6; // no room above: below the button
        pdk.dockPop.style.left = x + "px";
        pdk.dockPop.style.top = y + "px";
      }

      // Drag the card by its title or any empty spot, so it can be moved off the part of the map being looked at.
      function tzDockDockPopDrag(pdk, ev) {
        if (ev.target.closest("button, input, select, a, .tzm-chip")) return;
        var o = { x: ev.clientX - pdk.dockPop.offsetLeft, y: ev.clientY - pdk.dockPop.offsetTop };
        function mueve(e) {
          pdk.dockPopPos = { x: e.clientX - o.x, y: e.clientY - o.y };
          tzDockDockPopPlace(pdk);
        }
        function suelta() {
          document.removeEventListener("pointermove", mueve, true);
          document.removeEventListener("pointerup", suelta, true);
        }
        document.addEventListener("pointermove", mueve, true);
        document.addEventListener("pointerup", suelta, true);
        ev.preventDefault();
      }

      function tzDockDockPopPaint(pdk) {
        if (!pdk.dockPopBuild) return;
        var sc = pdk.dockPop.scrollTop;
        pdk.dockPop.innerHTML = "";
        pdk.dockPopBuild(pdk.dockPop);
        pdk.dockPop.scrollTop = sc;
        tzDockDockPopPlace(pdk);
      }

      function tzDockDockPopOpen(pdk, key, btn, build) {
        if (pdk.dockPopKey === key) return tzDockDockPopClose(pdk);
        tzDockDockPopClose(pdk);
        pdk.dockPopKey = key;
        pdk.dockPopBtn = btn;
        pdk.dockPopBuild = build;
        btn.classList.add("tzm-open");
        pdk.dockPop.style.display = "block";
        tzDockDockPopPaint(pdk);
      }

      function tzDockDockOutside(pdk, ev) {
        if (!pdk.shell.alive()) {
          document.removeEventListener("pointerdown", tzBind(tzDockDockOutside, pdk), true);
          document.removeEventListener("keydown", tzBind(tzDockDockEsc, pdk), true);
          return;
        }
        if (!pdk.dockPopKey) return;
        if (pdk.dockPop.contains(ev.target) || (pdk.dockPopBtn && pdk.dockPopBtn.contains(ev.target))) return;
        tzDockDockPopClose(pdk);
      }

      function tzDockDockEsc(pdk, ev) {
        if (ev.key === "Escape" && pdk.dockPopKey) tzDockDockPopClose(pdk);
      }

      function tzDockDSec(pdk, box, title) {
        var s = tzEl("div", "tzm-dsec");
        if (title) s.appendChild(tzEl("div", "tzm-dlbl", title));
        box.appendChild(s);
        return s;
      }

      function tzDockDRow(pdk, box) {
        var r = tzEl("div", "tzm-drow");
        box.appendChild(r);
        return r;
      }

      function tzDockDHomed(pdk, ejes) {
        var ax = pdk.data.st() && pdk.data.st().axes;
        return !!ax && ejes.split("").every(function (e) { return ax[e] && ax[e].homed; });
      }

      function tzDockDockStepMove(pdk, axis, sign) {
        var dist = sign * (axis === "Z" ? Math.min(pdk.dockStep, 10) : pdk.dockStep);
        var feed = axis === "Z" ? 600 : 3000;
        pdk.dockMsg = "";
        tzCode("G91\nG1 " + axis + dist.toFixed(3) + " F" + feed + " S0\nG90") // S0: laser apagado
          .then(function (r) {
            if (/error/i.test(r || "")) throw new Error(String(r).replace(/^\s*(Error:\s*)?/i, ""));
          })
          .catch(function (e) {
            pdk.dockMsg = i18nT('zonesPage.could_not_move_2', { err: e.message || e });
            tzDockDockPopPaint(pdk);
          });
      }

      function tzDockDockMove(pdk, box) {
        var h = tzEl("h4", "moves", i18nT('zonesPage.move_the_machine'));
        box.appendChild(h);
        var free = pdk.data.machineFree();
        var reason = !pdk.data.st() ? i18nT('zonesPage.reading_the_machine') : !free ? i18nT('zonesPage.the_machine_is_busy_or_a') : !tzDockDHomed(pdk, "XY") ? i18nT('common.x_and_y_need_homing') : "";
        box.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.one_tap_one_step_with_the')));
        var r = tzDockDRow(pdk, box);
        r.style.marginTop = "6px";
        r.appendChild(tzEl("span", "tz-muted", i18nT('zonesPage.step')));
        pdk.TZ_DOCK_STEPS.forEach(function (v) {
          var b = tzBtn(String(v), "tzm-chip" + (v === pdk.dockStep ? " on" : ""), function () {
            pdk.dockStep = v;
            try { localStorage.setItem("workshopDockStep", String(v)); } catch (e) { /* no critico */ }
            tzDockDockPopPaint(pdk);
          });
          r.appendChild(b);
        });
        r.appendChild(tzEl("span", "tz-muted", "mm"));
        var pad = tzEl("div", "tzm-dpad");
        box.appendChild(pad);
        function cell(txt, axis, sign, tip) {
          if (!txt) { pad.appendChild(tzEl("span")); return; }
          var b = tzBtn(txt, null, function () { tzDockDockStepMove(pdk, axis, sign); });
          b.disabled = !!reason || !tzDockDHomed(pdk, axis);
          tzTip(b, tip);
          pad.appendChild(b);
        }
        var pz = Math.min(pdk.dockStep, 10);
        cell("", null); cell("Y+", "Y", 1, "Y +" + pdk.dockStep + " mm"); cell("", null); pad.appendChild(tzEl("span")); cell("Z+", "Z", 1, i18nT('zonesPage.raises_z_mm', { pz: pz }));
        cell("X-", "X", -1, "X -" + pdk.dockStep + " mm"); cell("", null); cell("X+", "X", 1, "X +" + pdk.dockStep + " mm"); pad.appendChild(tzEl("span")); cell("", null);
        cell("", null); cell("Y-", "Y", -1, "Y -" + pdk.dockStep + " mm"); cell("", null); pad.appendChild(tzEl("span")); cell("Z-", "Z", -1, i18nT('zonesPage.lowers_z_mm_careful_with_the', { pz: pz }));
        if (reason) box.appendChild(tzEl("div", "tz-msg err", reason));
        if (pdk.dockMsg) box.appendChild(tzEl("div", "tz-msg err", pdk.dockMsg));
        var s = tzDockDSec(pdk, box, i18nT('tzTips.l_go_to_the_point'));
        if (pdk.tools.lastTap()) {
          s.appendChild(tzEl("div", "tz-muted", (pdk.tools.lastTap().name ? pdk.tools.lastTap().name + ": " : i18nT('zonesPage.last_point_tapped_2')) + "X" + tzFmt(pdk.tools.lastTap().x) + " Y" + tzFmt(pdk.tools.lastTap().y)));
          var lim = pdk.data.cutLimits();
          var outside = lim && (pdk.tools.lastTap().x < lim.xmin || pdk.tools.lastTap().x > lim.xmax || pdk.tools.lastTap().y < lim.ymin || pdk.tools.lastTap().y > lim.ymax);
          if (outside) s.appendChild(tzEl("div", "tz-msg err", i18nT('zonesPage.outside_the_axes_travel')));
          var q = pdk.tools.lastTap();
          var bGo = tzBtn(i18nT('zonesPage.go_with_the_pointer'), "primary", function () {
            bGo.disabled = true;
            tjGoToBed(q.x, q.y)
              .then(function () { pdk.dockMsg = ""; tzDockDockPopClose(pdk); })
              .catch(function (e) { pdk.dockMsg = i18nT('prepare.could_not_go', { err: e.message || e }); tzDockDockPopPaint(pdk); });
          }, i18nT('zonesPage.confirm_moves'), "dock-go");
          bGo.disabled = !!reason || outside;
          tzTip(bGo, i18nT('zonesPage.takes_the_pointer_to_the_point'));
          tzDockDRow(pdk, s).appendChild(bGo);
        } else s.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.tap_a_point_on_the_map')));
      }

      // Zona activa: cambiar, offset laser, ir a cero, fijar origen
      function tzDockDockZone(pdk, box) {
        var wn = pdk.data.st() ? pdk.data.st().wn : 0;
        var z = pdk.data.zones()[wn];
        box.appendChild(tzEl("h4", null, i18nT('zonesPage.active_zone', { code: TZ_CODES[wn], v: z && z.name ? " " + z.name : "" })));
        var free = pdk.data.machineFree();
        var r = tzDockDRow(pdk, box);
        TZ_CODES.forEach(function (c, i) {
          var zi = pdk.data.zones()[i];
          if (i !== 0 && i !== wn && !(zi && (zi.file || zi.name))) return;
          var b = tzBtn(c, "tzm-chip" + (i === wn ? " on" : ""), function () {
            tzCode(c).then(function () { tzDockDockPopPaint(pdk); }).catch(function () { /* lo muestra la consola */ });
          });
          b.disabled = i === wn || !free;
          tzTip(b, i18nT('zonesPage.activates_in_the_machine_also_applies', { v: zi && zi.name ? zi.name + ". " : "", c: c }));
          r.appendChild(b);
        });
        var correction = z && (z.correctionX || z.correctionY);
        var laserMode = pdk.data.st() && pdk.data.st().mode === "Laser";
        if (correction && laserMode) {
          var s1 = tzTechOnly(tzDockDSec(pdk, box, i18nT('zonesPage.x0_y0_falls_where'))); // laser / pointer correction: the technician's
          var r1 = tzDockDRow(pdk, s1);
          var bL = tzBtn("Laser", pdk.data.st().offsetOn ? "tzm-chip on" : "tzm-chip", function () { tzCode('M98 P"0:/sys/workshop/macros/laseroffset.g" S1').then(tzBind(tzDockDockPopPaint, pdk), tzBind(tzDockDockPopPaint, pdk)); });
          bL.disabled = pdk.data.st().offsetOn || !free;
          tzTip(bL, i18nT('zonesPage.offset_applied_how_you_cut_x0'));
          var bP = tzBtn(i18nT('zoneActive.pointer'), !pdk.data.st().offsetOn ? "tzm-chip on" : "tzm-chip", function () { tzCode('M98 P"0:/sys/workshop/macros/laseroffset.g" S0').then(tzBind(tzDockDockPopPaint, pdk), tzBind(tzDockDockPopPaint, pdk)); });
          bP.disabled = !pdk.data.st().offsetOn || !free;
          tzTip(bP, i18nT('zonesPage.offset_removed_to_locate_or_check'));
          r1.appendChild(bL);
          r1.appendChild(bP);
        }
        var s2 = tzDockDSec(pdk, box, i18nT('zonesPage.go_and_set'));
        var r2 = tzDockDRow(pdk, s2);
        var target = correction && laserMode && pdk.data.st().offsetOn ? "laser" : "pointer";
        var go = tzBtn(i18nT('zonesPage.go_to_x0_y0_target', { target: target === "laser" ? "laser" : i18nT('zoneActive.pointer_lc') }), "primary", function () {
          go.disabled = true;
          tzCode('M98 P"0:/sys/workshop/macros/workzero.g"').then(function () { tzDockDockPopClose(pdk); }, function () { tzDockDockPopPaint(pdk); });
        }, i18nT('zonesPage.confirm_moves'), "dock-g0");
        go.disabled = !free || !tzDockDHomed(pdk, "XY");
        tzTip(go, !tzDockDHomed(pdk, "XY") ? i18nT('needs.home_first') : i18nT('zonesPage.raises_z_goes_to_x0_y0_tap', { code: TZ_CODES[wn], target: target === "laser" ? "LASER" : i18nT('zoneActive.pointer_uc') }));
        r2.appendChild(go);
        var fx = tzBtn(i18nT('zoneActive.set_origin_here'), null, function () {
          tzDockDockPopClose(pdk);
          pdk.nav.goLayout("zones");
          pdk.nav.chooseZSub("active");
        });
        tzTip(fx, i18nT('zonesPage.opens_active_zone_at_the_set'));
        r2.appendChild(tzTechOnly(fx));
        if (!free) s2.appendChild(tzEl("div", "tz-msg err", i18nT('zonesPage.the_machine_is_busy_or_a')));
      }

      function tzDockDockViews(pdk) {
        try {
          var v = JSON.parse(localStorage.getItem(pdk.TZ_VIEWS_KEY) || "[]");
          return Array.isArray(v) ? v : [];
        } catch (e) {
          return [];
        }
      }

      function tzDockDockViewsSave(pdk, v) {
        try { localStorage.setItem(pdk.TZ_VIEWS_KEY, JSON.stringify(v.slice(0, 4))); } catch (e) { /* no critico */ }
      }

      function tzDockDockVer(pdk, v) {
        if (pdk.view.mapFollow()) pdk.view.followButton().click(); // un encuadre fijo deja de seguir al cabezal
        pdk.view.setMapView(v ? pdk.view.mapClampView(v) : null);
        if (pdk.data.st()) pdk.shell.renderMap();
        pdk.view.paintZoomLbl();
      }

      function tzDockDockView(pdk, box) {
        box.appendChild(tzEl("h4", null, i18nT('zonesPage.map_view')));
        var r = tzDockDRow(pdk, box);
        var bC = tzBtn(i18nT('zonesPage.whole_bed'), null, function () { tzDockDockVer(pdk, null); });
        r.appendChild(bC);
        var z = pdk.data.st() && pdk.data.zones()[pdk.data.st().wn];
        var bZ = tzBtn(i18nT('zoneActive.active_zone'), null, function () {
          if (!pdk.view.mapFull() || !z) return;
          var w = pdk.view.mapFull().w / 3, h = pdk.view.mapFull().h / 3;
          tzDockDockVer(pdk, { x: z.refX - w * 0.25, y: -z.refY - h * 0.75, w: w, h: h }); // the origin at the bottom left, the material toward +X +Y
        });
        bZ.disabled = !z || typeof z.refX !== "number";
        tzTip(bZ, i18nT('zonesPage.zooms_the_map_to_the_origin'));
        r.appendChild(bZ);
        var bS = tzBtn(i18nT('zonesPage.follow_head'), pdk.view.mapFollow() ? "tzm-chip on" : "tzm-chip", function () { pdk.view.followButton().click(); tzDockDockPopPaint(pdk); });
        r.appendChild(bS);
        var r2 = tzDockDRow(pdk, box);
        r2.style.marginTop = "4px";
        r2.appendChild(tzBtn(i18nT('zonesPage.rotate_3', { v: pdk.view.mapRot() ? " (" + pdk.view.mapRot() + "°)" : "" }), null, function () { pdk.view.setView({ rot: (pdk.view.mapRot() + 90) % 360 }); tzDockDockPopPaint(pdk); }));
        if (pdk.view.mapRot() || pdk.view.mapMirror()) r2.appendChild(tzBtn(i18nT('zonesPage.normal_view'), "warn", function () { pdk.view.setView({ rot: 0, mirror: false }); tzDockDockPopPaint(pdk); }));
        if (pdk.layers.hasLayer("photoBed") && pdk.layers.hasVisionNow()) {
          var s1 = tzDockDSec(pdk, box, i18nT('zonesPage.background'));
          var bF = tzBtn(i18nT('zonesPage.bed_photo'), pdk.layerState.layers().photoBed ? "tzm-chip on" : "tzm-chip", function () { pdk.layers.clickLayer("photoBed"); tzDockDockPopPaint(pdk); });
          tzTip(bF, pdk.data.photoBed() && pdk.data.photoBed().info ? i18nT('zonesPage.the_photo_of_the_whole_bed_2') : i18nT('zonesPage.there_is_no_bed_photo_yet'));
          tzDockDRow(pdk, s1).appendChild(bF);
          if (!(pdk.data.photoBed() && pdk.data.photoBed().info)) {
            s1.appendChild(tzEl("div", "tz-muted", i18nT('zonesPage.no_photo_yet_it_is_built')));
            if (pdk.nav.goPath) s1.appendChild(tzBtn(i18nT('zonesPage.build_in_vision'), null, function () { pdk.nav.goPath("/Plugins/Vision"); })); // the photo is made there: one tap to get to it
          }
        }
        var s2 = tzDockDSec(pdk, box, i18nT('zonesPage.saved_views'));
        var vs = tzDockDockViews(pdk);
        vs.forEach(function (v, i) {
          var rr = tzDockDRow(pdk, s2);
          rr.appendChild(tzBtn(v.name, null, function () { tzDockDockVer(pdk, v.v); }));
          var del = tzBtn(i18nT('common.remove'), null, function () {
            var a = tzDockDockViews(pdk);
            a.splice(i, 1);
            tzDockDockViewsSave(pdk, a);
            tzDockDockPopPaint(pdk);
          });
          rr.appendChild(del);
        });
        var bG = tzBtn(i18nT('zonesPage.save_this_view'), null, function () {
          var a = tzDockDockViews(pdk);
          var n = 1;
          while (a.some(function (x) { return x.name === i18nT('zonesPage.view_2', { n: n }); })) n++;
          a.push({ name: i18nT('zonesPage.view_2', { n: n }), v: pdk.view.mapView() ? { x: pdk.view.mapView().x, y: pdk.view.mapView().y, w: pdk.view.mapView().w, h: pdk.view.mapView().h } : null });
          tzDockDockViewsSave(pdk, a);
          tzDockDockPopPaint(pdk);
        });
        bG.disabled = vs.length >= 4;
        tzTip(bG, i18nT('zonesPage.saves_the_current_framing_up_to'));
        tzDockDRow(pdk, s2).appendChild(bG);
      }

      // automatic: with names if the bar fits in one row; otherwise, only icons
      function tzDockDockNames(pdk, force) {
        var w = pdk.barD.clientWidth;
        if (!force && w === pdk.dockNamesWidth) return;
        pdk.dockNamesWidth = w;
        if (pdk.dockNamesMode !== "auto") return pdk.barD.classList.toggle("tzm-without-names", pdk.dockNamesMode === "no");
        pdk.barD.classList.remove("tzm-without-names");
        var hijos = Array.prototype.filter.call(pdk.barD.children, function (c) { return c.offsetParent !== null && !c.classList.contains("tzm-gap"); });
        var wraps = hijos.length > 1 && hijos[hijos.length - 1].offsetTop > hijos[0].offsetTop + 4;
        pdk.barD.classList.toggle("tzm-without-names", wraps);
      }

