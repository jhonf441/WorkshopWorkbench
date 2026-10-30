      // ---- Laser editor: rotating the selection (2026-10-24, docs-internal/MESA-RENOVADA.md section 5) ----
      // Before, rotation was three hidden things: "Rotate 90" among the mirror buttons, a "Rotate (degrees)" box that always showed 0 and
      // turned by the number typed, and a small green dot above the selection (pivot fixed at the centre, a 15 degree magnet only within
      // 3 degrees, the angle never drawn). Now:
      //   - a "Rotate" group of its own in the selection bar: 90 left / step left / step right / 90 right, a box "by degrees" with its
      //     Apply button (Enter applies too), the PIVOT (centre, a corner of the selection, or the 0,0 of the active zone) and the STEP of the
      //     angle magnet (free, 1, 5, 15, 45);
      //   - the floating strip of the selection on the map (the one the touch screen uses) has 90 left / 90 right;
      //   - keys: R turns 90 to the right, Shift+R 90 to the left (only in the editor and never while typing);
      //   - the handle: bigger (bigger still on a touch screen), the turn goes around the chosen pivot, the angle snaps to the step (Shift:
      //     free) and the map draws the pivot, the arc and the angle while dragging.
      // Angles: positive = counter-clockwise on the bed (Y up), the same as tcRotateFn (39-cuts-geometry.js). The pivot and the step are a
      // preference of this browser (localStorage TC_ROT_KEY), not part of the design.
      // State: tc.rot = { pivot, step }.
      var TC_ROT_KEY = "workshopCutsRotate";
      var TC_ROT_PIVOTS = ["center", "bl", "br", "tl", "tr", "zone"];
      var TC_ROT_STEPS = [0, 1, 5, 15, 45]; // 0 = free (tenths of a degree)

      function tcRotLoad(tc) {
        var v = null;
        try { v = JSON.parse(localStorage.getItem(TC_ROT_KEY) || "null"); } catch (e) { v = null; }
        tc.rot = {
          pivot: v && TC_ROT_PIVOTS.indexOf(v.pivot) >= 0 ? v.pivot : "center",
          step: v && TC_ROT_STEPS.indexOf(v.step) >= 0 ? v.step : 15,
        };
        return tc.rot;
      }

      function tcRotSave(tc) {
        try { localStorage.setItem(TC_ROT_KEY, JSON.stringify(tc.rot)); } catch (e) { /* a preference: the default next time */ }
      }

      function tcRot(tc) {
        return tc.rot || tcRotLoad(tc);
      }

      // the pivot point (pure): b = box of the selection {xmin, xmax, ymin, ymax}, zone = {x, y} of the active zone or null
      function tcRotPivotPoint(b, key, zone) {
        if (!b) return null;
        if (key === "bl") return { x: b.xmin, y: b.ymin };
        if (key === "br") return { x: b.xmax, y: b.ymin };
        if (key === "tl") return { x: b.xmin, y: b.ymax };
        if (key === "tr") return { x: b.xmax, y: b.ymax };
        if (key === "zone" && zone && isFinite(zone.x) && isFinite(zone.y)) return { x: zone.x, y: zone.y };
        return { x: (b.xmin + b.xmax) / 2, y: (b.ymin + b.ymax) / 2 };
      }

      // the angle with the magnet (pure): step 0 or free = tenths of a degree; otherwise the nearest multiple of the step
      function tcRotSnapAngle(a, step, free) {
        if (!isFinite(a)) return 0;
        if (free || !step) return Math.round(a * 10) / 10;
        return Math.round(a / step) * step;
      }

      // the angle of a drag (pure): from the pointer at the start to the pointer now, around the pivot, in (-180, 180]
      function tcRotDragAngle(c, p0, p) {
        var a = ((Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(p0.y - c.y, p0.x - c.x)) * 180) / Math.PI;
        while (a > 180) a -= 360;
        while (a <= -180) a += 360;
        return a;
      }

      function tcRotPivotOf(tc) {
        return tcRotPivotPoint(tcSelBox(tc), tcRot(tc).pivot, tcZoneBox(tc));
      }

      // turns the selection by deg (counter-clockwise) around the chosen pivot
      function tcRotateSel(tc, deg) {
        var c = tcRotPivotOf(tc);
        if (!c || !deg) return;
        tcTransformSel(tc, tcRotateFn(deg, c.x, c.y), { rotate: true });
      }

      // The "Rotate" group of the selection bar (42-cuts-bar.js)
      function tcEditBarRotate(tc, eb, card) {
        var r = tcRot(tc);
        var box = tzEl("div", "tc-group tc-rot");
        box.setAttribute("data-tc", "rotate");
        box.appendChild(tzEl("span", "tc-glabel", i18nT('cuts.rotate_title')));
        var step = r.step || 15;
        [[90, "rotate-left", 'cuts.rotate_left_90'], [step, "rotate-left", 'cuts.rotate_left_step'], [-step, "rotate-right", 'cuts.rotate_right_step'], [-90, "rotate-right", 'cuts.rotate_right_90']].forEach(function (b) {
          var btn = tzBtn((Math.abs(b[0]) === 90 ? "90" : String(Math.abs(b[0]))) + "°", null, function () { tcRotateSel(tc, b[0]); });
          var ic = tzEl("span", "mdi mdi-" + b[1]);
          ic.setAttribute("aria-hidden", "true");
          btn.insertBefore(ic, btn.firstChild);
          btn.setAttribute("aria-label", i18nT(b[2], { n: Math.abs(b[0]) }));
          box.appendChild(tzTip(btn, i18nT(b[2], { n: Math.abs(b[0]) })));
        });
        card.appendChild(box);
        card.appendChild(tcEditBarRotateFields(tc));
      }

      // the angle box with Apply, the pivot and the step of the magnet
      function tcEditBarRotateFields(tc) {
        var r = tcRot(tc);
        var row = tzEl("div", "tc-inline tc-rot-fields");
        var d = tzEl("div");
        d.appendChild(tzEl("label", null, i18nT('cuts.rotate_by_degrees')));
        var inp = document.createElement("input");
        inp.type = "text"; // text: an account can be typed (tzEval)
        inp.placeholder = "0";
        inp.setAttribute("inputmode", "decimal");
        var apply = function () { var v = tcNum(tc, inp.value); if (v) tcRotateSel(tc, v); };
        inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); apply(); } });
        d.appendChild(inp);
        row.appendChild(d);
        row.appendChild(tzTip(tzBtn(i18nT('cuts.rotate_apply'), "primary", apply), i18nT('cuts.rotate_apply_tip')));
        row.appendChild(tcRotSelect(tc, i18nT('cuts.rotate_pivot'), TC_ROT_PIVOTS, r.pivot, function (k) { return i18nT('cuts.pivot_' + k); }, function (v) { r.pivot = v; }));
        row.appendChild(tcRotSelect(tc, i18nT('cuts.rotate_step'), TC_ROT_STEPS.map(String), String(r.step), function (k) { return k === "0" ? i18nT('cuts.rotate_free') : k + "°"; }, function (v) { r.step = Number(v); }));
        return row;
      }

      function tcRotSelect(tc, label, values, current, name, set) {
        var d = tzEl("div");
        d.appendChild(tzEl("label", null, label));
        var sel = document.createElement("select");
        sel.className = "tz-input";
        values.forEach(function (v) {
          var o = document.createElement("option");
          o.value = v;
          o.textContent = name(v);
          if (v === current) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener("change", function () { set(sel.value); tcRotSave(tc); tcGo(tc); });
        d.appendChild(sel);
        return d;
      }

      // the drag of the rotate handle starts: around the chosen pivot (41-cuts-pointer.js)
      function tcRotDragStart(tc, p, orig) {
        var c = tcRotPivotOf(tc);
        return { kind: "rotate", start: p, moved: false, c: c, orig: orig };
      }

      // the drag goes on: the angle with the magnet (Shift: free) -> {fn, kind, a}
      function tcRotDragStep(tc, p, free) {
        var a = tcRotSnapAngle(tcRotDragAngle(tc.drag.c, tc.drag.start, p), tcRot(tc).step, free);
        tc.drag.a = a;
        tc.drag.info = i18nT('cuts.rotation_degrees', { a: tc.fmt(a) });
        return { fn: tcRotateFn(a, tc.drag.c.x, tc.drag.c.y), kind: { rotate: true } };
      }

      // on the map while rotating: the pivot, a line to the pointer at the start and now, and the angle
      function tcRotDrawDrag(tc, dv, node, w) {
        var d = tc.drag;
        if (!d || d.kind !== "rotate" || !d.c) return;
        var c = d.c, rr = Math.hypot(d.start.x - c.x, d.start.y - c.y) || w / 20;
        var a0 = Math.atan2(d.start.y - c.y, d.start.x - c.x), a1 = a0 + ((d.a || 0) * Math.PI) / 180;
        var col = "#ffe082";
        node("line", { x1: c.x, y1: -c.y, x2: c.x + rr * Math.cos(a0), y2: -(c.y + rr * Math.sin(a0)), stroke: col, "stroke-width": dv.sw * 0.6, "stroke-dasharray": w / 150 + " " + w / 150 });
        node("line", { x1: c.x, y1: -c.y, x2: c.x + rr * Math.cos(a1), y2: -(c.y + rr * Math.sin(a1)), stroke: col, "stroke-width": dv.sw });
        var large = Math.abs(d.a || 0) > 180 ? 1 : 0, sweep = (d.a || 0) > 0 ? 0 : 1; // screen Y is down: counter-clockwise on the bed is sweep 0
        var ra = rr * 0.35;
        node("path", { d: "M " + (c.x + ra * Math.cos(a0)) + " " + -(c.y + ra * Math.sin(a0)) + " A " + ra + " " + ra + " 0 " + large + " " + sweep + " " + (c.x + ra * Math.cos(a1)) + " " + -(c.y + ra * Math.sin(a1)), fill: "none", stroke: col, "stroke-width": dv.sw * 0.8 });
        tcRotDrawPivot(dv, node, w, c);
        var t = node("text", { x: c.x + w / 80, y: -c.y - w / 80, fill: col, "font-size": w / 55, "font-weight": "bold", stroke: "#000", "stroke-width": w / 600, "paint-order": "stroke" });
        t.textContent = tc.fmt(d.a || 0) + "°";
      }

      // the pivot: a ring with a cross (also shown with the selection when it is not the centre)
      function tcRotDrawPivot(dv, node, w, c) {
        var s = w / 110;
        node("circle", { cx: c.x, cy: -c.y, r: s, fill: "none", stroke: "#ffe082", "stroke-width": dv.sw * 0.8 });
        node("line", { x1: c.x - s * 1.6, y1: -c.y, x2: c.x + s * 1.6, y2: -c.y, stroke: "#ffe082", "stroke-width": dv.sw * 0.6 });
        node("line", { x1: c.x, y1: -c.y - s * 1.6, x2: c.x, y2: -c.y + s * 1.6, stroke: "#ffe082", "stroke-width": dv.sw * 0.6 });
      }

      // R / Shift+R in the editor (40-cuts-state.js): true when the key was used
      function tcRotKey(tc, ev) {
        if (ev.ctrlKey || ev.metaKey || ev.altKey || (ev.key !== "r" && ev.key !== "R")) return false;
        tcRotateSel(tc, ev.shiftKey ? 90 : -90);
        return true;
      }

      // a touch screen: the handles are bigger to be hit with a finger
      function tcCoarsePointer() {
        try { return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; }
      }
