      function tzToolStart(pmt) {
        pmt.mapPtrs = {};
        pmt.mapDrag = null; // {x,y,view} al empezar a arrastrar
        pmt.mapPinch = null; // {d, cx, cy}
        pmt.mapDragMoved = false;
        // Point menu on HOLD (or right click), in any
        // tab and with any tool (map redesign, 2026-10-10:
        // "few direct actions"): go, zone origin, Z point, measure,
        // save position, offcut...
        pmt.mapHold = null;
        pmt.lastCursor = null;
        pmt.cameraZVis = false;
        // Drag to edit (redesign 2026-10-10, user's request): the
        // head (on release: the point menu with Go here, double tap), the origin
        // of a zone (on release: the editor of that zone with the point loaded, it is
        // saved there) or a corner of the active mode's cutting area (on
        // release: card to save the new area). Nothing moves nor is
        // saved by itself on release.
        pmt.dragEdit = null;
        // Point assistant (the dialog of the point: Z point, origin...). In the Laser editor and Find center it is OFF until the
        // user turns it on with its button (a long press there is for moving shapes); everywhere else it works as always.
        pmt.wizardPoints = false;
        pmt.dockLast = null; // ultimo punto tocado en el mapa (coords de cama)
        pmt.zonePick = null; // zone of the zone pop-up
        pmt.cutsSwallowClick = false;
      }
