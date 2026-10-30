      function tvVisCorrection(tvs) {
        var c = tvs.ctx.cut.correction && tvs.ctx.cut.correction();
        if (!tvs.prev || tvs.prev.mode !== "Laser" || !c) return { cx: 0, cy: 0 };
        return { cx: c.cx || 0, cy: c.cy || 0 };
      }

      // Where the job's beam lands against the measured cut area (same bed coordinates as the map). [] = inside or no area to compare.
      function tvVisNoticeArea(tvs) {
        var area = tvs.ctx.cut.area ? tvs.ctx.cut.area() : null;
        if (!tvs.prev || !tvs.prev.bbox || !area) return [];
        var b = tvs.prev.bbox, c = tvVisCorrection(tvs), tol = 0.05;
        var sides = [
          [area.xmin - (b.xmin - c.cx), 'tv.out_left'], [(b.xmax - c.cx) - area.xmax, 'tv.out_right'],
          [area.ymin - (b.ymin - c.cy), 'tv.out_bottom'], [(b.ymax - c.cy) - area.ymax, 'tv.out_top'],
        ];
        return sides.filter(function (l) { return l[0] > tol; }).map(function (l) { return i18nT(l[1], { mm: tzFmt(l[0]) }); });
      }

      function tvVisTotal(tvs) {
        return tvs.prev && tvs.prev.stats ? tvs.prev.stats.time_s || 0 : 0;
      }

      // ---------- files of 0:/gcodes ----------
      function tvVisLoadList(tvs) {
        if (tvs.loadingList) return Promise.resolve();
        tvs.loadingList = true;
        var out = [];
        function walk(dir, level) {
          return fetch("/machine/directory/" + encodeURI("0:/gcodes" + (dir ? "/" + dir : "")), { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (items) {
              return Promise.all((items || []).map(function (it) {
                if (it.type === "d" && level < 2) return walk((dir ? dir + "/" : "") + it.name, level + 1);
                if (it.type === "f" && TV_EXT.test(it.name)) out.push({ path: (dir ? dir + "/" : "") + it.name, size: it.size || 0, date: it.date || "" });
                return null;
              }));
            })
            .catch(function () {});
        }
        return walk("", 0).then(function () {
          out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
          tvs.files = out;
          tvs.loadingList = false;
          tvVisRender(tvs);
        });
      }

      function tvVisRead(tvs) {
        if (!tvs.sel || tvs.reading) return;
        tvs.reading = true;
        tvs.msg = "";
        tvVisStop(tvs);
        tvs.prev = null;
        tvs.layer = null;
        tvVisRender(tvs);
        tvs.ctx.map.redraw();
        workshopApi("jobs.preview", { file: tvs.sel })
          .then(function (r) {
            if (!r || !r.ok) throw new Error((r && r.error) || "?");
            tvs.prev = r;
            tvs.tNow = 0;
            tvs.layer = null;
            tvs.hidden = {};
            tvVisArmGroups(tvs);
            tvs.msgOk = true;
            tvs.msg = tvs.msgPost;
            tvs.msgPost = "";
          })
          .catch(function (e) {
            tvs.prev = null;
            tvs.msgOk = false;
            tvs.msg = i18nT('tv.could_not_read', { e: (e && e.message) || e });
          })
          .then(function () {
            tvs.reading = false;
            tvVisRender(tvs);
            tvs.ctx.map.redraw();
          });
      }

      function tvVisRemove(tvs) {
        tvVisStop(tvs);
        tvs.prev = null;
        tvs.layer = null;
        tvs.tNow = 0;
        tvs.msg = "";
        tvVisRender(tvs);
        tvs.ctx.map.redraw();
      }

      // ---------- simulation ----------
      function tvVisStop(tvs) {
        tvs.playing = false;
        clearInterval(tvs.timer);
        tvs.timer = null;
      }

      function tvVisTick(tvs) {
        tvs.tNow += 0.15 * TV_SPEEDS[tvs.speedIx];
        if (tvs.tNow >= tvVisTotal(tvs)) {
          tvs.tNow = tvVisTotal(tvs);
          tvVisStop(tvs);
          tvVisRender(tvs);
        }
        tvVisPaintProgress(tvs);
        tvs.ctx.map.redraw();
      }

      function tvVisPlay(tvs) {
        if (!tvs.prev) return;
        if (tvs.tNow >= tvVisTotal(tvs)) tvs.tNow = 0;
        tvs.playing = true;
        clearInterval(tvs.timer);
        tvs.timer = setInterval(tzBind(tvVisTick, tvs), 150);
        tvVisRender(tvs);
      }

      function tvVisPaintProgress(tvs) {
        if (tvs.scrub) tvs.scrub.value = String(tvVisTotal(tvs) ? Math.round((1000 * tvs.tNow) / tvVisTotal(tvs)) : 0);
        if (tvs.clock) tvs.clock.textContent = tvFmtDur(tvs.tNow) + " / " + tvFmtDur(tvVisTotal(tvs));
        if (tvs.chartPlay && tvVisTotal(tvs)) tvs.chartPlay.setAttribute("x1", (tvs.tNow / tvVisTotal(tvs)) * 100), tvs.chartPlay.setAttribute("x2", (tvs.tNow / tvVisTotal(tvs)) * 100);
      }

      // vertex index of a run reached at time t (last vertex with t <= tNow)
      function tvVisIndexEn(tvs, run, t) {
        var ts = run.t || [];
        var lo = 0, hi = ts.length - 1;
        while (lo < hi) {
          var mid = (lo + hi + 1) >> 1;
          if (ts[mid] <= t) lo = mid;
          else hi = mid - 1;
        }
        return lo;
      }

      function tvVisPositionNow(tvs) {
        if (!tvs.prev) return null;
        var runs = tvs.prev.segments || [];
        for (var i = runs.length - 1; i >= 0; i--) {
          var r = runs[i];
          if (!r.t || r.t[0] > tvs.tNow) continue;
          var k = tvVisIndexEn(tvs, r, tvs.tNow);
          var x = r.p[2 * k], y = r.p[2 * k + 1];
          if (k + 1 < r.t.length) {
            var f = (tvs.tNow - r.t[k]) / Math.max(1e-6, r.t[k + 1] - r.t[k]);
            x += (r.p[2 * k + 2] - x) * f;
            y += (r.p[2 * k + 3] - y) * f;
          }
          return { x: x, y: y, run: r };
        }
        return null;
      }

      // ---------- the board (several jobs together) ----------
      function tvVisCorrectionOf(tvs, p) {
        var c = tvs.ctx.cut.correction && tvs.ctx.cut.correction();
        if (!p || p.mode !== "Laser" || !c) return { cx: 0, cy: 0 };
        return { cx: c.cx || 0, cy: c.cy || 0 };
      }

      // where the job lands on the bed (beam coordinates) once shifted
      function tvVisBoxOf(tvs, it) {
        var b = it.prev.bbox, c = tvVisCorrectionOf(tvs, it.prev);
        return { xmin: b.xmin - c.cx + it.dx, xmax: b.xmax - c.cx + it.dx, ymin: b.ymin - c.cy + it.dy, ymax: b.ymax - c.cy + it.dy };
      }

      function tvVisAreaBoard(tvs) {
        return tvs.ctx.cut.area ? tvs.ctx.cut.area() : null;
      }

      function tvVisAddABoard(tvs) {
        if (!tvs.prev || !tvs.prev.bbox) return;
        if (tvs.board.some(function (it) { return it.path === tvs.sel; })) {
          tvs.boardOk = false;
          tvs.boardMsg = i18nT('tv.board_already');
          tvVisRender(tvs);
          return;
        }
        if (tvs.board.length && tvs.board[0].prev.mode !== tvs.prev.mode) {
          tvs.boardOk = false;
          tvs.boardMsg = i18nT('tv.board_mode');
          tvVisRender(tvs);
          return;
        }
        tvs.board.push({ path: tvs.sel, prev: tvs.prev, dx: 0, dy: 0, color: tvs.COLORS[tvs.board.length % tvs.COLORS.length], g: null, gkey: "" });
        tvs.boardFile = null;
        tvs.boardOk = true;
        tvs.boardMsg = "";
        tvVisRemove(tvs);
      }

      function tvVisRemoveOfBoard(tvs, i) {
        tvs.board.splice(i, 1);
        tvs.boardFile = null;
        tvVisRender(tvs);
        tvs.ctx.map.redraw();
      }

      function tvVisArrangeBoard(tvs) {
        var area = tvVisAreaBoard(tvs);
        if (!area) {
          tvs.boardOk = false;
          tvs.boardMsg = i18nT('tv.board_no_area');
          tvVisRender(tvs);
          return;
        }
        var boxes = tvs.board.map(function (it) {
          var b = it.prev.bbox;
          return { w: b.xmax - b.xmin, h: b.ymax - b.ymin };
        });
        var pos = tvArrangeBoxes(boxes, area, 5);
        var without = 0;
        tvs.board.forEach(function (it, i) {
          if (!pos[i]) { without++; return; }
          var b = it.prev.bbox, c = tvVisCorrectionOf(tvs, it.prev);
          it.dx = Math.round((pos[i].x - (b.xmin - c.cx)) * 10) / 10;
          it.dy = Math.round((pos[i].y - (b.ymin - c.cy)) * 10) / 10;
        });
        tvs.boardFile = null;
        tvs.boardOk = without === 0;
        tvs.boardMsg = without ? i18nT('tv.board_not_all_fit', { n: without }) : i18nT('tv.board_arranged');
        tvVisRender(tvs);
        tvs.ctx.map.redraw();
      }

      function tvVisCheckBoard(tvs) {
        var r = tvCheckBoxes(tvs.board.map(tzBind(tvVisBoxOf, tvs)), tvVisAreaBoard(tvs), 2);
        var out = [];
        r.outside.forEach(function (i) { out.push(i18nT('tv.board_outside', { f: tvs.board[i].path })); });
        r.crosses.forEach(function (c) { out.push(i18nT('tv.board_overlap', { a: tvs.board[c[0]].path, b: tvs.board[c[1]].path })); });
        if (!tvVisAreaBoard(tvs)) out.push(i18nT('tv.board_no_area'));
        return { list: out, well: out.length === 0 };
      }

      function tvVisStampLocal(tvs) {
        var d = new Date();
        function z(n) { return (n < 10 ? "0" : "") + n; }
        return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "_" + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds());
      }

