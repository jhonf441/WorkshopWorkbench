      // ---- Active zone: the head (which zone, change it, what is missing, the checks of the zone) ----
      function tzActHead(za, zr) {
        var hd = tzEl("div", "za-head");
        var tl = tzEl("div");
        tl.appendChild(tzEl("div", "tz-muted", i18nT('zoneActive.active_zone')));
        tl.appendChild(tzEl("div", "za-name", TZ_CODES[zr.wn] + (zr.z && zr.z.name ? " " + zr.z.name : zr.wn === 0 ? i18nT('zoneActive.general_paren') : "")));
        hd.appendChild(tl);
        hd.appendChild(tzActZoneSelect(za, zr));
        zr.card.appendChild(hd);
        if (zr.z) tzActNote(za, zr.card, i18nT('zoneActive.summary_origin', { xy: tzActFmtXY(za, zr.z.refX, zr.z.refY) }));
        tjNeedsRow(zr.card, { st: zr.s, free: zr.free, mode: null, focus: false, onMsg: tzBind(tzActSetMsg, za), after: function () { za.lastKey = ""; za.ctx.machine.refresh(); } });
        if (za.M.text) zr.card.appendChild(za.M.node());
        za.ctx.data.controls(zr.wn).filter(function (c) { return c.lvl !== "info"; }).forEach(function (c) {
          zr.card.appendChild(tzCheckEl(c));
        });
      }

      // The select that activates another zone (it does not move the machine). Off with the reason in its tip.
      function tzActZoneSelect(za, zr) {
        var sel = document.createElement("select");
        sel.className = "tz-input za-sel";
        var opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = i18nT('zoneActive.change_to');
        sel.appendChild(opt0);
        TZ_CODES.forEach(function (code, i) {
          var q = zr.zones[i]; // zones is sparse (forEach skipped G54 without a file)
          var hasOff = Math.abs(zr.ax.X.workplaceOffsets[i] || 0) > 0.0005 || Math.abs(zr.ax.Y.workplaceOffsets[i] || 0) > 0.0005;
          if (i === zr.wn || (!q && i !== 0 && !hasOff)) return;
          var o = document.createElement("option");
          o.value = String(i);
          o.textContent = code + (q && q.name ? " " + q.name : i === 0 ? i18nT('zoneActive.general_paren') : "");
          sel.appendChild(o);
        });
        sel.disabled = !zr.free || sel.options.length < 2;
        sel.title = !zr.free ? i18nT('zoneActive.' + tzNotFreeWhy(zr.s.status)) : i18nT('zoneActive.activates_another_zone_does_not_move');
        sel.addEventListener("change", function () {
          var i = parseInt(sel.value, 10);
          if (isFinite(i)) tzActRun(za, TZ_CODES[i], i18nT('zoneActive.active', { code: TZ_CODES[i] }));
        });
        return sel;
      }
