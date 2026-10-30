


      // Zone editor with the origin loaded from Vision: the active zone if
      // it has a file (G55..), otherwise a new one.
      function tzTableVisionOrigin(ptb, q) {
        var wn = ptb.data.st() ? ptb.data.st().wn : 0;
        if (ptb.nav.layout() !== "zones" && !ptb.nav.goLayout("zones")) return;
        if (ptb.nav.layout() !== "zones") return; // it opened on the other page
        tzTableOpenEditor(ptb, wn > 0 && ptb.data.zones()[wn] ? wn : "new", { pre: { x: q.x, y: q.y } });
        if (ptb.edCard.scrollIntoView) ptb.edCard.scrollIntoView({ block: "start", behavior: "smooth" });
      }



      function tzTablePosArm(ptb, k) {
        if (ptb.posArmed === k) {
          clearTimeout(ptb.posArmTimer);
          ptb.posArmed = "";
          return true;
        }
        ptb.posArmed = k;
        clearTimeout(ptb.posArmTimer);
        ptb.posArmTimer = setTimeout(function () { ptb.posArmed = ""; tzTableRenderPositions(ptb); }, 3000);
        tzTableRenderPositions(ptb);
        return false;
      }

      function tzTablePosSet(ptb, m, ok) {
        ptb.posMsg = m;
        ptb.posMsgOk = ok;
        tzTableRenderPositions(ptb);
      }


