      function tzSpaceStart(psp) {
        psp.KEY_STEP = "workshopWorkbenchStep"; // {paso, herr: {n: id}}: the step in use and the last tool used in each step
        psp.KEY_INSP = "workshopWorkbenchInspector"; // "0" = the inspector is folded (narrow screens)
        psp.stepsBar = null;
        psp.headBar = null;
        psp.stateBar = null;
        psp.inspHead = null;
        psp.stepsKey = "";
        psp.headKey = "";
        psp.stateKey = "";
        psp.inspKey = "";
        psp.inspAbierto = true;
        psp.remembered = { step: 0, tool: {} };
      }

      // the bars follow the page: called when the tool changes (applyLayout) and after every status read
      function tzSpacePaint(psp) {
        tzSpacePaintSteps(psp);
        tzSpacePaintHead(psp);
        tzSpacePaintState(psp);
        tzSpacePaintInspector(psp, false);
      }
