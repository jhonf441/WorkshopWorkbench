      function tgGrTgLoad(tg) {
        var d = null;
        try {
          d = JSON.parse(localStorage.getItem(TG_KEY) || "null");
        } catch (e) {
          d = null;
        }
        return tgGrTgComplete(tg, d);
      }

      function tgGrTgComplete(tg, d) {
        d = d || {};
        d.done = d.done || []; // T of each part already cut
        d.pct = d.pct || 8;
        d.speed = d.speed || 800;
        return d;
      }

      function tgGrSave(tg) {
        tg.tgSd.save(tg.data);
        tg.drawing = null;
      }

      function tgGrSetMsg(tg, t, ok) {
        tg.M.set(t, ok);
      }

      function tgGrArea(tg) {
        return tg.ctx.cut.area();
      }

      function tgGrCorrection(tg) {
        var c = tg.ctx.cut.correction();
        return c ? [c.cx, c.cy] : null;
      }

      function tgGrBase(tg) {
        return { file: tg.data.file, T: tg.data.T, area: tgGrArea(tg), done: tg.data.done };
      }

      function tgGrN(tg) {
        return tg.data.done.length + 1;
      }

      // -- previa y cuentas --
      function tgGrLoadPreview(tg) {
        if (!tg.data.file) return Promise.resolve();
        return tzGetText(TG_PREVIEW)
          .then(function (t) {
            var p = JSON.parse(t);
            tg.preview = p.file === tg.data.file ? p : null;
            tg.drawing = null;
            tg.ctx.map.redraw();
          })
          .catch(function () {
            tg.preview = null;
          });
      }

      function tgGrUpdateCounts(tg) {
        if (!tg.data.file || !tg.data.T || !tgGrArea(tg)) {
          tg.counts = null;
          return Promise.resolve();
        }
        return tgPi("counts", tgGrBase(tg))
          .then(function (c) {
            tg.counts = c;
            tgGrRender(tg, true);
          })
          .catch(function (e) {
            tg.counts = null;
            tgGrSetMsg(tg, i18nT('large.could_not_compute_the_part', { err: e.message }), false);
          });
      }

      function tgGrRead(tg, file) {
        tg.busy = true;
        tgGrSetMsg(tg, i18nT('large.reading_the_file_on_the_system'));
        tgPi("read", { file: file })
          .then(function (r) {
            tg.data = { file: file, summary: r, done: [], pct: tg.data.pct, speed: tg.data.speed, step: "place" };
            var z = tg.ctx.data.active();
            tg.data.T = { rotation: 0, tx: z ? z.x : 0, ty: z ? z.y : 0 };
            tgGrSave(tg);
            tg.M.text = "";
            return tgGrLoadPreview(tg);
          })
          .then(tzBind(tgGrUpdateCounts, tg))
          .catch(function (e) {
            tgGrSetMsg(tg, i18nT('large.could_not_read', { err: e.message }), false);
          })
          .then(function () {
            tg.busy = false;
            tgGrRender(tg, true);
          });
      }

      function tgGrListItems(tg) {
        tg.files = null;
        var out = [];
        function dir(d, prof) {
          return tzList(d).then(function (lst) {
            var subs = [];
            (lst || []).forEach(function (f) {
              if (f.type === "d" && prof < 2 && f.name !== "Taller") subs.push(dir(d + "/" + f.name, prof + 1));
              else if (/\.(gcode|g|nc|gc|ngc)$/i.test(f.name)) out.push({ path: d + "/" + f.name, date: f.lastModified || "" });
            });
            return Promise.all(subs);
          });
        }
        dir("0:/gcodes", 0).then(function () {
          out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
          tg.files = out;
          tgGrRender(tg, true);
        });
      }

      // -- trabajos --
      function tgGrRunFile(tg, file, text) {
        return tzStartFile(file).then(function () { // 22-start-file.js
          tgGrSetMsg(tg, text, true);
        });
      }

      // the laser burns: the manual safety list first (46-ready-safety.js), recorded in the Activity history; nothing else is done before it
      function tgGrGate(tg, what) {
        return tzSafetyGate({ mode: "Laser", zone: tg.ctx.data.nameActive(), what: what });
      }

      function tgGrMark(tg) {
        var c = tgGrCorrection(tg);
        if (!c) return tgGrSetMsg(tg, i18nT('large.no_known_laser_correction_offsets'), false);
        tg.busy = true;
        tgGrSetMsg(tg, i18nT('large.choosing_where_the_marks_go'));
        tgGrGate(tg, "large part marks")
          .then(function () { return tgPi("marks", Object.assign(tgGrBase(tg), { correction: c, pct: tg.data.pct, speed: tg.data.speed })); })
          .then(function (r) {
            tg.data.marks = { design: r.marks, bed: r.bed, part: tgGrN(tg) };
            tg.data.measures = [null, null, null];
            tgGrSave(tg);
            return tgGrRunFile(tg, r.file, i18nT('large.burning_the_3_registration_marks_wait'));
          })
          .catch(function (e) {
            tgGrSetMsg(tg, i18nT('large.not_marked_2', { err: e.message }), false);
          })
          .then(function () {
            tg.busy = false;
            tgGrRender(tg, true);
          });
      }

      function tgGrCut(tg) {
        var c = tgGrCorrection(tg);
        if (!c) return tgGrSetMsg(tg, i18nT('large.no_known_laser_correction_offsets'), false);
        tg.busy = true;
        tgGrSetMsg(tg, i18nT('large.preparing_part', { n: tgGrN(tg) }));
        tgGrGate(tg, "large part cut")
          .then(function () { return tgPi("part", Object.assign(tgGrBase(tg), { correction: c, n: tgGrN(tg) })); })
          .then(function (r) {
            tg.data.step = "cutting";
            tgGrSave(tg);
            return tgGrRunFile(tg, r.file, i18nT('large.cutting_part_mm_when_it_finishes', { n: tgGrN(tg), mm: Math.round(r.cut_mm) }));
          })
          .catch(function (e) {
            tgGrSetMsg(tg, i18nT('large.not_cut', { err: e.message }), false);
          })
          .then(function () {
            tg.busy = false;
            tgGrRender(tg, true);
          });
      }

      function tgGrPartFinished(tg) {
        tg.data.done.push(tg.data.T);
        tg.data.step = "move";
        tgGrSave(tg);
        tgGrUpdateCounts(tg).then(function () {
          if (tg.counts && tg.counts.missing_mm < 0.5) {
            tg.data.step = "end";
            tgGrSave(tg);
          }
          tgGrRender(tg, true);
          tg.ctx.map.redraw();
        });
      }

      // where it is suggested to put the piece for the next part: what is missing
      // inside the area (centered if it fits; otherwise, stuck to the edge where
      // the cut continues). Returns the suggested T.
      function tgGrSuggested(tg) {
        var A = tgGrArea(tg);
        if (!A || !tg.counts || !tg.counts.missing_box || !tg.data.T) return null;
        var f = tg.counts.missing_box;
        var esq = [[f[0], f[1]], [f[2], f[1]], [f[2], f[3]], [f[0], f[3]]].map(function (p) { return tgApply(tg.data.T, p[0], p[1]); });
        var bx0 = Math.min.apply(null, esq.map(function (p) { return p[0]; })), bx1 = Math.max.apply(null, esq.map(function (p) { return p[0]; }));
        var by0 = Math.min.apply(null, esq.map(function (p) { return p[1]; })), by1 = Math.max.apply(null, esq.map(function (p) { return p[1]; }));
        function axis(b0, b1, a0, a1) {
          var w = b1 - b0, aw = a1 - a0;
          if (w <= aw - 10) return (a0 + a1) / 2 - (b0 + b1) / 2;
          // it does not fit: what is closest to the area (where it continues) goes to the edge
          var c = (a0 + a1) / 2;
          return Math.abs(b0 - c) < Math.abs(b1 - c) ? a0 + 5 - b0 : a1 - 5 - b1;
        }
        var dx = axis(bx0, bx1, A.xmin, A.xmax), dy = axis(by0, by1, A.ymin, A.ymax);
        return { rotation: tg.data.T.rotation, tx: tg.data.T.tx + dx, ty: tg.data.T.ty + dy, dx: dx, dy: dy };
      }

      function tgGrExpected(tg) {
        var S = tgGrSuggested(tg);
        if (!S || !tg.data.marks) return null;
        return tg.data.marks.design.map(function (p) { return tgApply(S, p[0], p[1]); });
      }

      // -- medir las marcas --
      function tgGrCapture(tg, i) {
        var st = tg.ctx.machine.getSt();
        if (!st || !st.axes || !st.axes.X) return tgGrSetMsg(tg, i18nT('large.no_machine_position'), false);
        tg.data.measures[i] = [Math.round(st.axes.X.machinePosition * 1000) / 1000, Math.round(st.axes.Y.machinePosition * 1000) / 1000];
        tgGrSave(tg);
        tgGrRender(tg, true);
        tg.ctx.map.redraw();
      }

      function tgGrSearchCamera(tg) {
        var esp = tgGrExpected(tg);
        if (!esp) return tgGrSetMsg(tg, i18nT('large.first_cut_the_part_and_move'), false);
        tg.busy = true;
        tgGrSetMsg(tg, i18nT('large.the_camera_is_looking_for_the'));
        tzVisionPost("/record/search", { marks: esp, radius: 60, size: 5 })
          .then(function (d) {
            if (!d.ok) throw new Error(d.error || i18nT('large.could_not'));
            var hallados = 0;
            (d.marks || []).forEach(function (m, i) {
              if (m && m.found) {
                tg.data.measures[i] = [m.x, m.y];
                hallados++;
              }
            });
            tgGrSave(tg);
            tgGrSetMsg(tg, hallados >= 2 ? i18nT('large.the_camera_found_of_3_marks', { found: hallados }) : i18nT('large.the_camera_found_only_mark_s', { found: hallados }), hallados >= 2);
            tg.ctx.map.redraw();
          })
          .catch(function (e) {
            tgGrSetMsg(tg, i18nT('common.camera_msg', { msg: e.message }), false);
          })
          .then(function () {
            tg.busy = false;
            tgGrRender(tg, true);
          });
      }

      function tgGrCompute(tg) {
        var dis = [], camera = [];
        tg.data.measures.forEach(function (m, i) {
          if (m) {
            dis.push(tg.data.marks.design[i]);
            camera.push(m);
          }
        });
        if (dis.length < 2) return tgGrSetMsg(tg, i18nT('large.at_least_2_measured_marks_are'), false);
        tg.busy = true;
        tgPi("adjust", { design: dis, bed: camera })
          .then(function (r) {
            tg.data.newT = r.T;
            tg.data.errorMax = r.error_max;
            tg.data.errors = r.errors;
            tgGrSave(tg);
            tgGrSetMsg(tg, r.error_max <= TG_ERROR_OK ? i18nT('large.piece_located_rotation_degrees_maximum', { rotation: tzFmt(r.T.rotation), err: tzFmt(r.error_max) }) : i18nT('large.difference_of_mm_between_the_marks', { err: tzFmt(r.error_max) }), r.error_max <= TG_ERROR_OK);
          })
          .catch(function (e) {
            tgGrSetMsg(tg, i18nT('large.could_not_compute', { err: e.message }), false);
          })
          .then(function () {
            tg.busy = false;
            tgGrRender(tg, true);
            tg.ctx.map.redraw();
          });
      }

      function tgGrUseMeasure(tg) {
        tg.data.T = tg.data.newT;
        tg.data.newT = null;
        tg.data.marks = null;
        tg.data.measures = null;
        tg.data.step = "cut";
        tgGrSave(tg);
        tgGrUpdateCounts(tg).then(function () {
          tgGrRender(tg, true);
          tg.ctx.map.redraw();
        });
      }

