      // ---- "Active zone" card (Zones tab) ----
      //
      // Redesign 2026-10-22 ("zone, height and focus are too nested"): one flat card with three blocks, in the order a person uses them:
      //   head      which zone is active (and the select to change it), what is missing (homing, mode), the checks of the zone
      //   height    "Height and focus" (Laser) / "Z height" (CNC): the material, THE height, and the one button that measures
      //   origin    "Origin and zero": where X0 Y0 lands (laser or pointer), go there, set the origin here
      //   advanced  folded: the Z point (where the probe touches), Z by hand, calibration of the probe
      // The height is ONE number shown in ONE place (32-active-zone-focus-plan.js says where it comes from). Not here any more: the single
      // axis "go to zero" and "lower to Z0" (the Jog position card has them); Prepare keeps the guided steps of a job.
      // Files: -render (the card), -head, -height, -origin, -advanced (+ -point for the Z point), -focus-plan (pure), -z-lift, -state.

      function tzMountActive(ctx) {
        var za = { ctx: ctx };
        tzActStart(za);
        return tzActApi(za);
      }
