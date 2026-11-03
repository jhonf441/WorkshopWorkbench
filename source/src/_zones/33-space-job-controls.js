      // ---- Pause / resume / cancel in the status bar of the page (F0) ----
      // Shown only while a file job runs (workshopJobButtons, src/_shared/01-job-rules.js). Cancel needs a double tap (DESIGN.md level 2).
      // The box is built by tzSpaceJobBox so the "Job in progress" card (47-job-control.js) offers the very same buttons: one logic, one double tap.
      function tzSpaceJobBox(controls, readStatus, cancelKey) {
        if (!controls || !(controls.pause || controls.resume || controls.cancel)) return null;
        var box = tzActOnly(tzEl("span", "tz-e-job"));
        var send = function (kind) {
          tzCode(workshopJobCode(kind)).then(function () { return readStatus(); }).catch(function () {});
        };
        if (controls.pause) box.appendChild(tzBtn(i18nT('space.job_pause'), null, function () { send("pause"); }));
        if (controls.resume) box.appendChild(tzBtn(i18nT('space.job_resume'), "primary", function () { send("resume"); }));
        if (controls.cancel) box.appendChild(tzBtn(i18nT('space.job_cancel'), "danger", function () { send("cancel"); }, i18nT('space.job_cancel_confirm'), cancelKey || "job-cancel"));
        return box;
      }

      function tzSpaceJobButtons(psp, t) {
        var box = tzSpaceJobBox(t.controls, function () { return psp.data.readStatus(); });
        if (box) psp.stateBar.appendChild(box);
      }
