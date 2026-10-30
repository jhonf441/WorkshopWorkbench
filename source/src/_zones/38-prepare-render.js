      function tpRender(tp) {
        var pr = {};
        if (!tp.ctx.visible()) return;
        pr.s = tp.ctx.machine.getSt();
        if (!pr.s || !pr.s.axes || !pr.s.axes.X) return;
        pr.zones = tp.ctx.data.zones();
        pr.wn = pr.s.wn;
        pr.z = pr.zones[pr.wn];
        pr.free = tp.ctx.machine.free();
        pr.ax = pr.s.axes;
        pr.homed = !!(pr.ax.X.homed && pr.ax.Y.homed && pr.ax.Z && pr.ax.Z.homed);
        pr.mat = pr.z ? tmatById(tp.ctx.data.material(pr.wn)) : null;
        pr.f = tp.ctx.data.focusPerZone()[pr.wn];
        pr.zp = pr.z ? tp.ctx.data.point(pr.wn) : null;
        pr.sz = pr.z ? tp.ctx.data.size(pr.wn) : null;
        pr.chk = pr.z ? tp.ctx.data.controls(pr.wn) : [];
        tp.done = tzWorkFlags(); // marks of the steps Measure and Frame, kept per zone in the service
        pr.g = pr.s.globals && pr.s.globals.workshopThickness;
        var key = JSON.stringify([pr.wn, pr.homed, pr.free, pr.s.mode, pr.s.status, pr.s.offsetOn, !!pr.z, pr.mat && pr.mat.id, pr.mat, pr.f, pr.zp, pr.sz, pr.chk, tp.done, tp.skipMat, tp.M.text, tp.M.ok, pr.g, (window.__workshopMaterials || []).length, tjNeedsKey(pr.s)]);
        if (key === tp.lastKey) return;
        if (tzEditing(tp.ctx.card)) return tzRedrawOnRelease(tp.ctx.card, tzBind(tpRender, tp)); // campo con foco: rehacer al soltarlo (14-editing.js)
        tp.lastKey = key;
        pr.stepBox = function stepBox(i, body) {
          var st = pr.steps[i];
          var b = tzEl("div", "tp-step" + (st[0] ? " ok" : i === pr.current ? " cur" : ""));
          var h = tzEl("div", "tp-step-h");
          h.appendChild(tzEl("span", "tp-n", st[0] ? "✓" : String(i + 1)));
          h.appendChild(tzEl("span", "tp-t", st[1]));
          if (st[2]) h.appendChild(tzEl("span", "tz-muted tp-s", st[2]));
          b.appendChild(h);
          var c = tzEl("div", "tp-step-b");
          b.appendChild(c);
          pr.card.appendChild(b);
          body(c);
        };
        tpRenderHeader(tp, pr);
        tpRenderSteps(tp, pr);
        tpStepMachine(tp, pr);
        tpStepZone(tp, pr);
        tpStepMaterial(tp, pr);
        tpStepMeasure(tp, pr);
        tpStepFrame(tp, pr);
        tpStepReady(tp, pr);
      }

      function tpRenderHeader(tp, pr) {
        pr.card = tp.ctx.card;
        pr.card.innerHTML = "";
        var hd = tzEl("div", "tz-row");
        hd.style.alignItems = "center";
        hd.appendChild(tzEl("h3", null, i18nT('prepare.prepare_a_job')));
        pr.card.appendChild(hd);
        pr.card.appendChild(tzEl("div", "tz-muted", i18nT('prepare.follow_the_steps_in_order_each')));
        if (tp.M.text) pr.card.appendChild(tp.M.node());
      }

      function tpRenderSteps(tp, pr) {
        pr.laser = pr.s.mode === "Laser";
        pr.steps = [];
        pr.ok1 = pr.homed && pr.free;
        pr.ok2 = !!pr.z;
        pr.ok3 = !!pr.mat || !!tp.skipMat[pr.wn];
        pr.ok4 = !!tp.done["measure:" + pr.wn];
        var ok5 = !!tp.done["border:" + pr.wn];
        pr.steps.push([pr.ok1, i18nT('prepare.machine_ready'), i18nT('prepare.all_axes_homed_and_machine_free')]);
        pr.steps.push([pr.ok2, i18nT('common.zone'), pr.z ? TZ_CODES[pr.wn] + (pr.z.name ? " " + pr.z.name : "") : i18nT('prepare.choose_the_zone_where_the_material')]);
        pr.steps.push([pr.ok3, "Material", pr.mat ? tmatLabel(pr.mat) : tp.skipMat[pr.wn] ? i18nT('prepare.no_material_the_thickness_is_not') : i18nT('prepare.which_material_you_are_going_to')]);
        pr.steps.push([pr.ok4, pr.laser ? i18nT('prepare.measure_and_focus') : i18nT('prepare.measure_z0'), pr.ok4 && typeof pr.g === "number" && pr.g >= 0 ? i18nT('prepare.measured_thickness_mm', { g: pr.g }) : pr.laser ? i18nT('prepare.the_probe_measures_the_material_and') : i18nT('prepare.the_probe_measures_the_material_z0')]);
        pr.steps.push([ok5, i18nT('prepare.check_with_the_pointer'), i18nT('prepare.go_around_the_edge_of_the')]);
        pr.steps.push([pr.ok1 && pr.ok2 && pr.ok3 && pr.ok4, i18nT('prepare.ready_to_cut'), ""]);
        pr.current = 0;
        while (pr.current < pr.steps.length - 1 && pr.steps[pr.current][0]) pr.current++;
        // paso 5 es opcional: si 1-4 estan, "Listo" queda disponible igual
        var prog = tzEl("div", "tp-prog");
        pr.steps.forEach(function (st, i) {
          var p = tzEl("div", "tp-pill" + (st[0] ? " ok" : i === pr.current ? " cur" : ""));
          p.appendChild(tzEl("span", "tp-n", st[0] ? "✓" : String(i + 1)));
          p.appendChild(tzEl("span", null, st[1]));
          prog.appendChild(p);
        });
        pr.card.appendChild(prog);
      }

      function tpStepMachine(tp, pr) {
        // 1. maquina
        pr.stepBox(0, function (c) {
          tjNeedsRow(c, { st: pr.s, free: pr.free, mode: null, focus: false, onMsg: tzBind(tpSetMsg, tp), after: function () { tp.lastKey = ""; tp.ctx.machine.refresh(); } });
        });
      }

      function tpStepZone(tp, pr) {
        // 2. zona
        pr.stepBox(1, function (c) {
          var r = tzEl("div", "tz-row");
          r.style.cssText += "gap:6px;align-items:center;";
          var sel = document.createElement("select");
          sel.className = "tz-input";
          TZ_CODES.forEach(function (code, i) {
            var q = pr.zones[i];
            if (!q && i !== pr.wn) return;
            var o = document.createElement("option");
            o.value = String(i);
            o.textContent = code + (q && q.name ? " " + q.name : q ? "" : i18nT('prepare.no_file'));
            sel.appendChild(o);
          });
          sel.value = String(pr.wn);
          sel.disabled = !pr.free;
          sel.addEventListener("change", function () {
            var i = parseInt(sel.value, 10);
            tpRun(tp, TZ_CODES[i], i18nT('prepare.active_nothing_moved', { code: TZ_CODES[i] }));
          });
          r.appendChild(sel);
          r.appendChild(tzTip(tzBtn(i18nT('prepare.show_on_the_map'), null, function () { tp.ctx.map.show(); }), i18nT('prepare.scrolls_down_to_the_bed_map')));
          r.appendChild(tzTechOnly(tzTip(tzBtn(i18nT('prepare.open_zones_tab'), null, function () { tp.ctx.nav.go("zones"); }), i18nT('prepare.goes_to_the_zones_tab_editor'))));
          c.appendChild(r);
          if (!pr.z) c.appendChild(tzEl("div", "tz-msg err", i18nT('prepare.has_no_zone_file_choose_another', { code: TZ_CODES[pr.wn] })));
          pr.chk.forEach(function (k) {
            if (k.lvl === "info") return;
            c.appendChild(tzCheckEl(k));
          });
        });
      }

      function tpStepMaterial(tp, pr) {
        // 3. material
        pr.stepBox(2, function (c) {
          if (!pr.z) return c.appendChild(tzEl("div", "tz-muted", i18nT('prepare.zone_first')));
          var r = tzEl("div", "tz-row");
          r.style.cssText += "gap:6px;align-items:center;";
          var sel = document.createElement("select");
          sel.className = "tz-input";
          var o0 = document.createElement("option");
          o0.value = "";
          o0.textContent = i18nT('prepare.choose_material');
          sel.appendChild(o0);
          (window.__workshopMaterials || []).forEach(function (m) {
            var o = document.createElement("option");
            o.value = m.id;
            o.textContent = tmatLabel(m) + (m.mode !== pr.s.mode ? " [" + m.mode + "]" : "");
            sel.appendChild(o);
          });
          sel.value = pr.mat ? pr.mat.id : "";
          sel.disabled = !pr.free;
          sel.addEventListener("change", function () {
            tp.ctx.data.saveMaterial(pr.wn, sel.value || null).then(function () { tpSetMsg(tp, i18nT('prepare.material_of_saved', { code: TZ_CODES[pr.wn] }), true); }, function (e) { tpSetMsg(tp, i18nT('common.not_saved_2', { err: e.message }), false); });
          });
          r.appendChild(sel);
          r.appendChild(tzTechOnly(tzBtn(i18nT('prepare.library'), null, function () { tp.ctx.nav.go("materials"); })));
          if (!pr.mat && !tp.skipMat[pr.wn]) r.appendChild(tzBtn(i18nT('prepare.continue_without_material'), null, function () { tp.skipMat[pr.wn] = true; tp.lastKey = ""; tpRender(tp); }));
          c.appendChild(r);
          if (pr.mat && pr.mat.mode !== pr.s.mode) c.appendChild(tzEl("div", "tz-msg err", i18nT('prepare.this_material_is_for_and_the', { materialMode: pr.mat.mode, mode: pr.s.mode })));
          if (pr.mat && pr.mat.mode === "Laser" && pr.mat.cut && pr.mat.cut.power) c.appendChild(tzEl("div", "tz-muted", i18nT('prepare.cut_summary', { p: pr.mat.cut.power, v: pr.mat.cut.speed || "?", passes: pr.mat.cut.passes > 1 ? " x" + pr.mat.cut.passes : "" }) + (pr.mat.engraving && pr.mat.engraving.power ? " " + i18nT('prepare.engrave_summary', { p: pr.mat.engraving.power, v: pr.mat.engraving.speed || "?" }) : "")));
        });
      }

      function tpStepMeasure(tp, pr) {
        // 4. medir / enfocar
        pr.stepBox(3, function (c) {
          if (!pr.z) return c.appendChild(tzEl("div", "tz-muted", i18nT('prepare.zone_first')));
          var r = tzEl("div", "tz-row");
          r.style.cssText += "gap:6px;align-items:center;";
          var mark = function () { tzWorkPrepareMark(pr.wn, "measure"); if (pr.laser) tzFocusAppliedMark(pr.wn); };
          var tT = pr.mat && pr.mat.thickness > 0 && pr.mat.mode === pr.s.mode ? " T" + pr.mat.thickness : "";
          // the same plan as the Active zone (32-active-zone-focus-plan.js): the macro when it carries the focus height, else the Z point
          var plan = pr.laser ? tzActPlanFor(pr.mat, pr.f ? pr.f.h : null, !!pr.zp, null) : null;
          if (pr.laser && pr.f && (plan.action === "macro" || plan.action === "stale")) {
            var b = tzBtn(i18nT('prepare.measure_and_focus_mm', { h: pr.f.h }), "primary big", function () {
              tpRun(tp, 'M98 P"0:/macros/laser/' + pr.f.macro + '"', i18nT('prepare.measured_and_focused_laser_at_mm', { h: pr.f.h }), mark);
            });
            b.disabled = !pr.free || !pr.homed;
            tzTip(b, i18nT('prepare.runs_macros_laser_activates_the_zone', { macro: pr.f.macro, xy: pr.zp ? " (X" + tzFmt(pr.zp.x) + " Y" + tzFmt(pr.zp.y) + ")" : "", h: pr.f.h, check: tT ? i18nT('prepare.check_that_the_thickness_is_mm', { thickness: pr.mat.thickness }) : "" }));
            r.appendChild(b);
          } else if (pr.zp) {
            var h = pr.laser ? plan.h : (pr.mat && pr.mat.mode === "CNC" && pr.mat.altSafe) || 5;
            var b2 = tzBtn(i18nT('prepare.at_the_z_point', { v: pr.laser ? i18nT('prepare.focus') : i18nT('prepare.measure_z0') }), "primary big", function () {
              tpRun(tp, 'M98 P"0:/sys/workshop/macros/zprobepoint.g" X' + pr.zp.x + " Y" + pr.zp.y + " H" + h + tT, pr.laser ? i18nT('prepare.laser_mm_above_the_surface', { h: h }) : i18nT('prepare.z0_measured_ended_up_at_mm', { h: h }), mark);
            });
            b2.disabled = !pr.free || !pr.homed;
            tzTip(b2, i18nT('prepare.the_probe_touches_at_x_y', { x: tzFmt(pr.zp.x), y: tzFmt(pr.zp.y), h: h }));
            r.appendChild(b2);
          }
          r.appendChild(tzBtn(i18nT('prepare.already_measured'), null, function () { mark(); tp.lastKey = ""; tpRender(tp); }));
          c.appendChild(r);
          if (typeof pr.g === "number" && pr.g >= 0 && pr.ok4) {
            var bad = pr.mat && pr.mat.thickness > 0 && pr.g >= 0.3 && Math.abs(pr.g - pr.mat.thickness) > Math.max(0.6, pr.mat.thickness * 0.2);
            c.appendChild(tzEl("div", "tz-msg " + (bad ? "err" : "ok"), i18nT('prepare.measured_thickness_mm_2', { g: pr.g, v: pr.mat && pr.mat.thickness ? i18nT('prepare.material_mm', { thickness: pr.mat.thickness, v: bad ? i18nT('prepare.does_not_match_check_the_material') : "" }) : "" })));
          }
        });
      }

      function tpStepFrame(tp, pr) {
        // 5. puntero
        pr.stepBox(4, function (c) {
          if (!pr.z) return c.appendChild(tzEl("div", "tz-muted", i18nT('prepare.zone_first')));
          var r = tzEl("div", "tz-row");
          r.style.cssText += "gap:6px;align-items:center;flex-wrap:wrap;";
          var mark = function () { tzWorkPrepareMark(pr.wn, "border"); };
          if (pr.sz && pr.sz.w > 0) {
            var b = tzBtn(i18nT('prepare.frame_the_material_x', { w: tzFmt(pr.sz.w), h: tzFmt(pr.sz.h) }), "primary", function () {
              tpRun(tp, 'M98 P"0:/sys/workshop/macros/framerect.g" A' + pr.z.refX + " B" + (pr.z.refX + pr.sz.w) + " C" + pr.z.refY + " D" + (pr.z.refY + pr.sz.h), i18nT('prepare.material_traced_with_the_pointer'), mark);
            }, i18nT('prepare.tap_again_moves_pointer_laser_off'), "tp-fr");
            b.disabled = !pr.free || !(pr.ax.X.homed && pr.ax.Y.homed);
            tzTip(b, i18nT('prepare.goes_around_the_edge_of_the', { code: TZ_CODES[pr.wn] }));
            r.appendChild(b);
          } else c.appendChild(tzEl("div", "tz-muted", i18nT('prepare.the_zone_has_no_material_size')));
          var g0 = tzBtn(i18nT('prepare.pointer_to_the_origin'), null, function () {
            tjGoToBed(pr.z.refX, pr.z.refY).then(function () { mark(); tpSetMsg(tp, i18nT('prepare.pointer_at_the_origin_of', { code: TZ_CODES[pr.wn] }), true); }, function (e) { tpSetMsg(tp, i18nT('prepare.could_not_go', { err: e.message || e }), false); });
          }, i18nT('common.tap_again_moves'), "tp-g0");
          g0.disabled = !pr.free || !(pr.ax.X.homed && pr.ax.Y.homed);
          r.appendChild(g0);
          r.appendChild(tzBtn(i18nT('prepare.skip'), null, function () { mark(); tp.lastKey = ""; tpRender(tp); }));
          c.appendChild(r);
        });
      }

      function tpStepReady(tp, pr) {
        // 6. listo
        pr.stepBox(5, function (c) {
          if (!(pr.ok1 && pr.ok2 && pr.ok3 && pr.ok4)) return c.appendChild(tzEl("div", "tz-muted", i18nT('prepare.complete_the_steps_above')));
          if (pr.laser && pr.z && (pr.z.correctionX || pr.z.correctionY) && !pr.s.offsetOn) {
            var r0 = tzEl("div", "tz-row");
            r0.appendChild(tzEl("span", "wf-state tz-badge err", i18nT('prepare.laser_offset_removed')));
            r0.appendChild(tzBtn(i18nT('prepare.apply_offset'), "primary", function () {
              tpRun(tp, 'M98 P"0:/sys/workshop/macros/laseroffset.g" S1', i18nT('prepare.laser_offset_applied_x0_y0_where'));
            }));
            c.appendChild(r0);
          }
          c.appendChild(tzEl("div", "tz-msg ok", i18nT('prepare.all_ready_in', { code: TZ_CODES[pr.wn], v: pr.mat ? i18nT('prepare.with', { mat: tmatLabel(pr.mat) }) : "" })));
          var r = tzEl("div", "tz-row");
          r.style.cssText += "gap:6px;";
          if (pr.laser) r.appendChild(tzBtn(i18nT('prepare.open_the_laser_editor'), "primary", function () { tp.ctx.nav.go("cuts"); }));
          r.appendChild(tzBtn(i18nT('prepare.see_the_live_job'), null, function () { tp.ctx.nav.go("job"); }));
          c.appendChild(r);
          c.appendChild(tzEl("div", "tz-muted", pr.laser ? i18nT('prepare.live_job_from_your_sending_program_2', { code: TZ_CODES[pr.wn], v: pr.mat && pr.mat.thickness ? i18nT('prepare.and_the_thickness') : "" }) : i18nT('prepare.send_the_job_with_the_origin', { code: TZ_CODES[pr.wn] })));
        });
      }
