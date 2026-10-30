      // ---- A warning of the zone check, with its one-tap fix ----
      //
      // Request 2026-10-09 (via the other session): "I do not understand the probe's
      // warning" -> the warnings are explained in simple words and, when there is an obvious
      // fix, they bring a button (c.fix = {label, tip, run() -> Promise,
      // ok}). Used by the zones table, Active zone, Prepare and the panel of
      // a zone on the map.
      function tzCheckEl(c) {
        var cl = tzEl("div", "tz-chk " + c.lvl);
        cl.appendChild(tzEl("span", "wf-state tz-badge " + (c.lvl === "info" ? "info" : c.lvl), c.lvl === "err" ? "error" : c.lvl === "warn" ? i18nT('check.warning') : "info"));
        cl.appendChild(document.createTextNode(" " + c.txt));
        if (c.fix) {
          var row = tzEl("div");
          row.style.marginTop = "3px";
          var msg = tzEl("span", "tz-muted");
          var b = tzBtn(c.fix.label, "primary", function () {
            b.disabled = true;
            Promise.resolve()
              .then(c.fix.run)
              .then(
                function () { msg.textContent = " " + (c.fix.ok || i18nT('check.done')); },
                function (e) { b.disabled = false; msg.textContent = i18nT('common.could_not', { err: e && e.message ? e.message : e }); }
              );
          });
          if (c.fix.tip) tzTip(b, c.fix.tip);
          row.appendChild(b);
          row.appendChild(msg);
          cl.appendChild(row);
        }
        return cl;
      }
