      function tcmStart(tcm) {
        /* ctx: contract (21-contract.js): mapa.svg, svgBox, ctm(), capaActiva(), maquina.getSt, visible() */
        tcm.vcfg = void 0; // sys/workshop/config/vision.json (undefined = not read, null = does not exist: no Vision)
        tcm.img = document.createElement("img");
        tcm.img.alt = "";
        tcm.img.style.cssText = "position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;display:none;z-index:0;max-width:none;";
        tcm.ctx.map.svgBox.insertBefore(tcm.img, tcm.ctx.map.svg);
        tcm.ctx.map.svg.style.position = "relative";
        tcm.ctx.map.svg.style.zIndex = "1";
        tcm.ctx.map.svgBox.style.overflow = "hidden";
        tcm.ctx.map.svgBox.style.background = "#121212";
        tcm.ctx.map.svgBox.style.borderRadius = "4px";
        tcm.cameraErr = "", tcm.poseErr = "";
        tcm.now = null; // what the layer believes now: {w, h, ppm, x, y, z, iw, ih, c} (caption)
        // 2026-10-10: a relay cut (restart, network) left the image broken
        // forever on that page (the browser remembers that URL's error).
        // Now it retries every 5 s with a new URL.
        tcm.imgBase = "", tcm.imgRetry = null;
        tcm.img.addEventListener("error", function () {
          tcm.cameraErr = i18nT('cameraMap.could_not_open_the_camera_retrying', { imgBase: tcm.imgBase });
          clearTimeout(tcm.imgRetry);
          tcm.imgRetry = setTimeout(function () {
            if (tcm.imgBase && tcm.img.getAttribute("src")) tcm.img.src = tcm.imgBase + (tcm.imgBase.indexOf("?") >= 0 ? "&" : "?") + "r=" + Date.now();
          }, 5000);
        });
        tcm.img.addEventListener("load", function () {
          tcm.cameraErr = "";
          tcmPlace(tcm);
        });
        window.addEventListener("resize", tzBind(tcmPlace, tcm));
        tcmReload(tcm);
      }
