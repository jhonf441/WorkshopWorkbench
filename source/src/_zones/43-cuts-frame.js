      // -- Frame of the shapes (Simple cuts) --
      // NOT a job: the service sends short pieces (frame.start) and stops at once (frame.stop), like the frame of the
      // Jobs tab (49-trabajos-vista-*). The box or the outline (convex hull) of the shapes, once, N times or until stopped.
      // Before (2026-10-19) it wrote a gcode file and started it with M32: it showed up as a job and could only be a rectangle.

      // Convex hull (monotone chain) of every point of the shapes, closed: [[x, y], ...]
      function tcHull(shapes) {
        var pts = [];
        shapes.forEach(function (s) { tcShapePath(s).forEach(function (p) { pts.push([p.x, p.y]); }); });
        pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
        if (pts.length < 3) return pts;
        function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
        var lo = [], up = [];
        pts.forEach(function (p) {
          while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
          lo.push(p);
        });
        for (var i = pts.length - 1; i >= 0; i--) {
          var q = pts[i];
          while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
          up.push(q);
        }
        lo.pop();
        up.pop();
        var h = lo.concat(up);
        h.push(h[0]);
        return h;
      }

      // Points of the frame in bed coordinates (where the beam goes)
      function tcFramePoints(tc) {
        var b = tcBBox(tc.data.shapes);
        if (!b) return [];
        var rect = [[b.xmin, b.ymin], [b.xmax, b.ymin], [b.xmax, b.ymax], [b.xmin, b.ymax], [b.xmin, b.ymin]];
        if (tc.border.shape === "frame") return rect;
        var h = tcHull(tc.data.shapes);
        return h.length >= 4 ? h : rect;
      }

      function tcFrameStart(tc, how, pct) {
        var correction = tc.ctx.cut.correction();
        var lim = tc.ctx.cut.limits();
        var pts = tcFramePoints(tc);
        if (!pts.length) return Promise.resolve();
        if (how === "laser" && !correction) { tcSetMsg(tc, i18nT('cutarea.there_is_no_known_laser_correction'), false); return Promise.resolve(); }
        // the pointer goes to the shape; the laser, shifted by the correction
        var send = how === "laser" ? pts.map(function (p) { return [p[0] + correction.cx, p[1] + correction.cy]; }) : pts;
        if (lim && send.some(function (p) { return p[0] < lim.xmin - 0.001 || p[0] > lim.xmax + 0.001 || p[1] < lim.ymin - 0.001 || p[1] > lim.ymax + 0.001; })) {
          tcSetMsg(tc, i18nT('tv.frame_outside_axes'), false);
          return Promise.resolve();
        }
        var m = tc.border;
        var rep = m.repeat === "once" ? 1 : m.repeat === "times" ? m.n : 0;
        return workshopApi("frame.start", { points: send, mode: how, power_pct: how === "laser" ? pct : 0, repeat: rep }).then(
          function () { tc.jobStep = null; m.st = { active: true, turn: 0, repeat: rep }; tcSetMsg(tc, i18nT('tv.framing'), true); tcFrameWatch(tc); tcGo(tc); },
          function (e) { tcSetMsg(tc, String((e && e.message) || e), false); }
        );
      }

      function tcFrameWatch(tc) {
        clearInterval(tc.border.timer);
        tc.border.timer = setInterval(function () {
          workshopApi("frame.status", {}).then(function (e) {
            var before = tc.border.st && tc.border.st.active;
            tc.border.st = e;
            if (!e.active) {
              clearInterval(tc.border.timer);
              tc.border.timer = null;
              if (before) tcSetMsg(tc, e.error ? e.error : e.finished === "stopped" ? i18nT('tv.framing_stopped') : i18nT('tv.framing_done'), !e.error);
            }
            tcGo(tc);
          }).catch(function () {});
        }, 1000);
      }

      function tcFrameStop(tc) {
        return workshopApi("frame.stop", {}).then(function () { tcSetMsg(tc, i18nT('tv.stopping'), true); }, function (e) { tcSetMsg(tc, String((e && e.message) || e), false); });
      }

      // The options row (box / outline, how many times) and the Stop button while it traces
      function tcFrameOptions(tc, parent) {
        var m = tc.border;
        var row = tzEl("div", "tz-row");
        row.style.cssText += "gap:4px;flex-wrap:wrap;align-items:center;margin-top:6px;";
        [["frame", i18nT('tv.shape_box')], ["outline", i18nT('tv.shape_outline')]].forEach(function (o) {
          row.appendChild(tzBtn(o[1], m.shape === o[0] ? "primary" : null, function () { m.shape = o[0]; tc.lastKey = ""; tcGo(tc); }));
        });
        var sep = tzEl("span", "tz-muted", i18nT('tv.repeat'));
        sep.style.marginLeft = "10px";
        row.appendChild(sep);
        [["once", i18nT('tv.repeat_once')], ["times", i18nT('tv.repeat_n')], ["continuous", i18nT('tv.repeat_cont')]].forEach(function (o) {
          row.appendChild(tzBtn(o[1], m.repeat === o[0] ? "primary" : null, function () { m.repeat = o[0]; tcGo(tc); }));
        });
        if (m.repeat === "times") {
          var nin = document.createElement("input");
          nin.type = "number";
          nin.className = "tz-input";
          nin.min = "2";
          nin.max = "1000";
          nin.value = String(m.n);
          nin.style.width = "64px";
          nin.addEventListener("change", function () { m.n = Math.max(2, Math.min(1000, parseInt(nin.value, 10) || 2)); tcGo(tc); });
          row.appendChild(nin);
          row.appendChild(tzEl("span", "tz-muted", i18nT('tv.times')));
        }
        parent.appendChild(row);
        if (m.st && m.st.active) {
          var act = tzEl("div", "tz-row");
          act.style.cssText += "gap:6px;align-items:center;margin-top:6px;";
          var stp = tzBtn(i18nT('tv.stop'), "danger", function () { tcFrameStop(tc); });
          stp.style.cssText += "background:#c62828;color:#fff;";
          act.appendChild(stp);
          act.appendChild(tzEl("span", "tz-muted", m.st.stopping ? i18nT('tv.stopping') : (m.st.repeat === 0 ? i18nT('tv.lap_cont', { n: m.st.turn || 1 }) : i18nT('tv.lap_of', { n: m.st.turn || 1, t: m.st.repeat || 1 }))));
          parent.appendChild(act);
        }
      }
