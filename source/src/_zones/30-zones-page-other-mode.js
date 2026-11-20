      // ---- Workbench page: the mode of the machine now ----
      // The card that used to replace every tab in a mode another plugin serves (FFF) is gone (2026-11-12, mode rule of vue/_shared36/mode-gate.js): with a
      // work mode on in the profile and the machine elsewhere the page stays open for reading and editing, a thin note on top says so with the switch
      // (30-zones-page-gate.js), and what acts refuses with its reason (tzDataMachineFree + tzNotFreeWhy). Without a work mode in the profile the page is
      // closed by the gate panel, which names the plugin that serves the mode (tzGateActions).

      // the mode of the machine now, or "?" before the first status read
      function tzPageMode(pz) {
        var st = pz.data.st();
        return (st && st.mode) || "?";
      }
