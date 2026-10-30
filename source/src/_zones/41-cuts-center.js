      function tcCenterCorrection(tc) {
        return tc.ctx.cut.correction ? tc.ctx.cut.correction() : null;
      }

      function tcCenterPointsAct(tc) {
        return tc.centerPoints === "laser" && tcCenterCorrection(tc) ? "laser" : "pointer";
      }

      // takes the chosen aim (pointer or laser spot) to the bed point (x, y)
      function tcCenterIr(tc, x, y) {
        var hd = tcHeadFor(x, y, tcCenterPointsAct(tc), tcCenterCorrection(tc));
        return tjGoToBed(hd.x, hd.y);
      }

      function tcCenterUsesCamera(tc) {
        var ok = !!(tc.ctx.map.camera.hasVision && tc.ctx.map.camera.hasVision() && tc.ctx.map.camera.usable && tc.ctx.map.camera.usable());
        return ok && tc.centerSource !== "machine";
      }

      // How many points each mode uses (null = 3 or more, circle by fit).
      function tcCenterMax(tc) {
        if (tc.centerMode === "edges") return 4;
        if (tc.centerMode === "rect1") return 1;
        return tc.centerMode === "rect" ? 3 : tc.centerMode === "circle2" || tc.centerMode === "rect2" || tc.centerMode === "mid" ? 2 : null;
      }

      function tcCenterCameraItem(tc) {
        return tc.centerCamera.items.filter(function (it) { return it.id === tc.centerCamera.sel; })[0] || null;
      }

      // un item detectado por Vision -> {cx, cy, r | w, h, angle, poly}
      function tcCenterCameraResult(tc, it) {
        var m = it && it.mm;
        if (!m || !m.c) return null;
        if (it.kind === "circle") return { cx: m.c[0], cy: m.c[1], r: m.d / 2 };
        var poly = it.kind === "rect" ? m.corners : m.box;
        // rotation between -45 and 45 (Vision may give 89.9 degrees with width and height swapped)
        var ang = m.ang || 0, w0 = m.w, h0 = m.h;
        while (ang > 45) { ang -= 90; var t1 = w0; w0 = h0; h0 = t1; }
        while (ang < -45) { ang += 90; var t2 = w0; w0 = h0; h0 = t2; }
        return { cx: m.c[0], cy: m.c[1], w: w0, h: h0, angle: Math.round(ang * 100) / 100, squareErr: 0, poly: poly || null };
      }

      function tcCenterCameraName(tc, it) {
        var m = it.mm || {};
        if (it.kind === "circle") return i18nT('cuts.circle_diam_mm_at_x_y', { d: tc.fmt(m.d), c: tc.fmt(m.c[0]), c2: tc.fmt(m.c[1]) });
        var q = tcCenterCameraResult(tc, it);
        return i18nT('cuts.x_mm_at_x_y', { v: it.kind === "rect" ? i18nT('cuts.rectangle_2') : i18nT('cuts.piece'), w: tc.fmt(q.w), h: tc.fmt(q.h), cx: tc.fmt(q.cx), cy: tc.fmt(q.cy), v2: Math.abs(q.angle) >= 0.5 ? i18nT('cuts.rotation_degrees_2', { angle: tc.fmt(q.angle) }) : "" });
      }

      // Useful points for the current method taken from what the camera saw.
      function tcCenterCands(tc) {
        if (!tc.centerMode || tc.centerMode === "camera" || !tcCenterUsesCamera(tc)) return [];
        var out = [];
        function add(x, y) {
          for (var i = 0; i < tc.centerPts.length; i++) if (tc.centerPts[i] && Math.hypot(tc.centerPts[i].x - x, tc.centerPts[i].y - y) < 0.5) return; // ya tomado
          out.push({ x: +x.toFixed(2), y: +y.toFixed(2) });
        }
        tc.centerCamera.items.forEach(function (it) {
          var r0 = tcCenterCameraResult(tc, it);
          if (!r0) return;
          if (tc.centerMode === "mid") return add(r0.cx, r0.cy);
          if (r0.r) {
            if (tc.centerMode !== "circle" && tc.centerMode !== "circle2") return;
            var angs = tc.centerMode === "circle2" ? [0, 180] : [90, 210, 330];
            angs.forEach(function (a) { add(r0.cx + r0.r * Math.cos((a * Math.PI) / 180), r0.cy + r0.r * Math.sin((a * Math.PI) / 180)); });
            return;
          }
          if (tc.centerMode === "circle" || tc.centerMode === "circle2") return;
          var poly = r0.poly;
          if (!poly || poly.length < 4) {
            var hw = r0.w / 2, hh = r0.h / 2, an = ((r0.angle || 0) * Math.PI) / 180;
            poly = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(function (q) {
              return [r0.cx + q[0] * Math.cos(an) - q[1] * Math.sin(an), r0.cy + q[0] * Math.sin(an) + q[1] * Math.cos(an)];
            });
          }
          if (tc.centerMode === "edges") {
            for (var k = 0; k < 4; k++) {
              var a1 = poly[k], b1 = poly[(k + 1) % 4];
              add((a1[0] + b1[0]) / 2, (a1[1] + b1[1]) / 2);
            }
          } else poly.slice(0, 4).forEach(function (q) { add(q[0], q[1]); });
        });
        return out.slice(0, 40);
      }

      function tcCenterCandNear(tc, p) {
        var tol = Math.max(3, tc.lastW / 40), best = null, bd = Infinity;
        tcCenterCands(tc).forEach(function (c) {
          var d = Math.hypot(c.x - p.x, c.y - p.y);
          if (d < bd) { bd = d; best = c; }
        });
        return best && bd <= tol ? best : null;
      }

      // The map's Camera tool works on its own (drag = move, wheel = Z)
      function tcWantsCamera(tc) {
        return tc.view === "center" && !!tc.centerMode && tc.centerMode !== "camera" && tcCenterUsesCamera(tc) && !!(tc.ctx.map.camera.shown && tc.ctx.map.camera.shown());
      }

      // Called on every map drawing: search when the camera stayed still
      // in a new place (or when changing method).
      function tcCenterAutoTick(tc) {
        if (!tcWantsCamera(tc) || tc.centerCamera.busy) return;
        var stt = tc.ctx.machine.getSt && tc.ctx.machine.getSt();
        var ax = stt && stt.axes;
        if (!ax || !ax.X || !ax.Y || !ax.Z) return;
        var key = [Math.round(ax.X.machinePosition), Math.round(ax.Y.machinePosition), Math.round(ax.Z.machinePosition)].join(",");
        var now = Date.now();
        if (key !== tc.centerAuto.key) {
          tc.centerAuto.key = key;
          tc.centerAuto.since = now;
          return;
        }
        if (now - tc.centerAuto.since < 1200 || tc.centerAuto.seen === key) return;
        tc.centerAuto.seen = key;
        tcCenterCameraDetect(tc, false, true);
      }

      function tcCenterCameraDetect(tc, conPhoto, auto) {
        var post = function (path, body) {
          return tzVisionPost(path, body).then(function (j) {
            if (j && j.ok === false) throw new Error(j.error || i18nT('common.no_response'));
            return j;
          });
        };
        tc.centerCamera.busy = true;
        tc.centerCamera.notice = "";
        if (auto) tc.centerAuto.state = i18nT('cuts.searching_the_image');
        tcGo(tc);
        var kinds = ["circles", "rect", "piece"];
        (conPhoto ? post("/photo", {}).then(function (f) { return post("/detect", { photo: f.photo, kinds: kinds }); }) : post("/detect", { kinds: kinds }))
          .then(function (d) {
            tc.centerCamera.busy = false;
            tc.centerCamera.photo = d.photo;
            tc.centerCamera.items = (d.items || []).filter(function (it) { return it.mm && it.mm.c; });
            tc.centerCamera.sel = null;
            if (!d.calibration) tc.centerCamera.notice = i18nT('cuts.the_camera_is_not_calibrated_at');
            else if (d.notice) tc.centerCamera.notice = d.notice;
            if (auto) {
              tc.centerAuto.state = tcCenterCands(tc).length ? "suggested" : i18nT('cuts.nothing');
              tcGo(tc);
            } else tcSetMsg(tc, tc.centerCamera.items.length ? i18nT('cuts.things_detected_tap_one_in_the', { n: tc.centerCamera.items.length }) : i18nT('cuts.nothing_with_a_measurement_was_detected'), !!tc.centerCamera.items.length);
          })
          .catch(function (e) {
            tc.centerCamera.busy = false;
            if (auto) tc.centerAuto.state = "";
            tcSetMsg(tc, i18nT('common.camera_msg', { msg: e.message || e }), false);
          });
      }

      function tcCenterResult(tc) {
        if (tc.centerMode === "camera") return tcCenterCameraResult(tc, tcCenterCameraItem(tc));
        var P = tcCenterFilled(tc);
        if (tc.centerMode === "rect") return P.length === 3 ? tcRectFrom3(P) : null;
        if (tc.centerMode === "circle") return P.length >= 3 ? tcFitCircle(P) : null;
        if (tc.centerMode === "circle2") return P.length === 2 ? tcCircleFrom2(P[0], P[1], tcNum(tc, tc.centerDiam), tc.centerSol) : null;
        if (tc.centerMode === "rect2") return P.length === 2 ? tcRectFrom2(P[0], P[1]) : null;
        if (tc.centerMode === "edges") {
          // 1) left edge 2) right (only X matters) 3) bottom 4) top (only Y)
          if (P.length < 4) return null; // the 4 sides, each one in its place
          var w4 = Math.abs(tc.centerPts[1].x - tc.centerPts[0].x), h4 = Math.abs(tc.centerPts[3].y - tc.centerPts[2].y);
          if (w4 < 0.5 || h4 < 0.5) return null;
          return { cx: (tc.centerPts[0].x + tc.centerPts[1].x) / 2, cy: (tc.centerPts[2].y + tc.centerPts[3].y) / 2, w: w4, h: h4, angle: 0, squareErr: 0 };
        }
        if (tc.centerMode === "rect1") {
          var W = tcNum(tc, tc.centerW), H = tcNum(tc, tc.centerH);
          if (!tc.centerPts[0] || !(W > 0) || !(H > 0)) return null;
          var q1 = tc.centerPts[0];
          var sx = tc.centerCorner === "bl" || tc.centerCorner === "tl" ? 1 : -1;
          var sy = tc.centerCorner === "bl" || tc.centerCorner === "br" ? 1 : -1;
          return { cx: q1.x + (sx * W) / 2, cy: q1.y + (sy * H) / 2, w: W, h: H, angle: 0, squareErr: 0 };
        }
        if (tc.centerMode === "mid")
          return P.length === 2
            ? { cx: (P[0].x + P[1].x) / 2, cy: (P[0].y + P[1].y) / 2, dist: Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y) }
            : null;
        return null;
      }

      function tcCenterFilled(tc) {
        return tc.centerPts.filter(Boolean);
      }

      // "Deviation" line of the result: how far the used points are from
      // the drawn shape.
      function tcCenterDeviation(tc, cr) {
        var P = tcCenterFilled(tc);
        var noms = [];
        tc.centerPts.forEach(function (q, i) { if (q) noms.push("P" + (i + 1)); });
        if (tc.centerMode === "circle" && cr.errs) {
          if (P.length === 3) return i18nT('cuts.deviation_exact', { list: noms.join(" ") });
          return i18nT('cuts.deviation_circle', { rms: tc.fmt(cr.rms), max: tc.fmt(cr.maxErr), p: noms[cr.iMax] || "" });
        }
        if (cr.de3) return cr.squareErr >= 0.05
          ? i18nT('cuts.deviation_rect3', { deg: tc.fmt(cr.squareErr), mm: tc.fmt(cr.cornerErr) })
          : i18nT('cuts.deviation_exact', { list: noms.join(" ") });
        if (tc.centerMode === "circle2" || tc.centerMode === "rect2" || tc.centerMode === "edges" || tc.centerMode === "rect1")
          return i18nT('cuts.deviation_exact', { list: noms.join(" ") });
        return "";
      }

      // the point being captured now: the chosen one or the first missing
      function tcCenterSig(tc) {
        if (tc.centerSlot !== null) return tc.centerSlot;
        var mx = tcCenterMax(tc);
        for (var i = 0; i < tc.centerPts.length; i++) if (!tc.centerPts[i]) return i;
        return mx && tc.centerPts.length >= mx ? mx : tc.centerPts.length;
      }

      // Everything Find center has drawn on the map: the captured points, the tapped target, the camera detections and the centre found
      function tcCenterHasDrawing(tc) {
        return tcCenterFilled(tc).length > 0 || !!tc.centerAim || tc.centerCamera.items.length > 0 || !!tcCenterResult(tc);
      }

      // "Remove drawing": the map is left clean in EVERY mode (the camera detections included); the chosen method stays
      function tcCenterClearDrawing(tc) {
        tc.centerPts = [];
        tc.centerSlot = null;
        tc.centerAim = null;
        tc.centerSol = 0;
        tc.centerCamera.items = [];
        tc.centerCamera.sel = null;
        tc.centerCamera.photo = null;
        tc.centerCamera.notice = "";
        tcCenterDlgClose(tc);
      }

      function tcCenterPush(tc, q) {
        var mx = tcCenterMax(tc);
        var i = tcCenterSig(tc);
        if (mx && i >= mx) {
          tc.centerPts = []; // todos tomados: empieza otra medida
          i = 0;
        }
        while (tc.centerPts.length < i) tc.centerPts.push(null);
        tc.centerPts[i] = q;
        tc.centerSlot = null;
        return i;
      }

      // Box next to the tap on the map (2026-10-11: "when I select it on the
      // map some dialog box should open"): use the point as is,
      // take the pointer there to adjust, or cancel.
      function tcCenterDlgClose(tc) {
        if (tc.centerDlgEl && tc.centerDlgEl.parentNode) tc.centerDlgEl.parentNode.removeChild(tc.centerDlgEl);
        tc.centerDlgEl = null;
      }

      function tcCenterDlg(tc) {
        if (!tc.centerAim || tc.centerDlgSeen || tc.view !== "center" || !tc.centerMode || tc.centerMode === "camera" || !(tc.ctx.centerCard && document.body.contains(tc.ctx.centerCard))) return tcCenterDlgClose(tc);
        tcCenterDlgClose(tc);
        var d = tzEl("div", "tc-cdlg");
        d.setAttribute("data-workshop-i18n", "");
        var i = tcCenterSig(tc);
        d.appendChild(tzEl("div", "t", i18nT('cuts.point', { n: i + 1 })));
        d.appendChild(tzEl("div", "tz-muted", "X" + tc.fmt(tc.centerAim.x) + " Y" + tc.fmt(tc.centerAim.y)));
        var r = tzEl("div", "tz-row");
        d.appendChild(r);
        var aim = tc.centerAim;
        r.appendChild(tzTip(tzBtn(i18nT('cuts.use_this_point'), "primary", function () {
          tcCenterPush(tc, aim);
          tc.centerAim = null;
          tcCenterDlgClose(tc);
          tcGo(tc);
        }), i18nT('cuts.takes_the_point_tapped_on_the')));
        var bIr = tzBtn(i18nT('cuts.go_there_and_adjust'), null, function () {
          tc.centerDlgSeen = true;
          tcCenterDlgClose(tc);
          tcCenterIr(tc, aim.x, aim.y)
            .then(function () { tcSetMsg(tc, i18nT('cuts.pointer_going_to_the_point_adjust'), true); })
            .catch(function (e) { tcSetMsg(tc, i18nT('common.could_not_go', { e: e }), false); });
          tcGo(tc);
        }, i18nT('common.tap_again_moves'));
        bIr.disabled = !tc.ctx.machine.free();
        tzTip(bIr, i18nT('cuts.takes_the_pointer_there_laser_off'));
        r.appendChild(bIr);
        r.appendChild(tzBtn(i18nT('zcal.cancel'), null, function () {
          tc.centerAim = null;
          tcCenterDlgClose(tc);
          tcGo(tc);
        }));
        document.body.appendChild(d);
        var x = Math.min(tc.centerXY.x + 14, window.innerWidth - d.offsetWidth - 8);
        // above the tap (below stays the map's label); with no room, below
        var y = tc.centerXY.y - d.offsetHeight - 14;
        if (y < 8) y = Math.min(tc.centerXY.and + 14, window.innerHeight - d.offsetHeight - 8);
        d.style.left = Math.max(8, x) + "px";
        d.style.top = Math.max(8, y) + "px";
        tc.centerDlgEl = d;
        // tapping outside closes it (the point stays as the destination in the panel)
        setTimeout(function () {
          document.addEventListener("pointerdown", function outside(ev) {
            if (tc.centerDlgEl !== d) return document.removeEventListener("pointerdown", outside, true);
            if (d.contains(ev.target)) return;
            document.removeEventListener("pointerdown", outside, true);
            tc.centerDlgSeen = true;
            tcCenterDlgClose(tc);
          }, true);
        }, 0);
      }

      // Same center with the LASER spot instead of the pointer: the head goes to the center plus the laser correction
      // (the head is not where the spot lands: spot = head - correction). "" without a correction.
      function tcCenterLaserGcode(tc, cr) {
        var h = tcCenterLaserHead(tc, cr);
        return h ? "\n; With the LASER spot on the center (head = center + laser correction): G53 G1 X" + h.x.toFixed(3) + " Y" + h.y.toFixed(3) + " F6000 S0" : "";
      }

      function tcCenterLaserHead(tc, cr) {
        var c = tcCenterCorrection(tc);
        return c && isFinite(c.cx) && isFinite(c.cy) && (c.cx || c.cy) ? tcHeadFor(cr.cx, cr.cy, "laser", c) : null;
      }

      // G-code to go to the center (MACHINE coords = where the pointer lands).
      function tcCenterGcode(tc, cr) {
        return (
          "; Center found (WorkshopWorkbench) -- pointer over X" + tc.fmt(cr.cx) + " Y" + tc.fmt(cr.cy) + "\n" +
          "G53 G1 X" + cr.cx.toFixed(3) + " Y" + cr.cy.toFixed(3) + " F6000 S0" + tcCenterLaserGcode(tc, cr)
        );
      }

      function tcCopyText(tc, t) {
        var ta = document.createElement("textarea");
        ta.value = t;
        ta.style.cssText = "position:fixed;left:-9999px;top:0;";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try {
          ok = document.execCommand("copy");
        } catch (e) {
          ok = false;
        }
        ta.remove();
        if (!ok && navigator.clipboard) return navigator.clipboard.writeText(t);
        return ok ? Promise.resolve() : Promise.reject(new Error(i18nT('cuts.the_browser_didn_t_allow_copying')));
      }

      // Default name of a saved center: "Centre 1", "Centre 2"... (the next number not used in the list)
      function tcCenterNextName(list) {
        var mx = 0;
        list.forEach(function (p) {
          var m = /^(?:Centro|Centre) (\d+)$/.exec((p && p.name) || "");
          if (m) mx = Math.max(mx, +m[1]);
        });
        return i18nT('cuts.centre_n', { n: mx + 1 });
      }

      // Saves the center as a named POSITION (the same list as
      // jog > Saved positions: WORKSHOP_POS_FILE), to go
      // there later or use it as a zone corner/point.
      function tcCenterSaveAsPosition(tc, cr, name) {
        var saved = "";
        return workshopPosUpdate(function (list) {
          saved = (name || "").trim() || tcCenterNextName(list);
          var st = tc.ctx.machine.getSt();
          var z = st && st.axes && st.axes.Z ? st.axes.Z.machinePosition : null;
          list.push({ name: saved, x: Math.round(cr.cx * 1000) / 1000, y: Math.round(cr.cy * 1000) / 1000, z: z });
          return list;
        }).then(function () {
          return saved;
        });
      }

      // Saves the center (name optional) and says so: a message, a note in the result card with a button to the list, and the activity log
      function tcCenterSaveYNotify(tc, cr, name) {
        return tcCenterSaveAsPosition(tc, cr, name)
          .then(function (nm) {
            tc.centerName = "";
            tc.centerSaved = { nm: nm, cx: cr.cx, cy: cr.cy };
            workshopNote("config", i18nT('cuts.find_centre_saved_as_position', { nm: nm }));
            tcSetMsg(tc, i18nT('cuts.position_saved_toast', { nm: nm }), true);
            tcGo(tc);
            return nm;
          })
          .catch(function (e) { tcSetMsg(tc, i18nT('common.could_not_save_2', { err: e.message || e }), false); });
      }

      function tcCenterCopy(tc, cr) {
        var code = tcCenterGcode(tc, cr).split("\n")[1];
        return tcCopyText(tc, tcCenterGcode(tc, cr))
          .then(function () { tcSetMsg(tc, i18nT('cuts.g_code_copied', { code: code }), true); })
          .catch(function () { tcSetMsg(tc, i18nT('cuts.could_not_copy_automatically_g_code', { code: code }), false); });
      }

      // Box over the found center when it is tapped on the map: copy the G-code, save it as a position
      function tcCenterResultDlg(tc, cr) {
        tcCenterDlgClose(tc);
        var d = tzEl("div", "tc-cdlg");
        d.setAttribute("data-workshop-i18n", "");
        d.appendChild(tzEl("div", "t", i18nT('cuts.centre_found_title')));
        d.appendChild(tzEl("div", "tz-muted", "X" + tc.fmt(cr.cx) + " Y" + tc.fmt(cr.cy)));
        var lh = tcCenterLaserHead(tc, cr);
        if (lh) d.appendChild(tzEl("div", "tz-muted", i18nT('cuts.centre_laser_head', { hx: tc.fmt(lh.x), hy: tc.fmt(lh.y), cx: tc.fmt(tcCenterCorrection(tc).cx), x: tc.fmt(cr.cx), y: tc.fmt(cr.cy) })));
        var r = tzEl("div", "tz-row");
        d.appendChild(r);
        r.appendChild(tzTip(tzBtn(i18nT('cuts.copy_g_code'), "primary", function () {
          tcCenterCopy(tc, cr);
          tcCenterDlgClose(tc);
        }), i18nT('cuts.copies_a_line_to_go_to')));
        r.appendChild(tzTip(tzBtn(i18nT('cuts.save_as_position'), null, function () {
          tcCenterDlgClose(tc);
          tcCenterSaveYNotify(tc, cr, tc.centerName);
        }), i18nT('cuts.adds_it_to_the_saved_positions')));
        r.appendChild(tzBtn(i18nT('zcal.cancel'), null, function () { tcCenterDlgClose(tc); }));
        document.body.appendChild(d);
        var x = Math.min(tc.centerXY.x + 14, window.innerWidth - d.offsetWidth - 8);
        var y = tc.centerXY.y - d.offsetHeight - 14;
        if (y < 8) y = Math.min(tc.centerXY.y + 14, window.innerHeight - d.offsetHeight - 8);
        d.style.left = Math.max(8, x) + "px";
        d.style.top = Math.max(8, y) + "px";
        tc.centerDlgEl = d;
        setTimeout(function () {
          document.addEventListener("pointerdown", function outside(ev) {
            if (tc.centerDlgEl !== d) return document.removeEventListener("pointerdown", outside, true);
            if (d.contains(ev.target)) return;
            document.removeEventListener("pointerdown", outside, true);
            tcCenterDlgClose(tc);
          }, true);
        }, 0);
      }

