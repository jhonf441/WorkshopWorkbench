      function tvVisRender(tvs) {
        var rv = {};
        tvs.card.textContent = "";
        tvs.scrub = null;
        tvs.clock = null;
        tvs.chartPlay = null;
        var tit = tzEl("div", "tz-title", i18nT('tv.title'));
        tvs.card.appendChild(tit);
        tvs.card.appendChild(tzEl("div", "tz-muted", i18nT('tv.help')));
        var row = tzEl("div", "tz-row");
        row.style.cssText += "gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;";
        var s = document.createElement("select");
        s.className = "tz-input";
        s.style.cssText = "flex:1 1 220px;min-width:0;max-width:100%;";
        var o0 = document.createElement("option");
        o0.value = "";
        o0.textContent = tvs.files.length ? i18nT('tv.pick') : i18nT('tv.no_files');
        s.appendChild(o0);
        tvs.files.forEach(function (a) {
          var o = document.createElement("option");
          o.value = a.path;
          o.textContent = a.path + (a.size ? " (" + (a.size > 1048576 ? (a.size / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(a.size / 1024)) + " KB") + ")" : "");
          if (a.path === tvs.sel) o.selected = true;
          s.appendChild(o);
        });
        s.addEventListener("change", function () { tvs.sel = s.value; });
        row.appendChild(s);
        row.appendChild(tzBtn(tvs.reading ? i18nT('tv.reading') : i18nT('tv.view'), "primary", function () { tvVisRead(tvs); }));
        row.appendChild(tzBtn(i18nT('tv.refresh'), null, function () { tvVisLoadList(tvs); }));
        if (tvs.prev && tvs.prev.bbox) row.appendChild(tzTip(tzBtn(i18nT('tv.board_add'), null, tzBind(tvVisAddABoard, tvs)), i18nT('tv.board_add_tip')));
        if (tvs.prev) row.appendChild(tzBtn(i18nT('tv.clear'), null, tzBind(tvVisRemove, tvs)));
        row.appendChild(tzTip(tzBtn(i18nT('tv.clean'), null, function () { if (tvs.ctx.nav.cleanWorkbench) tvs.ctx.nav.cleanWorkbench(); }), i18nT('tv.clean_tip')));
        tvs.card.appendChild(row);
        if (tvs.msg) {
          var m = tzEl("div", tvs.msgOk ? "tz-muted" : "tz-msg err", tvs.msg);
          m.style.marginTop = "6px";
          tvs.card.appendChild(m);
        }
        if (tvs.board.length) tvVisRenderBoard(tvs);
        if (!tvs.prev) return;
        if (!TZ_PROFILES[tvs.prev.mode]) {
          // a file of a mode another plugin serves (an FFF print): only where it is simulated
          var other = tzModeElsewhere(tvs.prev.mode);
          tvs.card.appendChild(tzEl("div", "tz-msg", i18nT('job.other_mode_job', { mode: tvs.prev.mode, page: other ? i18nT(other.name) : "" })));
          return;
        }
        rv.st = tvs.prev.stats || {};
        var b = tvs.prev.bbox;
        var grid = tzEl("div", "tz-stats");
        grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:10px;";
        tvVisDatum(tvs, grid, i18nT('tv.size'), b ? tzFmt(b.xmax - b.xmin) + " x " + tzFmt(b.ymax - b.ymin) + " mm" : "-");
        tvVisDatum(tvs, grid, i18nT('tv.time'), tvFmtDur(rv.st.time_s || 0), i18nT('tv.time_tip'));
        tvVisDatum(tvs, grid, i18nT('tv.cut_dist'), tzFmt(rv.st.dist_cut || 0) + " mm");
        tvVisDatum(tvs, grid, i18nT('tv.travel_dist'), tzFmt(rv.st.dist_travel || 0) + " mm");
        tvVisDatum(tvs, grid, i18nT('tv.pieces'), String(rv.st.pieces || 0), i18nT('tv.pieces_tip'));
        if (rv.st.f_min) tvVisDatum(tvs, grid, i18nT('tv.feed'), Math.round(rv.st.f_min) === Math.round(rv.st.f_max) ? Math.round(rv.st.f_min) + " mm/min" : Math.round(rv.st.f_min) + " - " + Math.round(rv.st.f_max) + " mm/min");
        if (tvs.prev.mode === "Laser" && rv.st.v_max !== null && rv.st.v_max !== undefined) tvVisDatum(tvs, grid, i18nT('tv.power'), Math.round((rv.st.v_min || 0) * 100) + " - " + Math.round(rv.st.v_max * 100) + " %");
        if (tvs.prev.mode === "CNC" && rv.st.z_min !== null && rv.st.z_min !== undefined) tvVisDatum(tvs, grid, i18nT('tv.depth'), tzFmt(-rv.st.z_min) + " mm");
        tvVisDatum(tvs, grid, i18nT('tv.mode'), tvs.prev.mode);
        tvs.card.appendChild(grid);
        var outside = tvVisNoticeArea(tvs);
        if (outside.length) {
          var av = tzEl("div", "tz-msg err", i18nT('tv.out_of_area', { sides: outside.join(", ") }));
          av.style.marginTop = "8px";
          tvs.card.appendChild(av);
          tvs.card.appendChild(tzEl("div", "tz-muted", i18nT('tv.out_of_area_hint', { zone: (tvs.ctx.data.nameActive && tvs.ctx.data.nameActive()) || "?" })));
        }
        if (tvs.prev.vertices < tvs.prev.vertices_total) {
          tvs.card.appendChild(tzEl("div", "tz-muted", i18nT('tv.simplified', { n: tvs.prev.vertices, t: tvs.prev.vertices_total })));
        }
        tvVisLayers(tvs, rv);
        tvVisClock(tvs, rv);
        tvVisButtons(tvs, rv);
      }


      function tvVisStart(tvs) {
        if (tvs.done) return;
        tvs.done = true;
        tvVisLoadList(tvs);
        tvVisReadFrame(tvs);
        tvVisRender(tvs);
      }

      function tvVisLayers(tvs, rv) {
        // Laser / CNC: the layers of the job (power + feed, or depth), with the colour, what each one does and a switch to hide it
        if (tvs.prev.groups && tvs.prev.groups.length > 1) {
          var lg = tzEl("div", "tz-row");
          lg.style.cssText += "gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px;";
          lg.appendChild(tzEl("span", "tz-muted", i18nT('tv.color_by')));
          [["layers", i18nT('tv.by_layers')], ["power", tvs.prev.mode === "CNC" ? i18nT('tv.by_depth') : i18nT('tv.by_power')]].forEach(function (o) {
            lg.appendChild(tzBtn(o[1], tvs.colorBy === o[0] ? "primary" : null, function () { tvs.colorBy = o[0]; tvs.layer = null; tvVisRender(tvs); tvs.ctx.map.redraw(); }));
          });
          tvs.card.appendChild(lg);
          tvs.prev.groups.forEach(function (g) {
            var row = tzEl("label", "tz-row");
            row.style.cssText += "gap:6px;align-items:center;margin-top:4px;cursor:pointer;font-size:12px;";
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = !tvs.hidden[g.key];
            cb.addEventListener("change", function () { tvs.hidden[g.key] = !cb.checked; tvs.ctx.map.redraw(); });
            row.appendChild(cb);
            var sw = tzEl("span", null, " ");
            sw.style.cssText = "display:inline-block;width:12px;height:12px;border-radius:3px;background:" + (tvs.colorBy === "layers" ? g.color : tvs.prev.mode === "CNC" ? ttDepthColor(tvs.prev.stats && tvs.prev.stats.z_min < 0 ? g.v / tvs.prev.stats.z_min : 0) : ttPowerColor(Math.round(g.v * 10) / 10)) + ";";
            row.appendChild(sw);
            var txt = tvs.prev.mode === "Laser"
              ? i18nT('tv.layer_laser', { n: g.n + 1, p: Math.round(g.v * 100), f: g.fd, d: tzFmt(g.dist), t: tvFmtDur(g.time) })
              : i18nT('tv.layer_cnc', { n: g.n + 1, z: tzFmt(g.v), d: tzFmt(g.dist), t: tvFmtDur(g.time) });
            row.appendChild(tzEl("span", null, txt));
            tvs.card.appendChild(row);
          });
        }
        // chart of the job over time
        var gt = tzEl("div", "tz-muted", i18nT('tv.chart'));
        gt.style.marginTop = "10px";
        tvs.card.appendChild(gt);
        tvs.card.appendChild(tvVisChart(tvs));
        // simulation
        rv.sim = tzEl("div", "tz-row");
        rv.sim.style.cssText += "gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;";
        rv.sim.appendChild(tzBtn(tvs.playing ? i18nT('tv.pause') : i18nT('tv.simulate'), tvs.playing ? null : "primary", function () { if (tvs.playing) { tvVisStop(tvs); tvVisRender(tvs); } else tvVisPlay(tvs); }));
        rv.sim.appendChild(tzBtn(i18nT('tv.restart'), null, function () { tvVisStop(tvs); tvs.tNow = 0; tvVisRender(tvs); tvs.ctx.map.redraw(); }));
        var sp = document.createElement("select");
        sp.className = "tz-input";
        TV_SPEEDS.forEach(function (v, i) {
          var o = document.createElement("option");
          o.value = String(i);
          o.textContent = "x" + v;
          if (i === tvs.speedIx) o.selected = true;
          sp.appendChild(o);
        });
        sp.addEventListener("change", function () { tvs.speedIx = parseInt(sp.value, 10) || 0; });
        rv.sim.appendChild(sp);
      }

      function tvVisClock(tvs, rv) {
        tvs.clock = tzEl("span", "tz-muted", tvFmtDur(tvs.tNow) + " / " + tvFmtDur(tvVisTotal(tvs)));
        rv.sim.appendChild(tvs.clock);
        tvs.card.appendChild(rv.sim);
        tvs.scrub = document.createElement("input");
        tvs.scrub.type = "range";
        tvs.scrub.min = "0";
        tvs.scrub.max = "1000";
        tvs.scrub.value = String(tvVisTotal(tvs) ? Math.round((1000 * tvs.tNow) / tvVisTotal(tvs)) : 0);
        tvs.scrub.style.cssText = "width:100%;margin-top:4px;";
        tvs.scrub.addEventListener("input", function () {
          tvs.tNow = (parseInt(tvs.scrub.value, 10) / 1000) * tvVisTotal(tvs);
          tvVisPaintProgress(tvs);
          tvs.ctx.map.redraw();
        });
        tvs.card.appendChild(tvs.scrub);
        // after looking at it: send it from the point where the simulation is (Laser only: the Z of the
        // skipped part is not known to the plan)
        var dq = tzEl("div", "tz-row");
        dq.style.cssText += "gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;";
        var bdq = tzBtn(i18nT('tv.from_here'), null, function () { tvVisSinceHere(tvs); }, i18nT('tv.from_here_confirm'), "tv-since");
        bdq.disabled = tvs.prev.mode !== "Laser" || tvs.tNow <= 0 || tvs.tNow >= tvVisTotal(tvs);
        dq.appendChild(tzTip(bdq, tvs.prev.mode === "Laser" ? i18nT('tv.from_here_tip') : i18nT('tv.from_here_only_laser')));
        if (tvs.sinceMsg) dq.appendChild(tzEl("span", tvs.sinceOk ? "tz-muted" : "tz-msg err", tvs.sinceMsg));
        tvs.card.appendChild(dq);
        // frame
        var fr = tzEl("div", "tz-title", i18nT('tv.frame_title'));
        fr.style.marginTop = "12px";
        tvs.card.appendChild(fr);
        tvs.card.appendChild(tzEl("div", "tz-muted", i18nT('tv.frame_help')));
        var f1 = tzEl("div", "tz-row");
        f1.style.cssText += "gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;";
        [["frame", i18nT('tv.shape_box')], ["outline", i18nT('tv.shape_outline')]].forEach(function (o) {
          var bt = tzBtn(o[1], tvs.shape === o[0] ? "primary" : null, function () { tvs.shape = o[0]; tvVisRender(tvs); tvs.ctx.map.redraw(); });
          f1.appendChild(bt);
        });
        if (tzViewNow() !== "technician" && tvs.how === "laser") tvs.how = "pointer"; // framing with the laser on is the technician's (20-role-view.js)
        [["pointer", i18nT('tv.how_pointer')], ["laser", i18nT('tv.how_laser')]].forEach(function (o) {
          if (o[0] === "laser" && tvs.prev.mode !== "Laser") return;
          var bt = tzBtn(o[1], tvs.how === o[0] ? "primary" : null, function () { tvs.how = o[0]; tvVisRender(tvs); tvs.ctx.map.redraw(); });
          bt.style.marginLeft = o[0] === "pointer" ? "12px" : "";
          f1.appendChild(o[0] === "laser" ? tzTechOnly(bt) : bt);
        });
        tvs.card.appendChild(f1);
        if (tvs.how === "laser" && tvs.prev.mode === "Laser") {
          var pr = tzEl("div", "tz-row");
          pr.style.cssText += "gap:6px;align-items:center;margin-top:6px;";
          pr.appendChild(tzEl("span", "tz-muted", i18nT('tv.power_pct')));
          var inp = document.createElement("input");
          inp.type = "number";
          inp.className = "tz-input";
          inp.min = "1";
          inp.max = String(TJ_LASER_FRAME_MAX_PCT);
          inp.step = "0.5";
          inp.value = String(tvs.pct);
          inp.style.width = "70px";
          inp.addEventListener("change", function () { tvs.pct = Number(inp.value) || TJ_LASER_FRAME_DEFAULT_PCT; tvVisRender(tvs); });
          pr.appendChild(inp);
          if (tvs.pct > TJ_LASER_FRAME_WARN_PCT) pr.appendChild(tzEl("span", "tz-msg err", i18nT('tv.power_warn', { v: TJ_LASER_FRAME_WARN_PCT })));
          tvs.card.appendChild(pr);
        }
        // how many times: once, N times or until it is stopped
        var fr2 = tzEl("div", "tz-row");
        fr2.style.cssText += "gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;";
        fr2.appendChild(tzEl("span", "tz-muted", i18nT('tv.repeat')));
        [["once", i18nT('tv.repeat_once')], ["times", i18nT('tv.repeat_n')], ["continuous", i18nT('tv.repeat_cont')]].forEach(function (o) {
          fr2.appendChild(tzBtn(o[1], tvs.repeat === o[0] ? "primary" : null, function () { tvs.repeat = o[0]; tvVisRender(tvs); }));
        });
        if (tvs.repeat === "times") {
          var nin = document.createElement("input");
          nin.type = "number";
          nin.className = "tz-input";
          nin.min = "2";
          nin.max = "1000";
          nin.value = String(tvs.nTimes);
          nin.style.width = "64px";
          nin.addEventListener("change", function () { tvs.nTimes = Math.max(2, Math.min(1000, parseInt(nin.value, 10) || 2)); tvVisRender(tvs); });
          fr2.appendChild(nin);
          fr2.appendChild(tzEl("span", "tz-muted", i18nT('tv.times')));
        }
        tvs.card.appendChild(fr2);
        rv.f2 = tzEl("div", "tz-row");
        rv.f2.style.cssText += "gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap;";
        rv.activeFrame = !!(tvs.frameSt && tvs.frameSt.active);
        rv.go = tzBtn(i18nT('tv.frame_go'), "primary", function () { tvVisFrame(tvs); }, tvs.how === "laser" ? i18nT('tv.frame_confirm_laser') : i18nT('tv.frame_confirm'), "tv-frame");
      }

      function tvVisButtons(tvs, rv) {
        rv.go.disabled = !tvs.ctx.machine.free() || rv.activeFrame;
        rv.f2.appendChild(rv.go);
        if (rv.activeFrame) {
          var stp = tzBtn(i18nT('tv.stop'), "danger", function () { tvVisStopFrame(tvs); });
          stp.style.cssText += "background:#c62828;color:#fff;";
          rv.f2.appendChild(stp);
          rv.f2.appendChild(tzEl("span", "tz-muted", tvs.frameSt.stopping ? i18nT('tv.stopping') : (tvs.frameSt.repeat === 0 ? i18nT('tv.lap_cont', { n: tvs.frameSt.turn || 1 }) : i18nT('tv.lap_of', { n: tvs.frameSt.turn || 1, t: tvs.frameSt.repeat || 1 }))));
        } else if (!tvs.ctx.machine.free()) {
          rv.f2.appendChild(tzEl("span", "tz-muted", i18nT('tv.machine_busy')));
        }
        tvs.card.appendChild(rv.f2);
        // send it: after looking at it, the same file starts as a normal job (M32), in the zone that is active now
        var en = tzEl("div", "tz-title", i18nT('tv.send_title'));
        en.style.marginTop = "12px";
        tvs.card.appendChild(en);
        tvs.card.appendChild(tzEl("div", "tz-muted", i18nT('tv.send_help', { zone: (tvs.ctx.data.nameActive && tvs.ctx.data.nameActive()) || "?" })));
        var f3 = tzEl("div", "tz-row");
        f3.style.cssText += "gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap;";
        var ini = tzBtn(i18nT('tv.send'), "primary", function () { tvVisStartJob(tvs); }, (tvVisNoticeArea(tvs).length ? i18nT('tv.send_confirm_outside', { f: tvs.sel }) : i18nT('tv.send_confirm', { f: tvs.sel })), "tv-send");
        ini.disabled = !tvs.ctx.machine.free() || (tvs.ctx.machine.jobInProgress ? tvs.ctx.machine.jobInProgress() : false);
        f3.appendChild(ini);
        tvs.card.appendChild(f3);
      }
