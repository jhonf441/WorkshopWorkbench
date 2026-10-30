      // ---- Why the controls are locked (2026-10-22, "an icon says everything is locked and not why") ----
      // Pure: from what the page knows it gives the FIRST reason, in the order of how final it is, or null when nothing blocks.
      // i: {signedOut, viewOnly, status (state.status of RRF), liveJob, jobInProgress, holder (text when another device has the control),
      //     motion (text of the owner of the movement), homed}
      // Returns {key, params, soft} (key is a space.* key) or {text} (the holder's own text); soft = not a lock, only a hint.
      var TZ_BLOCK_STATUS = { off: "block_off", halted: "block_halted", disconnected: "block_disconnected", updating: "block_updating", starting: "block_starting", changingTool: "block_changing_tool" };
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
