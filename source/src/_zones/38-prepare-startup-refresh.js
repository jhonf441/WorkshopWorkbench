      // The start-up strip lives under the header of the page (30-zones-page.js puts puestaEl there), so it shows in every section and keeps
      // up to date whether or not this step is on screen: the page calls puestaRefrescar() on every refresh.
      function tpStartupRefresh(tp) {
        if (!tp.ctx.machine.getSt()) return; // nothing to read yet
        var pk = JSON.stringify(tpStartupKnow(tp.ctx));
        if (pk !== tp.startupKey) { tp.startupKey = pk; tp.startup.refresh(); }
      }

