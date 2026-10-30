      function tcCardCut(tc, rc) {
        var cz = {};
          // == CORTAR ==
          cz.errs = tcValidate(tc);
          rc.card = tcSection(rc.root, "cut", i18nT('cuts.cut'), cz.errs.length ? i18nT('cuts.thing_s_to_fix', { n: cz.errs.length }) : i18nT('cuts.ready_to_cut'), true, tzBind(tcGo, tc));
        tcCutOptions(tc, cz, rc);
        tcCutHistory(tc, cz, rc);
        tcCutButtons(tc, cz, rc);
        tcCutConfirm(tc, cz, rc);
      }


      function tcCardMessage(tc, rc) {
        if (tc.M.text) rc.msgBox.appendChild(tc.M.node());
      }

      function tcCutOptions(tc, cz, rc) {
        cz.jb = tzEl("div");
        rc.card.appendChild(cz.jb);
        var wr = tzEl("div", "tz-row");
        wr.style.cssText += "gap:6px;align-items:center;margin-bottom:6px;";
        wr.appendChild(tzEl("span", "tz-muted", i18nT('cuts.laser_diode')));
        var win = document.createElement("input");
        win.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
        win.min = "1";
        win.max = "200";
        win.className = "tz-input";
        win.value = String(tjLaserWatts);
        win.style.width = "70px";
        win.addEventListener("change", function () {
          tjSaveLaserCfg(tcNum(tc, win.value))
            .then(function () { tcSetMsg(tc, i18nT('cuts.laser_power_saved_w_for_all', { w: tjLaserWatts }), true); })
            .catch(function (e) { tcSetMsg(tc, String(e.message || e), false); });
        });
        tzTechOnly(win); // saving laser.json is a technician's (settings.set): the Operator sees the value as data
        wr.appendChild(win);
        wr.appendChild(tzTechOnly(tzEl("span", "tz-muted", i18nT('cuts.w_to_show_watts_limits_are'))));
        wr.appendChild(tzEl("span", "tz-opdata", tjLaserWatts + " W"));
        cz.jb.appendChild(wr);
        cz.jb.appendChild(tzEl("div", "tz-muted", i18nT('cuts.air_assist_m42_p7_is_chosen')));
        if (tc.data.shapes.length) {
          var bb = tcBBox(tc.data.shapes);
          cz.jb.appendChild(tzEl("div", "tz-muted", i18nT('cuts.takes_x_to_y_to_estimated', { xmin: tc.fmt(bb.xmin), xmax: tc.fmt(bb.xmax), ymin: tc.fmt(bb.ymin), ymax: tc.fmt(bb.ymax), min: Math.ceil(tcEstimate(tc)) })));
        }
      }

      function tcCutHistory(tc, cz, rc) {
        // shapes already cut: they stay on the area (green, dashed) but the next cut leaves them out unless asked
        var nCortadas = tc.data.shapes.filter(function (x) { return x.cut; }).length;
        var nArch = (tc.data.archived || []).length;
        if (nCortadas || nArch) {
          var yc = tzEl("div", "tz-row");
          yc.style.cssText += "gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0;";
          if (nCortadas) {
            yc.appendChild(tzEl("span", "tz-muted", i18nT('cuts.already_cut_n', { n: nCortadas, t: tc.data.shapes.length })));
            var lbl = document.createElement("label");
            lbl.style.cssText = "display:inline-flex;gap:4px;align-items:center;cursor:pointer;";
            var cbr = document.createElement("input");
            cbr.type = "checkbox";
            cbr.checked = !!tc.data.trim;
            cbr.addEventListener("change", function () { tc.data.trim = cbr.checked; tcSave(tc, true); tcGo(tc); });
            lbl.appendChild(cbr);
            lbl.appendChild(tzEl("span", null, i18nT('cuts.cut_them_again')));
            yc.appendChild(lbl);
            yc.appendChild(tzBtn(i18nT('cuts.mark_all_uncut'), null, function () {
              tc.data.shapes.forEach(function (x) { delete x.cut; });
              tcSave(tc); tcGo(tc);
            }));
            yc.appendChild(tzTip(tzBtn(i18nT('cuts.remove_cut'), null, function () {
              var outside = tc.data.shapes.filter(function (x) { return x.cut; });
              tc.data.archived = (tc.data.archived || []).concat(outside.map(function (x) { var c = JSON.parse(JSON.stringify(x)); c.archived = Date.now(); return c; })).slice(-100);
              tc.data.shapes = tc.data.shapes.filter(function (x) { return !x.cut; });
              tcSetSel(tc, []);
              tcSave(tc); tcGo(tc);
            }, i18nT('cuts.remove_cut_confirm'), "tc-remove-cut"), i18nT('cuts.remove_cut_tip')));
          }
          if (nArch) {
            yc.appendChild(tzTip(tzBtn(i18nT('cuts.bring_back', { n: nArch }), null, function () {
              (tc.data.archived || []).forEach(function (x) {
                var c = JSON.parse(JSON.stringify(x));
                delete c.cut;
                delete c.archived;
                c.id = tc.data.nextId++;
                tc.data.shapes.push(c);
              });
              tc.data.archived = [];
              tcSave(tc); tcGo(tc);
            }), i18nT('cuts.bring_back_tip')));
          }
          cz.jb.appendChild(yc);
        }
      }

      function tcCutButtons(tc, cz, rc) {
        cz.errs.forEach(function (e) { cz.jb.appendChild(tzEl("div", "tz-msg err", i18nT('cuts.cannot_cut', { e: e }))); });
        var jr = tzEl("div", "tz-row tc-actions"); // sticky at the bottom of the panel: frame / cut are always at hand
        jr.style.gap = "4px";
        cz.jb.appendChild(jr);
        var hasShapes = tc.data.shapes.length > 0;
        tcFrameOptions(tc, cz.jb);
        var fP = tzBtn(i18nT('cuts.frame_pointer'), null, function () { tcFrameStart(tc, "pointer", 0); }, i18nT('cuts.tap_again_frame'));
        fP.disabled = !rc.free || !hasShapes;
        jr.appendChild(fP);
        var fL = tzBtn(i18nT('cuts.frame_with_laser'), "warn", function () { tc.jobStep = { step: "laserframe", ack: false, pct: TJ_LASER_FRAME_DEFAULT_PCT }; tcGo(tc); });
        fL.disabled = !rc.free || !hasShapes || cz.errs.length > 0;
        jr.appendChild(fL);
        var cB = tzBtn(i18nT('cuts.cut_2'), "danger", function () { tc.jobStep = { step: "cut", ack: false }; tcGo(tc); });
        cB.disabled = !rc.free || cz.errs.length > 0;
        jr.appendChild(cB);
      }

      function tcCutConfirm(tc, cz, rc) {
        if (tc.jobStep) {
          var conf = tzEl("div", "tz-card wf-card");
          conf.style.cssText += "margin-top:6px;border-color:#c62828;";
          cz.jb.appendChild(conf);
          var isCut = tc.jobStep.step === "cut";
          if (!isCut) {
            var lf = tzEl("div", "tz-form");
            lf.appendChild(tzEl("label", null, i18nT('cuts.power_only_for_framing_not_the', { max: TJ_LASER_FRAME_MAX_PCT, pct: tc.jobStep.pct, w: tjPctToW(tc.jobStep.pct) })));
            var pin = document.createElement("input");
            pin.type = "text"; // text, not number: so the symbols of an account can be typed (see tzEval)
            pin.step = "0.5";
            pin.value = String(tc.jobStep.pct);
            pin.style.maxWidth = "120px";
            pin.addEventListener("change", function () {
              var v = tcNum(tc, pin.value);
              if (!(v > 0)) v = TJ_LASER_FRAME_DEFAULT_PCT;
              tc.jobStep = { step: "laserframe", ack: false, pct: Math.min(v, TJ_LASER_FRAME_MAX_PCT) };
              tcGo(tc);
            });
            lf.appendChild(pin);
            conf.appendChild(lf);
          }
          var maxPow = tcShapesInCutOrder(tc).reduce(function (m, s) { return Math.max(m, s.power); }, 0);
          conf.appendChild(
            tzEl(
              "div",
              "tz-msg err",
              isCut
                ? i18nT('cuts.cut_shape_s_power_up_to', { n: tc.data.shapes.length, maxPow: maxPow, w: tjPctToW(maxPow), tjLaserWatts: tjLaserWatts, min: Math.ceil(tcEstimate(tc)) })
                : i18nT('cuts.goes_around_the_rectangle_taken_by', { v: tc.jobStep.pct > TJ_LASER_FRAME_WARN_PCT ? i18nT('cuts.warning_is_more_than_it_may', { pct: tc.jobStep.pct, warn: TJ_LASER_FRAME_WARN_PCT }) : "", pct: tc.jobStep.pct })
            )
          );
          if (isCut) {
            // 2026-10-10 ("there is nothing that defines at what speed to cut"):
            // each layer with what it will use, in the order it is cut
            tc.data.layers.forEach(function (L, li) {
              var n = tc.data.shapes.filter(function (sh) { return sh.layer === L.id; }).length;
              if (!n) return;
              var fl = tzEl("div", null, (li + 1) + ". " + L.name + ": " + L.power + " % (~" + tjPctToW(L.power) + " W), " + L.speed + " mm/min, " +
                L.passes + (L.passes === 1 ? i18nT('cuts.pass') : i18nT('cuts.passes')) + (L.air ? i18nT('cuts.with_air') : "") + " -- " + n + (n === 1 ? i18nT('cuts.shape_3') : i18nT('cuts.shapes_3')) + (L.hidden ? i18nT('cuts.off_not_cut') : ""));
              fl.style.cssText = "font-size:13px;padding:2px 0 2px 8px;border-left:4px solid " + L.color + ";margin:2px 0;";
              conf.appendChild(fl);
            });
            conf.appendChild(tzEl("div", "tz-muted", i18nT('cuts.they_are_changed_in_layers_or')));
          }
          conf.appendChild(tzEl("div", "tz-muted", i18nT('cuts.wear_protection_glasses_for_blue_laser')));
          tjNeedsRow(conf, {
            st: tc.ctx.machine.getSt(),
            free: rc.free,
            mode: "Laser",
            focus: isCut,
            focusRequired: isCut && tcFocusRequired(tcCutGuardInput(tc).material),
            focusDone: tzFocusAppliedOk(tzFocusAppliedRead(tc.ctx.machine.getSt() ? tc.ctx.machine.getSt().wn : undefined), tc.ctx.machine.getSt()),
            focusList: tc.ctx.data.focusList ? tc.ctx.data.focusList() : [],
            onMsg: tzBind(tcSetMsg, tc),
            after: function () { tc.lastKey = ""; tc.ctx.machine.read().then(tzBind(tcGo, tc)); },
          });
          if (isCut) {
            tzSafetyRender(conf, function () { tcGo(tc); }); // the manual safety list of the laser (46-ready-safety.js): glasses, lid, extraction, area clear
          } else {
            var al = tzEl("label");
            al.style.cssText = "display:flex;gap:6px;align-items:center;margin-top:4px;font-size:12px;";
            var ack = document.createElement("input");
            ack.type = "checkbox";
            ack.checked = !!tc.jobStep.ack;
            ack.addEventListener("change", function () { tc.jobStep.ack = ack.checked; tcGo(tc); });
            al.appendChild(ack);
            al.appendChild(document.createTextNode(i18nT('cuts.i_have_the_glasses_on_and')));
            conf.appendChild(al);
          }
          rc.cr3 = tzEl("div", "tz-row");
          rc.cr3.style.gap = "4px";
          conf.appendChild(rc.cr3);
          var goJ = tzBtn(isCut ? i18nT('cuts.cut_3') : i18nT('cuts.start_framing'), "danger", function () {
            if (isCut) tcCutStart(tc);
            else
              tcFrameStart(tc, "laser", tc.jobStep.pct);
          });
          goJ.disabled = !rc.free || !(isCut ? tzSafetyDone() : tc.jobStep.ack) || tcValidate(tc, { frame: !isCut }).length > 0;
          rc.cr3.appendChild(goJ);
          rc.cr3.appendChild(tzBtn(i18nT('zcal.cancel'), null, function () { tc.jobStep = null; tcGo(tc); }));
        }
      }

      // The cut: first the safety list must be complete (it is recorded in the Activity history with the user), then the job starts
      function tcCutStart(tc) {
        var st = tc.ctx.machine.getSt();
        var zone = tcCutGuardInput(tc).zoneName;
        tzSafetyGate({ zone: zone, what: "cut" }).then(function () {
          var idsCut = tcShapesInCutOrder(tc).map(function (x) { return x.id; });
          var jbBefore = (st && st.job) || {};
          tcStartJob(tc, TC_JOB_FILE, tcBuildJob(tc), i18nT('cuts.cut_running_pause_cancel_in_dwc'), function () {
            tc.data.cutInProgress = { ids: idsCut, t: Date.now(), prevDur: jbBefore.lastDuration || 0 };
            tcSave(tc, true);
          });
        }, function (e) {
          tcSetMsg(tc, String(e && e.message ? e.message : e), false);
          tcGo(tc);
        });
      }
