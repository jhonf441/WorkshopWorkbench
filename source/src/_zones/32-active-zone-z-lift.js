      // ---- Active zone: helpers shared by the blocks (messages, running codes, lines, blocks, the Advanced fold) ----
      // Height at which Z ends up after measuring outside Laser (CNC).
      function tzActZLift(za) {
        try {
          var v = parseFloat(localStorage.getItem("workshopZRaise"));
          return v >= 1 && v <= 60 ? v : 5;
        } catch (e) {
          return 5;
        }
      }

      function tzActSetZLift(za, v) {
        try {
          localStorage.setItem("workshopZRaise", String(v));
        } catch (e) {
          /* no critico */
        }
      }

      function tzActSetMsg(za, t, ok) {
        za.M.set(t, ok);
      }

      // True when this browser has no session while the service has users: whatever the person taps is going to be refused, so it says
      // why instead (the sign-in is NOT opened by itself: the chip at the bottom of the screen offers it).
      function tzActSignedOut() {
        return typeof workshopSignedOut === "function" && workshopSignedOut();
      }

      // Runs G-code lines one after the other. A person without a session gets the reason, not a silent failure.
      function tzActRun(za, codes, okText, after) {
        if (tzActSignedOut()) {
          tzActSetMsg(za, i18nT('zoneActive.why_signed_out'), false);
          if (typeof workshopToast === "function") workshopToast(i18nT('zoneActive.why_signed_out'));
          return Promise.resolve();
        }
        codes = Array.isArray(codes) ? codes : [codes];
        return codes
          .reduce(function (p, c) { return p.then(function () { return tzCode(c); }); }, Promise.resolve())
          .then(function (out) {
            var bad = /error/i.test(out || "");
            if (!bad && after) after();
            tzActSetMsg(za, bad ? String(out).trim() : okText, !bad);
            return za.ctx.machine.refresh();
          })
          .catch(function (e) { tzActSetMsg(za, String(e && e.message ? e.message : e), false); });
      }

      function tzActFmtXY(za, x, y) {
        return "X" + tzFmt(x) + " Y" + tzFmt(y);
      }

      // A block of the card: a line, the title (and a short summary at its right) and the body to fill. Returns the body.
      function tzActBlock(za, parent, title, summary) {
        var box = tzEl("div", "za-block");
        var hd = tzEl("div", "za-block-hd");
        hd.appendChild(tzEl("span", "za-block-t", title));
        if (summary) hd.appendChild(tzEl("span", "za-block-s", summary));
        box.appendChild(hd);
        parent.appendChild(box);
        return box;
      }

      // The folded block (Advanced): the header is a 44 px button; the body exists only while it is open. Returns the body or null.
      function tzActFold(za, parent, id, title, summary) {
        var box = tzEl("div", "za-block");
        var hd = tzEl("button", "za-fold");
        hd.type = "button";
        hd.setAttribute("aria-expanded", za.secOpen[id] ? "true" : "false");
        hd.appendChild(tzEl("span", "mdi mdi-chevron-" + (za.secOpen[id] ? "down" : "right")));
        hd.appendChild(tzEl("span", "za-block-t", title));
        if (summary) hd.appendChild(tzEl("span", "za-block-s", summary));
        hd.addEventListener("click", function () {
          za.secOpen[id] = !za.secOpen[id];
          try {
            localStorage.setItem(za.ZA_SEC_KEY, JSON.stringify(za.secOpen));
          } catch (e) {
            /* no critico */
          }
          za.lastKey = "";
          tzActRender(za);
        });
        box.appendChild(hd);
        parent.appendChild(box);
        return za.secOpen[id] ? box : null;
      }

      function tzActLine(za, parent, cls) {
        var r = tzEl("div", "za-line" + (cls ? " " + cls : ""));
        parent.appendChild(r);
        return r;
      }

      function tzActNote(za, parent, text) {
        var n = tzEl("div", "tz-muted za-note", text);
        parent.appendChild(n);
        return n;
      }

      // The reason a button is off, written under it (DESIGN.md: disabled with the reason written). Empty text writes nothing.
      function tzActWhy(za, parent, text) {
        if (text) parent.appendChild(tzEl("div", "za-why", text));
      }
