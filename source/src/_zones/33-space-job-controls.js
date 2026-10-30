      // ---- Pause / resume / cancel in the status bar of the page (F0) ----
      // Shown only while a file job runs (tzJobControls, 22-job-controls.js). Cancel needs a double tap (DESIGN.md level 2).
      function tzSpaceJobButtons(psp, t) {
        if (!t.controls || !(t.controls.pause || t.controls.resume || t.controls.cancel)) return;
        var box = tzActOnly(tzEl("span", "tz-e-job"));
        var send = function (kind) {
          tzCode(TZ_JOB_CODES[kind]).then(function () { return psp.data.readStatus(); }).catch(function () {});
        };
        if (t.controls.pause) box.appendChild(tzBtn(i18nT('space.job_pause'), null, function () { send("pause"); }));
        if (t.controls.resume) box.appendChild(tzBtn(i18nT('space.job_resume'), "primary", function () { send("resume"); }));
        if (t.controls.cancel) box.appendChild(tzBtn(i18nT('space.job_cancel'), "danger", function () { send("cancel"); }, i18nT('space.job_cancel_confirm'), "job-cancel"));
        psp.stateBar.appendChild(box);
      }
