      // ---- Active zone: the paper buttons of a machine without a probe ----
      // A probe that can touch the surface measures it (zprobepoint.g / focushere.g). Without one the surface is found with a sheet of paper:
      // the button "Go to the Z point" takes the TOOL there (zcal-goto.g, which stays high), the person lowers it with the Jog until it just
      // drags the paper, and "Z0 with paper" (zcal-mark.g) makes that surface Z0 and rises to the final height. The codes are in 12-probe-kind.js.
      // getH: function -> final height above the surface in mm (1 to 60), or null when the box that holds it is not valid
      // label: caption of the Z0 button; after: runs when the Z0 was set (the focus of the zone is applied)
      function tzActPaperButtons(za, zr, getH, label, after) {
        tzcLoad();
        var why = tzActBlockedWhy({ signedOut: tzActSignedOut(), free: zr.free, status: zr.s.status, homedXY: zr.homedXY, homedAll: zr.allHomed, needAll: true, needPoint: true, hasPoint: !!zr.zp });
        var row = tzActLine(za, zr.hb);
        var go = tzBtn(i18nT('paper.go_to_the_point'), null, function () {
          tzActSetMsg(za, i18nT('paper.going', { xy: tzActFmtXY(za, zr.zp.x, zr.zp.y) }), true);
          tzActRun(za, tzProbeGoCode(zr.zp.x, zr.zp.y), tzTx('paper.gone', 'jog', { xy: tzActFmtXY(za, zr.zp.x, zr.zp.y) }));
        }, i18nT('common.tap_again_moves'), "az-paper-go");
        go.disabled = !!why;
        tzTip(go, tzTx('paper.go_to_the_point_tip', 'jog'));
        row.appendChild(go);
        var z0 = tzBtn(label, "primary big", function () {
          var h = getH();
          if (h === null || !(h >= 1 && h <= 60)) return tzActSetMsg(za, i18nT('zoneActive.the_height_must_be_between_1'), false);
          tzActRun(za, tzProbePaperCode(h, tzcPaper(tzc.data)), i18nT('paper.done', { h: h }), after);
        }, i18nT('paper.confirm'), "az-paper-z0");
        z0.disabled = !!tzActBlockedWhy({ signedOut: tzActSignedOut(), free: zr.free, status: zr.s.status, homedXY: zr.homedXY, homedAll: zr.allHomed, needAll: true, needPoint: false, hasPoint: true });
        tzTip(z0, i18nT('paper.z0_tip', { paper: tzFmt(tzcPaper(tzc.data)) }));
        row.appendChild(z0);
        tzActWhy(za, zr.hb, why ? i18nT('zoneActive.' + why) : "");
      }
