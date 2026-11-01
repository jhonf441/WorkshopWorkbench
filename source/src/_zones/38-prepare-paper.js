      // ---- Prepare, step 4 on a machine without a probe: the paper ----
      // The step measures with the probe (zprobepoint.g / the zone macro). Without a probe that can touch the surface it offers the paper instead
      // (the codes and the idea are in 12-probe-kind.js; the same two buttons live in the Active zone, 32-active-zone-paper.js):
      // "Go to the Z point" takes the tool there, the person lowers it with the Jog until it just drags the paper, and "Z0 with paper"
      // makes that surface Z0 and rises to h mm above it. mark: runs when the Z0 was set (the step is done).
      function tpPaperButtons(tp, pr, row, h, mark) {
        tzcLoad();
        var go = tzBtn(i18nT('paper.go_to_the_point'), null, function () {
          tpRun(tp, tzProbeGoCode(pr.zp.x, pr.zp.y), tzTx('paper.gone', 'jog', { xy: "X" + tzFmt(pr.zp.x) + " Y" + tzFmt(pr.zp.y) }));
        }, i18nT('common.tap_again_moves'), "tp-paper-go");
        go.disabled = !pr.free || !pr.homed || !pr.zp;
        tzTip(go, pr.zp ? tzTx('paper.go_to_the_point_tip', 'jog') : i18nT('zoneActive.why_no_point'));
        row.appendChild(go);
        var z0 = tzBtn(pr.laser ? i18nT('paper.z0_and_focus', { h: h }) : i18nT('paper.z0_here'), "primary big", function () {
          tpRun(tp, tzProbePaperCode(h, tzcPaper(tzc.data)), i18nT('paper.done', { h: h }), mark);
        }, i18nT('paper.confirm'), "tp-paper-z0");
        z0.disabled = !pr.free || !pr.homed;
        tzTip(z0, i18nT('paper.z0_tip', { paper: tzFmt(tzcPaper(tzc.data)) }));
        row.appendChild(z0);
      }
