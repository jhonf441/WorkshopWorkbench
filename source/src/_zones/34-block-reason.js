      // ---- Why the controls are locked (2026-10-22, "an icon says everything is locked and not why") ----
      // Pure: from what the page knows it gives the FIRST reason, in the order of how final it is, or null when nothing blocks.
      // i: {signedOut, viewOnly, status (state.status of RRF), liveJob, jobInProgress, holder (text when another device has the control),
      //     motion (text of the owner of the movement), homed}
      // Returns {key, params, soft} (key is a space.* key) or {text} (the holder's own text); soft = not a lock, only a hint.
      var TZ_BLOCK_STATUS = { off: "block_off", halted: "block_halted", disconnected: "block_disconnected", updating: "block_updating", starting: "block_starting", changingTool: "block_changing_tool" };
      // Why the machine is not free, from its status: "off" or "halted" is not "busy" (nothing moves, and the cause is another one). The key (zoneActive.*)
      // of the reason; the generic busy one (a job or a movement) when the status says nothing else.
      // `mode` (optional): the machine mode; a known mode the Workbench does not serve (FFF) or an unknown one is the reason when the status says nothing else
      function tzNotFreeWhy(status, mode) {
        if (status === "off") return "why_off";
        if (status === "halted") return "why_halted";
        if (status === "disconnected") return "why_disconnected";
        if (status === "updating") return "why_updating";
        if (status === "starting") return "why_starting";
        if (mode !== undefined && TZ_WORK_MODES.indexOf(mode) < 0) return mode && mode !== "?" ? "why_mode_elsewhere" : "why_mode_unknown";
        return "why_busy";
      }
      // the same as a short text for the badge of the needs list
      function tzNotFreeBadge(status, mode) {
        if (status === "off") return i18nT('needs.not_free_off');
        if (status === "halted") return i18nT('needs.not_free_halted');
        if (status === "disconnected") return i18nT('needs.not_free_disconnected');
        if (status === "updating") return i18nT('needs.not_free_updating');
        if (status === "starting") return i18nT('needs.not_free_starting');
        if (mode !== undefined && TZ_WORK_MODES.indexOf(mode) < 0) return mode && mode !== "?" ? i18nT('needs.not_free_mode_elsewhere') : i18nT('common.mode_unknown');
        return i18nT('needs.machine_busy', { status: status || "?" });
      }
      function tzBlockReason(i) {
        if (i.signedOut) return { key: "block_signed_out" };
        if (i.viewOnly) return { key: "block_view_only" };
        if (TZ_BLOCK_STATUS[i.status]) return { key: TZ_BLOCK_STATUS[i.status] };
        if (i.holder) return { text: i.holder };
        if (i.liveJob) return { key: "block_live_job" };
        if (i.jobInProgress) return { key: "blocked_job" };
        if (i.motion) return { key: "block_motion", params: { reason: i.motion } };
        if (i.homed === false) return { key: "block_not_homed", soft: true };
        return null;
      }
