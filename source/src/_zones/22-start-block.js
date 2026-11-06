      // ---- What stops a laser / CNC job from starting on this machine state (WB-3, 2026-11-05) ----
      // A job button used to need only "the machine is free" (status idle or busy): a machine that was OFF but reported "idle", or one that was
      // never homed, got its job started and the first macro cancelled it ("Foco laser: primero hace homing"). The checks live here, in ONE pure
      // function that the buttons use to stay grey with the reason AND that tzStartArmed asks again right before the M32.
      //   st   the state of the page (axes {X: {homed}}, status, atxPower) or null
      // An axis whose `homed` is not known (a state not read yet) never blocks: only a reported `homed: false` does.
      // -> the sentence that says what is missing, or "" when nothing blocks. The mode is checked by each caller (they word it their own way).
      function tzStartBlock(st) {
        if (!st) return "";
        if (st.status === "off" || st.atxPower === false) return i18nT('common.start_no_power');
        var ax = st.axes || {};
        var miss = ["X", "Y", "Z"].filter(function (k) { return ax[k] && ax[k].homed === false; });
        return miss.length ? i18nT('common.start_not_homed', { axes: miss.join(" ") }) : "";
      }

      // The same from the object model (what tzStartFile reads right before the M32): move.axes[] and state.
      function tzStartBlockOm(om) {
        if (!om) return "";
        var axes = {};
        ((om.move && om.move.axes) || []).forEach(function (a) { if (a && a.letter) axes[a.letter] = a; });
        return tzStartBlock({ axes: axes, status: om.state && om.state.status, atxPower: om.state ? om.state.atxPower : undefined });
      }
