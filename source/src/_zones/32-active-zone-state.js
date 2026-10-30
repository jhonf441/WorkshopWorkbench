      function tzActStart(za) {
        /* ctx: contract (21-contract.js) */
        // ctx: {card, getSt, zones(), focusByZone(), focusList(), machineFree(),
        //       refresh(), openEditorAt(idx, pre), visible()}
        za.M = tzMsg(function () { za.lastKey = ""; tzActRender(za); });
        za.aimAsk = false; // "Fijar origen": preguntando laser / puntero
        za.hDraft = null; // {wn, v}: a focus height written by the person and not saved anywhere (it only drives the measure buttons)
        za.ptDraft = null; // {wn, x, y}: a Z point coordinate written and not used yet
        za.lastKey = "";
        za.ZA_SEC_KEY = "workshopActiveZoneSections"; // only the Advanced fold is remembered (a screen preference)
        za.secOpen = { advanced: false };
        try {
          var rawSec = localStorage.getItem(za.ZA_SEC_KEY);
          za.so = JSON.parse(rawSec || "{}");
          if (typeof za.so.advanced === "boolean") za.secOpen.advanced = za.so.advanced;
        } catch (e) {
          /* defaults */
        }
      }
