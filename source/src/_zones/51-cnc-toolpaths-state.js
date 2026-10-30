      function tzCncTrayStart(cnc) {
        // ctx: contract (21-contract.js): card, visible(), maquina.getSt / libre / leer, mapa.redraw, corte.area / limites, ui.fmt
        cnc.M = tzMsg(function () { tzCncTrayRender(cnc, true); });
        cnc.doc = { v: 1, active: "", designs: [], readOnly: false };
        cnc.d = null; // design being edited
        cnc.sel = null; // id of the selected shape
        cnc.level = 0; // 0 = every level in the preview; k = up to the level k
        cnc.placing = null; // { paso } while the next tap on the map sets a point of the selected shape
        cnc.file = null; // { ruta, clave } of the last file written from this design
        cnc.before = "";
        cnc.seq = 0;
        // ---- shapes ----
        cnc.FIELDS = {
          line: [["x1", "x1"], ["y1", "y1"], ["x2", "x2"], ["y2", "y2"]],
          rect: [["x", "x"], ["y", "y"], ["w", "w"], ["h", "h"]],
          pocket: [["x", "x"], ["y", "y"], ["w", "w"], ["h", "h"]],
          circle: [["cx", "cx"], ["cy", "cy"], ["r", "r"]],
        };
        tzCncTrayLoad(cnc);
      }
