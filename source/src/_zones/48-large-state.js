      function tgGrStart(tg) {
        /* ctx: contract (21-contract.js) */
        tg.card = tg.ctx.card;
        tg.data = tgGrTgLoad(tg);
        // on the card too (17-sd-saving.js); big-part.json is the service's drawing
        tg.tgSd = tzSdStore(TG_KEY, "0:/sys/workshop/data/big-part-wizard.json", function (sv) {
          Object.keys(tg.data).forEach(function (k) { delete tg.data[k]; });
          Object.assign(tg.data, tgGrTgComplete(tg, sv));
          tg.drawing = null;
          tgGrRender(tg, true);
          tg.ctx.map.redraw();
        });
        tg.preview = null; // {bbox, lineas: [[x0,y0,x1,y1,...]]} en coords de diseno
        tg.counts = null; // {this_mm, missing_mm, missing_box}
        tg.files = null;
        tg.M = tzMsg(function () { tgGrRender(tg, true); });
        tg.busy = false;
        tg.choosingOrigin = false;
        tg.touching = null; // "esq" | "borde": the next tap on the map is that point of the part
        tg.drawing = null; // cache of what is drawn on the map
        tg.beforeRender = "";
        // -- place by dragging the design on the map --
        tg.drag = null; // {p0, tx0, ty0}
        if (tg.data.file) tgGrLoadPreview(tg).then(tzBind(tgGrUpdateCounts, tg));
      }
