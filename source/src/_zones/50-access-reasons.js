      // ---- Block with reason in the Workbench (step 8 of the access control, document PASO8-PLUGINS 8.4) ----
      // ONE note (class wf-reason, the shared 09-access-reason.js) under each group of sensitive buttons; it says why the service would refuse the group to this
      // person (profile and rule, ceiling, no rule, role, condition) from ONE batched auth.can per screen. The buttons keep what they have today (hidden or grey
      // by the table of the role, the machine state with its own written reason); this only adds the cause. A stop is never in a group: frame.stop and
      // livejob.stop_safe are never asked, never blocked and never carry a sentence (workshopAccessIsStop leaves them out anyway).
      //   Frame (start)          frame.start                                    cut card, vision card
      //   Live job (close)       job.close                                      banner of the running job
      //   Interrupted jobs       the resume, discard and hide of a record       row of the list (target workshop:workbench:interrupted/<id>)
      //   Large pieces           bigpart.read / counts / marks / part / fit     card of the assistant
      //   Preview                jobs.preview                                   card of the preview (target workshop:printing:file/<path>)
      //   Vision from the bench  vision.post                                    the camera buttons of the assistant and of the center
      // workstate.set has no button: the page saves the work state by itself and falls back to the browser when refused, so there is nothing to explain.
      var TZ_REASON_OPS = {
        frame: ["frame.start"],
        close_job: ["job.close"],
        interrupted: ["livejob.resume.arm", "livejob.resume.disarm", "livejob.interrupted.discard", "livejob.interrupted.hide"],
        large: ["bigpart.read", "bigpart.counts", "bigpart.marks", "bigpart.part", "bigpart.fit"],
        preview: ["jobs.preview"],
        vision: ["vision.post"],
      };
      // the operations of a group the service names by target (access_targets.py); the others are asked without one
      var TZ_REASON_TARGETED = {
        interrupted: ["livejob.resume.arm", "livejob.interrupted.discard", "livejob.interrupted.hide"],
        preview: ["jobs.preview"],
      };

      // The items asked for a group: operation names, or { operation, target } for the ones the target names
      function tzReasonItems(group, target) {
        var targeted = TZ_REASON_TARGETED[group] || [];
        return (TZ_REASON_OPS[group] || []).map(function (op) {
          return target && targeted.indexOf(op) >= 0 ? { operation: op, target: target } : op;
        });
      }

      // The note of a group: an empty element that fills itself when something blocks (and says nothing when nothing does)
      function tzReasonEl(group, target) {
        if (typeof workshopReasonGroupEl !== "function") return document.createComment("");
        var box = workshopReasonGroupEl(tzReasonItems(group, target), { need: "operator", subject: i18nT("subjects_zones." + group) });
        box.style.marginTop = "6px";
        return box;
      }

      // The note of one interrupted job (its own target); the line that says why it cannot be resumed (the table of the role) stays where it is
      function tzReasonInterrupted(rec) {
        return tzReasonEl("interrupted", "workshop:workbench:interrupted/" + String(rec.id));
      }

      // The note of the preview of a file of the list (the path relative to gcodes, as the service reads it)
      function tzReasonPreview(path) {
        return tzReasonEl("preview", path ? "workshop:printing:file/" + String(path) : "");
      }
