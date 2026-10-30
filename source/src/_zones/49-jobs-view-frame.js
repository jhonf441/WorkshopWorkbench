      function tvVisReadFrame(tvs) {
        return workshopApi("frame.status", {}).then(function (e) {
          tvs.frameSt = e;
          if (e.active) tvVisWatchFrame(tvs);
        }).catch(function () {});
      }

      function tvVisFrame(tvs) {
        if (!tvs.prev || !tvs.prev.bbox) return Promise.resolve();
        var c = tvVisCorrection(tvs);
        var pts = tvvisforma_points(tvs).map(function (p) {
          return tvs.how === "pointer" ? [p[0] - c.cx, p[1] - c.cy] : [p[0], p[1]];
        });
        var args = { points: pts, mode: tvs.how, power_pct: tvs.how === "laser" ? tvs.pct : 0, repeat: tvs.repeat === "once" ? 1 : tvs.repeat === "times" ? tvs.nTimes : 0 };
        return workshopApi("frame.start", args).then(
          function () { tvs.msgOk = true; tvs.msg = i18nT('tv.framing'); tvs.frameSt = { active: true, turn: 0, repeat: args.repeat }; tvVisWatchFrame(tvs); tvVisRender(tvs); },
          function (e) { tvs.msgOk = false; tvs.msg = String((e && e.message) || e); tvVisRender(tvs); }
        );
      }

      // vertex of the plan where the simulation is: {ri: run, k: vertex of that run} (the next segment is the one that starts there)
      function tvVisPointOfCut(tvs) {
        var runs = tvs.prev.segments || [];
        for (var i = runs.length - 1; i >= 0; i--) {
          var r = runs[i];
          if (!r.t || r.t[0] > tvs.tNow) continue;
          var k = tvVisIndexEn(tvs, r, tvs.tNow);
          if (k + 1 >= r.f.length) {
            if (i + 1 >= runs.length) return null;
            return { ri: i + 1, k: 0 };
          }
          return { ri: i, k: k };
        }
        return null;
      }

      function tvVisSinceHere(tvs) {
        if (!tvs.prev || tvs.prev.mode !== "Laser") return;
        var pc = tvVisPointOfCut(tvs);
        if (!pc) { tvs.sinceOk = false; tvs.sinceMsg = i18nT('tv.from_here_end'); tvVisRender(tvs); return; }
        var r = tvs.prev.segments[pc.ri];
        var fpos = r.f[pc.k + 1];
        var start = [r.p[2 * pc.k], r.p[2 * pc.k + 1]];
        tvs.sinceOk = true;
        tvs.sinceMsg = i18nT('tv.building');
        tvVisRender(tvs);
        fetch("/machine/file/" + encodeURI("0:/gcodes/" + tvs.sel), { cache: "no-store" })
          .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.arrayBuffer();
          })
          .then(function (buf) {
            var bytes = new Uint8Array(buf);
            var dec = new TextDecoder("utf-8");
            var res = tvSinceHere(dec.decode(bytes.slice(0, fpos)), dec.decode(bytes.slice(fpos)), start, tvs.prev.fast_mm_min);
            if (res.error) throw new Error(i18nT('tv.from_here_relative'));
            var base = tvs.sel.split("/").pop().replace(/\.[^.]*$/, "");
            var nombre = "Workshop/since_" + base + "_" + tvVisStampLocal(tvs) + ".gcode";
            return fetch("/machine/directory/" + encodeURI("0:/gcodes/Workshop"), { method: "PUT" }).catch(function () {}).then(function () {
              return fetch("/machine/file/" + encodeURI("0:/gcodes/" + nombre), { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: res.text });
            }).then(function (put) {
              if (!put.ok) throw new Error("HTTP " + put.status);
              tvs.sinceOk = true;
              tvs.sinceMsg = "";
              tvs.boardMsg = "";
              tvs.files.push({ path: nombre, size: 0, date: "" });
              tvs.sel = nombre;
              tvs.msgPost = i18nT('tv.from_here_done', { f: nombre, q: res.notices.removed });
              tvVisRead(tvs);
            });
          })
          .catch(function (e) {
            tvs.sinceOk = false;
            tvs.sinceMsg = String((e && e.message) || e);
            tvVisRender(tvs);
          });
      }

      function tvVisStartJob(tvs) {
        if (!tvs.prev || !tvs.sel) return;
        return postCode('M32 "0:/gcodes/' + tvs.sel + '"').then(
          function () { tvs.msgOk = true; tvs.msg = i18nT('tv.sent'); tvVisRender(tvs); },
          function (e) { tvs.msgOk = false; tvs.msg = String((e && e.message) || e); tvVisRender(tvs); }
        );
      }

      function tvVisStopFrame(tvs) {
        return workshopApi("frame.stop", {}).then(function () { tvs.msgOk = true; tvs.msg = i18nT('tv.stopping'); tvVisRender(tvs); }, function (e) { tvs.msgOk = false; tvs.msg = String((e && e.message) || e); tvVisRender(tvs); });
      }

      // ---------- the card ----------
      function tvVisDatum(tvs, grid, k, v, tip) {
        var d = tzEl("div", "tz-stat");
        d.appendChild(tzEl("div", "tz-muted", k));
        var vv = tzEl("div", null, v);
        vv.style.fontWeight = "600";
        d.appendChild(vv);
        if (tip) tzTip(d, tip);
        grid.appendChild(d);
      }

      function tvVisChart(tvs) {
        var NS = "http://www.w3.org/2000/svg";
        var s = document.createElementNS(NS, "svg");
        s.setAttribute("viewBox", "0 0 100 40");
        s.setAttribute("preserveAspectRatio", "none");
        s.style.cssText = "width:100%;height:70px;background:rgba(255,255,255,0.04);border-radius:4px;display:block;";
        var T = tvVisTotal(tvs);
        if (!T) return s;
        var vmax = 0;
        (tvs.prev.segments || []).forEach(function (r) { if (r.w) vmax = Math.max(vmax, tvs.prev.mode === "CNC" ? -r.v : r.v); });
        vmax = vmax || 1;
        (tvs.prev.segments || []).forEach(function (r) {
          if (!r.t || r.t.length < 2) return;
          var x0 = (r.t[0] / T) * 100, x1 = (r.t[r.t.length - 1] / T) * 100;
          var rect = document.createElementNS(NS, "rect");
          if (r.w) {
            var f = Math.max(0.08, (tvs.prev.mode === "CNC" ? -r.v : r.v) / vmax);
            rect.setAttribute("y", String(40 - 38 * f));
            rect.setAttribute("height", String(38 * f));
            rect.setAttribute("fill", tvVisColorOf(tvs, r));
          } else {
            rect.setAttribute("y", "37");
            rect.setAttribute("height", "3");
            rect.setAttribute("fill", "#9e9e9e");
          }
          rect.setAttribute("x", String(x0));
          rect.setAttribute("width", String(Math.max(0.15, x1 - x0)));
          s.appendChild(rect);
        });
        var ln = document.createElementNS(NS, "line");
        ln.setAttribute("y1", "0");
        ln.setAttribute("y2", "40");
        ln.setAttribute("stroke", "#fff");
        ln.setAttribute("stroke-width", "0.6");
        ln.setAttribute("x1", String((tvs.tNow / T) * 100));
        ln.setAttribute("x2", String((tvs.tNow / T) * 100));
        s.appendChild(ln);
        tvs.chartPlay = ln;
        return s;
      }

      function tvVisRenderBoard(tvs) {
        var box = tzEl("div", "tz-card wf-card");
        box.style.cssText += "margin-top:10px;padding:8px;border:1px solid rgba(255,255,255,0.18);border-radius:6px;";
        box.appendChild(tzEl("div", "tz-title", i18nT('tv.board_title', { n: tvs.board.length })));
        box.appendChild(tzEl("div", "tz-muted", i18nT('tv.board_help')));
        var ar = tvVisAreaBoard(tvs);
        tvs.board.forEach(function (it, i) {
          var row = tzEl("div", "tz-row");
          row.style.cssText += "gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;";
          var dot = tzEl("span", null, " ");
          dot.style.cssText = "display:inline-block;width:10px;height:10px;border-radius:50%;background:" + it.color + ";";
          row.appendChild(dot);
          var b = it.prev.bbox;
          var nm = tzEl("span", null, (i + 1) + ". " + it.path.split("/").pop() + " (" + tzFmt(b.xmax - b.xmin) + " x " + tzFmt(b.ymax - b.ymin) + ")");
          nm.style.cssText = "flex:1 1 150px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
          nm.title = it.path;
          row.appendChild(nm);
          [["dx", "X"], ["dy", "Y"]].forEach(function (o) {
            row.appendChild(tzEl("span", "tz-muted", o[1]));
            var inp = document.createElement("input");
            inp.type = "number";
            inp.step = "1";
            inp.className = "tz-input";
            inp.style.width = "72px";
            inp.value = String(it[o[0]]);
            inp.addEventListener("change", function () {
              it[o[0]] = Math.round((parseFloat(inp.value) || 0) * 10) / 10;
              tvs.boardFile = null;
              tvVisRender(tvs);
              tvs.ctx.map.redraw();
            });
            row.appendChild(inp);
          });
          row.appendChild(tzBtn(i18nT('tv.board_remove'), null, function () { tvVisRemoveOfBoard(tvs, i); }));
          box.appendChild(row);
        });
        var acc = tzEl("div", "tz-row");
        acc.style.cssText += "gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;";
        acc.appendChild(tzTip(tzBtn(i18nT('tv.board_arrange'), null, tzBind(tvVisArrangeBoard, tvs)), i18nT('tv.board_arrange_tip')));
        acc.appendChild(tzBtn(i18nT('tv.board_create'), "primary", tzBind(tvVisCreateFileBoard, tvs)));
        box.appendChild(acc);
        var rv = tvVisCheckBoard(tvs);
        if (ar && rv.well) box.appendChild(tzEl("div", "tz-muted", i18nT('tv.board_ok')));
        rv.list.forEach(function (t) { box.appendChild(tzEl("div", "tz-msg err", t)); });
        if (tvs.boardMsg) {
          var m = tzEl("div", tvs.boardOk ? "tz-muted" : "tz-msg err", tvs.boardMsg);
          m.style.marginTop = "6px";
          box.appendChild(m);
        }
        tvs.boardNotices.forEach(function (t) { box.appendChild(tzEl("div", "tz-msg err", t)); });
        if (tvs.boardFile) box.appendChild(tzBtn(i18nT('tv.board_open'), "primary", tzBind(tvVisVerFileBoard, tvs)));
        tvs.card.appendChild(box);
      }

