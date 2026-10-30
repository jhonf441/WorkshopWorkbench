      // ---- Workbench page: small UI helpers shared by every module: tzEl, tzTip, tzBtn (double tap), status read ----
      function tzEl(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined && text !== null) e.textContent = text;
        return e;
      }

      // Button with double tap (3s) for actions that move the machine or delete.
      // Tooltip (mouse: hover; touch: hold -- see 12-tips.js).
      function tzTip(el, text) {
        el.setAttribute("data-tip", text);
        return el;
      }

      // Explanation of each button of the page (Zones + Simple cuts), by its translated
      // label. A row with true = the label STARTS with it. tzBtn sets it by itself; a
      // data-tip/title of the button itself takes precedence.
      function tzTipsTable() {
        // built again only when the language changes (the labels are the translated button texts)
        var probe = i18nT('tzTips.l_new_zone');
        if (tzTipsCache && tzTipsCache.probe === probe) return tzTipsCache;
        var rows = [
          [i18nT('tzTips.l_new_zone'), i18nT('tzTips.t_new_zone')],
          [i18nT('tzTips.l_export_json'), i18nT('tzTips.t_export_json')],
          [i18nT('tzTips.l_import_json'), i18nT('tzTips.t_import_json')],
          [i18nT('tzTips.l_use'), i18nT('tzTips.t_use')],
          [i18nT('tzTips.l_active'), i18nT('tzTips.t_active')],
          [i18nT('tzTips.l_go_to_x0_y0'), i18nT('tzTips.t_go_to_x0_y0')],
          [i18nT('tzTips.l_edit'), i18nT('tzTips.t_edit')],
          [i18nT('tzTips.l_create'), i18nT('tzTips.t_create')],
          [i18nT('tzTips.l_copy_to'), i18nT('tzTips.t_copy_to')],
          [i18nT('tzTips.l_history'), i18nT('tzTips.t_history')],
          [i18nT('tzTips.l_restore'), i18nT('tzTips.t_restore')],
          [i18nT('tzTips.l_delete'), i18nT('tzTips.t_delete')],
          [i18nT('tzTips.l_measure_with_pointer'), i18nT('tzTips.t_measure_with_pointer')],
          [i18nT('tzTips.l_measure_with_laser'), i18nT('tzTips.t_measure_with_laser')],
          [i18nT('tzTips.l_measure_by_hand'), i18nT('tzTips.t_measure_by_hand')],
          [i18nT('tzTips.l_measure_from_the_map'), i18nT('tzTips.t_measure_from_the_map')],
          [i18nT('tzTips.l_draw_rectangle'), i18nT('tzTips.t_draw_rectangle')],
          [i18nT('tzTips.l_edit_numbers'), i18nT('tzTips.t_edit_numbers')],
          [i18nT('tzTips.l_from_saved_positions'), i18nT('tzTips.t_from_saved_positions')],
          [i18nT('tzTips.l_use_these_corners'), i18nT('tzTips.t_use_these_corners')],
          [i18nT('tzTips.l_frame'), i18nT('tzTips.t_frame')],
          [i18nT('tzTips.l_frame_pointer'), i18nT('tzTips.t_frame_pointer')],
          [i18nT('tzTips.l_frame_with_laser'), i18nT('tzTips.t_frame_with_laser')],
          [i18nT('tzTips.l_start_framing'), i18nT('tzTips.t_start_framing')],
          [i18nT('tzTips.l_remove'), i18nT('tzTips.t_remove')],
          [i18nT('tzTips.l_save'), i18nT('tzTips.t_save')],
          [i18nT('tzTips.l_save_area'), i18nT('tzTips.t_save_area')],
          [i18nT('tzTips.l_test_with_the_head'), i18nT('tzTips.t_test_with_the_head')],
          [i18nT('tzTips.l_test_with_the_laser'), i18nT('tzTips.t_test_with_the_laser'), true],
          [i18nT('tzTips.l_draw_again'), i18nT('tzTips.t_draw_again')],
          [i18nT('tzTips.l_go_to_the_point'), i18nT('tzTips.t_go_to_the_point')],
          [i18nT('tzTips.l_capture_corner'), i18nT('tzTips.t_capture_corner'), true],
          [i18nT('tzTips.l_release_x_y_motors'), i18nT('tzTips.t_release_x_y_motors')],
          [i18nT('tzTips.l_motors_released'), i18nT('tzTips.t_motors_released')],
          [i18nT('tzTips.l_use_current_position'), i18nT('tzTips.t_use_current_position')],
          ["+", i18nT('tzTips.t_zoom_in')],
          ["-", i18nT('tzTips.t_zoom_out')],
          [i18nT('tzTips.l_fit'), i18nT('zonesPage.show_the_whole_bed')],
          [i18nT('tzTips.l_line'), i18nT('tzTips.t_line')],
          [i18nT('tzTips.l_rectangle'), i18nT('tzTips.t_rectangle')],
          [i18nT('tzTips.l_circle'), i18nT('tzTips.t_circle')],
          [i18nT('tzTips.l_circle_2'), i18nT('tzTips.t_circle_2')],
          [i18nT('tzTips.l_rectangle_2'), i18nT('tzTips.t_rectangle_2')],
          [i18nT('tzTips.l_finish'), i18nT('tzTips.t_finish')],
          [i18nT('tzTips.l_capture_point'), i18nT('tzTips.t_capture_point')],
          [i18nT('tzTips.l_undo_last'), i18nT('tzTips.t_undo_last')],
          [i18nT('tzTips.l_clear_points'), i18nT('tzTips.t_clear_points')],
          [i18nT('tzTips.l_go_to_the_centre'), i18nT('tzTips.t_go_to_the_centre')],
          [i18nT('tzTips.l_create_circle'), i18nT('tzTips.t_create_circle')],
          [i18nT('tzTips.l_create_rectangle'), i18nT('tzTips.t_create_rectangle')],
          [i18nT('tzTips.l_centre_shape_here'), i18nT('tzTips.t_centre_shape_here')],
          [i18nT('tzTips.l_start_pointer'), i18nT('tzTips.t_start_pointer')],
          [i18nT('tzTips.l_corner_pointer'), i18nT('tzTips.t_corner_pointer')],
          [i18nT('tzTips.l_centre_pointer'), i18nT('tzTips.t_centre_pointer')],
          [i18nT('tzTips.l_end_pointer'), i18nT('tzTips.t_end_pointer')],
          [i18nT('tzTips.l_apply_to_all'), i18nT('tzTips.t_apply_to_all')],
          [i18nT('tzTips.l_cut'), i18nT('tzTips.t_cut')],
          [i18nT('tzTips.l_cut_2'), i18nT('tzTips.t_cut_2')],
          [i18nT('tzTips.l_cancel'), i18nT('tzTips.t_cancel')],
          [i18nT('tzTips.l_close'), i18nT('tzTips.t_close')],
        ];
        var exact = {}, prefix = [];
        rows.forEach(function (r) {
          if (r[2]) prefix.push(r);
          else exact[r[0]] = r[1];
        });
        tzTipsCache = { probe: probe, exact: exact, prefix: prefix };
        return tzTipsCache;
      }
      var tzTipsCache = null;

      function tzTipFor(label) {
        var t = tzTipsTable();
        if (Object.prototype.hasOwnProperty.call(t.exact, label)) return t.exact[label];
        for (var i = 0; i < t.prefix.length; i++) {
          if (String(label).indexOf(t.prefix[i][0]) === 0) return t.prefix[i][1];
        }
        return "";
      }

      // Button with optional double tap (confirmLabel). Reported: "the button
      // changed size / position and I did not get to give the second click".
      // Two causes: (1) the confirmation text was longer and the button
      // grew/pushed the row; (2) the zones table is rebuilt with
      // each state reading (1 s) and the armed button was lost. Now the
      // armed button keeps its WIDTH (it says "Confirm?" and the explanation
      // comes out in a tooltip, see 12-tips.js) and, with `armKey`, the arming
      // survives the rebuild during the 3 s.
      var TZ_ARM_MS = 3000;
      var tzArmed = null; // {key, until, w}
      function tzBtn(label, cls, onClick, confirmLabel, armKey) {
        var b = tzEl("button", "wf-btn tz-btn tzb" + (/(^| )primary( |$)/.test(cls || "") ? " wf-main" : "") + (/(^| )tz-armed( |$)/.test(cls || "") ? " wf-armed" : "") + (cls ? " " + cls : ""), label);
        b.type = "button";
        var tip = tzTipFor(label);
        if (tip) b.setAttribute("data-tip", tip);
        var armed = false;
        var timer = null;
        var saved = null; // what the button held before "Confirm?" (icon + caption of the map toolbar, or plain text)
        function disarm() {
          clearTimeout(timer);
          // 2026-10-16: it used to do b.textContent = label on EVERY click, which wiped the icon of the map toolbar buttons
          // (iconize() puts an svg + caption inside) and left plain text that overflowed the 38 px button, whatever the
          // "Names on the buttons" setting said. Only an armed button changes its content, and gets the same content back.
          if (armed && saved !== null) b.innerHTML = saved;
          saved = null;
          armed = false;
          b.classList.remove("tz-armed", "wf-armed");
          b.style.width = "";
          if (armKey && tzArmed && tzArmed.key === armKey) tzArmed = null;
        }
        function arm(w, ms) {
          armed = true;
          saved = b.innerHTML;
          if (w) b.style.width = w + "px"; // same size: the second touch lands in the same place
          b.textContent = i18nT('common.confirm');
          b.classList.add("tz-armed", "wf-armed"); // level 2 (DESIGN.md): amber
          timer = setTimeout(disarm, ms);
        }
        if (confirmLabel && armKey && tzArmed && tzArmed.key === armKey && Date.now() < tzArmed.until) {
          arm(tzArmed.w, tzArmed.until - Date.now());
        }
        b.addEventListener("click", function () {
          if (b.disabled) return;
          if (confirmLabel && !armed) {
            var w = b.offsetWidth;
            arm(w, TZ_ARM_MS);
            if (armKey) tzArmed = { key: armKey, until: Date.now() + TZ_ARM_MS, w: w };
            tjTipShow(b, TZ_ARM_MS, confirmLabel);
            return;
          }
          disarm();
          tjTipHide();
          onClick();
        });
        return b;
      }

      // Machine state for when the page runs without the jog: from DWC's
      // store (01-dwc-state.js), no longer from /machine/status (2026-10-12).
      function tzFetchStatus() {
        return workshopReadState();
      }
