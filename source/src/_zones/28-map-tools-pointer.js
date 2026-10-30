      // A SINGLE tooltip for the whole map (request 2026-10-08: "there are several
      // tooltips and one covers the other" -- before, the native <title>s of the
      // area and the zones were added up). It shows, in lines: coordinate
      // under the cursor, the visible areas that contain it (limits and
      // distance to each edge) and the zone whose marker is near.
      function tzToolSvgMouseMove(pmt, ev) {
        if (!pmt.data.st()) return;
        var p = pmt.view.svgPoint(ev);
        if (!p) return;
        pmt.lastCursor = p;
        if (pmt.measure && pmt.measure.a && !pmt.measure.b) {
          pmt.measure.hover = pmt.snap.mapPick(p);
          tzToolPlaceMeasure(pmt);
        }
        tzToolPaintStatus(pmt);
        var lines = ["X " + p.x.toFixed(1) + "    Y " + p.y.toFixed(1)];
        var gl = pmt.data.st().globals || {};
        TZ_WORK_MODES.forEach(function (m) {
          var a = gl["cutArea" + m];
          if (!pmt.layerState.layers()["area" + m] || !Array.isArray(a) || a.length !== 4) return;
          if (p.x < a[0] || p.x > a[1] || p.y < a[2] || p.y > a[3]) return;
          lines.push(
            i18nT('zonesPage.area_x_to_y_to', { m: m, v: m === pmt.data.st().mode ? i18nT('zonesPage.active_2') : "", a: tzFmt(a[0]), a2: tzFmt(a[1]), a3: tzFmt(a[2]), a4: tzFmt(a[3]) })
          );
          lines.push(
            i18nT('zonesPage.to_the_edges_left_right_front', { v: (p.x - a[0]).toFixed(1), v2: (a[1] - p.x).toFixed(1), v3: (p.y - a[2]).toFixed(1), v4: (a[3] - p.y).toFixed(1) })
          );
        });
        // zona cercana: a menos de ~14 px de pantalla de su marcador
        if (pmt.layerState.layers().zones) {
          var tol = 14 * ((pmt.view.mapView() || pmt.view.mapFull() || { w: 1 }).w / (pmt.shell.svg().clientWidth || 1));
          pmt.data.zones().forEach(function (z, i) {
            if (z && Math.hypot(z.refX - p.x, z.refY - p.y) <= tol)
              lines.push(i18nT('zonesPage.point_x_y_click_edit', { code: TZ_CODES[i], v: z.name ? " " + z.name : "", refX: tzFmt(z.refX), refY: tzFmt(z.refY) }));
          });
        }
        // iman: referencia o punto del layout (ej. malla) cercano -> anillo + datos
        var rq = pmt.snap.snapNear(p, pmt.snap.snapTol());
        if ((rq && (!pmt.snap.hover() || pmt.snap.hover().x !== rq.x || pmt.snap.hover().y !== rq.y)) || (!rq && pmt.snap.hover())) {
          pmt.snap.setHover(rq);
          pmt.snap.placeSnapMarker();
        }
        if (rq) lines.push((rq.short !== undefined ? i18nT('zonesPage.reference') : "") + rq.name + "  X" + tzFmt(rq.x) + " Y" + tzFmt(rq.y) + (pmt.nav.layMod() ? i18nT('zonesPage.a_tap_here_snaps_to_this') : ""));
        // Head (request: "when the pointer is over the head I want the exact
        // information, like with the zones"): pointer + where the
        // laser lands + Z, when passing near the cross or the red dot.
        var tolG = 14 * ((pmt.view.mapView() || pmt.view.mapFull() || { w: 1 }).w / (pmt.shell.svg().clientWidth || 1));
        if (pmt.layerState.layers().head && pmt.data.st().axes.X && pmt.data.st().axes.Y) {
          var hx = pmt.data.st().axes.X.machinePosition, hy = pmt.data.st().axes.Y.machinePosition;
          var hc = pmt.data.cutCorrection();
          var nearHead = Math.hypot(p.x - hx, p.y - hy) <= tolG;
          var nearLaser = hc && Math.hypot(p.x - (hx - hc.cx), p.y - (hy - hc.cy)) <= tolG;
          var hso = pmt.data.areaProbeOffset();
          var nearProbe = pmt.layerState.layers().probe && hso && Math.hypot(p.x - (hx + hso.x), p.y - (hy + hso.y)) <= tolG;
          if (nearHead || nearLaser || nearProbe) {
            lines.push(i18nT('zonesPage.head_pointer_x_y', { hx: tzFmt(hx), hy: tzFmt(hy), v: pmt.data.st().axes.Z ? "  Z" + tzFmt(pmt.data.st().axes.Z.machinePosition) : "", v2: pmt.data.st().axes.X.homed && pmt.data.st().axes.Y.homed ? "" : i18nT('zonesPage.not_homed') }));
            if (hc) lines.push(i18nT('zonesPage.laser_hits_at_x_y_correction', { v: tzFmt(hx - hc.cx), v2: tzFmt(hy - hc.cy), cx: hc.cx, cy: hc.cy }));
            else lines.push(i18nT('zonesPage.laser_no_laser_pointer_correction_saved'));
            if (hso) lines.push(i18nT('zonesPage.probe_touches_at_x_y_g31', { v: tzFmt(hx + hso.x), v2: tzFmt(hy + hso.y), x: hso.x, y: hso.y, mode: pmt.data.st().mode }));
            var wz = pmt.data.st().wn;
            lines.push(i18nT('zonesPage.active_zone_work_position_x_y', { code: TZ_CODES[wz], x: tzFmt(pmt.data.st().axes.X.userPosition), y: tzFmt(pmt.data.st().axes.Y.userPosition) }));
          }
        }
        if (pmt.nav.layMod()) pmt.nav.layMod().tipLines(p, tolG).forEach(function (l) { lines.push(l); });
        if (pmt.nav.layMod()) pmt.shell.svg().style.cursor = pmt.nav.layMod().cursorAt(p, tolG * 0.7);
        if (pmt.nav.layout() === "cuts" && pmt.nav.module("cuts").wantsClick() && !pmt.nav.module("cuts").dragging()) lines.push(i18nT('zonesPage.click_mark_point_here'));
        pmt.shell.mapTip().textContent = lines.join(String.fromCharCode(10)); // one line per datum (white-space:pre)
        pmt.shell.mapTip().style.display = "block";
        // to the right/below the cursor; if it does not fit, on the other side
        var tw = pmt.shell.mapTip().offsetWidth, th = pmt.shell.mapTip().offsetHeight;
        var lx = ev.clientX + 16, ty = ev.clientY + 16;
        if (lx + tw > window.innerWidth - 8) lx = ev.clientX - tw - 16;
        if (ty + th > window.innerHeight - 8) ty = ev.clientY - th - 16;
        pmt.shell.mapTip().style.left = Math.max(4, lx) + "px";
        pmt.shell.mapTip().style.top = Math.max(4, ty) + "px";
      }

      // Object under the finger (redesign: "card next to what was touched"): zone,
      // posicion guardada, retazo o prensa; null si es un punto libre.
      function tzToolObjectEn(pmt, p, tol) {
        var best = null, d;
        if (pmt.layerState.layers().zones) {
          pmt.data.zones().forEach(function (z, i) {
            if (!z) return;
            d = Math.hypot(p.x - z.refX, p.y - z.refY);
            if (d <= tol && (!best || d < best.d)) best = { kind: "zone", i: i, d: d };
          });
        }
        if (pmt.layerState.layers().positions) {
          pmt.data.savedPos().forEach(function (q, i) {
            d = Math.hypot(p.x - q.x, p.y - q.y);
            if (d <= tol && (!best || d < best.d)) best = { kind: "pos", i: i, d: d };
          });
        }
        if (best) return best;
        function inside(r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
        if (pmt.layerState.layers().offcuts) for (var a = 0; a < pmt.data.offcuts().length; a++) if (inside(pmt.data.offcuts()[a])) return { kind: "offcut", i: a };
        if (pmt.layerState.clampsOn() && pmt.layerState.layers().clamps) for (var b = 0; b < pmt.data.clamps().length; b++) if (inside(pmt.data.clamps()[b])) return { kind: "prensa", i: b };
        return null;
      }

      function tzToolDragEditAt(pmt, p, tol) {
        if (!pmt.data.st()) return null;
        var ax = pmt.data.st().axes;
        if (pmt.layerState.layers().head && ax && ax.X && ax.Y && Math.hypot(p.x - ax.X.machinePosition, p.y - ax.Y.machinePosition) <= tol)
          return { kind: "head", since: { x: ax.X.machinePosition, y: ax.Y.machinePosition } };
        var zp = pmt.layerState.layers().zpoint && pmt.data.zonePoint(pmt.data.st().wn);
        if (zp && Math.hypot(p.x - zp.x, p.y - zp.y) <= tol) return { kind: "zpoint", i: pmt.data.st().wn, since: { x: zp.x, y: zp.y } };
        var ob = tzToolObjectEn(pmt, p, tol);
        if (ob && ob.kind === "zone" && pmt.data.zones()[ob.i]) return { kind: "zone", i: ob.i, since: { x: pmt.data.zones()[ob.i].refX, y: pmt.data.zones()[ob.i].refY } };
        return null;
      }

      function tzToolDragEditRelease(pmt, ev) {
        var d = pmt.dragEdit;
        pmt.dragEdit = null;
        if (!d || !d.moved) {
          if (pmt.data.st()) pmt.shell.renderMap();
          return;
        }
        var q = { x: Math.round(d.until.x * 10) / 10, y: Math.round(d.until.y * 10) / 10 };
        if (d.kind === "head") return tzToolOpenPointPop(pmt, q, ev);
        if (d.kind === "zpoint") return tzToolOpenZPointPop(pmt, d.i, q, ev);
        if (d.kind === "zone") {
          if (pmt.nav.layout() !== "zones") pmt.nav.goLayout("zones");
          pmt.table.openEditor(d.i, { pre: q });
          if (pmt.table.editorCard().scrollIntoView) pmt.table.editorCard().scrollIntoView({ block: "start", behavior: "smooth" });
          if (pmt.data.st()) pmt.shell.renderMap();
          return;
        }
      }

      // Card to save the dragged Z measuring point (it is not saved by itself): saving moves it
      // and rewrites the X/Y of the material macro (saveZonePoint).
      function tzToolOpenZPointPop(pmt, i, q, ev) {
        pmt.posPick = null;
        pmt.ptPick = null;
        pmt.zonePick = null;
        pmt.posPop.innerHTML = "";
        var label = pmt.data.st().mode === "Laser" ? i18nT('zonesPage.measure_focus') : i18nT('zonesPage.measure_z');
        pmt.posPop.appendChild(tzEl("div", null, i18nT('zonesPage.z_point_drag_ask', { label: label, code: TZ_CODES[i] })));
        pmt.posPop.appendChild(tzEl("div", "tz-muted", "X " + tzFmt(q.x) + "  Y " + tzFmt(q.y)));
        var lim = pmt.data.cutLimits();
        var outside = lim && (q.x < lim.xmin || q.x > lim.xmax || q.y < lim.ymin || q.y > lim.ymax);
        if (outside) pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('zonesPage.outside_the_axes_travel')));
        var row = tzEl("div", "tz-row");
        row.style.cssText += "gap:4px;margin-top:6px;flex-wrap:wrap;";
        var bG = tzBtn(i18nT('zcal.save'), "primary", function () {
          pmt.data.saveZonePoint(i, q)
            .then(function () { tzToolClosePosPop(pmt); pmt.shell.renderMap(); })
            .catch(function (e) { pmt.posPop.appendChild(tzEl("div", "tz-msg err", i18nT('common.not_saved_2', { err: e.message || e }))); });
        });
        bG.disabled = !!outside || !pmt.data.zones()[i] || !pmt.data.machineFree();
        row.appendChild(bG);
        row.appendChild(tzBtn(i18nT('zcal.cancel'), null, function () { tzToolClosePosPop(pmt); }));
        pmt.posPop.appendChild(row);
        tzToolPlacePop(pmt, ev);
      }

      function tzToolWizardPointsOk(pmt) {
        return pmt.wizardPoints || (pmt.nav.layout() !== "cuts" && pmt.nav.layout() !== "center");
      }

      // A free tap (no marker) only means something inside the machine's travel: outside there is nothing to point at, go to or save.
      function tzToolInsideMachine(pmt, p) {
        var lim = pmt.data.cutLimits();
        return !lim || (p.x >= lim.xmin && p.x <= lim.xmax && p.y >= lim.ymin && p.y <= lim.ymax);
      }

      function tzToolMapMenuEn(pmt, ev) {
        if (!pmt.data.st()) return;
        if (!tzToolWizardPointsOk(pmt)) return;
        var raw = pmt.view.svgRaw(ev);
        if (!raw) return;
        var p0 = { x: raw.x, y: -raw.y };
        var ob = tzToolObjectEn(pmt, p0, pmt.snap.snapTol() * 1.5);
        if (ob) {
          if (ob.kind === "zone") tzToolOpenZonePop(pmt, ob.i, ev);
          else if (ob.kind === "pos") tzToolOpenPosPop(pmt, ob.i, ev);
          else tzToolOpenRectPop(pmt, ob.kind, ob.i, ev);
          return true; // a popup opened (stage 5: the command menu is only for when nothing opened)
        }
        if (!tzToolInsideMachine(pmt, p0)) return false;
        var ref = pmt.snap.snapNear(p0, pmt.snap.snapTol());
        tzToolOpenPointPop(pmt, ref ? { x: ref.x, y: ref.y, name: ref.name } : { x: Math.round(p0.x * 10) / 10, y: Math.round(p0.y * 10) / 10 }, ev);
        return true;
      }

      function tzToolSvgPointerDown(pmt, ev) {
        clearTimeout(pmt.mapHold && pmt.mapHold.t);
        pmt.mapHold = null;
        // in the Laser editor (and Find center) the long press is for the shapes: the point dialog (Z point, origin...) does not open
        if (ev.pointerType !== "mouse" && !Object.keys(pmt.mapPtrs).length && tzToolWizardPointsOk(pmt)) {
          var e0 = { clientX: ev.clientX, clientY: ev.clientY };
          pmt.mapHold = { x: ev.clientX, y: ev.clientY, t: setTimeout(function () { pmt.mapDragMoved = true; pmt.mapHold = null; tzToolMapMenuEn(pmt, e0); }, 600) };
        }
        pmt.mapPtrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
        var ids = Object.keys(pmt.mapPtrs);
        pmt.mapDragMoved = false;
        pmt.dragEdit = null;
        if (ids.length === 1 && (pmt.mapTool === "point" || pmt.mapTool === "see") && !pmt.nav.layMod()) {
          var r0 = pmt.view.svgRaw(ev);
          var de = r0 && tzToolDragEditAt(pmt, { x: r0.x, y: -r0.y }, pmt.snap.snapTol() * 1.5);
          if (de) {
            de.until = { x: de.since.x, y: de.since.y };
            de.moved = false;
            pmt.dragEdit = de;
            try {
              pmt.shell.svg().setPointerCapture(ev.pointerId);
            } catch (e) {
              /*  without capture: it still works inside the map */
            }
          }
        }
        if (ids.length === 1) pmt.mapDrag = { x: ev.clientX, y: ev.clientY, view: pmt.view.mapView() || pmt.view.mapFull() };
        else if (ids.length === 2) {
          var a = pmt.mapPtrs[ids[0]], b = pmt.mapPtrs[ids[1]];
          pmt.mapPinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
          pmt.mapDrag = null;
        }
      }

      function tzToolSvgPointerMove(pmt, ev) {
        if (!pmt.mapPtrs[ev.pointerId]) return;
        pmt.mapPtrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
        var ids = Object.keys(pmt.mapPtrs);
        if (ids.length === 2 && pmt.mapPinch) {
          var a = pmt.mapPtrs[ids[0]], b = pmt.mapPtrs[ids[1]];
          var d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
          var mid = pmt.view.svgRaw({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
          pmt.mapDragMoved = true;
          pmt.view.mapZoomAt(d / pmt.mapPinch.d, mid && mid.x, mid && mid.y);
          pmt.mapPinch.d = d;
          return;
        }
        if (pmt.mapHold && Math.hypot(ev.clientX - pmt.mapHold.x, ev.clientY - pmt.mapHold.y) > 8) { clearTimeout(pmt.mapHold.t); pmt.mapHold = null; }
        if (pmt.dragEdit && Object.keys(pmt.mapPtrs).length === 1) {
          var rr = pmt.view.svgRaw(ev);
          if (rr) {
            var nq = { x: rr.x, y: -rr.y };
            var sn = pmt.snap.snapNear(nq, pmt.snap.snapTol());
            if (sn) nq = { x: sn.x, y: sn.y };
            if (!pmt.dragEdit.moved && Math.hypot(nq.x - pmt.dragEdit.since.x, nq.y - pmt.dragEdit.since.y) < pmt.snap.snapTol() * 0.5) return;
            pmt.dragEdit.moved = true;
            pmt.mapDragMoved = true;
            pmt.dragEdit.until = nq;
            if (pmt.data.st()) pmt.shell.renderMap();
          }
          return;
        }
        if (!pmt.mapDrag || !pmt.view.mapFull()) return;
        var dxp = ev.clientX - pmt.mapDrag.x, dyp = ev.clientY - pmt.mapDrag.y;
        if (!pmt.mapDragMoved && Math.hypot(dxp, dyp) < 5) return;
        pmt.mapDragMoved = true;
        if (!pmt.mapDrag.view || pmt.mapDrag.view === pmt.view.mapFull()) return; // without zoom there is nothing to move
        if (pmt.view.mapFollow()) pmt.view.setFollow(false); // mover a mano deja de seguir al cabezal
        var k = pmt.view.mapUnitsPerPx();
        var dd = pmt.view.xfInvP(dxp * k, dyp * k); // the on-screen drag, in unrotated coords
        pmt.view.setMapView(pmt.view.mapClampView({ x: pmt.mapDrag.view.x - dd.x, y: pmt.mapDrag.view.y - dd.y, w: pmt.mapDrag.view.w, h: pmt.mapDrag.view.h }));
        pmt.view.setFocusZoom(false); // the user took the view
        if (pmt.data.st()) pmt.shell.renderMap();
      }

      function tzToolMapPtrEnd(pmt, ev) {
        if (pmt.mapHold) { clearTimeout(pmt.mapHold.t); pmt.mapHold = null; }
        if (pmt.dragEdit) {
          if (ev.type === "pointercancel") {
            pmt.dragEdit = null;
            if (pmt.data.st()) pmt.shell.renderMap();
          } else tzToolDragEditRelease(pmt, ev);
        }
        delete pmt.mapPtrs[ev.pointerId];
        if (Object.keys(pmt.mapPtrs).length < 2) pmt.mapPinch = null;
        if (!Object.keys(pmt.mapPtrs).length) pmt.mapDrag = null;
      }

      function tzToolSvgClickDrag(pmt, ev) {
          if (pmt.mapDragMoved) {
            pmt.mapDragMoved = false;
            ev.stopImmediatePropagation();
            ev.preventDefault();
          } else if (pmt.cameraTool.swallow && pmt.nav.layMod()) {
            pmt.cameraTool.swallow = false;
            ev.stopImmediatePropagation();
            ev.preventDefault();
          }
        }

      function tzToolSvgClickPick(pmt, ev) {
        if (!pmt.data.st() || pmt.nav.layMod()) return;
        var raw = pmt.view.svgRaw(ev);
        if (!raw) return;
        var p0 = { x: raw.x, y: -raw.y }; // el mapa dibuja Y invertida
        var ref = pmt.snap.snapNear(p0, pmt.snap.snapTol());
        var q = ref ? { x: ref.x, y: ref.y, name: ref.name } : { x: Math.round(p0.x * 10) / 10, y: Math.round(p0.y * 10) / 10 };
        if (!tzToolInsideMachine(pmt, q) && pmt.mapTool !== "measure" && pmt.mapTool !== "camera") return;
        pmt.dockLast = q; // "Ir al punto" de Mover
        if (pmt.mapTool === "measure") {
          if (!pmt.measure || pmt.measure.b) pmt.measure = { a: q, b: null, hover: null };
          else pmt.measure.b = q;
          tzToolPlaceMeasure(pmt);
          tzToolPaintStatus(pmt);
          return;
        }
        if (pmt.mapTool === "point" && (pmt.nav.layout() === "zones" || pmt.nav.layout() === "prepare")) tzToolOpenPointPop(pmt, q, ev);
        if (pmt.mapTool === "camera") {
          if (pmt.cameraTool.swallow) { pmt.cameraTool.swallow = false; return; }
          tzToolCameraGesture(pmt);
          var cp = tzToolCameraPose(pmt);
          var h = tzToolCameraFingerprint(pmt, cp);
          if (!h) { tzToolPaintCameraZ(pmt); return; }
          tzToolCameraPropose(pmt, cp.x + (p0.x - h.cx), cp.y + (p0.y - h.cy), Math.max(cp.z, pmt.CAMERA_ZMIN), ev);
        }
      }

