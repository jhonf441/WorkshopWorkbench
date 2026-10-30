      function tpSetMsg(tp, t, ok) {
        tp.M.set(t, ok);
      }

      function tpRun(tp, code, okText, after) {
        tpSetMsg(tp, i18nT('prepare.running'), true);
        return tzCode(code)
          .then(function (out) {
            var bad = /error|abort/i.test(out || "");
            if (!bad && after) after();
            tpSetMsg(tp, bad ? String(out).trim() : okText, !bad);
            return tp.ctx.machine.refresh();
          })
          .catch(function (e) { tpSetMsg(tp, String(e && e.message ? e.message : e), false); });
      }

