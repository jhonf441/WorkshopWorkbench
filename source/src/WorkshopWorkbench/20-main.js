      // ---- WorkshopWorkbench startup (Workbench) ----
      //
      // 2026-10-11 (request: "split it"): the Workbench was part of
      // WorkshopJog; now it is its own plugin and the Jog keeps only the
      // floating panel. The map and its tools are in src/_zones and what it
      // shares with the Jog in src/_workbench_base (see _includes.txt). One page, one
      // menu entry, with the tabs in two groups: Work zone (prepare, zones, materials,
      // cut area, find center) and Design and cut (laser editor, cut in parts, simulate,
      // job). Route /Plugins/Workbench.
      // 2026-10-21: the Machine group (Offsets, Level Z, Mesh) is its own plugin,
      // WorkshopMachine (/Plugins/Machine); its code is not loaded here.
      tzRegisterPage("zones", "mdi-vector-square");

      // Turning the plugin off from DWC stops its timers (workshopCheckEnabled).
      workshopWatchEnabled();
