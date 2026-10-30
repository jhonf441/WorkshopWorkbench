      function tpPrepareStart(tp) {
        /* ctx: contract (21-contract.js) */
        tp.done = {}; // "measure:<wn>" / "border:<wn>" -> true: a copy of the work state of the service (22-work-state.js), refreshed on every render
        tp.skipMat = {}; // zona -> seguir sin material
        tp.M = tzMsg(function () { tp.lastKey = ""; tpRender(tp); });
        tp.lastKey = "";
        tp.startup = tpStartupCreate(tp.ctx); // start-up card (38-prepare-startup.js); the element survives the redraws
        tp.startupKey = "";
      }
