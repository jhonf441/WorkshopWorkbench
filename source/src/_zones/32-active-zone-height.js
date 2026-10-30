      // ---- Active zone: the "Height and focus" block ----
      // ONE place for the height. Laser: the material (its thickness gives the focus by the rule of the lens box), the focus height and
      // where it comes from, the state of the macro of the zone, and the button that measures and focuses. CNC: the height Z ends
      // up at after measuring and the button that measures Z0. The Z point (where the probe touches) is only summarised here; it is
      // changed under Advanced.
      function tzActHeight(za, zr) {
        var title = zr.laserMode ? i18nT('zoneActive.z_height_and_focus') : i18nT('zoneActive.z_height');
        zr.hb = tzActBlock(za, zr.card, title);
        if (!zr.z) return tzActNote(za, zr.hb, i18nT('zoneActive.has_no_zone_file_create_it', { code: TZ_CODES[zr.wn] }));
        tzActMaterialLine(za, zr);
        if (zr.laserMode) tzActFocusBlock(za, zr);
        else tzActLiftBlock(za, zr);
        tzActPointSummary(za, zr);
      }

      // The material of the zone: a select (library of the Materials tab) and the last measured thickness
      function tzActMaterialLine(za, zr) {
        var lm = tzActLine(za, zr.hb);
        lm.appendChild(tzEl("span", "za-lbl", i18nT('zoneActive.material')));
        var ms = document.createElement("select");
        ms.className = "tz-input za-sel";
        ms.style.maxWidth = "260px";
        var o0m = document.createElement("option");
        o0m.value = "";
        o0m.textContent = i18nT('zoneActive.no_material');
        ms.appendChild(o0m);
        (window.__workshopMaterials || []).forEach(function (m) {
          var o = document.createElement("option");
          o.value = m.id;
          o.textContent = tmatLabel(m) + (m.mode !== zr.s.mode ? " [" + m.mode + "]" : "");
          ms.appendChild(o);
        });
        ms.value = zr.mat ? zr.mat.id : "";
        ms.disabled = !zr.free;
        ms.addEventListener("change", function () { tzActSaveMaterial(za, zr, ms.value || null); });
        tzTip(ms, i18nT('zoneActive.the_material_of_this_zone_library'));
        lm.appendChild(ms);
        if (!(window.__workshopMaterials || []).length) lm.appendChild(tzEl("span", "tz-muted", i18nT('zoneActive.create_materials_in_the_materials_tab')));
        var g = zr.s.globals && zr.s.globals.workshopThickness;
        if (typeof g === "number" && g >= 0) {
          var bad = zr.mat && zr.mat.thickness > 0 && g >= 0.3 && Math.abs(g - zr.mat.thickness) > Math.max(0.6, zr.mat.thickness * 0.2);
          lm.appendChild(tzEl("span", "wf-state tz-badge " + (bad ? "err" : "info"), i18nT('zoneActive.last_measured_thickness_mm', { g: g })));
        }
      }

      function tzActSaveMaterial(za, zr, id) {
        if (tzActSignedOut()) return tzActSetMsg(za, i18nT('zoneActive.why_signed_out'), false);
        za.ctx.data.saveMaterial(zr.wn, id)
          .then(function () {
            var m = id ? tmatById(id) : null;
            tzActSetMsg(za, m ? TZ_CODES[zr.wn] + " = " + tmatLabel(m) + (m.mode === "Laser" ? i18nT('zoneActive.focus_mm_and_thickness_mm_written', { h: tmatH(m), t: m.thickness || "?" }) : ".") : i18nT('zoneActive.without_material', { code: TZ_CODES[zr.wn] }), true);
          })
          .catch(function (e) { tzActSetMsg(za, i18nT('common.not_saved_2', { err: e && e.message ? e.message : e }), false); });
      }

      // The focus plan of a zone (32-active-zone-focus-plan.js) from its material, its macro height (or null) and whether it has a Z point.
      // typed = a height the person wrote (or null). Prepare uses it too: one rule for the whole Workbench.
      function tzActPlanFor(mat, macroH, hasPoint, typed) {
        var matLaser = !!mat && mat.mode === "Laser";
        return tzActFocusPlan({
          matLaser: matLaser,
          thickness: matLaser ? mat.thickness : 0,
          ruleH: matLaser && mat.thickness > 0 ? tzFocusHeight(mat.thickness) : null,
          inside: matLaser ? tmatInside(mat) : 0,
          lens: tjLaserFocus(),
          typedH: typed,
          macroH: macroH,
          hasPoint: hasPoint,
        });
      }

      function tzActMakePlan(za, zr) {
        var typed = null;
        if (za.hDraft && za.hDraft.wn === zr.wn) {
          var tv = parseFloat(za.hDraft.v);
          if (tv >= 1 && tv <= 60) typed = tv;
        }
        return tzActPlanFor(zr.mat, zr.f ? zr.f.h : null, !!zr.zp, typed);
      }

      // Laser: the focus height, its source, the macro of the zone and the measure buttons
      function tzActFocusBlock(za, zr) {
        zr.plan = tzActMakePlan(za, zr);
        tzActNote(za, zr.hb, i18nT('zoneActive.laser_the_bltouch_measures_the_surface'));
        var lv = tzActLine(za, zr.hb);
        lv.appendChild(tzEl("span", "za-lbl", i18nT('zoneActive.focus_height')));
        lv.appendChild(tzActHeightInput(za, zr, zr.plan.h));
        lv.appendChild(tzEl("span", "tz-muted", i18nT('zoneActive.mm_above_the_surface')));
        if (zr.plan.source === "typed") {
          lv.appendChild(tzBtn(i18nT('zoneActive.back_to_calculated'), null, function () { za.hDraft = null; za.lastKey = ""; tzActRender(za); }));
        }
        tzActNote(za, zr.hb, tzActSourceText(zr));
        tzActMacroLine(za, zr);
        tzActMeasureButtons(za, zr);
      }

      // The number box of the height: what is written is kept as a draft (it is not saved in any file) and redraws the card when released
      function tzActHeightInput(za, zr, value) {
        var hIn = document.createElement("input");
        hIn.type = "number";
        hIn.className = "tz-input";
        hIn.style.width = "84px";
        hIn.step = "0.1";
        hIn.min = "1";
        hIn.max = "60";
        hIn.value = String(value);
        hIn.addEventListener("input", function () { za.hDraft = { wn: zr.wn, v: hIn.value }; });
        hIn.addEventListener("change", function () { za.lastKey = ""; tzActRender(za); });
        return hIn;
      }

      // One short sentence: where the height comes from
      function tzActSourceText(zr) {
        var p = zr.plan;
        if (p.source === "typed") return i18nT('zoneActive.src_typed');
        if (p.source === "rule") return i18nT('zoneActive.src_rule', { t: zr.mat.thickness });
        if (p.source === "material") return i18nT('zoneActive.src_material', { f: tjLaserFocus(), dz: p.inside, mat: tmatLabel(zr.mat) });
        return i18nT('zoneActive.src_lens', { f: tjLaserFocus() });
      }

      // The macro of the zone (macros/laser/<name>.g): up to date, different, or missing; one button when it needs a hand
      function tzActMacroLine(za, zr) {
        var lm = tzActLine(za, zr.hb);
        var p = zr.plan;
        if (zr.f && !p.mismatch) {
          lm.appendChild(tzEl("span", "wf-state tz-badge ok", i18nT('zoneActive.macro_ok')));
          lm.appendChild(tzEl("span", "tz-muted", zr.f.macro));
          return;
        }
        lm.appendChild(tzEl("span", "wf-state tz-badge " + (zr.f ? "warn" : "info"), zr.f ? i18nT('zoneActive.the_macro_says_mm', { h: zr.f.h }) : i18nT('zoneActive.no_macro')));
        var b = tzBtn(zr.f ? i18nT('zoneActive.update_macro') : i18nT('zoneActive.create_macro'), null, function () { tzActWriteMacro(za, zr); });
        b.disabled = zr.wn > 5 || !zr.free || tzActSignedOut();
        tzTip(b, zr.wn > 5 ? i18nT('zoneActive.measure_and_focus_laserfocus_g_only') : i18nT('zoneActive.creates_macros_laser_g_with_measure', { slug: tzSlug(zr.z.name) }));
        lm.appendChild(b);
      }

      // Writes the height in the macro of the zone. With a material that has thickness the macro carries T (the rule), so the material is applied again.
      function tzActWriteMacro(za, zr) {
        var viaMaterial = zr.mat && zr.mat.mode === "Laser" && zr.mat.thickness > 0 && zr.plan.source === "rule" && zr.f;
        var p = viaMaterial ? za.ctx.data.saveMaterial(zr.wn, zr.mat.id).then(function () { return zr.f.macro; }) : za.ctx.data.saveFocus(zr.wn, zr.plan.h);
        p.then(function (macro) { tzActSetMsg(za, i18nT('zoneActive.created_macros_laser_with_focus_mm', { macro: macro, hz: zr.plan.h }), true); })
          .catch(function (e) { tzActSetMsg(za, i18nT('zoneActive.not_created', { err: e && e.message ? e.message : e }), false); });
      }

      // The two buttons that measure: "Measure and focus" (the main one) and "Focus here" (without moving X/Y)
      function tzActMeasureButtons(za, zr) {
        var p = zr.plan;
        var row = tzActLine(za, zr.hb);
        var why = tzActBlockedWhy({ signedOut: tzActSignedOut(), free: zr.free, homedXY: zr.homedXY, homedAll: zr.allHomed, needAll: true, needPoint: p.action === "none", hasPoint: p.action !== "none" });
        var mf = tzBtn(i18nT('prepare.measure_and_focus_mm', { h: p.action === "stale" ? zr.f.h : p.h }), "primary big", function () { tzActFocusRun(za, zr); });
        mf.disabled = !!why || p.action === "none";
        tzTip(mf, p.action === "macro" ? i18nT('zoneActive.runs_macros_laser_the_same_as', { macro: zr.f.macro, code: TZ_CODES[zr.wn], h: p.h }) : i18nT('zoneActive.goes_to_the_z_point_the', { xy: zr.zp ? tzActFmtXY(za, zr.zp.x, zr.zp.y) : "--", v: i18nT('zoneActive.the_focus_height'), v2: i18nT('zoneActive.does_not_change_the_zone_or') }));
        row.appendChild(mf);
        var fh = tzBtn(i18nT('needs.focus_here'), null, function () { tzActFocusHere(za, zr); });
        fh.disabled = !!why && why !== "why_no_point";
        tzTip(fh, i18nT('zoneActive.measures_the_surface_with_the_bltouch'));
        row.appendChild(fh);
        tzActWhy(za, zr.hb, why ? i18nT('zoneActive.' + why) : "");
        if (!why && p.action === "stale") tzActWhy(za, zr.hb, i18nT('zoneActive.stale_macro_runs_its_own', { h: zr.f.h }));
      }

      // "Measure and focus": the macro of the zone when it carries this height, otherwise the Z point with this height
      function tzActFocusRun(za, zr) {
        var p = zr.plan;
        var mark = function () { tzFocusAppliedMark(zr.wn); };
        if (p.action === "macro" || p.action === "stale") {
          tzActSetMsg(za, i18nT('zoneActive.measuring_and_focusing'), true);
          return tzActRun(za, 'M98 P"0:/macros/laser/' + zr.f.macro + '"', i18nT('zoneActive.measured_and_focused_laser_mm_above', { h: zr.f.h, name: zr.f.name }), mark);
        }
        tjSetFocusH(p.h);
        tzActSetMsg(za, i18nT('zoneActive.measuring_at', { xy: tzActFmtXY(za, zr.zp.x, zr.zp.y) }), true);
        var tT = zr.mat && zr.mat.thickness > 0 && zr.mat.mode === zr.s.mode ? " T" + zr.mat.thickness : "";
        tzActRun(za, 'M98 P"0:/sys/workshop/macros/zprobepoint.g" X' + zr.zp.x + " Y" + zr.zp.y + " H" + p.h + tT, i18nT('zoneActive.done_laser_mm_above_the_surface', { h: p.h, xy: tzActFmtXY(za, zr.zp.x, zr.zp.y) }), mark);
      }

      // "Focus here": measures where the head is (no X/Y move) and leaves the laser at the height
      function tzActFocusHere(za, zr) {
        var h = zr.plan.h;
        tjSetFocusH(h);
        tzActSetMsg(za, i18nT('zoneActive.focusing_the_probe_measures_the_surface', { h: h }), true);
        var tT = zr.mat && zr.mat.thickness > 0 && zr.mat.mode === "Laser" ? " T" + zr.mat.thickness : "";
        tzActRun(za, 'M98 P"0:/sys/workshop/macros/focushere.g" H' + h + tT, i18nT('zoneActive.done_laser_mm_above_the_measured', { h: h }), function () { tzFocusAppliedMark(zr.wn); });
      }

      // CNC: the height Z ends up at after measuring, and the button that measures Z0 at the Z point
      function tzActLiftBlock(za, zr) {
        tzActNote(za, zr.hb, i18nT('zoneActive.cnc_the_bltouch_measures_the_top'));
        var safe = zr.cncMode && zr.mat && zr.mat.mode === "CNC" && zr.mat.altSafe >= 1;
        var l4 = tzActLine(za, zr.hb);
        l4.appendChild(tzEl("span", "za-lbl", i18nT('zoneActive.after_measuring_rise_to')));
        var hIn = tzActLiftInput(za, safe ? zr.mat.altSafe : tzActZLift(za));
        if (safe) hIn.title = i18nT('zoneActive.safe_height_of_the_material', { name: zr.mat.name });
        l4.appendChild(hIn);
        l4.appendChild(tzEl("span", "tz-muted", i18nT('common.mm_above_the_surface_2')));
        var why = tzActBlockedWhy({ signedOut: tzActSignedOut(), free: zr.free, homedXY: zr.homedXY, homedAll: zr.allHomed, needAll: true, needPoint: true, hasPoint: !!zr.zp });
        var l5 = tzActLine(za, zr.hb);
        var zb = tzBtn(i18nT('zoneActive.measure_z0_at_the_z_point'), "primary big", function () {
          var h = parseFloat(hIn.value);
          if (!(h >= 1 && h <= 60)) return tzActSetMsg(za, i18nT('zoneActive.the_height_must_be_between_1'), false);
          tzActSetMsg(za, i18nT('zoneActive.measuring_at', { xy: tzActFmtXY(za, zr.zp.x, zr.zp.y) }), true);
          var tT = zr.mat && zr.mat.thickness > 0 && zr.mat.mode === zr.s.mode ? " T" + zr.mat.thickness : "";
          tzActRun(za, 'M98 P"0:/sys/workshop/macros/zprobepoint.g" X' + zr.zp.x + " Y" + zr.zp.y + " H" + h + tT, i18nT('zoneActive.z0_measured_at_ended_up_at', { xy: tzActFmtXY(za, zr.zp.x, zr.zp.y), h: h }));
        });
        zb.disabled = !!why;
        l5.appendChild(zb);
        tzActWhy(za, zr.hb, why ? i18nT('zoneActive.' + why) : "");
      }

      // The "rise to" box of CNC: remembered in this browser (a screen preference), not in the zone
      function tzActLiftInput(za, value) {
        var hIn = document.createElement("input");
        hIn.type = "number";
        hIn.className = "tz-input";
        hIn.style.width = "84px";
        hIn.step = "0.1";
        hIn.min = "1";
        hIn.max = "60";
        hIn.value = String(value);
        hIn.addEventListener("input", function () { tzActSetZLift(za, hIn.value); });
        return hIn;
      }

      // Where the probe touches (summary; it is changed under Advanced) and a warning when the head cannot get there
      function tzActPointSummary(za, zr) {
        if (!zr.zp) return;
        var l = tzActLine(za, zr.hb);
        l.appendChild(tzEl("span", "za-lbl", i18nT('zoneActive.measures_at_label')));
        l.appendChild(tzEl("b", null, tzActFmtXY(za, zr.zp.x, zr.zp.y)));
        if (!tzActPointReach(zr).ok) l.appendChild(tzEl("span", "wf-state tz-badge err", i18nT('zoneActive.the_head_does_not_reach_it')));
        l.appendChild(tzBtn(i18nT('zoneActive.change_point'), null, function () {
          za.secOpen.advanced = true;
          try {
            localStorage.setItem(za.ZA_SEC_KEY, JSON.stringify(za.secOpen));
          } catch (e) {
            /* a screen preference only */
          }
          za.lastKey = "";
          tzActRender(za);
        }));
      }

      // Can the head bring the probe over the Z point? (the probe touches at head + probe offset)
      function tzActPointReach(zr) {
        if (!zr.zp || !zr.po) return { ok: true, hx: zr.zp ? zr.zp.x : 0, hy: zr.zp ? zr.zp.y : 0 };
        var hx = zr.zp.x - zr.po.x, hy = zr.zp.y - zr.po.y;
        return { ok: hx >= zr.ax.X.min && hx <= zr.ax.X.max && hy >= zr.ax.Y.min && hy <= zr.ax.Y.max, hx: hx, hy: hy };
      }
