      // ---- Focus applied to the active zone (F0, 2026-10-21; storage + pure checks) ----
      // "Cut" needs a measured focus for a material with thickness. There is no flag in the machine for it, so the page remembers it:
      // when a focus action finishes (the material macro of the zone, "Focus here", "Go to height") it marks the active zone, and the
      // next idle status read stores the Z where the laser was left. The focus stays valid while that zone is active and Z is homed and
      // still where it was left (a new homing, or moving Z, loses it: the lens is no longer at the focus distance).
      // The record is kept per zone in the work state of the service (22-work-state.js).
      var TZ_FOCUS_Z_TOL = 0.3; // mm

      // The record of zone wn ({wn, z, ts}); without wn, the most recent one. null when there is none.
      function tzFocusAppliedRead(wn) {
        return typeof wn === "number" ? tzWorkGetApplied(tzWorkData(), wn) : tzWorkLastApplied(tzWorkData());
      }
      function tzFocusAppliedWrite(rec) {
        tzWorkSetApplied(tzWorkData(), rec.wn, rec);
        tzWorkSave();
      }

      // A focus action just finished on zone wn: its Z is stored by the next idle status (tzFocusAppliedSettle).
      function tzFocusAppliedMark(wn) {
        tzFocusAppliedWrite({ wn: wn, z: null, ts: Date.now() });
      }

      // Called with every status read: stores the Z of a pending mark once the machine is idle and Z is homed.
      function tzFocusAppliedSettle(st) {
        var rec = st ? tzFocusAppliedRead(st.wn) : null;
        if (!rec || rec.z !== null || st.status !== "idle" || rec.wn !== st.wn) return;
        var az = st.axes && st.axes.Z;
        if (az && az.homed && isFinite(az.machinePosition)) {
          rec.z = az.machinePosition;
          rec.ts = Date.now(); // newer than the pending mark, so it wins when the screens merge
          tzFocusAppliedWrite(rec);
        }
      }

      // Pure: the focus rec is valid for the state st?
      function tzFocusAppliedOk(rec, st) {
        if (!rec || !st || rec.wn !== st.wn || rec.z === null || rec.z === undefined) return false;
        var az = st.axes && st.axes.Z;
        return !!(az && az.homed && Math.abs(az.machinePosition - rec.z) <= TZ_FOCUS_Z_TOL);
      }
