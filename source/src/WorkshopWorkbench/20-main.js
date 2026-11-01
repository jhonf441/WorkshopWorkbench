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

      // Stopping the plugin from DWC (Plugins > Stop) runs what was registered with workshopOnStop (src/_shared/30-lifecycle.js, through
      // workshopCheckEnabled on 3.6 or the dwcPluginUnloaded event on 3.7). The page does NOT register anything there for its own parts: its
      // timers, its listeners and its tools belong to the page and end when it is left (tzMountPage destroy), and DWC 3.6 cannot remove the
      // route. What outlives the page is registered by the module that makes it: the pointer listeners of the cards that are typed in
      // (14-editing.js), the list of materials in window (36-materials.js) and the palette, menu and notice of the keyboard help
      // (56-agility.js). The <style> elements with an id of their own are taken out here, as if the plugin had never been loaded; each one is made
      // again, if it is missing, the next time the page, the editor or the command palette is built.
      var WORKBENCH_OWN_STYLES = [TZ_STYLE_ID, TZ_GATE_CSS_ID, TC_CSS_ID, TZ_AGILITY_STYLE_ID];
      workshopOwnStyles(WORKBENCH_OWN_STYLES);
      workshopWatchEnabled();
