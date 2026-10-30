      function tcCardShapeSel(tc, rc) {
        var fm = {};
          // numeric editor of the selected shape (a single one)
          fm.cur = rc.ssNow.length === 1 ? tcShapeById(tc, tc.sel) : null;
          if (!fm.cur) return;
        tcShapeMeasures(tc, fm, rc);
        tcShapeLine(tc, fm, rc);
        tcShapeActions(tc, fm, rc);
      }

      function tcShapeMeasures(tc, fm, rc) {
        rc.card = tcSection(rc.root, "measures", i18nT('cuts.size_of_shape', { n: tc.data.shapes.indexOf(fm.cur) + 1 }), tcDescribe(fm.cur), true, tzBind(tcGo, tc), true);
        fm.ed = tzEl("div", "tz-form");
        rc.card.appendChild(fm.ed);
        var fields =
          fm.cur.type === "line" ? [["x1", i18nT('cuts.x_start')], ["y1", i18nT('cuts.y_start')], ["x2", i18nT('cuts.x_end')], ["y2", i18nT('cuts.y_end')]]
          : fm.cur.type === "rect" ? [["x", i18nT('cuts.x_corner')], ["y", i18nT('cuts.y_corner')], ["w", i18nT('cuts.width')], ["h", i18nT('cuts.height')]]
          : fm.cur.type === "circle" ? [["cx", i18nT('cuts.x_centre')], ["cy", i18nT('cuts.y_centre')], ["r", i18nT('cuts.radius')]]
          : []; // outline/polyline: edited with the selection bar (position, size, rotation)
        var pair = tzEl("div", "pair");
        fm.ed.appendChild(pair);
        fields.forEach(function (f) {
          var d = tzEl("div");
          d.appendChild(tzEl("label", null, f[1]));
          var inp = document.createElement("input");
          inp.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
          inp.step = "0.1";
          inp.value = tc.fmt(fm.cur[f[0]]);
          inp.addEventListener("change", function () {
            var v = tcNum(tc, inp.value);
            if (v === null) return;
            if ((f[0] === "w" || f[0] === "h" || f[0] === "r") && v <= 0) return;
            fm.cur[f[0]] = v;
            tcSave(tc);
            tcGo(tc);
          });
          d.appendChild(inp);
          pair.appendChild(d);
        });
      }

      function tcShapeLine(tc, fm, rc) {
        if (fm.cur.type === "line") {
          // length + angle (from the start): the end is recomputed
          var Lc = Math.hypot(fm.cur.x2 - fm.cur.x1, fm.cur.y2 - fm.cur.y1);
          var Ac = Math.atan2(fm.cur.y2 - fm.cur.y1, fm.cur.x2 - fm.cur.x1) * 180 / Math.PI;
          var setThe = function (L, A) {
            var r = A * Math.PI / 180;
            fm.cur.x2 = Math.round((fm.cur.x1 + L * Math.cos(r)) * 1000) / 1000;
            fm.cur.y2 = Math.round((fm.cur.y1 + L * Math.sin(r)) * 1000) / 1000;
            tcSave(tc);
            tcGo(tc);
          };
          var el = tzEl("div", "pair");
          fm.ed.appendChild(el);
          [[i18nT('cuts.length_mm'), Lc, function (v) { if (v > 0) setThe(v, Ac); }], [i18nT('cuts.angle_degrees_0_x_90_y'), Ac, function (v) { setThe(Lc, v); }]].forEach(function (f) {
            var d = tzEl("div");
            d.appendChild(tzEl("label", null, f[0]));
            var inp = document.createElement("input");
            inp.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
            inp.step = "0.1";
            inp.value = tc.fmt(f[1]);
            inp.addEventListener("change", function () { var v = tcNum(tc, inp.value); if (v !== null) f[2](v); });
            d.appendChild(inp);
            el.appendChild(d);
          });
          var dr = tzEl("div", "tz-row");
          dr.style.gap = "3px";
          dr.style.alignItems = "center";
          fm.ed.appendChild(dr);
          dr.appendChild(tzEl("span", "tz-muted", i18nT('cuts.direction')));
          [0, 45, 90, 135, 180, 225, 270, 315].forEach(function (a) {
            var on = Math.abs((((Ac - a) % 360) + 540) % 360 - 180) < 0.05;
            dr.appendChild(tzTip(tzBtn(String(a), on ? "primary" : null, function () { setThe(Lc, a); }), i18nT('cuts.rotate_the_line_to_degrees_from', { a: a })));
          });
        }
      }

      function tcShapeActions(tc, fm, rc) {
        var er2 = tzEl("div", "tz-row");
        er2.style.gap = "4px";
        fm.ed.appendChild(er2);
        var usePtr = tzBtn(fm.cur.type === "line" ? i18nT('cuts.start_pointer') : fm.cur.type === "rect" ? i18nT('common.corner_pointer') : i18nT('cuts.centre_pointer'), null, function () {
          tc.ctx.machine.read().then(function () {
            var hp = tcHeadPoint(tc);
            if (!hp) return tcSetMsg(tc, i18nT('cuts.x_y_not_homed'), false);
            if (fm.cur.type === "line") { fm.cur.x1 = hp.x; fm.cur.y1 = hp.y; }
            else if (fm.cur.type === "rect") { fm.cur.x = hp.x; fm.cur.y = hp.y; }
            else if (fm.cur.type === "path") tcMoveCenterTo(fm.cur, hp.x, hp.y);
            else { fm.cur.cx = hp.x; fm.cur.cy = hp.y; }
            tcSave(tc);
            tcGo(tc);
          });
        });
        er2.appendChild(usePtr);
        if (fm.cur.type === "line")
          er2.appendChild(tzBtn(i18nT('cuts.end_pointer'), null, function () {
            tc.ctx.machine.read().then(function () {
              var hp = tcHeadPoint(tc);
              if (!hp) return tcSetMsg(tc, i18nT('cuts.x_y_not_homed'), false);
              fm.cur.x2 = hp.x;
              fm.cur.y2 = hp.y;
              tcSave(tc);
              tcGo(tc);
            });
          }));
        if (fm.cur.type === "rect") {
          // esquinas redondeadas
          var rrw = tzEl("div", "tz-row");
          rrw.style.cssText += "gap:6px;align-items:center;";
          rrw.appendChild(tzEl("span", null, i18nT('cuts.corner_radius_mm')));
          var rri = document.createElement("input");
          rri.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
          rri.min = "0";
          rri.step = "0.5";
          rri.className = "tz-input";
          rri.style.width = "80px";
          rri.value = tc.fmt(fm.cur.rr || 0);
          rri.addEventListener("change", function () { var v = tcNum(tc, rri.value); if (v !== null && v >= 0) { fm.cur.rr = v; tcSave(tc); tcGo(tc); } });
          rrw.appendChild(rri);
          fm.ed.appendChild(rrw);
        }
      }
