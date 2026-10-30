      // ---- Height calibration: a summary here, the calibration itself in Machine > Height (2026-10-22) ----
      // The calibration of the tool height (trigger height of the BLTouch, fine adjustment, paper, SZP) was a card of Zones > Active zone. The owner asked why
      // a calibration of the machine lived in the bed map and not in Machine: it moved to WorkshopMachine (service ops machine.height.*, page "Height").
      // What is left here is what depends on WHERE the material is: the line that says what height the mode works with, and the button that takes the person
      // to Machine with the Z point of the active zone (the page takes it from the one-shot key below).
      //   0:/sys/workshop/config/zcal.json   saved by the service (read here, never written)
      var TZC_JSON = "0:/sys/workshop/config/zcal.json";
      // review #12: the Z point travels as route query parameters (?x=..&y=..) of Machine; the one-shot localStorage key below is
      // TRANSITIONAL (vue/WorkshopMachine/dwc-src/lib/height.js ASK_KEY still reads it): delete it when Machine reads route.query.
      var TZC_ASK_KEY = "workshopHeightPoint";
      var tzc = { data: null, text: "", loading: false };

      // The saved calibration of a mode: {k0: {z, date} | null, setting: mm}
      function tzcModeOf(data, mode) {
        var o = data && data.modes && data.modes[mode];
        var g = (o && o.general) || {};
        var k0 = o && o.k0 && isFinite(o.k0.z) ? { z: o.k0.z, date: o.k0.date || "" } : null;
        return { k0: k0, setting: isFinite(parseFloat(g.setting)) ? parseFloat(g.setting) : 0 };
      }

      // Reads the file again; when it changed since the last time the card is drawn again (Machine may have saved a new one meanwhile).
      function tzcLoad(onChange) {
        if (tzc.loading) return;
        tzc.loading = true;
        tzGetText(TZC_JSON)
          .then(function (t) { return { text: t, data: JSON.parse(t) }; })
          .catch(function () { return { text: "", data: null }; })
          .then(function (r) {
            tzc.loading = false;
            var changed = r.text !== tzc.text;
            tzc.text = r.text;
            tzc.data = r.data;
            if (changed && onChange) onChange();
          });
      }

      // Machine > Height with this zone's Z point (the assistants of Machine measure there)
      function tzcGoMachine(go, zp) {
        try {
          if (zp && isFinite(zp.x) && isFinite(zp.y)) localStorage.setItem(TZC_ASK_KEY, JSON.stringify({ x: zp.x, y: zp.y }));
        } catch (e) {
          /* without storage Machine opens on its own last view and the person types the point */
        }
        go(zp && isFinite(zp.x) && isFinite(zp.y) ? { x: zp.x, y: zp.y } : undefined);
      }

      // What redraws the card when the height changes: the trigger height of the probe, the mode and the saved file
      function tzcKey(s) {
        var p0 = s && s.probes && s.probes[0];
        return [tzc.text.length, p0 && p0.triggerHeight, s && s.mode];
      }

      // o: {s, zp, line, note, goMachine, rerender}
      function tzcRender(b2, o) {
        var mode = o.s.mode;
        if (TZ_WORK_MODES.indexOf(mode) < 0) return;
        tzcLoad(o.rerender);
        var mo = tzcModeOf(tzc.data, mode);
        var p0 = o.s.probes && o.s.probes[0];
        var th = p0 && isFinite(p0.triggerHeight) ? p0.triggerHeight : null;
        var l1 = o.line(b2);
        l1.appendChild(tzEl("span", "za-lbl", i18nT('zcal.calibrated_height', { mode: mode })));
        l1.appendChild(tzEl("b", null, th !== null ? tzFmt(th) + " mm" : "--"));
        l1.appendChild(tzEl("span", "wf-state tz-badge " + (mo.k0 ? "ok" : "info"), mo.k0 ? i18nT('zcal.calibrated_on', { date: mo.k0.date || "?" }) : i18nT('zcal.from_the_mode_file')));
        var l2 = o.line(b2);
        l2.appendChild(tzEl("span", "za-lbl", i18nT('zcal.fine_adjustment')));
        l2.appendChild(tzEl("b", null, (mo.setting > 0 ? "+" : "") + tzFmt(mo.setting) + " mm"));
        var go = tzBtn(i18nT('zcal.calibrate_in_machine'), null, function () { tzcGoMachine(o.goMachine, o.zp); });
        tzTip(go, i18nT('zcal.calibrate_in_machine_tip'));
        o.line(b2).appendChild(go);
      }
