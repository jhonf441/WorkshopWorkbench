      // -------- editor --------
      function tzTableRenderEditorEmpty(ptb) {
        if (ptb.nav.zSub() === "editor") {
          ptb.nav.setZSub("zones");
          setTimeout(ptb.nav.apply, 0);
        }
        ptb.edCard.innerHTML = "";
        ptb.edCard.appendChild(tzEl("h3", null, "Editor"));
        ptb.edCard.appendChild(
          tzEl(
            "div",
            "tz-muted",
            i18nT('zonesPage.choose_a_zone_in_the_table')
          )
        );
      }

      function tzTableField(ptb, parent, label, value, type) {
        var w = tzEl("div");
        w.appendChild(tzEl("label", null, label));
        var inp = document.createElement("input");
        inp.type = type || "text";
        if (type === "number") inp.step = "any";
        inp.value = value === undefined || value === null ? "" : value;
        w.appendChild(inp);
        parent.appendChild(w);
        return inp;
      }

      function tzTableOpenEditor(ptb, which, opts) {
        var ed = {};
        opts = opts || {};
        ed.addMac = function addMac(v, t, dis) {
          var o = document.createElement("option");
          o.value = v;
          o.textContent = t;
          if (dis) o.disabled = true;
          ed.macSel.appendChild(o);
        };
        ed.syncMac = function syncMac() {
          ed.macroRow.style.display = ed.macSel.value === "new" ? "" : "none";
          ed.focusInp.disabled = ed.macSel.value === "none";
          ed.askRow.style.display = ed.macSel.value === "none" ? "none" : "";
          if (ed.macPrev.style.display !== "none") { ed.macPrev.style.display = "none"; ed.prevBtn.textContent = i18nT('zonesPage.view_macro'); }
        };
        ed.current = function current() {
          return {
            name: tzCleanName(ed.nameInp.value),
            refX: parseFloat(ed.rxInp.value),
            refY: parseFloat(ed.ryInp.value),
            correctionX: parseFloat(ed.cxInp.value) || 0,
            correctionY: parseFloat(ed.cyInp.value) || 0,
          };
        };
        ed.preview = function preview() {
          var z = ed.current();
          var errs = isFinite(z.refX) && isFinite(z.refY) ? tzValidate(z, ptb.data.st()) : [i18nT('zonesPage.point_x_y_missing')];
          ed.info.textContent =
            i18nT('zonesPage.applied_origin_x_y_laser_offset', { v: tzFmt(z.refX + z.correctionX), v2: tzFmt(z.refY + z.correctionY), refX: tzFmt(z.refX), refY: tzFmt(z.refY) });
          tzSetMsg(ed.msg, errs.join("\n"), false);
          ed.saveBtn.disabled = errs.length > 0;
        };
        if (tzEditorFields(ptb, ed, which, opts)) return;
        tzEditorCorrection(ptb, ed, which, opts);
        tzEditorMacro(ptb, ed, which, opts);
        tzEditorSave(ptb, ed, which, opts);
      }

      function tzEditorFields(ptb, ed, which, opts) {
        ptb.nav.setSelected(which);
        ptb.nav.setZSub("editor");
        setTimeout(ptb.nav.apply, 0);
        tzTableRenderTable(ptb);
        ptb.edCard.innerHTML = "";
        ed.isNew = which === "new";
        ed.src = ed.isNew ? (opts.from !== undefined ? ptb.data.zones()[opts.from] : null) : ptb.data.zones()[which];
        ed.idx = ed.isNew ? null : which;
        ptb.edCard.appendChild(tzEl("h3", null, ed.isNew ? (opts.from !== undefined ? i18nT('zonesPage.copy_to_another_zone', { code: TZ_CODES[opts.from] }) : i18nT('tzTips.l_new_zone')) : i18nT('zonesPage.edit', { code: TZ_CODES[ed.idx] })));
        ed.slotInp = null;
        if (ed.isNew) {
          var freeSlots = [];
          for (var i = 1; i < TZ_CODES.length; i++) if (!ptb.data.zones()[i]) freeSlots.push(i);
          if (!freeSlots.length) {
            ptb.edCard.appendChild(tzEl("div", "tz-msg err", i18nT('zonesPage.there_are_no_free_zones_g55')));
            return true;
          }
          var w = tzEl("div");
          w.appendChild(tzEl("label", null, i18nT('common.zone')));
          ed.slotInp = document.createElement("select");
          ed.slotInp.style.cssText = "background:#263238;color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:4px;padding:4px;width:100%;";
          freeSlots.forEach(function (s) {
            var o = document.createElement("option");
            o.value = s;
            o.textContent = TZ_CODES[s] + (s > 5 ? i18nT('zonesPage.no_measure_and_focus_laserfocus_g') : "");
            ed.slotInp.appendChild(o);
          });
          w.appendChild(ed.slotInp);
          ptb.edCard.appendChild(w);
        }
        ed.nameInp = tzTableField(ptb, ptb.edCard, i18nT('zonesPage.name_e_g_mdf_3mm'), ed.src ? (ed.isNew ? i18nT('zonesPage.copy', { name: ed.src.name }) : ed.src.name) : "");
        var pair1 = tzEl("div", "pair");
        ptb.edCard.appendChild(pair1);
        ed.rxInp = tzTableField(ptb, pair1, i18nT('zonesPage.point_x_pointer_over_the_corner'), ed.src ? tzNum(ed.src.refX) : "", "number");
        ed.ryInp = tzTableField(ptb, pair1, i18nT('zonesPage.point_y'), ed.src ? tzNum(ed.src.refY) : "", "number");
        if (opts.pre) {
          // "Set origin here" (Active zone card): already computed point
          ed.rxInp.value = tzNum(opts.pre.x);
          ed.ryInp.value = tzNum(opts.pre.y);
        }
        ptb.edCard.appendChild(
          tzBtn(i18nT('tzTips.l_use_current_position'), null, function () {
            if (!ptb.data.st() || !ptb.data.st().axes.X) return;
            ed.rxInp.value = tzNum(ptb.data.st().axes.X.machinePosition);
            ed.ryInp.value = tzNum(ptb.data.st().axes.Y.machinePosition);
            ed.preview();
          })
        );
        if (ptb.data.savedPos().length) {
          // Saved position (jog > Saved positions) as the zone's point: same
          // reference (the pointer), in machine coords.
          var posSel = document.createElement("select");
          posSel.style.cssText = "background:#263238;color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:4px;padding:4px;margin:2px;max-width:230px;";
          tzTip(posSel, i18nT('zonesPage.set_as_the_zone_point_one'));
          var o0 = document.createElement("option");
          o0.value = "";
          o0.textContent = i18nT('zonesPage.use_saved_position');
          posSel.appendChild(o0);
          ptb.data.savedPos().forEach(function (q, i) {
            var o = document.createElement("option");
            o.value = i;
            o.textContent = q.name + " (X" + tzFmt(q.x) + " Y" + tzFmt(q.y) + ")";
            posSel.appendChild(o);
          });
          posSel.addEventListener("change", function () {
            var q = ptb.data.savedPos()[parseInt(posSel.value, 10)];
            if (!q) return;
            ed.rxInp.value = tzNum(q.x);
            ed.ryInp.value = tzNum(q.y);
            posSel.value = "";
            ed.preview();
          });
          ptb.edCard.appendChild(posSel);
        }
        var pair2 = tzEl("div", "pair");
        ptb.edCard.appendChild(pair2);
        ed.mcorr = tjLaserCorrection();
        var defCorrection = ed.src ? ed.src : ed.mcorr ? { correctionX: ed.mcorr.x, correctionY: ed.mcorr.y } : ptb.data.zones()[2] || ptb.data.zones()[1] || { correctionX: -16.5, correctionY: 0 };
        ed.cxInp = tzTableField(ptb, pair2, i18nT('zonesPage.laser_correction_x'), tzNum(defCorrection.correctionX), "number");
        ed.cyInp = tzTableField(ptb, pair2, i18nT('zonesPage.laser_correction_y'), tzNum(defCorrection.correctionY), "number");
      }

      function tzEditorCorrection(ptb, ed, which, opts) {
        if (ed.mcorr) {
          // a single one for the machine: changed in Offsets and valid for all
          ed.cxInp.value = tzNum(ed.mcorr.x);
          ed.cyInp.value = tzNum(ed.mcorr.y);
          ed.cxInp.disabled = ed.cyInp.disabled = true;
          tzTip(ed.cxInp, i18nT('zonesPage.it_s_the_machine_s_offsets'));
          tzTip(ed.cyInp, i18nT('zonesPage.it_s_the_machine_s_offsets'));
        }
        var pair3 = tzEl("div", "pair");
        ptb.edCard.appendChild(pair3);
        var srcIdx = ed.isNew ? opts.from : ed.idx;
        var curSize = srcIdx !== undefined && srcIdx !== null ? ptb.data.zoneSizes()[srcIdx] : null;
        ed.swInp = tzTableField(ptb, pair3, i18nT('zonesPage.material_width_mm_optional'), curSize ? tzNum(curSize.w) : "", "number");
        ed.shInp = tzTableField(ptb, pair3, i18nT('zonesPage.material_height_mm_optional'), curSize ? tzNum(curSize.h) : "", "number");
        tzTip(ed.swInp, i18nT('zonesPage.towards_x_from_the_zone_point'));
        tzTip(ed.shInp, i18nT('zonesPage.towards_y_from_the_zone_point'));
        // ---- Material and focus (request 2026-10-09: "in material macro I do not
        // quite understand; there could be a list or specify what must go there or
        // the macro itself"): explanation, library material, list
        // of macros (this zone's / new / none; those of other zones
        // are seen but not chosen) and "View macro" with the exact text.
        ed.curFocus = !ed.isNew ? ptb.data.focusByZone()[ed.idx] : null;
        ed.curMat = !ed.isNew ? tmatById(ptb.data.zoneMaterial(ed.idx)) : null;
        ed.mbox = tzEl("div");
        ed.mbox.style.cssText = "margin-top:10px;padding:8px 10px;border:1px solid rgba(255,255,255,0.12);border-radius:6px;";
        ptb.edCard.appendChild(ed.mbox);
        var mt = tzEl("div", null, i18nT('zonesPage.material_and_focus_optional_laser'));
        mt.style.cssText = "font-weight:500;color:#90caf9;margin-bottom:2px;";
        ed.mbox.appendChild(mt);
        ed.mbox.appendChild(
          tzEl(
            "div",
            "tz-muted",
            i18nT('zonesPage.the_material_macro_is_a_file')
          )
        );
        ed.matSel = document.createElement("select");
        ed.matSel.className = "tz-input";
        var mo0 = document.createElement("option");
        mo0.value = "";
        mo0.textContent = i18nT('zoneActive.no_material');
        ed.matSel.appendChild(mo0);
        tmatItems.filter(function (m) { return m.mode === "Laser"; }).forEach(function (m) {
          var o = document.createElement("option");
          o.value = m.id;
          o.textContent = tmatLabel(m) + (m.focus ? i18nT('zonesPage.focus_mm_2', { focus: m.focus }) : "");
          ed.matSel.appendChild(o);
        });
        ed.matSel.value = ed.curMat ? ed.curMat.id : "";
        var lm = tzEl("label");
        lm.style.cssText = "display:flex;flex-direction:column;gap:2px;margin-top:6px;";
        lm.appendChild(tzEl("span", "tz-muted", i18nT('zonesPage.material_library_materials_tab')));
        lm.appendChild(ed.matSel);
        ed.mbox.appendChild(lm);
        ed.focusInp = tzTableField(ptb, ed.mbox, i18nT('zonesPage.focus_height_over_the_material_mm'), ed.curFocus ? ed.curFocus.h : ed.curMat && ed.curMat.focus ? ed.curMat.focus : "", "number");
        ed.macSel = document.createElement("select");
        ed.macSel.className = "tz-input";
        ed.suggested = ed.curFocus ? ed.curFocus.macro : tzSlug((ed.curMat && ed.curMat.name) || (ed.src && ed.src.name) || "material") + ".g";
        if (ed.curFocus) ed.addMac("cur", i18nT('zonesPage.the_one_of_this_zone', { macro: ed.curFocus.macro }));
        ed.addMac("new", i18nT('zonesPage.new', { v: ed.curFocus ? i18nT('zonesPage.other_name') : ed.suggested }));
        ed.addMac("none", i18nT('zonesPage.none_no_measure_and_focus_in'));
        Object.keys(ptb.data.focusByZone()).forEach(function (k) {
          var f = ptb.data.focusByZone()[k];
          if (!ed.curFocus || f.macro !== ed.curFocus.macro) ed.addMac("x" + k, i18nT('zonesPage.belongs_to', { macro: f.macro, code: TZ_CODES[k] }), true);
        });
        ed.macSel.value = ed.curFocus ? "cur" : "new";
        var lmac = tzEl("label");
        lmac.style.cssText = "display:flex;flex-direction:column;gap:2px;margin-top:6px;";
        lmac.appendChild(tzEl("span", "tz-muted", i18nT('zonesPage.material_macro_macros_laser')));
        lmac.appendChild(ed.macSel);
        ed.mbox.appendChild(lmac);
        ed.macroInp = tzTableField(ptb, ed.mbox, i18nT('zonesPage.new_file_name'), ed.suggested);
        ed.macroRow = ed.macroInp.parentNode;
        // Q1 in the laserfocus.g line: before measuring, the macro asks whether there is material on the table
        ed.askRow = tzEl("label");
        ed.askRow.style.cssText = "display:flex;gap:6px;align-items:center;margin-top:6px;font-size:12px;";
        ed.askChk = document.createElement("input");
        ed.askChk.type = "checkbox";
        ed.askChk.checked = !!(ed.curFocus && ed.curFocus.ask);
        ed.askRow.appendChild(ed.askChk);
        ed.askRow.appendChild(document.createTextNode(i18nT('zonesPage.ask_if_there_is_material_before_focusing')));
        tzTip(ed.askRow, i18nT('zonesPage.ask_if_there_is_material_before_focusing_tip'));
        ed.mbox.appendChild(ed.askRow);
        ed.macPrev = tzEl("pre");
        ed.macPrev.style.cssText = "display:none;white-space:pre-wrap;font-size:11px;background:rgba(0,0,0,0.35);padding:6px 8px;border-radius:4px;margin:6px 0 0 0;max-height:180px;overflow:auto;";
      }

      function tzEditorMacro(ptb, ed, which, opts) {
        ed.prevBtn = tzBtn(i18nT('zonesPage.view_macro'), null, function () {
          if (ed.macPrev.style.display !== "none") {
            ed.macPrev.style.display = "none";
            ed.prevBtn.textContent = i18nT('zonesPage.view_macro');
            return;
          }
          ed.prevBtn.textContent = i18nT('zonesPage.hide_macro');
          ed.macPrev.style.display = "block";
          var h = parseFloat(ed.focusInp.value);
          if (ed.macSel.value === "cur" && ed.curFocus) {
            ed.macPrev.textContent = i18nT('zonesPage.reading_macros_laser_2', { macro: ed.curFocus.macro });
            tzGetText("0:/macros/laser/" + ed.curFocus.macro).then(function (t) {
              ed.macPrev.textContent = "macros/laser/" + ed.curFocus.macro + (isFinite(h) && h !== ed.curFocus.h ? i18nT('zonesPage.on_save_h_becomes_2', { h: h }) : "") + "\n\n" + t;
            }, function (e) { ed.macPrev.textContent = String(e); });
          } else if (ed.macSel.value === "new") {
            var tgt = ed.isNew ? parseInt(ed.slotInp.value, 10) : ed.idx;
            ed.macPrev.textContent = isFinite(h)
              ? i18nT('zonesPage.created_on_save_path', { v: ed.macroInp.value || ed.suggested }) + "\n\n" + ptb.data.focusMacroBody(tgt, ed.current(), h, ed.macroInp.value || ed.suggested)
              : i18nT('zonesPage.type_the_focus_height_or_choose');
          } else ed.macPrev.textContent = i18nT('zonesPage.no_macro_the_zone_will_not');
        });
        tzTip(ed.prevBtn, i18nT('zonesPage.shows_the_exact_content_of_the'));
        ed.mbox.appendChild(ed.prevBtn);
        ed.mbox.appendChild(ed.macPrev);
        ed.macSel.addEventListener("change", ed.syncMac);
        ed.matSel.addEventListener("change", function () {
          var m = tmatById(ed.matSel.value);
          if (m && m.focus) ed.focusInp.value = String(m.focus);
          if (m && !ed.curFocus && !ed.macroInp.dataset.touched) ed.macroInp.value = tzSlug(m.name) + ".g";
          if (m && ed.macSel.value === "none") ed.macSel.value = ed.curFocus ? "cur" : "new";
          ed.syncMac();
        });
        ed.syncMac();
        ed.info = tzEl("div", "tz-muted", "");
        ed.info.style.marginTop = "6px";
        ptb.edCard.appendChild(ed.info);
        ed.msg = tzEl("div", "tz-msg", "");
        [ed.nameInp, ed.rxInp, ed.ryInp, ed.cxInp, ed.cyInp].forEach(function (inp) {
          inp.addEventListener("input", ed.preview);
        });
        ed.macroInp.addEventListener("input", function () {
          ed.macroInp.dataset.touched = "1";
        });
        if (ed.isNew) {
          ed.nameInp.addEventListener("input", function () {
            if (!ed.macroInp.dataset.touched && !ed.matSel.value) ed.macroInp.value = tzSlug(ed.nameInp.value) + ".g";
          });
        }
        ed.btnRow = tzEl("div");
        ed.btnRow.style.marginTop = "8px";
        ptb.edCard.appendChild(ed.btnRow);
      }

      function tzEditorSave(ptb, ed, which, opts) {
        ed.saveBtn = tzBtn(i18nT('zcal.save'), "primary", function () {
          var target = ed.isNew ? parseInt(ed.slotInp.value, 10) : ed.idx;
          var fv = ed.macSel.value === "none" ? "" : ed.focusInp.value;
          var mname = ed.macSel.value === "cur" && ed.curFocus ? ed.curFocus.macro : ed.macroInp.value;
          var matId = ed.matSel.value || null;
          ptb.data.saveZone(target, ed.current(), fv, mname, ed.msg)
            .then(function (ok) {
              if (ok && matId !== ((ed.curMat && ed.curMat.id) || null)) return ptb.data.saveZoneMaterial(target, matId).then(function () { return ok; });
              return ok;
            })
            .then(function (ok) {
              // Q1 on the laserfocus.g line (the macro asks if there is material); only touched when it changed
              var wasAsk = !!(ed.curFocus && ed.curFocus.ask);
              if (!ok || ed.macSel.value === "none" || ed.askChk.checked === wasAsk) return ok;
              return ptb.data.refreshAll().then(function () { return ptb.data.setFocusLine(target, { Q: ed.askChk.checked ? 1 : null }); }).then(ptb.data.refreshAll).then(function () { return ok; });
            })
            .then(function (ok) {
              if (!ok) return false;
              return ptb.data.saveZoneSize(target, parseFloat(ed.swInp.value), parseFloat(ed.shInp.value)).then(function () { return true; });
            })
            .then(function (ok) {
              if (ok) tzTableOpenEditor(ptb, target);
            });
        });
        ed.btnRow.appendChild(ed.saveBtn);
        ed.btnRow.appendChild(
          tzBtn(i18nT('zcal.close'), null, function () {
            ptb.nav.setSelected(null);
            tzTableRenderEditorEmpty(ptb);
            tzTableRenderTable(ptb);
          })
        );
        ptb.edCard.appendChild(ed.msg);
        ed.preview();
      }
