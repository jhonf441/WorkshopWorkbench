      // ---- Status bar of the page: who has the control (F1-D, 2026-10-21) ----
      // "Bloqueado: trabajo en curso" now says whose it is when the service knows who has the control of the movement, and when
      // nobody's job blocks but somebody else has the control it says so, with the button to take it (technician or administrator,
      // double tap). The data and the texts are in src/_shared/07-control-holder.js.

      // Part of the key of the bar: it must be painted again when the holder changes.
      function tzSpaceControlKey() {
        var c = workshopControl();
        return "|" + [c.held, c.mine, c.name, c.device, c.since, workshopControlCanTake()].join(",");
      }

      // Everything that locks the controls, as a reason (34-block-reason.js) built from the page's sources: the session and role, the
      // state of the machine, the live job, the job, the holder of the control and the owner of the movement.
      function tzSpaceBlockReason(t, st) {
        var c = workshopControl();
        var other = c.held && !c.mine;
        var who = other ? workshopControlWho(c) : "";
        return tzBlockReason({
          signedOut: typeof workshopSignedOut === "function" && workshopSignedOut(),
          viewOnly: tzViewNow() === "viewer",
          status: st ? String(st.status || "") : "",
          liveJob: !!(st && st.liveJob),
          jobInProgress: t.blocked,
          holder: other ? (t.blocked ? i18nT('control.blocked_job_by', { who: who }) : workshopControlText(c) || i18nT('control.blocked_by', { who: who })) : "",
          motion: workshopMotionBlock([PLUGIN_ID]),
          homed: t.head ? t.head.homed : true,
        });
      }

      // The reason is written in the header (33-space-head.js, tzSpacePaintHeadBlock); here only the button to take the control.
      function tzSpaceControlMark(psp, t) {
        var c = workshopControl();
        if (!(c.held && !c.mine)) return;
        var b = workshopControlTakeButton();
        if (b) {
          b.title = i18nT('control.take_tip');
          psp.stateBar.appendChild(b);
        }
      }
