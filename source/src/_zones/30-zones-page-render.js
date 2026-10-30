      // ---- Workbench page: render() of the shell paints every card of the page with the machine state ----
      function tzPagRender(pz) {
        if (!pz.shell.alive() || !pz.data.st()) return;
        pz.tzMarkGroups(pz.data.st().mode);
        pz.offsetInfo.textContent = pz.data.st().mode === "Laser" ? "Offset laser: " + (pz.data.st().offsetOn ? i18nT('zonesPage.applied') : i18nT('zonesPage.removed_x0_y0_pointer')) : "";
        pz.shell.renderMap();
        pz.table.renderTable();
        pz.cutArea.renderCard();
        pz.nav.module("active").render();
        pz.nav.module("cuts").render();
        pz.nav.module("prepare").render(); // it is rebuilt only if something changed (key)
        pz.nav.module("ready").render(); // the "Ready to cut" card of the Run section (only drawn while that tab is open)
        pz.toolsTick(); // the registered tools that follow every state (e.g. the Machine tabs: offsets, level Z, mesh)
        if (pz.nav.layout() === "job" || pz.data.jobRunning()) pz.nav.module("job").render(); // (rebuilt only if something changed) and loads the path for focus mode
        if (pz.nav.layout() === "large") pz.nav.module("large").render(); // maquina libre / ocupada habilita los botones
        if (pz.nav.selected() === null) pz.table.renderEditorEmpty();
      }

