      function tmatStart(tm2) {
        /* ctx: contract */
        // ctx: contract (21-contract.js): card, visible(), datos.zones / material / focoPorZona, nav.onChange
        tm2.editing = null; // copy of the material in the editor (or null)
        tm2.M = tzMsg(function () { tmatRender(tm2); });
      }
